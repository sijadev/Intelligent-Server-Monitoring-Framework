import pytest
from unittest.mock import patch

@pytest.mark.asyncio
async def test_ai_code_learning_basic_train_cycle():
    try:
        from ai_code_learning_system import AICodeLearningSystem
    except Exception:
        pytest.skip("ai_code_learning_system heavy deps missing")

    system = AICodeLearningSystem(config={"min_training_samples":1,"retrain_interval":1})
    system.record_training_example({"features":[1,2,3],"label":1})
    with patch.object(system,'_train_internal_model',return_value={"status":"ok"}) as mock_train:
        result = await system.training_tick()
    assert result.get("status") == "ok"
    assert mock_train.called
