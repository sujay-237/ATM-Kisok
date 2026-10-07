import asyncio
import sys
import httpx

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.gemini_rotator import GeminiKeyRotator, KeySlot

async def test_rotator_logic():
    print("==================================================")
    print("  UNIT TEST: GEMINI ROTATOR ROUND-ROBIN & FAILOVER")
    print("==================================================")

    rotator = GeminiKeyRotator()
    rotator.slots = [
        KeySlot("KEY_1", "LIVE_KEY_1"),
        KeySlot("KEY_2", "LIVE_KEY_2"),
        KeySlot("KEY_3", "LIVE_KEY_3"),
    ]

    # 1. Test basic round-robin progression
    slots_picked = []
    for _ in range(6):
        slot, idx = await rotator.get_next_key_slot()
        slots_picked.append(slot.key_id)

    print(f"6 sequential requests picked slots: {slots_picked}")
    assert slots_picked == ["KEY_1", "KEY_2", "KEY_3", "KEY_1", "KEY_2", "KEY_3"], f"Unexpected rotation: {slots_picked}"
    print("PASS: Round-robin rotation working perfectly (1 -> 2 -> 3 -> 1 -> 2 -> 3).")

    # 2. Test failover: put KEY_1 into cooldown (e.g. 429 rate limit)
    await rotator.record_feedback(0, 429, "Rate limit test")
    assert rotator.slots[0].is_cooling_down, "KEY_1 should be cooling down"
    assert rotator.slots[0].rate_limit_count == 1, "Rate limit count should be 1"

    # Now verify that subsequent get_next_key_slot skips KEY_1
    slots_picked_after_failover = []
    for _ in range(4):
        slot, idx = await rotator.get_next_key_slot()
        slots_picked_after_failover.append(slot.key_id)

    print(f"4 sequential requests while KEY_1 is cooling down: {slots_picked_after_failover}")
    assert "KEY_1" not in slots_picked_after_failover, "KEY_1 should be skipped during cooldown!"
    assert all(k in ["KEY_2", "KEY_3"] for k in slots_picked_after_failover)
    print("PASS: KEY_1 was skipped and traffic seamlessly fell over to KEY_2 and KEY_3.")

    # 3. Test failover recovery: reset cooldown
    rotator.slots[0].cooldown_until = 0.0
    slot, _ = await rotator.get_next_key_slot()
    print(f"After cooldown expiry, picked slot: {slot.key_id}")
    print("PASS: Cooldown recovery confirmed.")

    print("\n==================================================")
    print("  ALL ROTATOR LOGIC TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_rotator_logic())
