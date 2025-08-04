#!/usr/bin/env python3
"""
Test Suite für AI Learning Engine
Tests the Python-based AI learning and intervention functionality
"""

import pytest
import asyncio
import tempfile
import json
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any

# Import the AI learning system
from ai_code_learning_system import (
    AILearningEngine, AiIntervention, AiLearningModel, DeploymentRecord
)


class TestAILearningEngine:
    """Test suite for the AI Learning Engine"""
    
    @pytest.fixture
    def temp_model_dir(self):
        """Create a temporary directory for AI models"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def ai_config(self, temp_model_dir):
        """Create test configuration for AI learning"""
        return {
            'ai_learning': {
                'model_dir': temp_model_dir,
                'min_confidence': 0.75,
                'max_risk_score': 0.3,
                'min_success_probability': 0.8,
                'learning_rate': 0.1,
                'retrain_frequency': 5,  # Lower for testing
                'max_deployments_per_hour': 3,
                'require_approval': False
            }
        }
    
    @pytest.fixture
    def ai_engine(self, ai_config):
        """Create a fresh AI Learning Engine for each test"""
        return AILearningEngine(ai_config)
    
    def create_test_intervention(self, 
                               problem_type: str = "TEST_PROBLEM",
                               solution: str = "test_solution",
                               confidence: float = 0.8,
                               risk_score: float = 0.2,
                               outcome: str = "success") -> AiIntervention:
        """Helper to create test interventions"""
        return AiIntervention(
            problem_type=problem_type,
            issue_description=f"Test issue for {problem_type}",
            solution_applied=solution,
            confidence=confidence,
            risk_score=risk_score,
            outcome=outcome,
            timestamp=datetime.now()
        )
    
    @pytest.mark.asyncio
    async def test_engine_initialization(self, ai_engine):
        """Test AI engine initialization with configuration"""
        assert ai_engine.min_confidence == 0.75
        assert ai_engine.max_risk_score == 0.3
        assert ai_engine.min_success_probability == 0.8
        assert ai_engine.learning_rate == 0.1
        assert ai_engine.retrain_frequency == 5
        
        assert len(ai_engine.interventions) == 0
        assert len(ai_engine.models) == 0
        assert ai_engine.model_dir.exists()
    
    @pytest.mark.asyncio
    async def test_record_intervention(self, ai_engine):
        """Test recording a new AI intervention"""
        intervention = self.create_test_intervention(
            problem_type="HIGH_CPU_USAGE",
            solution="restart_service",
            confidence=0.9,
            risk_score=0.1,
            outcome="success"
        )
        
        initial_count = len(ai_engine.interventions)
        await ai_engine.record_intervention(intervention)
        
        assert len(ai_engine.interventions) == initial_count + 1
        recorded = ai_engine.interventions[-1]
        
        assert recorded.problem_type == "HIGH_CPU_USAGE"
        assert recorded.solution_applied == "restart_service"
        assert recorded.confidence == 0.9
        assert recorded.outcome == "success"
    
    @pytest.mark.asyncio
    async def test_pattern_learning_from_interventions(self, ai_engine):
        """Test that the engine learns patterns from recorded interventions"""
        # Record multiple successful interventions for the same problem type
        for i in range(3):
            intervention = self.create_test_intervention(
                problem_type="MEMORY_LEAK",
                solution="garbage_collect",
                confidence=0.8 + i * 0.05,
                risk_score=0.2 - i * 0.05,
                outcome="success"
            )
            await ai_engine.record_intervention(intervention)
        
        # Record one failure
        failure_intervention = self.create_test_intervention(
            problem_type="MEMORY_LEAK",
            solution="garbage_collect",
            confidence=0.7,
            risk_score=0.4,
            outcome="failure"
        )
        await ai_engine.record_intervention(failure_intervention)
        
        # Check learned patterns
        assert "MEMORY_LEAK" in ai_engine.pattern_success_rates
        success_rate = ai_engine.pattern_success_rates["MEMORY_LEAK"]
        assert success_rate == 0.75  # 3 successes out of 4 interventions
    
    @pytest.mark.asyncio
    async def test_success_prediction_with_history(self, ai_engine):
        """Test intervention success prediction with historical data"""
        # Create a pattern with known success rate (80%)
        problem_type = "DATABASE_SLOW"
        
        # Add historical data: 4 successes, 1 failure
        for outcome in ["success", "success", "success", "success", "failure"]:
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                solution="optimize_query",
                confidence=0.8,
                risk_score=0.2,
                outcome=outcome
            )
            await ai_engine.record_intervention(intervention)
        
        # Test prediction
        prediction = await ai_engine.predict_intervention_success(problem_type, 0.8, 0.2)
        
        # Should be close to the historical success rate (0.8) with some adjustment
        assert 0.7 <= prediction <= 0.9
        assert prediction > 0.5  # Should be positive given good history
    
    @pytest.mark.asyncio
    async def test_success_prediction_without_history(self, ai_engine):
        """Test fallback prediction for unknown problem types"""
        prediction = await ai_engine.predict_intervention_success(
            "UNKNOWN_PROBLEM", 0.8, 0.2
        )
        
        # Should fall back to confidence - risk_score
        expected = max(0.0, 0.8 - 0.2)
        assert prediction == expected
    
    @pytest.mark.asyncio
    async def test_confidence_and_risk_adjustment(self, ai_engine):
        """Test that predictions adjust based on confidence and risk scores"""
        problem_type = "ADJUSTMENT_TEST"
        
        # Create baseline pattern
        for _ in range(3):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                confidence=0.8,
                risk_score=0.2,
                outcome="success"
            )
            await ai_engine.record_intervention(intervention)
        
        # Test different confidence/risk combinations
        high_conf_low_risk = await ai_engine.predict_intervention_success(
            problem_type, 0.9, 0.1
        )
        low_conf_high_risk = await ai_engine.predict_intervention_success(
            problem_type, 0.7, 0.3
        )
        
        # Higher confidence and lower risk should yield better prediction
        assert high_conf_low_risk > low_conf_high_risk
    
    @pytest.mark.asyncio
    async def test_auto_apply_decision_thresholds(self, ai_engine):
        """Test auto-apply decision logic with various thresholds"""
        problem_type = "AUTO_APPLY_TEST"
        
        # Create successful pattern
        for _ in range(3):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                confidence=0.9,
                risk_score=0.1,
                outcome="success"
            )
            await ai_engine.record_intervention(intervention)
        
        # Test cases that should be approved
        should_apply_high_conf = await ai_engine.should_auto_apply_fix(
            problem_type, 0.9, 0.1  # High confidence, low risk
        )
        assert should_apply_high_conf is True
        
        # Test cases that should be rejected
        should_apply_low_conf = await ai_engine.should_auto_apply_fix(
            problem_type, 0.6, 0.1  # Low confidence (below 0.75 threshold)
        )
        assert should_apply_low_conf is False
        
        should_apply_high_risk = await ai_engine.should_auto_apply_fix(
            problem_type, 0.9, 0.5  # High risk (above 0.3 threshold)
        )
        assert should_apply_high_risk is False
    
    @pytest.mark.asyncio
    async def test_deployment_rate_limiting(self, ai_engine):
        """Test that deployment rate limiting works correctly"""
        problem_type = "RATE_LIMIT_TEST"
        
        # Create successful pattern first
        for _ in range(3):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                confidence=0.9,
                risk_score=0.1,
                outcome="success"
            )
            await ai_engine.record_intervention(intervention)
        
        # Add recent deployments to hit the limit (max 3 per hour)
        current_time = datetime.now()
        for i in range(3):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                confidence=0.9,
                risk_score=0.1,
                outcome="success"
            )
            intervention.deployment_id = f"deploy_{i}"
            intervention.timestamp = current_time  # Recent deployment
            await ai_engine.record_intervention(intervention)
        
        # Should reject due to rate limit
        should_apply = await ai_engine.should_auto_apply_fix(problem_type, 0.9, 0.1)
        assert should_apply is False
    
    @pytest.mark.asyncio
    async def test_model_retraining(self, ai_engine):
        """Test automatic model retraining after sufficient interventions"""
        problem_type = "RETRAIN_TEST"
        initial_model_count = len(ai_engine.models)
        
        # Add exactly retrain_frequency (5) interventions to trigger retraining
        for i in range(5):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                solution=f"solution_{i % 2}",  # Vary solutions
                confidence=0.8 + i * 0.02,
                risk_score=0.2 - i * 0.02,
                outcome="success" if i < 4 else "failure"  # 4 success, 1 failure
            )
            await ai_engine.record_intervention(intervention)
        
        # Should have triggered retraining
        final_model_count = len(ai_engine.models)
        assert final_model_count > initial_model_count
        
        # Check that a model was created for the problem type
        retrain_models = [m for m in ai_engine.models.values() 
                         if m.problem_type == problem_type]
        assert len(retrain_models) > 0
        
        # Verify model properties
        model = retrain_models[0]
        assert model.training_data_size == 5
        assert model.accuracy == 0.8  # 4/5 success rate
        assert model.is_active is True
    
    @pytest.mark.asyncio
    async def test_model_training_insufficient_data(self, ai_engine):
        """Test that models are not created with insufficient training data"""
        problem_type = "INSUFFICIENT_DATA"
        initial_model_count = len(ai_engine.models)
        
        # Add only a few interventions (below minimum threshold of 10)
        for i in range(3):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                outcome="success"
            )
            await ai_engine.record_intervention(intervention)
        
        # Force retrain attempt
        await ai_engine._retrain_models()
        
        # Should not create new models due to insufficient data
        final_model_count = len(ai_engine.models)
        assert final_model_count == initial_model_count
    
    @pytest.mark.asyncio
    async def test_learning_statistics(self, ai_engine):
        """Test learning statistics generation"""
        # Add diverse intervention data
        problem_types = ["STATS_TEST_1", "STATS_TEST_2", "STATS_TEST_3"]
        
        for i, problem_type in enumerate(problem_types):
            for j in range(2 + i):  # Different counts per problem type
                intervention = self.create_test_intervention(
                    problem_type=problem_type,
                    confidence=0.7 + i * 0.1,
                    risk_score=0.1 + i * 0.05,
                    outcome="success" if j % 2 == 0 else "failure"
                )
                await ai_engine.record_intervention(intervention)
        
        stats = ai_engine.get_learning_stats()
        
        assert stats['total_interventions'] == 9  # 2+3+4 interventions
        assert stats['problem_types_learned'] == 3
        assert len(stats['success_rates']) == 3
        assert 'STATS_TEST_1' in stats['success_rates']
        assert 'STATS_TEST_2' in stats['success_rates']
        assert 'STATS_TEST_3' in stats['success_rates']
        assert 0 <= stats['average_confidence'] <= 1
        assert stats['models_trained'] >= 0
    
    @pytest.mark.asyncio
    async def test_partial_outcomes_handling(self, ai_engine):
        """Test handling of partial outcomes in learning"""
        problem_type = "PARTIAL_TEST"
        
        # Add interventions with different outcomes
        outcomes = ["success", "failure", "partial", "partial", "success"]
        for outcome in outcomes:
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                outcome=outcome
            )
            await ai_engine.record_intervention(intervention)
        
        # Check success rate calculation (success=1, partial=0.5, failure=0)
        # Expected: (1 + 0 + 0.5 + 0.5 + 1) / 5 = 0.6
        success_rate = ai_engine.pattern_success_rates[problem_type]
        assert abs(success_rate - 0.6) < 0.01
    
    @pytest.mark.asyncio
    async def test_data_persistence(self, ai_engine, temp_model_dir):
        """Test saving and loading of learning data"""
        # Add some intervention data
        for i in range(3):
            intervention = self.create_test_intervention(
                problem_type="PERSISTENCE_TEST",
                solution=f"solution_{i}",
                confidence=0.8,
                outcome="success"
            )
            await ai_engine.record_intervention(intervention)
        
        # Force save
        await ai_engine._save_data()
        
        # Check that files were created
        interventions_file = Path(temp_model_dir) / "interventions.json"
        models_file = Path(temp_model_dir) / "models.json"
        
        assert interventions_file.exists()
        assert models_file.exists()
        
        # Check intervention data was saved correctly
        with open(interventions_file, 'r') as f:
            saved_data = json.load(f)
        
        assert len(saved_data) == 3
        assert saved_data[0]['problem_type'] == "PERSISTENCE_TEST"
        assert saved_data[0]['outcome'] == "success"
    
    @pytest.mark.asyncio
    async def test_pattern_feature_extraction(self, ai_engine):
        """Test extraction of pattern features from interventions"""
        problem_type = "FEATURE_TEST"
        
        # Add interventions with specific patterns
        solutions = ["solution_A", "solution_A", "solution_B", "solution_A"]
        confidences = [0.8, 0.85, 0.9, 0.75]
        risk_scores = [0.2, 0.15, 0.1, 0.25]
        
        interventions = []
        for i, (sol, conf, risk) in enumerate(zip(solutions, confidences, risk_scores)):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                solution=sol,
                confidence=conf,
                risk_score=risk,
                outcome="success"
            )
            # Set specific timestamp for timing pattern
            intervention.timestamp = datetime.now().replace(hour=9 + i)
            interventions.append(intervention)
            await ai_engine.record_intervention(intervention)
        
        # Extract features
        features = ai_engine._extract_pattern_features(interventions)
        
        # Check common solutions
        assert "solution_A" in features['common_solutions']
        assert "solution_B" in features['common_solutions']
        assert features['common_solutions']['solution_A'] == 0.75  # 3/4
        assert features['common_solutions']['solution_B'] == 0.25  # 1/4
        
        # Check other patterns
        assert len(features['confidence_patterns']) == 4
        assert len(features['risk_patterns']) == 4
        assert len(features['timing_patterns']) == 4
        assert features['timing_patterns'] == [9, 10, 11, 12]  # Hours
    
    @pytest.mark.asyncio
    async def test_error_handling(self, ai_engine):
        """Test error handling in various scenarios"""
        # Test prediction with invalid inputs
        prediction = await ai_engine.predict_intervention_success(
            "ERROR_TEST", 1.5, -0.1  # Invalid confidence and risk values
        )
        assert 0.0 <= prediction <= 1.0  # Should still return valid range
        
        # Test auto-apply decision with edge cases
        should_apply = await ai_engine.should_auto_apply_fix(
            "ERROR_TEST", float('inf'), float('nan')
        )
        assert isinstance(should_apply, bool)  # Should not crash
        
        # Test with empty problem type
        prediction_empty = await ai_engine.predict_intervention_success("", 0.8, 0.2)
        assert 0.0 <= prediction_empty <= 1.0
    
    @pytest.mark.asyncio
    async def test_learning_improvement_over_time(self, ai_engine):
        """Test that learning improves prediction accuracy over time"""
        problem_type = "IMPROVEMENT_TEST"
        
        # Initial prediction with no history
        initial_prediction = await ai_engine.predict_intervention_success(
            problem_type, 0.8, 0.2
        )
        
        # Add successful interventions
        for _ in range(5):
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                confidence=0.8,
                risk_score=0.2,
                outcome="success"
            )
            await ai_engine.record_intervention(intervention)
        
        # Prediction should improve (become more optimistic)
        improved_prediction = await ai_engine.predict_intervention_success(
            problem_type, 0.8, 0.2
        )
        
        assert improved_prediction > initial_prediction
        
        # Add failures to see if prediction adapts
        for _ in range(7):  # More failures than successes
            intervention = self.create_test_intervention(
                problem_type=problem_type,
                confidence=0.8,
                risk_score=0.2,
                outcome="failure"
            )
            await ai_engine.record_intervention(intervention)
        
        # Prediction should decrease (become more pessimistic)
        adapted_prediction = await ai_engine.predict_intervention_success(
            problem_type, 0.8, 0.2
        )
        
        assert adapted_prediction < improved_prediction
    
    @pytest.mark.asyncio
    async def test_concurrent_interventions(self, ai_engine):
        """Test handling of concurrent intervention recording"""
        problem_type = "CONCURRENT_TEST"
        
        # Create multiple interventions to record concurrently
        interventions = [
            self.create_test_intervention(
                problem_type=problem_type,
                solution=f"solution_{i}",
                confidence=0.7 + i * 0.05,
                outcome="success" if i % 2 == 0 else "failure"
            )
            for i in range(10)
        ]
        
        # Record interventions concurrently
        tasks = [ai_engine.record_intervention(intervention) for intervention in interventions]
        await asyncio.gather(*tasks)
        
        # Verify all interventions were recorded
        recorded_interventions = [i for i in ai_engine.interventions 
                                if i.problem_type == problem_type]
        assert len(recorded_interventions) == 10
        
        # Verify learning patterns were updated correctly
        assert problem_type in ai_engine.pattern_success_rates
        success_rate = ai_engine.pattern_success_rates[problem_type]
        assert 0.0 <= success_rate <= 1.0


class TestAILearningIntegration:
    """Integration tests for AI Learning with other system components"""
    
    @pytest.fixture
    def integration_config(self):
        """Configuration for integration testing"""
        return {
            'ai_learning': {
                'model_dir': './test_integration_models',
                'min_confidence': 0.7,
                'max_risk_score': 0.4,
                'min_success_probability': 0.6,
                'retrain_frequency': 3,
                'require_approval': False
            }
        }
    
    @pytest.mark.asyncio
    async def test_end_to_end_learning_workflow(self, integration_config):
        """Test complete learning workflow from problem to decision"""
        ai_engine = AILearningEngine(integration_config)
        
        # Step 1: System detects a problem
        problem_type = "E2E_HIGH_MEMORY_USAGE"
        
        # Step 2: AI suggests solution based on initial heuristics
        initial_should_apply = await ai_engine.should_auto_apply_fix(
            problem_type, 0.8, 0.3
        )
        # Should approve initially (no negative history)
        assert initial_should_apply is True
        
        # Step 3: Record intervention outcomes over time
        # Simulate learning cycle with mixed outcomes
        learning_scenarios = [
            ("restart_process", 0.9, 0.1, "success"),
            ("restart_process", 0.85, 0.15, "success"),
            ("restart_process", 0.8, 0.2, "failure"),  # One failure
            ("kill_process", 0.7, 0.3, "failure"),
            ("restart_process", 0.9, 0.1, "success"),
        ]
        
        for solution, confidence, risk, outcome in learning_scenarios:
            intervention = AiIntervention(
                problem_type=problem_type,
                issue_description=f"Memory usage at 95%",
                solution_applied=solution,
                confidence=confidence,
                risk_score=risk,
                outcome=outcome,
                timestamp=datetime.now()
            )
            await ai_engine.record_intervention(intervention)
        
        # Step 4: Verify learning occurred
        stats = ai_engine.get_learning_stats()
        assert stats['total_interventions'] == 5
        assert problem_type in stats['success_rates']
        assert stats['success_rates'][problem_type] == 0.6  # 3 success out of 5
        
        # Step 5: Test improved decision making
        # Should still approve given overall positive history
        learned_decision = await ai_engine.should_auto_apply_fix(
            problem_type, 0.85, 0.2
        )
        assert isinstance(learned_decision, bool)
        
        # Cleanup
        if ai_engine.model_dir.exists():
            shutil.rmtree(ai_engine.model_dir)
    
    @pytest.mark.asyncio
    async def test_multiple_problem_types_learning(self, integration_config):
        """Test learning across multiple different problem types"""
        ai_engine = AILearningEngine(integration_config)
        
        problem_types = [
            ("CPU_SPIKE", "restart_service", 0.9),
            ("DISK_FULL", "cleanup_logs", 0.7),
            ("NETWORK_TIMEOUT", "restart_network", 0.8),
            ("DATABASE_LOCK", "kill_queries", 0.6)
        ]
        
        # Train each problem type with different success patterns
        for problem_type, solution, base_success_rate in problem_types:
            num_successes = int(10 * base_success_rate)
            num_failures = 10 - num_successes
            
            # Add successful interventions
            for i in range(num_successes):
                intervention = AiIntervention(
                    problem_type=problem_type,
                    issue_description=f"Issue with {problem_type}",
                    solution_applied=solution,
                    confidence=0.8 + i * 0.01,
                    risk_score=0.2,
                    outcome="success",
                    timestamp=datetime.now()
                )
                await ai_engine.record_intervention(intervention)
            
            # Add failed interventions
            for i in range(num_failures):
                intervention = AiIntervention(
                    problem_type=problem_type,
                    issue_description=f"Issue with {problem_type}",
                    solution_applied=solution,
                    confidence=0.7 + i * 0.01,
                    risk_score=0.3,
                    outcome="failure",
                    timestamp=datetime.now()
                )
                await ai_engine.record_intervention(intervention)
        
        # Verify learning for each problem type
        stats = ai_engine.get_learning_stats()
        assert stats['total_interventions'] == 40  # 10 * 4 problem types
        assert stats['problem_types_learned'] == 4
        
        # Test predictions for each learned problem type
        for problem_type, solution, expected_rate in problem_types:
            prediction = await ai_engine.predict_intervention_success(
                problem_type, 0.8, 0.2
            )
            # Prediction should be influenced by historical success rate
            assert 0.0 <= prediction <= 1.0
            
            # For high success rate patterns, prediction should be optimistic
            if expected_rate >= 0.8:
                assert prediction > 0.7
            # For low success rate patterns, prediction should be pessimistic
            elif expected_rate <= 0.6:
                assert prediction < 0.7
        
        # Cleanup
        if ai_engine.model_dir.exists():
            shutil.rmtree(ai_engine.model_dir)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])