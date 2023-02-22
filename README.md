# mysql-pool
Wrapper extending the features for mysqljs/mysql.

Sample implementation:
```js
import MysqlPool from 'mysql-pool';
import logger from 'logger';

const o_pool = new MysqlPool({
   connectionLimit: 3,
   host: 'localhost',
   user: 'db_admin',
   password: 'abc123',
   canRetry: true, // Automatically try to reconnect.
});

o_pool.on( 'get_connection_error', function( /* err */ ){
   logger( 'error', 'MysqlPool get_connection failed!' );
});

o_pool.on( 'reconnect', function( /* err */ ){
   logger( 'warning', 'MysqlPool: Reconnecting...' );
});

o_pool.on( 'error', function( err ){
   logger( 'error', 'MysqlPool error:', err );
   process.exit( 1 );
});

logger( 'info', 'MysqlPool: Connecting...' );
await o_pool.connect();
logger( 'info', 'MysqlPool: Connected.' );

const c_query = 'SELECT * FROM `schema`.`table` WHERE `id`=:id;';
const o_statement = o_pool.prepare( c_query, { id: 1 } );

const o_response = await o_statement.execute();
logger( 'info', 'Result count:', o_response.results.length );
process.exit( 0 );
```
