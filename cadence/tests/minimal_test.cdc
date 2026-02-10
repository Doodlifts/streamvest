import Test

access(all) let admin = Test.getAccount(0x0000000000000007)

access(all) fun setup() {
    let err = Test.deployContract(
        name: "StreamVest",
        path: "../contracts/StreamVest.cdc",
        arguments: []
    )
    Test.expect(err, Test.beNil())
}

access(all) fun testDeploySucceeded() {
    Test.assert(true)
}
