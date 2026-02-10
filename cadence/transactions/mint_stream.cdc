import "StreamVest"
import "NonFungibleToken"
import "FungibleToken"
import "FlowToken"

transaction(amount: UFix64, destinationAddress: Address, durationSeconds: UFix64) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Set up collection if needed
        if signer.storage.borrow<&StreamVest.Collection>(from: StreamVest.CollectionStoragePath) == nil {
            let collection <- StreamVest.createEmptyCollection(nftType: Type<@StreamVest.NFT>())
            signer.storage.save(<-collection, to: StreamVest.CollectionStoragePath)

            let publicCapability = signer.capabilities.storage.issue<&StreamVest.Collection>(
                StreamVest.CollectionStoragePath
            )
            signer.capabilities.publish(publicCapability, at: StreamVest.CollectionPublicPath)
        }

        // Withdraw FLOW tokens from the signer's vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FlowToken vault from signer's storage")

        let tokenVault <- flowVault.withdraw(amount: amount) as! @FlowToken.Vault

        // Create the stream using the public function (no Minter needed)
        let nft <- StreamVest.createStream(
            vault: <- tokenVault,
            destination: destinationAddress,
            duration: durationSeconds
        )

        // Deposit the NFT into the signer's collection
        let collection = signer.storage.borrow<&StreamVest.Collection>(
            from: StreamVest.CollectionStoragePath
        ) ?? panic("Could not borrow collection from storage")

        collection.deposit(token: <- nft)
    }

    execute {
        // Stream created successfully
    }
}
