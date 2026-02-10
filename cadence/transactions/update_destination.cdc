import "StreamVest"
import "NonFungibleToken"
import "FungibleToken"
import "FlowToken"

transaction(nftID: UInt64, newDestination: Address) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the collection with StreamOwner entitlement
        let collection = signer.storage.borrow<auth(StreamVest.StreamOwner) &StreamVest.Collection>(
            from: StreamVest.CollectionStoragePath
        ) ?? panic("Could not borrow StreamVest collection from signer's storage")

        // Update the destination
        collection.updateDestination(nftID: nftID, newAddress: newDestination)
    }

    execute {
        // Transaction executed successfully
    }
}
