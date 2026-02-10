import Test
import "StreamVest"

// Test suite for StreamVest string helper functions

access(all) fun setup() {
    let err = Test.deployContract(
        name: "StreamVest",
        path: "../contracts/StreamVest.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())
}

// ──────────────── ufix64ToIntString Tests ────────────────

access(all) fun testIntString_Zero() {
    let result = StreamVest.ufix64ToIntString(0.0)
    Test.assertEqual("0", result)
}

access(all) fun testIntString_WholeNumber() {
    let result = StreamVest.ufix64ToIntString(123.0)
    Test.assertEqual("123", result)
}

access(all) fun testIntString_WithDecimals() {
    let result = StreamVest.ufix64ToIntString(123.45678900)
    Test.assertEqual("123", result)
}

access(all) fun testIntString_LargeNumber() {
    let result = StreamVest.ufix64ToIntString(123456789.98765432)
    Test.assertEqual("123456789", result)
}

access(all) fun testIntString_LessThanOne() {
    let result = StreamVest.ufix64ToIntString(0.999999)
    Test.assertEqual("0", result)
}

access(all) fun testIntString_Thousand() {
    let result = StreamVest.ufix64ToIntString(1000.0)
    Test.assertEqual("1000", result)
}

// ──────────────── ufix64ToDecimalString Tests ────────────────

access(all) fun testDecimalString_ZeroPlaces() {
    let result = StreamVest.ufix64ToDecimalString(123.456, 0)
    Test.assertEqual("123", result)
}

access(all) fun testDecimalString_OnePlaceRounded() {
    let result = StreamVest.ufix64ToDecimalString(123.456, 1)
    Test.assertEqual("123.4", result)
}

access(all) fun testDecimalString_TwoPlaces() {
    let result = StreamVest.ufix64ToDecimalString(123.456, 2)
    Test.assertEqual("123.45", result)
}

access(all) fun testDecimalString_FourPlaces() {
    let result = StreamVest.ufix64ToDecimalString(123.45678900, 4)
    Test.assertEqual("123.4567", result)
}

access(all) fun testDecimalString_EightPlaces() {
    let result = StreamVest.ufix64ToDecimalString(0.27777777, 8)
    Test.assertEqual("0.27777777", result)
}

access(all) fun testDecimalString_PaddingNeeded() {
    // 5.0 should pad to 5.000000 with 6 places
    let result = StreamVest.ufix64ToDecimalString(5.0, 6)
    Test.assertEqual("5.000000", result)
}

access(all) fun testDecimalString_PartialPadding() {
    // 1.5 should become 1.500000 with 6 places
    let result = StreamVest.ufix64ToDecimalString(1.5, 6)
    Test.assertEqual("1.500000", result)
}

access(all) fun testDecimalString_Zero() {
    let result = StreamVest.ufix64ToDecimalString(0.0, 4)
    Test.assertEqual("0.0000", result)
}

access(all) fun testDecimalString_WholeNumber() {
    let result = StreamVest.ufix64ToDecimalString(1000.0, 4)
    Test.assertEqual("1000.0000", result)
}

access(all) fun testDecimalString_SmallValue() {
    let result = StreamVest.ufix64ToDecimalString(0.0001, 4)
    // UFix64.toString() might add trailing zeros, so expect 0.0001
    Test.assertEqual("0.0001", result)
}
