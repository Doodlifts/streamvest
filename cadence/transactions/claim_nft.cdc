import "StreamVest"
import "NonFungibleToken"
import "FungibleToken"
import "FlowToken"

transaction(nftID: UInt64, recipient: Address) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the signer's collection to withdraw the NFT
        let signerCollection = signer.storage.borrow<auth(NonFungibleToken.Withdraw) &StreamVest.Collection>(
            from: StreamVest.CollectionStoragePath
        ) ?? panic("Could not borrow StreamVest collection from signer's storage")

        // Withdraw the NFT
        let nft <- signerCollection.withdraw(withdrawID: nftID) as! @StreamVest.NFT

        // Get the recipient's public collection capability
        let recipientCollectionCapability = getAccount(recipient).capabilities.borrow<&StreamVest.Collection>(
            StreamVest.CollectionPublicPath
        ) ?? panic("Could not borrow StreamVest collection from recipient's public capability")

        // Deposit the NFT into the recipient's collection
        recipientCollectionCapability.deposit(token: <-nft)
    }

    execute {
        // Transaction executed successfully
    }
}
