import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { Tx } from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput } from '../proofs';
import { Signer } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';

export class FeeController {
  private feeProofOutputs: ProofOutput[] = [];
  private txIds: TxId[] = [];

  constructor(
    public readonly userId: GrumpkinAddress,
    private readonly userSigner: Signer,
    public readonly proofTxs: Tx[],
    public readonly fee: AssetValue,
    private readonly core: CoreSdkInterface,
  ) {
    if (!fee.value) {
      throw new Error('Fee cannot be 0.');
    }
  }

  public async createProof() {
    const spendingPublicKey = this.userSigner.getPublicKey();
    const spendingKeyRequired = !spendingPublicKey.equals(this.userId);
    const feeProofInputs = await this.core.createPaymentProofInputs(
      this.userId,
      this.fee.assetId,
      BigInt(0),
      BigInt(0),
      this.fee.value,
      BigInt(0),
      BigInt(0),
      this.userId,
      spendingKeyRequired,
      undefined,
      spendingPublicKey,
      2,
    );
    const txRefNo = feeProofInputs.length > 1 ? createTxRefNo() : 0;

    this.feeProofOutputs = [];
    for (const proofInput of feeProofInputs) {
      proofInput.signature = await this.userSigner.signMessage(proofInput.signingData);
      this.feeProofOutputs.push(await this.core.createPaymentProof(proofInput, txRefNo));
    }
  }

  public async send() {
    if (!this.feeProofOutputs.length) {
      throw new Error('Call createProof() first.');
    }

    this.txIds = await this.core.sendProofs(this.feeProofOutputs, this.proofTxs);
    return this.txIds[0];
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.feeProofOutputs.length ? 'createProof()' : 'send()'} first.`);
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}
