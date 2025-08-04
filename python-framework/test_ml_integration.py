#!/usr/bin/env python3
"""
Test script to verify ML integration with the Intelligent Monitoring Framework
Demonstrates real AI model training and prediction capabilities
"""

import asyncio
import sys
import json
from pathlib import Path
from real_ai_learning_system import initialize_real_ai_system, ML_AVAILABLE

async def test_ml_integration():
    """Test real ML system integration"""
    print("🧪 Testing ML Integration with IMF")
    print(f"📋 ML Libraries Available: {ML_AVAILABLE}")
    
    if not ML_AVAILABLE:
        print("❌ ML libraries not installed. Run: pip install -r requirements.txt")
        return False
    
    # Initialize AI system
    config = {
        'ai_model_dir': './ai_models',
        'learning_enabled': True
    }
    
    try:
        ai_system = await initialize_real_ai_system(config)
        if not ai_system:
            print("❌ Failed to initialize AI system")
            return False
        
        print("✅ AI System initialized successfully")
        
        # Add some training data for code issues
        print("\n📊 Adding training data for code issue classification...")
        for i in range(25):
            features = {
                'severity_score': (i % 4) + 1,
                'description_length': 50 + (i * 10),
                'file_path_depth': (i % 5) + 1,
                'line_number': i * 10 + 1,
                'confidence': 0.3 + (i * 0.02),
                'is_syntax_error': 1 if i % 3 == 0 else 0,
                'is_logic_error': 1 if i % 4 == 0 else 0,
                'is_security_issue': 1 if i % 7 == 0 else 0,
                'is_performance_issue': 1 if i % 5 == 0 else 0
            }
            target = 1 if i % 3 != 0 else 0  # 66% success rate
            
            await ai_system.add_training_data('code_issues', features, target, 'test_data')
        
        print(f"   Added 25 training samples for code issues")
        
        # Add training data for deployment success
        print("\n🚀 Adding training data for deployment success prediction...")
        for i in range(30):
            features = {
                'files_changed_count': (i % 10) + 1,
                'is_ai_initiated': 1 if i % 4 == 0 else 0,
                'deployment_hour': i % 24,
                'deployment_weekday': i % 7,
                'is_canary': 1 if i % 5 == 0 else 0,
                'is_blue_green': 1 if i % 6 == 0 else 0,
                'is_direct': 1 if i % 3 == 0 else 0,
                'historical_success_rate': 0.4 + (i * 0.02)
            }
            target = 1 if i % 4 != 0 else 0  # 75% success rate
            
            await ai_system.add_training_data('deployment_success', features, target, 'test_data')
        
        print(f"   Added 30 training samples for deployment success")
        
        # Train models
        print("\n🎯 Training ML models...")
        code_metrics = await ai_system.train_model('code_issues')
        deployment_metrics = await ai_system.train_model('deployment_success')
        
        if code_metrics:
            print(f"✅ Code Issues Model:")
            if code_metrics.accuracy is not None:
                print(f"   Accuracy: {code_metrics.accuracy:.3f}")
            if code_metrics.training_time_seconds is not None:
                print(f"   Training Time: {code_metrics.training_time_seconds:.2f}s")
            print(f"   Samples: {code_metrics.training_samples}")
            print(f"   Features: {code_metrics.feature_count}")
        
        if deployment_metrics:
            print(f"✅ Deployment Success Model:")
            if deployment_metrics.accuracy is not None:
                print(f"   Accuracy: {deployment_metrics.accuracy:.3f}")
            if deployment_metrics.training_time_seconds is not None:
                print(f"   Training Time: {deployment_metrics.training_time_seconds:.2f}s")
            print(f"   Samples: {deployment_metrics.training_samples}")
            print(f"   Features: {deployment_metrics.feature_count}")
        
        # Test predictions
        print("\n🔮 Testing predictions...")
        
        # Test code issue prediction
        test_code_issue = {
            'severity': 'HIGH',
            'description': 'Null pointer exception in authentication module',
            'filePath': 'src/auth/login.ts',
            'lineNumber': 42,
            'confidence': 85,
            'issueType': 'logic_error'
        }
        
        prediction = await ai_system.predict_code_fix_success(test_code_issue)
        print(f"📋 Code Fix Prediction:")
        print(f"   Success Probability: {prediction.prediction:.3f}")
        print(f"   Confidence: {prediction.confidence:.3f}")
        print(f"   Model Used: {prediction.model_used}")
        print(f"   Prediction Time: {prediction.prediction_time_ms:.1f}ms")
        
        # Test deployment prediction
        test_deployment = {
            'filesChanged': ['src/auth/login.ts', 'src/auth/session.ts'],
            'initiatedBy': 'ai_system',
            'strategy': 'canary_deployment'
        }
        
        deployment_pred = await ai_system.predict_deployment_success(test_deployment)
        print(f"🚀 Deployment Success Prediction:")
        print(f"   Success Probability: {deployment_pred.prediction:.3f}")
        print(f"   Confidence: {deployment_pred.confidence:.3f}")
        print(f"   Model Used: {deployment_pred.model_used}")
        print(f"   Prediction Time: {deployment_pred.prediction_time_ms:.1f}ms")
        
        # Get training status
        print("\n📊 Training Status:")
        status = await ai_system.get_training_status()
        print(f"   Available Models: {status['models_available']}")
        print(f"   Training Data Counts: {status['training_data_counts']}")
        
        print("\n✅ ML Integration Test Completed Successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during ML integration test: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_ml_integration())
    sys.exit(0 if success else 1)