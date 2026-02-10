import "StreamVest"

access(all) struct FeeEstimate {
    access(all) let totalFees: UFix64
    access(all) let numberOfExecutions: UFix64
    access(all) let durationSeconds: UFix64
    access(all) let intervalSeconds: UFix64
    access(all) let feePerExecution: UFix64

    init(
        totalFees: UFix64,
        numberOfExecutions: UFix64,
        durationSeconds: UFix64,
        intervalSeconds: UFix64,
        feePerExecution: UFix64
    ) {
        self.totalFees = totalFees
        self.numberOfExecutions = numberOfExecutions
        self.durationSeconds = durationSeconds
        self.intervalSeconds = intervalSeconds
        self.feePerExecution = feePerExecution
    }
}

access(all) fun main(
    durationSeconds: UFix64,
    intervalSeconds: UFix64,
    feePerExecution: UFix64
): FeeEstimate {
    let totalFees = StreamVest.estimateFees(
        durationSeconds: durationSeconds,
        intervalSeconds: intervalSeconds,
        feePerExecution: feePerExecution
    )

    let numberOfExecutions = durationSeconds / intervalSeconds

    return FeeEstimate(
        totalFees: totalFees,
        numberOfExecutions: numberOfExecutions,
        durationSeconds: durationSeconds,
        intervalSeconds: intervalSeconds,
        feePerExecution: feePerExecution
    )
}
