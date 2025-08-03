#!/usr/bin/env python3
"""
AI Code Learning System for Intelligent Monitoring Framework
Provides machine learning for code fixing, deployment automation, and safety measures
"""

import asyncio
import json
import logging
import os
import subprocess
import time
import hashlib
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
import yaml

logger = logging.getLogger(__name__)

# Import framework interfaces
from main import (
    PluginInterface, RemediationPlugin, Problem, ProblemSeverity, LogEntry
)
from code_analysis_plugin import CodeIssue, CodeLocation

# ============================================================================
# AI LEARNING DATA STRUCTURES
# ============================================================================

@dataclass
class AiIntervention:
    """Records an AI intervention for learning"""
    problem_type: str
    issue_description: str
    solution_applied: str
    confidence: float  # 0.0 to 1.0
    risk_score: float  # 0.0 to 1.0
    outcome: str  # success, failure, partial
    timestamp: datetime
    deployment_id: Optional[str] = None
    code_issue_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class DeploymentRecord:
    """Records a deployment for tracking and learning"""
    id: str
    type: str  # ai_fix, manual_fix, rollback
    strategy: str  # direct_deployment, canary_deployment, blue_green_deployment
    status: str  # pending, in_progress, completed, failed, rolled_back
    initiated_by: str  # ai_system, user_manual
    description: str
    files_changed: List[str] = field(default_factory=list)
    test_results: Dict[str, Any] = field(default_factory=dict)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    commit_hash: Optional[str] = None
    rollback_commit_hash: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AiLearningModel:
    """Represents a trained AI model"""
    name: str
    version: str
    problem_type: str
    model_path: str
    accuracy: float  # 0.0 to 1.0
    training_data_size: int
    last_trained: datetime
    is_active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

# ============================================================================
# AI LEARNING ENGINE
# ============================================================================

class AILearningEngine:
    """Core AI learning engine for intervention patterns"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config.get('ai_learning', {})
        self.model_dir = Path(self.config.get('model_dir', './ai_models'))
        self.model_dir.mkdir(exist_ok=True)
        
        # Learning parameters
        self.min_confidence = self.config.get('min_confidence', 0.75)
        self.max_risk_score = self.config.get('max_risk_score', 0.3)
        self.min_success_probability = self.config.get('min_success_probability', 0.8)
        self.learning_rate = self.config.get('learning_rate', 0.1)
        self.retrain_frequency = self.config.get('retrain_frequency', 50)
        
        # Storage for learning data
        self.interventions: List[AiIntervention] = []
        self.models: Dict[str, AiLearningModel] = {}
        self.pattern_success_rates: Dict[str, float] = defaultdict(float)
        self.pattern_confidence_scores: Dict[str, List[float]] = defaultdict(list)
        
        # Load existing models and data
        asyncio.create_task(self._load_existing_data())
    
    async def _load_existing_data(self):
        """Load existing learning data and models"""
        try:
            # Load interventions
            interventions_file = self.model_dir / "interventions.json"
            if interventions_file.exists():
                with open(interventions_file, 'r') as f:
                    data = json.load(f)
                    for item in data:
                        item['timestamp'] = datetime.fromisoformat(item['timestamp'])
                        self.interventions.append(AiIntervention(**item))
            
            # Load models
            models_file = self.model_dir / "models.json"
            if models_file.exists():
                with open(models_file, 'r') as f:
                    data = json.load(f)
                    for model_data in data:
                        model_data['last_trained'] = datetime.fromisoformat(model_data['last_trained'])
                        model = AiLearningModel(**model_data)
                        self.models[model.name] = model
            
            await self._update_learning_patterns()
            logger.info(f"Loaded {len(self.interventions)} interventions and {len(self.models)} models")
            
        except Exception as e:
            logger.error(f"Error loading AI learning data: {e}")
    
    async def _save_data(self):
        """Save learning data and models"""
        try:
            # Save interventions
            interventions_file = self.model_dir / "interventions.json"
            data = []
            for intervention in self.interventions:
                item = asdict(intervention)
                item['timestamp'] = intervention.timestamp.isoformat()
                data.append(item)
            
            with open(interventions_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Save models
            models_file = self.model_dir / "models.json"
            data = []
            for model in self.models.values():
                item = asdict(model)
                item['last_trained'] = model.last_trained.isoformat()
                data.append(item)
            
            with open(models_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error saving AI learning data: {e}")
    
    async def record_intervention(self, intervention: AiIntervention):
        """Record a new AI intervention for learning"""
        self.interventions.append(intervention)
        await self._update_learning_patterns()
        await self._save_data()
        
        # Check if we need to retrain
        if len(self.interventions) % self.retrain_frequency == 0:
            await self._retrain_models()
    
    async def _update_learning_patterns(self):
        """Update success rates and confidence patterns"""
        pattern_outcomes = defaultdict(list)
        pattern_confidences = defaultdict(list)
        
        for intervention in self.interventions:
            key = intervention.problem_type
            
            # Track outcomes (success = 1, failure = 0, partial = 0.5)
            outcome_value = 1.0 if intervention.outcome == 'success' else \
                           0.5 if intervention.outcome == 'partial' else 0.0
            pattern_outcomes[key].append(outcome_value)
            pattern_confidences[key].append(intervention.confidence)
        
        # Calculate success rates
        for pattern, outcomes in pattern_outcomes.items():
            self.pattern_success_rates[pattern] = sum(outcomes) / len(outcomes)
            self.pattern_confidence_scores[pattern] = pattern_confidences[pattern]
    
    async def _retrain_models(self):
        """Retrain AI models with new data"""
        logger.info("Retraining AI models with accumulated intervention data")
        
        try:
            # Group interventions by problem type
            training_data = defaultdict(list)
            for intervention in self.interventions:
                training_data[intervention.problem_type].append(intervention)
            
            # Create/update models for each problem type
            for problem_type, interventions in training_data.items():
                if len(interventions) >= 10:  # Minimum data for training
                    model = await self._train_problem_type_model(problem_type, interventions)
                    if model:
                        self.models[f"{problem_type}_v{int(time.time())}"] = model
            
            await self._save_data()
            logger.info(f"Retrained {len(training_data)} model types")
            
        except Exception as e:
            logger.error(f"Error retraining models: {e}")
    
    async def _train_problem_type_model(self, problem_type: str, interventions: List[AiIntervention]) -> Optional[AiLearningModel]:
        """Train a model for a specific problem type"""
        try:
            # Simple learning: calculate average success rates and confidence patterns
            successful_interventions = [i for i in interventions if i.outcome == 'success']
            success_rate = len(successful_interventions) / len(interventions)
            
            # Calculate confidence patterns
            confidence_scores = [i.confidence for i in successful_interventions]
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5
            
            model = AiLearningModel(
                name=f"{problem_type}_model",
                version=f"v{int(time.time())}",
                problem_type=problem_type,
                model_path=str(self.model_dir / f"{problem_type}_model.json"),
                accuracy=success_rate,
                training_data_size=len(interventions),
                last_trained=datetime.now()
            )
            
            # Save model data
            model_data = {
                'success_rate': success_rate,
                'avg_confidence': avg_confidence,
                'pattern_features': self._extract_pattern_features(interventions)
            }
            
            with open(model.model_path, 'w') as f:
                json.dump(model_data, f, indent=2)
            
            return model
            
        except Exception as e:
            logger.error(f"Error training model for {problem_type}: {e}")
            return None
    
    def _extract_pattern_features(self, interventions: List[AiIntervention]) -> Dict[str, Any]:
        """Extract pattern features from interventions"""
        features = {
            'common_solutions': defaultdict(int),
            'risk_patterns': [],
            'confidence_patterns': [],
            'timing_patterns': []
        }
        
        for intervention in interventions:
            features['common_solutions'][intervention.solution_applied] += 1
            features['risk_patterns'].append(intervention.risk_score)
            features['confidence_patterns'].append(intervention.confidence)
            features['timing_patterns'].append(intervention.timestamp.hour)
        
        # Convert to frequencies
        total = len(interventions)
        features['common_solutions'] = {k: v/total for k, v in features['common_solutions'].items()}
        
        return features
    
    async def predict_intervention_success(self, problem_type: str, confidence: float, risk_score: float) -> float:
        """Predict success probability for an intervention"""
        try:
            # Use learned patterns
            if problem_type in self.pattern_success_rates:
                base_success_rate = self.pattern_success_rates[problem_type]
                
                # Adjust based on confidence and risk
                confidence_factor = (confidence - 0.5) * 2  # Scale to -1 to 1
                risk_factor = (0.5 - risk_score) * 2  # Scale to -1 to 1
                
                # Combined adjustment
                adjustment = (confidence_factor + risk_factor) * 0.2  # Max 20% adjustment
                predicted_success = max(0.0, min(1.0, base_success_rate + adjustment))
                
                return predicted_success
            
            # Fallback: conservative estimate based on confidence and risk
            return max(0.0, confidence - risk_score)
            
        except Exception as e:
            logger.error(f"Error predicting intervention success: {e}")
            return 0.5  # Neutral fallback
    
    async def should_auto_apply_fix(self, problem_type: str, confidence: float, risk_score: float) -> bool:
        """Determine if a fix should be automatically applied"""
        try:
            # Check basic thresholds
            if confidence < self.min_confidence or risk_score > self.max_risk_score:
                return False
            
            # Check predicted success
            predicted_success = await self.predict_intervention_success(problem_type, confidence, risk_score)
            if predicted_success < self.min_success_probability:
                return False
            
            # Check deployment limits
            recent_deployments = await self._count_recent_deployments()
            max_per_hour = self.config.get('max_deployments_per_hour', 2)
            
            if recent_deployments >= max_per_hour:
                logger.info(f"Deployment limit reached: {recent_deployments}/{max_per_hour} per hour")
                return False
            
            # Check if approval is required
            if self.config.get('require_approval', True):
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error determining auto-apply decision: {e}")
            return False
    
    async def _count_recent_deployments(self) -> int:
        """Count deployments in the last hour"""
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_interventions = [
            i for i in self.interventions 
            if i.timestamp > one_hour_ago and i.deployment_id
        ]
        return len(recent_interventions)
    
    def get_learning_stats(self) -> Dict[str, Any]:
        """Get current learning statistics"""
        return {
            'total_interventions': len(self.interventions),
            'problem_types_learned': len(self.pattern_success_rates),
            'success_rates': dict(self.pattern_success_rates),
            'models_trained': len(self.models),
            'average_confidence': sum(i.confidence for i in self.interventions) / len(self.interventions) if self.interventions else 0,
            'recent_deployments': len([i for i in self.interventions if i.timestamp > datetime.now() - timedelta(days=7)])
        }

# ============================================================================
# DEPLOYMENT ENGINE
# ============================================================================

class DeploymentEngine:
    """Handles automated deployments with safety measures"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config.get('deployment', {})
        self.safety_config = config.get('safety', {})
        
        # Deployment settings
        self.git_repo_path = Path(self.config.get('git_repo_path', '.'))
        self.use_docker = self.config.get('use_docker', True)
        self.use_kubernetes = self.config.get('use_kubernetes', False)
        self.test_commands = self.config.get('test_commands', ['python -m pytest tests/ -v'])
        self.docker_image_name = self.config.get('docker_image_name', 'mcp-server')
        
        # Safety settings
        self.business_hours_restriction = self.safety_config.get('business_hours_restriction', True)
        self.max_concurrent_deployments = self.safety_config.get('max_concurrent_deployments', 1)
        self.monitoring_period = self.safety_config.get('monitoring_period', 600)  # 10 minutes
        
        # Active deployments tracking
        self.active_deployments: Dict[str, DeploymentRecord] = {}
        self.deployment_history: List[DeploymentRecord] = []
    
    async def deploy_fix(self, code_issue: CodeIssue, fix_content: str, confidence: float) -> DeploymentRecord:
        """Deploy a code fix with appropriate strategy"""
        # Create deployment record
        deployment_id = hashlib.md5(f"{code_issue.location.file_path}_{time.time()}".encode()).hexdigest()[:8]
        
        deployment = DeploymentRecord(
            id=deployment_id,
            type='ai_fix',
            strategy=self._determine_deployment_strategy(confidence),
            status='pending',
            initiated_by='ai_system',
            description=f"AI fix for {code_issue.issue_type} in {code_issue.location.file_path}",
            files_changed=[code_issue.location.file_path]
        )
        
        try:
            self.active_deployments[deployment_id] = deployment
            
            # Check safety constraints
            if not await self._check_safety_constraints():
                deployment.status = 'failed'
                deployment.metadata['failure_reason'] = 'Safety constraints not met'
                return deployment
            
            # Execute deployment
            await self._execute_deployment(deployment, code_issue, fix_content)
            
            return deployment
            
        except Exception as e:
            logger.error(f"Error deploying fix: {e}")
            deployment.status = 'failed'
            deployment.metadata['error'] = str(e)
            return deployment
    
    def _determine_deployment_strategy(self, confidence: float) -> str:
        """Determine deployment strategy based on confidence and risk"""
        strategies = self.config.get('deployment_strategies', {})
        
        if confidence >= 0.9:
            return strategies.get('low_risk', 'direct_deployment')
        elif confidence >= 0.7:
            return strategies.get('medium_risk', 'canary_deployment')
        else:
            return strategies.get('high_risk', 'blue_green_deployment')
    
    async def _check_safety_constraints(self) -> bool:
        """Check if deployment is safe to proceed"""
        try:
            # Check business hours
            if self.business_hours_restriction:
                current_hour = datetime.now().hour
                if 9 <= current_hour <= 17:  # Business hours
                    logger.warning("Deployment blocked: business hours restriction")
                    return False
            
            # Check concurrent deployments
            active_count = len([d for d in self.active_deployments.values() if d.status == 'in_progress'])
            if active_count >= self.max_concurrent_deployments:
                logger.warning(f"Deployment blocked: max concurrent deployments ({active_count})")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking safety constraints: {e}")
            return False
    
    async def _execute_deployment(self, deployment: DeploymentRecord, code_issue: CodeIssue, fix_content: str):
        """Execute the actual deployment"""
        try:
            deployment.status = 'in_progress'
            
            # 1. Create backup
            await self._create_backup(code_issue.location.file_path)
            
            # 2. Apply fix
            await self._apply_code_fix(code_issue.location.file_path, fix_content)
            
            # 3. Run tests
            test_results = await self._run_tests()
            deployment.test_results = test_results
            
            if not test_results.get('success', False):
                await self._rollback_deployment(deployment)
                return
            
            # 4. Commit changes
            commit_hash = await self._commit_changes(deployment.description)
            deployment.commit_hash = commit_hash
            
            # 5. Deploy based on strategy
            if deployment.strategy == 'direct_deployment':
                await self._direct_deployment(deployment)
            elif deployment.strategy == 'canary_deployment':
                await self._canary_deployment(deployment)
            elif deployment.strategy == 'blue_green_deployment':
                await self._blue_green_deployment(deployment)
            
            deployment.status = 'completed'
            deployment.end_time = datetime.now()
            
            # 6. Monitor post-deployment
            asyncio.create_task(self._monitor_deployment(deployment))
            
        except Exception as e:
            logger.error(f"Error executing deployment {deployment.id}: {e}")
            deployment.status = 'failed'
            deployment.metadata['error'] = str(e)
            await self._rollback_deployment(deployment)
    
    async def _create_backup(self, file_path: str):
        """Create backup of file before modification"""
        backup_dir = Path(self.config.get('backup_directory', './backups'))
        backup_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = backup_dir / f"{Path(file_path).name}_{timestamp}.backup"
        
        shutil.copy2(file_path, backup_path)
        logger.info(f"Created backup: {backup_path}")
    
    async def _apply_code_fix(self, file_path: str, fix_content: str):
        """Apply the code fix to the file"""
        try:
            with open(file_path, 'w') as f:
                f.write(fix_content)
            logger.info(f"Applied code fix to {file_path}")
        except Exception as e:
            logger.error(f"Error applying code fix to {file_path}: {e}")
            raise
    
    async def _run_tests(self) -> Dict[str, Any]:
        """Run test suite to validate changes"""
        results = {'success': True, 'output': [], 'failed_tests': []}
        
        for test_command in self.test_commands:
            try:
                process = await asyncio.create_subprocess_shell(
                    test_command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.git_repo_path
                )
                
                stdout, stderr = await process.communicate()
                
                output = {
                    'command': test_command,
                    'returncode': process.returncode,
                    'stdout': stdout.decode(),
                    'stderr': stderr.decode()
                }
                
                results['output'].append(output)
                
                if process.returncode != 0:
                    results['success'] = False
                    results['failed_tests'].append(test_command)
                
            except Exception as e:
                logger.error(f"Error running test command '{test_command}': {e}")
                results['success'] = False
                results['failed_tests'].append(test_command)
        
        return results
    
    async def _commit_changes(self, message: str) -> Optional[str]:
        """Commit changes to git"""
        try:
            # Add changes
            await self._run_git_command(['add', '.'])
            
            # Commit
            await self._run_git_command(['commit', '-m', message])
            
            # Get commit hash
            result = await self._run_git_command(['rev-parse', 'HEAD'])
            commit_hash = result.stdout_text.strip() if result.stdout_text else None
            
            logger.info(f"Committed changes: {commit_hash}")
            return commit_hash
            
        except Exception as e:
            logger.error(f"Error committing changes: {e}")
            return None
    
    async def _run_git_command(self, args: List[str]):
        """Run a git command"""
        process = await asyncio.create_subprocess_exec(
            'git', *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.git_repo_path
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            stderr_text = stderr.decode() if stderr else 'Unknown error'
            raise Exception(f"Git command failed: {stderr_text}")
        
        # Create a simple result object with decoded stdout
        class GitResult:
            def __init__(self, stdout_bytes, stderr_bytes, returncode):
                self.stdout_text = stdout_bytes.decode() if stdout_bytes else ''
                self.stderr_text = stderr_bytes.decode() if stderr_bytes else ''
                self.returncode = returncode
                
        return GitResult(stdout, stderr, process.returncode)
    
    async def _direct_deployment(self, deployment: DeploymentRecord):
        """Direct deployment strategy"""
        if self.use_docker:
            await self._docker_deploy(deployment)
        else:
            await self._restart_service(deployment)
    
    async def _canary_deployment(self, deployment: DeploymentRecord):
        """Canary deployment strategy"""
        # Simplified canary deployment
        logger.info(f"Starting canary deployment for {deployment.id}")
        await self._direct_deployment(deployment)  # Simplified for prototype
    
    async def _blue_green_deployment(self, deployment: DeploymentRecord):
        """Blue-green deployment strategy"""
        # Simplified blue-green deployment
        logger.info(f"Starting blue-green deployment for {deployment.id}")
        await self._direct_deployment(deployment)  # Simplified for prototype
    
    async def _docker_deploy(self, deployment: DeploymentRecord):
        """Deploy using Docker"""
        try:
            # Build new image
            await self._run_docker_command(['build', '-t', self.docker_image_name, '.'])
            
            # Stop old container
            await self._run_docker_command(['stop', self.docker_image_name], ignore_errors=True)
            
            # Start new container
            await self._run_docker_command([
                'run', '-d', '--name', self.docker_image_name,
                '-p', '5000:5000', self.docker_image_name
            ])
            
            logger.info(f"Docker deployment completed for {deployment.id}")
            
        except Exception as e:
            logger.error(f"Docker deployment failed: {e}")
            raise
    
    async def _run_docker_command(self, args: List[str], ignore_errors: bool = False):
        """Run a docker command"""
        process = await asyncio.create_subprocess_exec(
            'docker', *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.git_repo_path
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0 and not ignore_errors:
            raise Exception(f"Docker command failed: {stderr.decode()}")
        
        return process
    
    async def _restart_service(self, deployment: DeploymentRecord):
        """Restart service using system command"""
        restart_command = self.config.get('restart_command', 'sudo systemctl restart mcp-server')
        
        try:
            process = await asyncio.create_subprocess_shell(
                restart_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"Service restart failed with code {process.returncode}")
            
            logger.info(f"Service restarted for deployment {deployment.id}")
            
        except Exception as e:
            logger.error(f"Error restarting service: {e}")
            raise
    
    async def _monitor_deployment(self, deployment: DeploymentRecord):
        """Monitor deployment for issues and auto-rollback if needed"""
        try:
            logger.info(f"Starting post-deployment monitoring for {deployment.id}")
            
            # Monitor for the configured period
            end_time = datetime.now() + timedelta(seconds=self.monitoring_period)
            
            while datetime.now() < end_time:
                # Check rollback triggers
                should_rollback = await self._check_rollback_triggers(deployment)
                
                if should_rollback:
                    logger.warning(f"Auto-rollback triggered for deployment {deployment.id}")
                    await self._rollback_deployment(deployment)
                    return
                
                await asyncio.sleep(30)  # Check every 30 seconds
            
            logger.info(f"Monitoring completed successfully for deployment {deployment.id}")
            
        except Exception as e:
            logger.error(f"Error monitoring deployment {deployment.id}: {e}")
    
    async def _check_rollback_triggers(self, deployment: DeploymentRecord) -> bool:
        """Check if deployment should be rolled back"""
        # This would integrate with monitoring metrics
        # For prototype, always return False
        return False
    
    async def _rollback_deployment(self, deployment: DeploymentRecord):
        """Rollback a failed deployment"""
        try:
            deployment.status = 'rolled_back'
            
            if deployment.commit_hash:
                # Git rollback
                await self._run_git_command(['reset', '--hard', 'HEAD~1'])
                
                # Redeploy previous version
                if self.use_docker:
                    await self._docker_deploy(deployment)
                else:
                    await self._restart_service(deployment)
            
            logger.info(f"Rollback completed for deployment {deployment.id}")
            
        except Exception as e:
            logger.error(f"Error rolling back deployment {deployment.id}: {e}")

# ============================================================================
# AI CODE FIXING PLUGIN
# ============================================================================

class AICodeFixingPlugin(RemediationPlugin):
    """Main plugin that combines AI learning with automated code fixing"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.ai_engine = AILearningEngine(config)
        self.deployment_engine = DeploymentEngine(config)
        self.source_directories = config.get('code_analysis', {}).get('source_directories', [])
    
    @property
    def name(self) -> str:
        return "ai_code_fixing"
    
    @property
    def version(self) -> str:
        return "1.0.0"
    
    async def initialize(self, config: Dict[str, Any]) -> bool:
        logger.info("Initialized AI Code Fixing Plugin")
        return True
    
    async def cleanup(self) -> None:
        await self.ai_engine._save_data()
    
    async def can_handle_problem(self, problem: Problem) -> bool:
        """Check if this plugin can handle the problem"""
        # Handle code-related problems
        code_related_types = [
            'log_pattern_syntax_error',
            'log_pattern_database_connection_error',
            'log_pattern_api_timeout',
            'code_issue'
        ]
        
        return any(problem_type in problem.type for problem_type in code_related_types)
    
    async def execute_remediation(self, problem: Problem, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute AI-powered remediation"""
        try:
            # Generate fix using AI
            fix_suggestion = await self._generate_ai_fix(problem, context)
            
            if not fix_suggestion:
                return {
                    'success': False,
                    'message': 'Could not generate AI fix suggestion',
                    'confidence': 0.0
                }
            
            # Calculate risk score
            risk_score = await self._calculate_risk_score(problem, fix_suggestion)
            
            # Check if auto-apply is appropriate
            should_auto_apply = await self.ai_engine.should_auto_apply_fix(
                problem.type, fix_suggestion['confidence'], risk_score
            )
            
            if should_auto_apply:
                # Apply fix automatically
                deployment = await self._apply_fix_automatically(problem, fix_suggestion)
                
                # Record intervention
                intervention = AiIntervention(
                    problem_type=problem.type,
                    issue_description=problem.description,
                    solution_applied=fix_suggestion['description'],
                    confidence=fix_suggestion['confidence'],
                    risk_score=risk_score,
                    outcome='success' if deployment.status == 'completed' else 'failure',
                    timestamp=datetime.now(),
                    deployment_id=deployment.id
                )
                
                await self.ai_engine.record_intervention(intervention)
                
                return {
                    'success': deployment.status == 'completed',
                    'message': f"AI fix applied automatically (deployment: {deployment.id})",
                    'confidence': fix_suggestion['confidence'],
                    'deployment_id': deployment.id,
                    'auto_applied': True
                }
            
            else:
                # Return suggestion for manual review
                return {
                    'success': False,
                    'message': 'AI fix generated, requires manual approval',
                    'confidence': fix_suggestion['confidence'],
                    'risk_score': risk_score,
                    'suggestion': fix_suggestion,
                    'auto_applied': False,
                    'requires_approval': True
                }
        
        except Exception as e:
            logger.error(f"Error in AI remediation: {e}")
            return {
                'success': False,
                'message': f'AI remediation failed: {str(e)}',
                'confidence': 0.0
            }
    
    async def _generate_ai_fix(self, problem: Problem, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Generate AI-powered fix suggestion"""
        try:
            # Simple pattern-based fixes for prototype
            if 'syntax_error' in problem.type.lower():
                return await self._generate_syntax_fix(problem, context)
            elif 'database_connection' in problem.type.lower():
                return await self._generate_db_connection_fix(problem, context)
            elif 'api_timeout' in problem.type.lower():
                return await self._generate_timeout_fix(problem, context)
            
            return None
            
        except Exception as e:
            logger.error(f"Error generating AI fix: {e}")
            return None
    
    async def _generate_syntax_fix(self, problem: Problem, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate syntax error fix"""
        return {
            'description': 'Fix syntax error based on common patterns',
            'confidence': 0.8,
            'fix_type': 'syntax_correction',
            'code_changes': 'Generated syntax fix based on AI patterns',
            'reasoning': 'Common syntax error pattern detected and fixed'
        }
    
    async def _generate_db_connection_fix(self, problem: Problem, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate database connection fix"""
        return {
            'description': 'Add connection retry logic and better error handling',
            'confidence': 0.7,
            'fix_type': 'connection_resilience',
            'code_changes': 'Added retry logic and connection pooling improvements',
            'reasoning': 'Database connection issues often resolved with retry mechanisms'
        }
    
    async def _generate_timeout_fix(self, problem: Problem, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate API timeout fix"""
        return {
            'description': 'Increase timeout values and add circuit breaker',
            'confidence': 0.75,
            'fix_type': 'timeout_handling',
            'code_changes': 'Increased timeout values and added circuit breaker pattern',
            'reasoning': 'Timeout issues often resolved with increased limits and circuit breakers'
        }
    
    async def _calculate_risk_score(self, problem: Problem, fix_suggestion: Dict[str, Any]) -> float:
        """Calculate risk score for applying a fix"""
        base_risk = 0.2  # Base risk
        
        # Increase risk based on problem severity
        if problem.severity == ProblemSeverity.CRITICAL:
            base_risk += 0.3
        elif problem.severity == ProblemSeverity.HIGH:
            base_risk += 0.2
        elif problem.severity == ProblemSeverity.MEDIUM:
            base_risk += 0.1
        
        # Decrease risk based on fix confidence
        confidence_factor = (1.0 - fix_suggestion['confidence']) * 0.3
        
        # Adjust based on fix type
        fix_type_risks = {
            'syntax_correction': 0.1,
            'connection_resilience': 0.2,
            'timeout_handling': 0.15,
            'security_fix': 0.4
        }
        
        type_risk = fix_type_risks.get(fix_suggestion.get('fix_type', 'unknown'), 0.3)
        
        total_risk = min(1.0, base_risk + confidence_factor + type_risk)
        return total_risk
    
    async def _apply_fix_automatically(self, problem: Problem, fix_suggestion: Dict[str, Any]) -> DeploymentRecord:
        """Apply fix automatically using deployment engine"""
        # For prototype, create a mock code issue
        mock_code_issue = CodeIssue(
            issue_type=problem.type,
            severity=problem.severity,
            description=problem.description,
            location=CodeLocation(
                file_path='./src/main.py',  # Mock path
                line_number=1,
                function_name='main'
            ),
            confidence=fix_suggestion['confidence']
        )
        
        # Deploy the fix
        deployment = await self.deployment_engine.deploy_fix(
            mock_code_issue,
            fix_suggestion['code_changes'],
            fix_suggestion['confidence']
        )
        
        return deployment

# ============================================================================
# DEMO AND UTILITY FUNCTIONS
# ============================================================================

async def demo_ai_code_fixing():
    """Demo function for AI code fixing capabilities"""
    print("\n🤖 AI Code Fixing Demo")
    print("=" * 50)
    
    # Create demo configuration
    config = {
        'ai_learning': {
            'enabled': True,
            'model_dir': './demo_ai_models',
            'min_confidence': 0.7,
            'require_approval': False,
            'max_deployments_per_hour': 5
        },
        'deployment': {
            'enabled': True,
            'use_docker': False,
            'test_commands': ['echo "Demo test passed"']
        },
        'safety': {
            'business_hours_restriction': False,
            'max_concurrent_deployments': 1
        }
    }
    
    # Initialize AI plugin
    ai_plugin = AICodeFixingPlugin(config)
    await ai_plugin.initialize(config)
    
    # Create demo problem
    demo_problem = Problem(
        type='log_pattern_syntax_error',
        severity=ProblemSeverity.MEDIUM,
        description='Syntax error detected in main.py line 42',
        timestamp=datetime.now(),
        metadata={'file': 'main.py', 'line': 42}
    )
    
    print(f"🔍 Analyzing problem: {demo_problem.description}")
    
    # Test if plugin can handle it
    can_handle = await ai_plugin.can_handle_problem(demo_problem)
    print(f"✅ Can handle problem: {can_handle}")
    
    if can_handle:
        # Execute remediation
        print("🔧 Executing AI remediation...")
        result = await ai_plugin.execute_remediation(demo_problem, {})
        
        print(f"📊 Remediation result:")
        print(f"  Success: {result['success']}")
        print(f"  Confidence: {result['confidence']:.1%}")
        print(f"  Message: {result['message']}")
        
        if result.get('auto_applied'):
            print(f"  🚀 Deployment ID: {result.get('deployment_id')}")
    
    # Show learning stats
    stats = ai_plugin.ai_engine.get_learning_stats()
    print(f"\n📚 Learning Statistics:")
    print(f"  Total Interventions: {stats['total_interventions']}")
    print(f"  Problem Types Learned: {stats['problem_types_learned']}")
    print(f"  Models Trained: {stats['models_trained']}")
    
    await ai_plugin.cleanup()
    print("\n✅ Demo completed successfully!")

if __name__ == "__main__":
    asyncio.run(demo_ai_code_fixing())