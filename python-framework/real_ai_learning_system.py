#!/usr/bin/env python3
"""
Real AI Learning System with Machine Learning Integration
Provides actual ML models for code analysis, deployment prediction, and automated learning
"""

import asyncio
import json
import logging
import os
import pickle
import time
import warnings
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict, field
import yaml

# Suppress warnings for cleaner output
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', category=UserWarning)

# Machine Learning Imports
try:
    import numpy as np
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, mean_squared_error
    from sklearn.feature_extraction.text import TfidfVectorizer
    import joblib
    ML_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  ML libraries not available: {e}")
    print("📦 Install with: pip install -r requirements.txt")
    ML_AVAILABLE = False

# Optional: Deep Learning
try:
    import tensorflow as tf
    tf.get_logger().setLevel('ERROR')
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False

# Optional: NLP for Code Analysis
try:
    from transformers import pipeline, AutoTokenizer, AutoModel
    import torch
    NLP_AVAILABLE = True
except ImportError:
    NLP_AVAILABLE = False

logger = logging.getLogger(__name__)

# ============================================================================
# AI MODEL DATA STRUCTURES
# ============================================================================

@dataclass
class ModelTrainingMetrics:
    """Metrics collected during model training"""
    model_name: str
    training_start: datetime
    training_end: Optional[datetime] = None
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    mse: Optional[float] = None
    training_samples: int = 0
    validation_samples: int = 0
    feature_count: int = 0
    training_time_seconds: Optional[float] = None
    cross_validation_score: Optional[float] = None
    model_size_mb: Optional[float] = None
    learning_curve_data: List[Dict] = field(default_factory=list)

@dataclass
class PredictionResult:
    """Result from model prediction"""
    prediction: Union[float, str, List]
    confidence: float
    model_used: str
    prediction_time_ms: float
    feature_importance: Optional[Dict[str, float]] = None
    explanation: Optional[str] = None

@dataclass
class TrainingDataPoint:
    """Single training data point"""
    features: Dict[str, Any]
    target: Union[float, str]
    timestamp: datetime
    source: str
    metadata: Dict[str, Any] = field(default_factory=dict)

# ============================================================================
# REAL AI LEARNING SYSTEM
# ============================================================================

class RealAILearningSystem:
    """Real AI Learning System with actual ML models"""
    
    def __init__(self, config: Dict[str, Any]):
        if not ML_AVAILABLE:
            raise ImportError("ML libraries not available. Install with: pip install -r requirements.txt")
        
        self.config = config
        self.model_dir = Path(config.get('ai_model_dir', './ai_models'))
        self.model_dir.mkdir(exist_ok=True)
        
        # Model storage
        self.models: Dict[str, Any] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.encoders: Dict[str, LabelEncoder] = {}
        self.vectorizers: Dict[str, TfidfVectorizer] = {}
        
        # Training data
        self.training_data: Dict[str, List[TrainingDataPoint]] = {
            'code_issues': [],
            'deployment_success': [],
            'system_performance': [],
            'intervention_outcomes': []
        }
        
        # Training metrics
        self.training_metrics: List[ModelTrainingMetrics] = []
        self.is_training: Dict[str, bool] = {}
        
        # Initialize NLP components if available
        self.nlp_pipeline = None
        if NLP_AVAILABLE:
            try:
                self.nlp_pipeline = pipeline("text-classification", 
                                           model="microsoft/codebert-base",
                                           return_all_scores=True)
                logger.info("🤖 CodeBERT NLP pipeline initialized")
            except Exception as e:
                logger.warning(f"NLP pipeline initialization failed: {e}")
        
        # Load existing models and data
        asyncio.create_task(self._load_existing_models())
    
    async def _load_existing_models(self):
        """Load existing models and training data"""
        try:
            # Load models
            for model_file in self.model_dir.glob("*.joblib"):
                model_name = model_file.stem
                try:
                    self.models[model_name] = joblib.load(model_file)
                    logger.info(f"📁 Loaded model: {model_name}")
                except Exception as e:
                    logger.error(f"Failed to load model {model_name}: {e}")
            
            # Load scalers and encoders
            for scaler_file in self.model_dir.glob("*_scaler.joblib"):
                scaler_name = scaler_file.stem.replace('_scaler', '')
                self.scalers[scaler_name] = joblib.load(scaler_file)
            
            for encoder_file in self.model_dir.glob("*_encoder.joblib"):
                encoder_name = encoder_file.stem.replace('_encoder', '')
                self.encoders[encoder_name] = joblib.load(encoder_file)
            
            # Load training data
            training_data_file = self.model_dir / "training_data.json"
            if training_data_file.exists():
                with open(training_data_file, 'r') as f:
                    data = json.load(f)
                    for category, points in data.items():
                        self.training_data[category] = [
                            TrainingDataPoint(
                                features=point['features'],
                                target=point['target'],
                                timestamp=datetime.fromisoformat(point['timestamp']),
                                source=point['source'],
                                metadata=point.get('metadata', {})
                            ) for point in points
                        ]
            
            # Load training metrics
            metrics_file = self.model_dir / "training_metrics.json"
            if metrics_file.exists():
                with open(metrics_file, 'r') as f:
                    data = json.load(f)
                    for metric_data in data:
                        metric = ModelTrainingMetrics(**metric_data)
                        metric.training_start = datetime.fromisoformat(metric_data['training_start'])
                        if metric_data.get('training_end'):
                            metric.training_end = datetime.fromisoformat(metric_data['training_end'])
                        self.training_metrics.append(metric)
            
            logger.info(f"🧠 AI Learning System initialized with {len(self.models)} models")
            
        except Exception as e:
            logger.error(f"Error loading AI models: {e}")
    
    async def _save_models_and_data(self):
        """Save models and training data"""
        try:
            # Save models
            for model_name, model in self.models.items():
                model_file = self.model_dir / f"{model_name}.joblib"
                joblib.dump(model, model_file)
            
            # Save scalers and encoders
            for scaler_name, scaler in self.scalers.items():
                scaler_file = self.model_dir / f"{scaler_name}_scaler.joblib"
                joblib.dump(scaler, scaler_file)
            
            for encoder_name, encoder in self.encoders.items():
                encoder_file = self.model_dir / f"{encoder_name}_encoder.joblib"
                joblib.dump(encoder, encoder_file)
            
            # Save training data
            training_data_file = self.model_dir / "training_data.json"
            data = {}
            for category, points in self.training_data.items():
                data[category] = [
                    {
                        'features': point.features,
                        'target': point.target,
                        'timestamp': point.timestamp.isoformat(),
                        'source': point.source,
                        'metadata': point.metadata
                    } for point in points
                ]
            
            with open(training_data_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            # Save training metrics
            metrics_file = self.model_dir / "training_metrics.json"
            metrics_data = []
            for metric in self.training_metrics:
                metric_dict = asdict(metric)
                metric_dict['training_start'] = metric.training_start.isoformat()
                if metric.training_end:
                    metric_dict['training_end'] = metric.training_end.isoformat()
                metrics_data.append(metric_dict)
            
            with open(metrics_file, 'w') as f:
                json.dump(metrics_data, f, indent=2)
            
            logger.info("💾 Models and data saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    # ========================================================================
    # TRAINING DATA COLLECTION
    # ========================================================================
    
    async def add_training_data(self, category: str, features: Dict[str, Any], 
                              target: Union[float, str], source: str = "unknown"):
        """Add training data point"""
        if category not in self.training_data:
            self.training_data[category] = []
        
        data_point = TrainingDataPoint(
            features=features,
            target=target,
            timestamp=datetime.now(),
            source=source
        )
        
        self.training_data[category].append(data_point)
        
        # Auto-trigger retraining if enough new data
        if len(self.training_data[category]) % 50 == 0:  # Every 50 new samples
            logger.info(f"🔄 Auto-triggering retraining for {category} (new samples: {len(self.training_data[category])})")
            asyncio.create_task(self.train_model(category))
    
    async def extract_code_features(self, code_issue: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features from code issue for ML"""
        features = {}
        
        # Basic features
        features['severity_score'] = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4}.get(
            code_issue.get('severity', 'MEDIUM'), 2)
        features['description_length'] = len(code_issue.get('description', ''))
        features['file_path_depth'] = len(code_issue.get('filePath', '').split('/'))
        features['line_number'] = code_issue.get('lineNumber', 0)
        features['confidence'] = code_issue.get('confidence', 50) / 100.0
        
        # Issue type encoding
        issue_type = code_issue.get('issueType', 'unknown')
        features['is_syntax_error'] = 1 if 'syntax' in issue_type else 0
        features['is_logic_error'] = 1 if 'logic' in issue_type else 0
        features['is_security_issue'] = 1 if 'security' in issue_type else 0
        features['is_performance_issue'] = 1 if 'performance' in issue_type else 0
        
        # NLP features if available
        if self.nlp_pipeline and code_issue.get('description'):
            try:
                nlp_result = self.nlp_pipeline(code_issue['description'])
                features['nlp_confidence'] = max([score['score'] for score in nlp_result[0]])
                features['nlp_negative_sentiment'] = 1 if any(
                    'negative' in score['label'].lower() for score in nlp_result[0]
                ) else 0
            except Exception as e:
                logger.warning(f"NLP feature extraction failed: {e}")
        
        return features
    
    async def extract_deployment_features(self, deployment: Dict[str, Any]) -> Dict[str, Any]:
        """Extract features from deployment for ML"""
        features = {}
        
        # Basic deployment features
        features['files_changed_count'] = len(deployment.get('filesChanged', []))
        features['is_ai_initiated'] = 1 if deployment.get('initiatedBy') == 'ai_system' else 0
        features['deployment_hour'] = datetime.now().hour
        features['deployment_weekday'] = datetime.now().weekday()
        
        # Strategy encoding
        strategy = deployment.get('strategy', 'direct_deployment')
        features['is_canary'] = 1 if 'canary' in strategy else 0
        features['is_blue_green'] = 1 if 'blue_green' in strategy else 0
        features['is_direct'] = 1 if 'direct' in strategy else 0
        
        # Historical success rate for similar deployments
        features['historical_success_rate'] = await self._get_historical_success_rate(deployment)
        
        return features
    
    async def _get_historical_success_rate(self, deployment: Dict[str, Any]) -> float:
        """Calculate historical success rate for similar deployments"""
        # Simple implementation - could be more sophisticated
        similar_deployments = [
            point for point in self.training_data.get('deployment_success', [])
            if point.features.get('files_changed_count', 0) <= deployment.get('filesChanged', 0) + 2
        ]
        
        if not similar_deployments:
            return 0.5  # Default
        
        success_count = sum(1 for point in similar_deployments if point.target == 1)
        return success_count / len(similar_deployments)
    
    # ========================================================================
    # MODEL TRAINING
    # ========================================================================
    
    async def train_model(self, model_type: str) -> ModelTrainingMetrics:
        """Train a specific model type"""
        if self.is_training.get(model_type, False):
            logger.warning(f"Model {model_type} is already training")
            return None
        
        self.is_training[model_type] = True
        
        try:
            logger.info(f"🎯 Starting training for {model_type} model")
            start_time = datetime.now()
            
            # Initialize metrics
            metrics = ModelTrainingMetrics(
                model_name=model_type,
                training_start=start_time
            )
            
            # Get training data
            training_data = self.training_data.get(model_type, [])
            if len(training_data) < 10:
                logger.warning(f"Insufficient training data for {model_type}: {len(training_data)} samples")
                return metrics
            
            # Prepare data
            X, y = await self._prepare_training_data(training_data)
            metrics.training_samples = len(X)
            metrics.feature_count = len(X[0]) if len(X) > 0 else 0
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y if isinstance(y[0], str) else None
            )
            metrics.validation_samples = len(X_test)
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            self.scalers[model_type] = scaler
            
            # Choose and train model
            if isinstance(y[0], str):  # Classification
                model = RandomForestClassifier(n_estimators=100, random_state=42)
                model.fit(X_train_scaled, y_train)
                
                # Evaluate
                y_pred = model.predict(X_test_scaled)
                metrics.accuracy = accuracy_score(y_test, y_pred)
                precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted')
                metrics.precision = precision
                metrics.recall = recall
                metrics.f1_score = f1
                
                # Cross-validation
                cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
                metrics.cross_validation_score = cv_scores.mean()
                
            else:  # Regression
                model = GradientBoostingRegressor(n_estimators=100, random_state=42)
                model.fit(X_train_scaled, y_train)
                
                # Evaluate
                y_pred = model.predict(X_test_scaled)
                metrics.mse = mean_squared_error(y_test, y_pred)
                
                # Cross-validation
                cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='neg_mean_squared_error')
                metrics.cross_validation_score = -cv_scores.mean()
            
            # Save model
            self.models[model_type] = model
            
            # Calculate training time and model size
            end_time = datetime.now()
            metrics.training_end = end_time
            metrics.training_time_seconds = (end_time - start_time).total_seconds()
            
            # Estimate model size
            model_file = self.model_dir / f"{model_type}_temp.joblib"
            joblib.dump(model, model_file)
            metrics.model_size_mb = model_file.stat().st_size / (1024 * 1024)
            model_file.unlink()  # Clean up temp file
            
            # Save metrics
            self.training_metrics.append(metrics)
            
            # Save everything
            await self._save_models_and_data()
            
            logger.info(f"✅ Model {model_type} training completed in {metrics.training_time_seconds:.2f}s")
            if metrics.accuracy is not None:
                logger.info(f"   Accuracy: {metrics.accuracy:.3f}, Samples: {metrics.training_samples}")
            else:
                logger.info(f"   Samples: {metrics.training_samples}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error training model {model_type}: {e}")
            return metrics
        finally:
            self.is_training[model_type] = False
    
    async def _prepare_training_data(self, training_data: List[TrainingDataPoint]) -> Tuple[List, List]:
        """Prepare training data for ML"""
        X = []
        y = []
        
        # Get all feature keys
        all_features = set()
        for point in training_data:
            all_features.update(point.features.keys())
        
        feature_keys = sorted(list(all_features))
        
        # Convert to arrays
        for point in training_data:
            feature_vector = [point.features.get(key, 0) for key in feature_keys]
            X.append(feature_vector)
            y.append(point.target)
        
        return X, y
    
    # ========================================================================
    # PREDICTIONS
    # ========================================================================
    
    async def predict_code_fix_success(self, code_issue: Dict[str, Any]) -> PredictionResult:
        """Predict probability of successful code fix"""
        start_time = time.time()
        
        model_name = 'code_issues'
        if model_name not in self.models:
            # Return default prediction
            return PredictionResult(
                prediction=0.5,
                confidence=0.3,
                model_used='default',
                prediction_time_ms=(time.time() - start_time) * 1000,
                explanation="No trained model available, using default prediction"
            )
        
        try:
            # Extract features
            features = await self.extract_code_features(code_issue)
            
            # Prepare feature vector
            model = self.models[model_name]
            scaler = self.scalers.get(model_name)
            
            # Get feature keys from training data
            training_data = self.training_data.get(model_name, [])
            if not training_data:
                raise ValueError("No training data available")
            
            all_features = set()
            for point in training_data[:10]:  # Sample for feature keys
                all_features.update(point.features.keys())
            
            feature_keys = sorted(list(all_features))
            feature_vector = [features.get(key, 0) for key in feature_keys]
            
            # Scale and predict
            if scaler:
                feature_vector = scaler.transform([feature_vector])[0]
            
            prediction = model.predict([feature_vector])[0]
            
            # Get confidence (for RandomForest)
            confidence = 0.5
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba([feature_vector])[0]
                confidence = max(proba)
            
            # Get feature importance
            feature_importance = None
            if hasattr(model, 'feature_importances_'):
                importance_scores = model.feature_importances_
                feature_importance = {
                    feature_keys[i]: float(importance_scores[i])
                    for i in range(len(feature_keys))
                }
            
            return PredictionResult(
                prediction=float(prediction) if isinstance(prediction, (int, float)) else prediction,
                confidence=confidence,
                model_used=model_name,
                prediction_time_ms=(time.time() - start_time) * 1000,
                feature_importance=feature_importance
            )
            
        except Exception as e:
            logger.error(f"Prediction error for {model_name}: {e}")
            return PredictionResult(
                prediction=0.5,
                confidence=0.1,
                model_used='error',
                prediction_time_ms=(time.time() - start_time) * 1000,
                explanation=f"Prediction failed: {str(e)}"
            )
    
    async def predict_deployment_success(self, deployment: Dict[str, Any]) -> PredictionResult:
        """Predict probability of successful deployment"""
        start_time = time.time()
        
        model_name = 'deployment_success'
        if model_name not in self.models:
            return PredictionResult(
                prediction=0.7,  # Optimistic default
                confidence=0.3,
                model_used='default',
                prediction_time_ms=(time.time() - start_time) * 1000,
                explanation="No trained model available, using optimistic default"
            )
        
        try:
            features = await self.extract_deployment_features(deployment)
            model = self.models[model_name]
            scaler = self.scalers.get(model_name)
            
            # Prepare and predict
            training_data = self.training_data.get(model_name, [])
            if not training_data:
                raise ValueError("No training data available")
            
            all_features = set()
            for point in training_data[:10]:
                all_features.update(point.features.keys())
            
            feature_keys = sorted(list(all_features))
            feature_vector = [features.get(key, 0) for key in feature_keys]
            
            if scaler:
                feature_vector = scaler.transform([feature_vector])[0]
            
            prediction = model.predict([feature_vector])[0]
            
            confidence = 0.5
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba([feature_vector])[0]
                confidence = max(proba)
            
            return PredictionResult(
                prediction=float(prediction),
                confidence=confidence,
                model_used=model_name,
                prediction_time_ms=(time.time() - start_time) * 1000
            )
            
        except Exception as e:
            logger.error(f"Deployment prediction error: {e}")
            return PredictionResult(
                prediction=0.5,
                confidence=0.1,
                model_used='error',
                prediction_time_ms=(time.time() - start_time) * 1000,
                explanation=f"Prediction failed: {str(e)}"
            )
    
    # ========================================================================
    # MONITORING AND METRICS
    # ========================================================================
    
    async def get_training_status(self) -> Dict[str, Any]:
        """Get current training status for all models"""
        status = {
            'models_available': list(self.models.keys()),
            'models_training': [k for k, v in self.is_training.items() if v],
            'training_data_counts': {
                k: len(v) for k, v in self.training_data.items()
            },
            'recent_metrics': []
        }
        
        # Add recent training metrics
        recent_metrics = sorted(self.training_metrics, key=lambda x: x.training_start, reverse=True)[:5]
        for metric in recent_metrics:
            status['recent_metrics'].append({
                'model_name': metric.model_name,
                'training_time': metric.training_start.isoformat(),
                'accuracy': metric.accuracy,
                'training_samples': metric.training_samples,
                'training_duration_seconds': metric.training_time_seconds
            })
        
        return status
    
    async def get_model_performance(self, model_name: str) -> Optional[Dict[str, Any]]:
        """Get performance metrics for a specific model"""
        if model_name not in self.models:
            return None
        
        # Find latest training metrics
        model_metrics = [m for m in self.training_metrics if m.model_name == model_name]
        if not model_metrics:
            return None
        
        latest_metric = sorted(model_metrics, key=lambda x: x.training_start, reverse=True)[0]
        
        return {
            'model_name': model_name,
            'accuracy': latest_metric.accuracy,
            'precision': latest_metric.precision,
            'recall': latest_metric.recall,
            'f1_score': latest_metric.f1_score,
            'mse': latest_metric.mse,
            'training_samples': latest_metric.training_samples,
            'validation_samples': latest_metric.validation_samples,
            'feature_count': latest_metric.feature_count,
            'training_time_seconds': latest_metric.training_time_seconds,
            'cross_validation_score': latest_metric.cross_validation_score,
            'model_size_mb': latest_metric.model_size_mb,
            'last_trained': latest_metric.training_start.isoformat()
        }
    
    async def trigger_training_for_all_models(self):
        """Trigger training for all model types that have sufficient data"""
        for model_type in self.training_data.keys():
            if len(self.training_data[model_type]) >= 10:
                logger.info(f"🚀 Triggering training for {model_type}")
                asyncio.create_task(self.train_model(model_type))
            else:
                logger.info(f"⏳ Insufficient data for {model_type}: {len(self.training_data[model_type])} samples")

# ============================================================================
# GLOBAL INSTANCE
# ============================================================================

# Global instance (will be initialized by main framework)
real_ai_system: Optional[RealAILearningSystem] = None

async def initialize_real_ai_system(config: Dict[str, Any]) -> RealAILearningSystem:
    """Initialize the global AI system"""
    global real_ai_system
    if ML_AVAILABLE:
        real_ai_system = RealAILearningSystem(config)
        return real_ai_system
    else:
        logger.error("Cannot initialize AI system: ML libraries not available")
        return None

async def get_ai_system() -> Optional[RealAILearningSystem]:
    """Get the global AI system instance"""
    return real_ai_system