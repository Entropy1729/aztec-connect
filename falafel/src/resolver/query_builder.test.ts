import { Connection, createConnection, Repository } from 'typeorm';
import { AssetMetricsDao, AccountDao, BridgeMetricsDao, ClaimDao, TxDao, RollupDao, RollupProofDao } from '../entity';
import { RollupDb, TypeOrmRollupDb } from '../rollup_db';
import { randomRollupProof } from '../rollup_db/fixtures';
import { getQuery } from './query_builder';

describe('Query Builder', () => {
  let connection: Connection;
  let rollupProofRep: Repository<RollupProofDao>;
  let rollupDb: RollupDb;

  beforeEach(async () => {
    connection = await createConnection({
      type: 'sqlite',
      database: ':memory:',
      entities: [TxDao, RollupProofDao, RollupDao, AccountDao, ClaimDao, AssetMetricsDao, BridgeMetricsDao],
      dropSchema: true,
      synchronize: true,
      logging: false,
    });

    rollupProofRep = connection.getRepository(RollupProofDao);

    rollupDb = new TypeOrmRollupDb(connection);
  });

  afterEach(async () => {
    await connection.close();
  });

  it('should get rollup proof by id', async () => {
    const rollupProof = randomRollupProof([]);
    await rollupDb.addRollupProof(rollupProof);

    const query = getQuery(rollupProofRep, { where: { id: rollupProof.id } });
    const rollupProofDao = (await query.getOne())!;
    expect(rollupProofDao.id).toStrictEqual(rollupProof.id);
    expect(rollupProofDao.created).toStrictEqual(rollupProof.created);
  });
});
