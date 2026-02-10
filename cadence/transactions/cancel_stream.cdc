import "StreamVest"
import "NonFungibleToken"
import "FungibleToken"
import "FlowToken"

transaction(nftID: UInt64) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the collection with StreamOwner entitlement
        let collection = signer.storage.borrow<auth(StreamVest.StreamOwner) &StreamVest.Collection>(
            from: StreamVest.CollectionStoragePath
        ) ?? panic("Could not borrow StreamVest collection from signer's storage")

        // Cancel the stream and get back the remaining tokens
        let returnedVault <- collection.cancelStream(nftID: nftID)

        // Borrow the signer's FlowToken vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Deposit) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken vault from signer's storage")

        // Deposit the returned tokens
        flowVault.deposit(from: <-returnedVault)
    }

    execute {
        // Transaction executed successfully
    }
}
