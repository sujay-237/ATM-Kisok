import asyncio
import sys
import httpx

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.gemini_rotator import GeminiKeyRotator, KeySlot
from app.config import settings

# 1x1 white pixel JPEG for lightweight test
TINY_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////"
    "//////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
)

async def test_live_failover_execution():
    print("=================================================================")
    print("  LIVE FAILOVER TEST: SIMULATED KEY FAILURE -> RECOVERY ON KEY 2")
    print("=================================================================")

    rotator = GeminiKeyRotator()
    # Slot 1: Purposefully invalid key that will trigger 400 API key not valid from Google
    # Slot 2: User's real key 2
    # Slot 3: User's real key 3
    rotator.slots = [
        KeySlot("KEY_1_BAD", "INVALID_BAD_KEY_12345"),
        KeySlot("KEY_2_LIVE", settings.GEMINI_API_KEY_2),
        KeySlot("KEY_3_LIVE", settings.GEMINI_API_KEY_3),
    ]

    print(f"Slot 1: {rotator.slots[0].key_id} (simulated bad key)")
    print(f"Slot 2: {rotator.slots[1].key_id} ({rotator.slots[1].masked_key})")
    print(f"Slot 3: {rotator.slots[2].key_id} ({rotator.slots[2].masked_key})")

    result = await rotator.verify_selfie(
        reference_image_b64=TINY_JPEG_B64,
        live_selfie_b64=TINY_JPEG_B64,
        user_name="Sujay"
    )

    print("\nVerification Result:")
    print(f"  Match: {result.get('match')}")
    print(f"  Confidence: {result.get('confidence')}")
    print(f"  Key Used: {result.get('key_used')}")
    print(f"  Keys Attempted: {result.get('keys_attempted')}")
    print(f"  Failover Occurred: {result.get('failover_occurred')}")
    print(f"  Engine: {result.get('engine')}")

    assert result.get("failover_occurred") is True, "Failover should have been triggered!"
    assert result.get("key_used") == "KEY_2_LIVE", f"Expected KEY_2_LIVE to succeed, got {result.get('key_used')}"
    assert "KEY_1_BAD" in result.get("keys_attempted", []), "Expected KEY_1_BAD to have been attempted first"
    assert rotator.slots[0].is_cooling_down is True, "Slot 1 should now be in cooldown"
    assert rotator.slots[0].other_errors_count >= 1, "Slot 1 should have error recorded"

    print("\nPASS: Bad key in Slot 1 was caught, marked cooling down, and request seamlessly fell over to Slot 2 (Key 2)!")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(test_live_failover_execution())
