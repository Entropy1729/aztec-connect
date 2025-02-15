// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { toBuffer } from 'ethereumjs-util';
import { Signer } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  evmRevert,
  evmSnapshot,
  advanceBlocksHardhat,
  blocksToAdvanceHardhat,
} from '../../ganache/hardhat_chain_manipulation';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

describe('rollup_processor: ', () => {
  let rollupProcessor: TestRollupProcessor;
  let signers: Signer[];
  let addresses: EthAddress[];

  let snapshot: string;

  const OWNER_ROLE = keccak256(toUtf8Bytes('OWNER_ROLE'));
  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;

  const RANDOM_BYTES = keccak256(toUtf8Bytes('RANDOM'));

  before(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor } = await setupTestRollupProcessor(signers, {
      numberOfTokenAssets: 1,
      escapeBlockLowerBound,
      escapeBlockUpperBound,
    }));
    // Advance into block region where escapeHatch is active.
    const blocks = await blocksToAdvanceHardhat(escapeBlockLowerBound, escapeBlockUpperBound, ethers.provider);
    await advanceBlocksHardhat(blocks, ethers.provider);

    expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.paused()).to.be.eq(false);

    expect(await rollupProcessor.pause({ signingAddress: addresses[0] }));
    expect(await rollupProcessor.paused()).to.be.eq(true);
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('cannot be paused when already paused', async () => {
    await expect(rollupProcessor.pause({ signingAddress: addresses[0] })).to.be.revertedWith(`PAUSED`);
  });

  it('cannot unpause if already unpaused', async () => {
    expect(await rollupProcessor.unpause({ signingAddress: addresses[0] }));
    expect(await rollupProcessor.paused()).to.be.eq(false);

    await expect(rollupProcessor.unpause({ signingAddress: addresses[0] })).to.be.revertedWith(`NOT_PAUSED`);
  });

  it('cannot setSupportedAsset when paused', async () => {
    await expect(
      rollupProcessor.setSupportedAsset(addresses[0], 1, { signingAddress: addresses[0] }),
    ).to.be.revertedWith(`PAUSED`);
  });

  it('cannot setSupportedBridge when paused', async () => {
    await expect(
      rollupProcessor.setSupportedBridge(addresses[0], 1, { signingAddress: addresses[0] }),
    ).to.be.revertedWith(`PAUSED`);
  });

  it('cannot approveProof when paused', async () => {
    await expect(
      rollupProcessor.approveProof(toBuffer(RANDOM_BYTES), { signingAddress: addresses[0] }),
    ).to.be.revertedWith(`PAUSED`);
  });

  it('cannot depositPendingFunds when paused', async () => {
    await expect(
      rollupProcessor.depositPendingFunds(0, 0n, toBuffer(RANDOM_BYTES), { signingAddress: addresses[0] }),
    ).to.be.revertedWith(`PAUSED`);
  });

  it('cannot offchainData when paused', async () => {
    await expect(
      rollupProcessor.offchainData(0n, 0n, 0n, Buffer.from('0x00'), {
        signingAddress: addresses[0],
      }),
    ).to.be.revertedWith(`PAUSED`);
  });

  it('cannot processRollup when paused', async () => {
    await expect(
      rollupProcessor.processRollup(Buffer.from('0x00'), Buffer.from('0x00'), {
        signingAddress: addresses[0],
      }),
    ).to.be.revertedWith(`PAUSED`);
  });

  it('cannot processAsyncDefiInteraction when paused', async () => {
    await expect(
      rollupProcessor.processAsyncDefiInteraction(0, {
        signingAddress: addresses[0],
      }),
    ).to.be.revertedWith(`PAUSED`);
  });
});
