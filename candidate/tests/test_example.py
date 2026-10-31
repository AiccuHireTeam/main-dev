from examples.offline import offline_client
from examples.run_flow import run_flow


def test_offline_sample_completes_and_persists_vectors():
    messages = []
    with offline_client() as (client, tick, count):
        result = run_flow(client, timeout=10, tick=tick, emit=messages.append)
        assert result["status"] == "completed"
        assert result["questions"] == 4
        assert result["processed_applications"] == 1
        assert count() > 0
        assert any("Thank you" in message for message in messages)
