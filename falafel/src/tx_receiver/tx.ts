import { ProofData } from '@aztec/barretenberg/client_proofs';

export interface Tx {
  proof: ProofData;
  offchainTxData: Buffer;
  depositSignature?: Buffer;
}

export interface TxRequest {
  txs: Tx[];
  requestSender: string;
}
