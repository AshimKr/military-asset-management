import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function main(){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const bases=(await client.query(`INSERT INTO bases(name,code) VALUES
      ('Alpha Base','ALPHA'),('Bravo Base','BRAVO'),('Charlie Base','CHARLIE')
      ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name RETURNING id,code`)).rows;
    const byCode=Object.fromEntries(bases.map(b=>[b.code,b.id]));
    await client.query(`INSERT INTO equipment_types(name,category,code,unit) VALUES
      ('Utility Vehicle','Vehicle','VEH-UTIL','vehicle'),
      ('Standard Equipment Unit','Equipment','EQ-STD','unit'),
      ('Training Ammunition Pack','Consumable','CONS-TRAIN','pack')
      ON CONFLICT(code) DO NOTHING`);

    const users=[
      ['System Admin','admin@example.com','Admin@12345','ADMIN',null],
      ['Alpha Commander','commander.alpha@example.com','Commander@12345','BASE_COMMANDER',byCode.ALPHA],
      ['Alpha Logistics','logistics.alpha@example.com','Logistics@12345','LOGISTICS_OFFICER',byCode.ALPHA],
    ];
    for(const [name,email,password,role,baseId] of users){
      const hash=await bcrypt.hash(password,12);
      await client.query(`INSERT INTO users(name,email,password_hash,role,base_id)
        VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,base_id=EXCLUDED.base_id,active=TRUE`,
        [name,email,hash,role,baseId]);
    }
    await client.query('COMMIT');
    console.log('Seed complete. Demo users are listed in README.md');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
}
main().catch(e=>{console.error(e);process.exit(1)});
