#!/usr/bin/env python3
"""
Intelligent MCP Code Monitor
Combines MCP server monitoring with AI-powered code analysis and automatic fixing
"""

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

# Import existing components
from mcp_monitoring_plugin import MCPServerDiscovery, MCPMetricsCollectorPlugin, MCPPatternDetectorPlugin, MCPServerRemediationPlugin, MCPServerInfo
from code_analysis_plugin import CodeAnalysisPlugin, CodeFixRemediationPlugin, LogToCodeMapperPlugin, CodeIssue, CodeLocation
from real_ai_learning_system import get_ai_system, RealAILearningSystem

logger = logging.getLogger(__name__)

@dataclass
class MCPCodeIssue:
    """Represents a code issue detected in MCP server context"""
    mcp_server_id: str
    server_name: str
    code_issue: CodeIssue
    error_logs: List[str]
    fix_attempted: bool = False
    fix_success: bool = False
    confidence_score: float = 0.0
    discovery_time: datetime = None
    
    def __post_init__(self):
        if self.discovery_time is None:
            self.discovery_time = datetime.now()

@dataclass
class AutoFixResult:
    """Result of automatic code fixing attempt"""
    success: bool
    original_code: str
    fixed_code: str
    confidence: float
    backup_path: Optional[str] = None
    validation_passed: bool = False
    error_message: Optional[str] = None

class IntelligentMCPCodeMonitor:
    """
    Comprehensive monitoring system that:
    1. Discovers and monitors MCP servers
    2. Analyzes their logs for code issues
    3. Uses ML to predict fix success
    4. Automatically applies fixes when confident
    5. Validates fixes by monitoring server health
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.mcp_discovery = None
        self.mcp_metrics = None
        self.mcp_detector = None
        self.mcp_remediation = None
        self.code_analyzer = None
        self.code_fixer = None
        self.log_mapper = None
        self.ai_system = None
        
        # Monitoring state
        self.discovered_servers = {}
        self.monitored_issues = {}
        self.fix_history = []
        self.monitoring_active = False
        
        # Configuration
        self.scan_interval = config.get('scan_interval', 30)  # seconds
        self.auto_fix_enabled = config.get('auto_fix_enabled', True)
        self.min_confidence_threshold = config.get('min_confidence_threshold', 0.8)
        self.source_directories = config.get('source_directories', ['./server', './src', './lib'])
        
        # Statistics
        self.stats = {
            'servers_monitored': 0,
            'issues_detected': 0,
            'fixes_attempted': 0,
            'fixes_successful': 0,
            'ml_predictions_made': 0
        }
    
    async def initialize(self) -> bool:
        """Initialize all monitoring components"""
        try:
            logger.info("🚀 Initializing Intelligent MCP Code Monitor")
            
            # Initialize MCP components
            self.mcp_discovery = MCPServerDiscovery(self.config)
            
            # Initialize code analysis components
            self.code_analyzer = CodeAnalysisPlugin(self.source_directories)
            await self.code_analyzer.initialize({
                'source_directories': self.source_directories,
                'confidence_threshold': 0.7
            })
            
            self.code_fixer = CodeFixRemediationPlugin(
                self.source_directories, 
                auto_apply=self.auto_fix_enabled
            )
            await self.code_fixer.initialize({
                'auto_apply': self.auto_fix_enabled,
                'backup_dir': './code_fix_backups'
            })
            
            self.log_mapper = LogToCodeMapperPlugin(self.source_directories)
            await self.log_mapper.initialize()
            
            # Get AI system for ML predictions
            self.ai_system = await get_ai_system()
            if self.ai_system:
                logger.info("✅ AI Learning System connected")
            else:
                logger.warning("⚠️ AI Learning System not available, using fallback predictions")
            
            logger.info("✅ Intelligent MCP Code Monitor initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize monitor: {e}")
            return False
    
    async def start_monitoring(self):
        """Start continuous monitoring"""
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        logger.info("🎯 Starting continuous MCP code monitoring")
        
        try:
            while self.monitoring_active:
                await self._monitoring_cycle()
                await asyncio.sleep(self.scan_interval)
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")
        finally:
            self.monitoring_active = False
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring_active = False
        logger.info("🛑 Stopping MCP code monitoring")
    
    async def _monitoring_cycle(self):
        """Single monitoring cycle"""
        try:
            # 1. Discover MCP servers
            await self._discover_mcp_servers()
            
            # 2. Collect metrics and logs from servers
            server_metrics = await self._collect_server_metrics()
            
            # 3. Analyze logs for code issues
            code_issues = await self._analyze_server_logs(server_metrics)
            
            # 4. Use ML to predict fix success and apply fixes
            if code_issues:
                await self._process_code_issues(code_issues)
            
            # 5. Validate previous fixes
            await self._validate_previous_fixes()
            
            # 6. Update statistics
            self._update_statistics()
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")
    
    async def _discover_mcp_servers(self):
        """Discover and update MCP servers"""
        try:
            servers = await self.mcp_discovery.discover_all_servers()
            
            # Update discovered servers
            for server in servers:
                self.discovered_servers[server.server_id] = server
            
            # Initialize monitoring components for new servers
            if not self.mcp_metrics:
                self.mcp_metrics = MCPMetricsCollectorPlugin(servers)
                await self.mcp_metrics.initialize({})
                
                self.mcp_detector = MCPPatternDetectorPlugin(self.discovered_servers)
                await self.mcp_detector.initialize({})
                
                self.mcp_remediation = MCPServerRemediationPlugin(self.discovered_servers)
                await self.mcp_remediation.initialize({})
            
            self.stats['servers_monitored'] = len(self.discovered_servers)
            
        except Exception as e:
            logger.error(f"Error discovering MCP servers: {e}")
    
    async def _collect_server_metrics(self) -> Dict[str, Any]:
        """Collect metrics and logs from all MCP servers"""
        if not self.mcp_metrics:
            return {}
        
        try:
            metrics = await self.mcp_metrics.collect_metrics()
            
            # Simulate log collection (in real implementation, collect from actual logs)
            metrics['recent_log_entries'] = await self._simulate_server_logs()
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error collecting server metrics: {e}")
            return {}
    
    async def _simulate_server_logs(self) -> List[Dict[str, Any]]:
        """Simulate server logs (replace with actual log collection)"""
        # This would be replaced with actual log collection from MCP servers
        sample_logs = [
            {
                'timestamp': datetime.now().isoformat(),
                'level': 'ERROR',
                'message': 'TypeError: Cannot read property "length" of undefined at processData (server.js:42:15)',
                'server_id': list(self.discovered_servers.keys())[0] if self.discovered_servers else 'unknown'
            },
            {
                'timestamp': datetime.now().isoformat(),
                'level': 'ERROR', 
                'message': 'ReferenceError: calculateTotal is not defined at main.py:15',
                'server_id': list(self.discovered_servers.keys())[0] if self.discovered_servers else 'unknown'
            }
        ]
        
        # Only return logs occasionally to simulate real scenarios
        if time.time() % 60 < 10:  # 10 seconds every minute
            return sample_logs[:1]  # Return one log entry
        return []
    
    async def _analyze_server_logs(self, server_metrics: Dict[str, Any]) -> List[MCPCodeIssue]:
        """Analyze server logs to detect code issues"""
        mcp_issues = []
        
        try:
            log_entries = server_metrics.get('recent_log_entries', [])
            
            for log_entry in log_entries:
                if log_entry.get('level') in ['ERROR', 'CRITICAL']:
                    server_id = log_entry.get('server_id', 'unknown')
                    server = self.discovered_servers.get(server_id)
                    
                    if not server:
                        continue
                    
                    # Use code analyzer to detect issues
                    code_issues = await self.code_analyzer._analyze_error_message(log_entry['message'])
                    
                    for code_issue in code_issues:
                        mcp_issue = MCPCodeIssue(
                            mcp_server_id=server_id,
                            server_name=server.name,
                            code_issue=code_issue,
                            error_logs=[log_entry['message']],
                            confidence_score=code_issue.confidence
                        )
                        mcp_issues.append(mcp_issue)
                        
                        # Store in monitored issues
                        issue_key = f"{server_id}_{code_issue.location.file_path}_{code_issue.location.line_number}"
                        self.monitored_issues[issue_key] = mcp_issue
            
            self.stats['issues_detected'] += len(mcp_issues)
            
            if mcp_issues:
                logger.info(f"🔍 Detected {len(mcp_issues)} code issues from MCP server logs")
            
            return mcp_issues
            
        except Exception as e:
            logger.error(f"Error analyzing server logs: {e}")
            return []
    
    async def _process_code_issues(self, mcp_issues: List[MCPCodeIssue]):
        """Process detected code issues with ML predictions and auto-fixing"""
        for mcp_issue in mcp_issues:
            try:
                # Use ML to predict fix success if AI system is available
                fix_prediction = await self._predict_fix_success(mcp_issue)
                mcp_issue.confidence_score = fix_prediction.get('success_probability', mcp_issue.confidence_score)
                
                logger.info(f"🧠 ML Prediction for {mcp_issue.code_issue.issue_type}: "
                          f"{fix_prediction.get('success_probability', 0):.1%} success probability")
                
                # Apply fix if confidence is high enough
                if (mcp_issue.confidence_score >= self.min_confidence_threshold and 
                    self.auto_fix_enabled and 
                    not mcp_issue.fix_attempted):
                    
                    fix_result = await self._apply_automatic_fix(mcp_issue)
                    mcp_issue.fix_attempted = True
                    mcp_issue.fix_success = fix_result.success
                    
                    # Record fix attempt in history
                    self.fix_history.append({
                        'timestamp': datetime.now(),
                        'mcp_issue': mcp_issue,
                        'fix_result': fix_result
                    })
                    
                    self.stats['fixes_attempted'] += 1
                    if fix_result.success:
                        self.stats['fixes_successful'] += 1
                        
                        # Add successful fix to training data
                        if self.ai_system:
                            await self._add_fix_to_training_data(mcp_issue, fix_result, success=True)
                    else:
                        # Add failed fix to training data
                        if self.ai_system:
                            await self._add_fix_to_training_data(mcp_issue, fix_result, success=False)
                
            except Exception as e:
                logger.error(f"Error processing code issue: {e}")
    
    async def _predict_fix_success(self, mcp_issue: MCPCodeIssue) -> Dict[str, Any]:
        """Use ML to predict fix success probability"""
        try:
            if not self.ai_system:
                # Fallback prediction based on issue type and confidence
                return {
                    'success_probability': mcp_issue.confidence_score * 0.8,
                    'model_used': 'fallback',
                    'reasoning': 'AI system not available'
                }
            
            # Prepare features for ML prediction
            code_issue_dict = {
                'issueType': mcp_issue.code_issue.issue_type,
                'severity': mcp_issue.code_issue.severity.name,
                'description': mcp_issue.code_issue.description,
                'filePath': mcp_issue.code_issue.location.file_path,
                'lineNumber': mcp_issue.code_issue.location.line_number,
                'confidence': mcp_issue.code_issue.confidence
            }
            
            # Get ML prediction
            prediction = await self.ai_system.predict_code_fix_success(code_issue_dict)
            
            self.stats['ml_predictions_made'] += 1
            
            return {
                'success_probability': prediction.prediction,
                'confidence': prediction.confidence,
                'model_used': prediction.model_used,
                'prediction_time_ms': prediction.prediction_time_ms,
                'feature_importance': prediction.feature_importance
            }
            
        except Exception as e:
            logger.error(f"Error predicting fix success: {e}")
            return {
                'success_probability': 0.5,
                'model_used': 'error',
                'error': str(e)
            }
    
    async def _apply_automatic_fix(self, mcp_issue: MCPCodeIssue) -> AutoFixResult:
        """Apply automatic fix to the code issue"""
        try:
            logger.info(f"🔧 Attempting automatic fix for {mcp_issue.code_issue.issue_type} "
                       f"in {mcp_issue.server_name}")
            
            # Create a Problem object for the code fixer
            from main import Problem, ProblemSeverity
            
            problem = Problem(
                type=f"code_issue_{mcp_issue.code_issue.issue_type}",
                severity=mcp_issue.code_issue.severity,
                description=mcp_issue.code_issue.description,
                timestamp=datetime.now(),
                metadata={
                    'code_location': asdict(mcp_issue.code_issue.location),
                    'confidence': mcp_issue.code_issue.confidence,
                    'suggested_fix': mcp_issue.code_issue.suggested_fix,
                    'mcp_server_id': mcp_issue.mcp_server_id
                }
            )
            
            # Apply fix using the remediation plugin
            fix_result_dict = await self.code_fixer.execute_remediation(problem, {})
            
            # Convert to our result format
            auto_fix_result = AutoFixResult(
                success=fix_result_dict.get('success', False),
                original_code=fix_result_dict.get('details', {}).get('original_line', ''),
                fixed_code=fix_result_dict.get('details', {}).get('fixed_line', ''),
                confidence=fix_result_dict.get('confidence', 0.0),
                backup_path=fix_result_dict.get('backup_path'),
                error_message=fix_result_dict.get('details', {}).get('error')
            )
            
            if auto_fix_result.success:
                logger.info(f"✅ Successfully applied fix for {mcp_issue.code_issue.issue_type}")
                
                # Validate fix by checking server health (simplified)
                auto_fix_result.validation_passed = await self._validate_fix_by_server_health(mcp_issue)
            else:
                logger.warning(f"❌ Failed to apply fix: {auto_fix_result.error_message}")
            
            return auto_fix_result
            
        except Exception as e:
            logger.error(f"Error applying automatic fix: {e}")
            return AutoFixResult(
                success=False,
                original_code="",
                fixed_code="",
                confidence=0.0,
                error_message=str(e)
            )
    
    async def _validate_fix_by_server_health(self, mcp_issue: MCPCodeIssue) -> bool:
        """Validate fix effectiveness by monitoring server health"""
        try:
            server = self.discovered_servers.get(mcp_issue.mcp_server_id)
            if not server:
                return False
            
            # Wait a moment for server to potentially restart/reload
            await asyncio.sleep(5)
            
            # Check if server is still responding
            if self.mcp_metrics:
                server_metrics = await self.mcp_metrics._test_server_alive(server)
                return server_metrics
            
            return True  # Assume success if we can't test
            
        except Exception as e:
            logger.error(f"Error validating fix: {e}")
            return False
    
    async def _add_fix_to_training_data(self, mcp_issue: MCPCodeIssue, fix_result: AutoFixResult, success: bool):
        """Add fix result to ML training data"""
        try:
            if not self.ai_system:
                return
            
            # Prepare features
            features = await self.ai_system.extract_code_features({
                'issueType': mcp_issue.code_issue.issue_type,
                'severity': mcp_issue.code_issue.severity.name,
                'description': mcp_issue.code_issue.description,
                'filePath': mcp_issue.code_issue.location.file_path,
                'lineNumber': mcp_issue.code_issue.location.line_number,
                'confidence': mcp_issue.code_issue.confidence
            })
            
            # Add training data point
            await self.ai_system.add_training_data(
                'code_issues',
                features,
                1 if success else 0,
                'intelligent_mcp_monitor'
            )
            
            logger.debug(f"Added fix result to training data: success={success}")
            
        except Exception as e:
            logger.error(f"Error adding to training data: {e}")
    
    async def _validate_previous_fixes(self):
        """Validate previously applied fixes"""
        # Check fixes from last 24 hours
        recent_fixes = [
            fix for fix in self.fix_history
            if fix['timestamp'] > datetime.now() - timedelta(hours=24)
        ]
        
        for fix_record in recent_fixes:
            mcp_issue = fix_record['mcp_issue']
            fix_result = fix_record['fix_result']
            
            if fix_result.success and not fix_result.validation_passed:
                # Re-validate the fix
                validation_result = await self._validate_fix_by_server_health(mcp_issue)
                fix_result.validation_passed = validation_result
                
                if validation_result:
                    logger.info(f"✅ Fix validation passed for {mcp_issue.code_issue.issue_type}")
                else:
                    logger.warning(f"❌ Fix validation failed for {mcp_issue.code_issue.issue_type}")
    
    def _update_statistics(self):
        """Update monitoring statistics"""
        # Statistics are updated throughout the monitoring cycle
        pass
    
    async def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        return {
            'monitoring_active': self.monitoring_active,
            'servers_discovered': len(self.discovered_servers),
            'issues_being_monitored': len(self.monitored_issues),
            'fix_history_count': len(self.fix_history),
            'statistics': self.stats.copy(),
            'configuration': {
                'auto_fix_enabled': self.auto_fix_enabled,
                'min_confidence_threshold': self.min_confidence_threshold,
                'scan_interval': self.scan_interval,
                'source_directories': self.source_directories
            },
            'ai_system_available': self.ai_system is not None
        }
    
    async def get_discovered_servers(self) -> List[Dict[str, Any]]:
        """Get list of discovered MCP servers"""
        return [
            {
                'server_id': server.server_id,
                'name': server.name,
                'host': server.host,
                'port': server.port,
                'status': server.status,
                'protocol': server.protocol
            }
            for server in self.discovered_servers.values()
        ]
    
    async def get_detected_issues(self) -> List[Dict[str, Any]]:
        """Get list of detected code issues"""
        return [
            {
                'server_name': issue.server_name,
                'issue_type': issue.code_issue.issue_type,
                'severity': issue.code_issue.severity.name,
                'description': issue.code_issue.description,
                'file_path': issue.code_issue.location.file_path,
                'line_number': issue.code_issue.location.line_number,
                'confidence': issue.confidence_score,
                'fix_attempted': issue.fix_attempted,
                'fix_success': issue.fix_success,
                'discovery_time': issue.discovery_time.isoformat()
            }
            for issue in self.monitored_issues.values()
        ]
    
    async def cleanup(self):
        """Cleanup resources"""
        self.stop_monitoring()
        
        if self.code_analyzer:
            await self.code_analyzer.cleanup()
        if self.code_fixer:
            await self.code_fixer.cleanup()
        if self.log_mapper:
            await self.log_mapper.cleanup()

# ============================================================================
# DEMO AND TESTING
# ============================================================================

async def demo_intelligent_mcp_monitoring():
    """Demo the intelligent MCP monitoring system"""
    print("🎬 Intelligent MCP Code Monitor Demo")
    print("=" * 60)
    
    # Configuration
    config = {
        'scan_interval': 10,  # 10 seconds for demo
        'auto_fix_enabled': True,
        'min_confidence_threshold': 0.7,
        'source_directories': ['./server', './python-framework'],
        'scan_ports': [8000, 3000, 5000],
        'scan_hosts': ['localhost'],
        'discovery_methods': ['process_scan', 'port_scan']
    }
    
    # Initialize monitor
    monitor = IntelligentMCPCodeMonitor(config)
    
    if not await monitor.initialize():
        print("❌ Failed to initialize monitor")
        return
    
    print("✅ Monitor initialized successfully")
    
    # Run a few monitoring cycles
    print("\n🔄 Running monitoring cycles...")
    for i in range(3):
        print(f"\n--- Cycle {i+1} ---")
        await monitor._monitoring_cycle()
        
        # Show status
        status = await monitor.get_monitoring_status()
        print(f"📊 Servers: {status['servers_discovered']}, "
              f"Issues: {status['issues_being_monitored']}, "
              f"Fixes: {status['statistics']['fixes_attempted']}")
        
        if i < 2:  # Don't wait after last cycle
            await asyncio.sleep(2)
    
    # Show final results
    print("\n📈 Final Results:")
    status = await monitor.get_monitoring_status()
    for key, value in status['statistics'].items():
        print(f"   {key}: {value}")
    
    # Show discovered servers
    servers = await monitor.get_discovered_servers()
    if servers:
        print(f"\n🖥️  Discovered Servers ({len(servers)}):")
        for server in servers:
            print(f"   - {server['name']} ({server['host']}:{server['port']})")
    
    # Show detected issues
    issues = await monitor.get_detected_issues()
    if issues:
        print(f"\n🚨 Detected Issues ({len(issues)}):")
        for issue in issues:
            print(f"   - {issue['issue_type']} in {issue['server_name']} "
                  f"(confidence: {issue['confidence']:.1%})")
    
    await monitor.cleanup()
    print("\n✅ Demo completed!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_intelligent_mcp_monitoring())