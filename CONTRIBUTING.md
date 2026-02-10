# Contributing to StreamVest

Thanks for your interest in contributing to StreamVest. This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/streamvest.git`
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Push to your fork: `git push origin feature/your-feature`
6. Open a Pull Request

## Project Structure

```
streamvest/
  cadence/
    contracts/          # Cadence smart contracts
    scripts/            # Read-only Cadence scripts
    transactions/       # Cadence transactions
  frontend/
    src/                # React frontend (Vite + FCL)
```

## Development

### Smart Contracts

Contracts are written in Cadence and deployed on Flow mainnet. To work with them locally:

```bash
# Install Flow CLI
brew install flow-cli

# Run the emulator
flow emulator

# Deploy to emulator
flow deploy --network emulator
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend connects to Flow mainnet by default. It uses FCL (Flow Client Library) for wallet interaction and on-chain queries.

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include a clear description of what the PR does and why
- Test your changes locally before submitting
- Follow existing code style and naming conventions
- Update documentation if your change affects the public API or user experience

## Reporting Issues

Open an issue on GitHub with:
- A clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser/wallet version if it's a frontend issue

## Contract Changes

Since the core contracts are deployed on mainnet, changes to `StreamVest.cdc` cannot be redeployed due to Cadence's contract update restrictions. New functionality should be added via companion contracts (following the `StreamVestSchedulerV2` pattern).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
