'use strict';
const mysql = require( 'mysql' );
const EventEmitter = require( 'events' );

class MysqlPool extends EventEmitter {
   pool = null;
   pool_options = null;

   constructor( o_options ){
      super();

      this.pool_options = Object.assign({
         canRetry: false, // Automatically try to reconnect.
         connectionLimit: 10, // Default
         database: null,
         host: 'localhost',
         password: null,
         user: null,
      }, o_options );
   }// /constructor()

   connect(){
      this.pool = mysql.createPool( this.pool_options );
      this.pool.on( 'error', ( err ) => {
         this.on_pool_error( err );
      });
   }// /connect()

   on_pool_error( err ){
      this.emit( 'warning', err );
      const c_code = err.code;
      switch( c_code ) {
      case 'PROTOCOL_CONNECTION_LOST':
      case 'ECONNRESET':
         if ( this.pool_options.canRetry ) {
            // Try and reconnect.
            this.emit( 'reconnect', err );
            setTimeout( () => {
               this.connect();
            }, 100 );
         }
         break;

      default:
         this.emit( 'error', err );
      }// /default()
   }// /on_pool_error()

   async query( c_query, a_params ){
      var resolve, reject;
      const o_promise = new Promise( ( res, rej ) => {
         resolve = res;
         reject = rej;
      });

      var o_connection = null;
      // Ensure a shared connection.
      try{
         o_connection = await this.get_connection();
      }
      catch( err ){
         return reject( err );
      }

      this.pool.query( c_query, a_params, (err, results, fields) => {
         // Done with the shared connection.
         o_connection.release();

         if (err) {
            err.query = c_query;
            return reject( err );
         }

         resolve({
            fields: fields,
            results: results,
         });
      });
      return o_promise;
   }// /query()

   prepare( c_query, o_params ){
      var c_statement = c_query;
      const a_params = [];

      if( o_params ){
         Object.entries( o_params ).forEach( ([name, value]) => {
            const c_token = `:${name}\\b`;
            const o_reg = new RegExp( c_token, 'g' );
            if( !o_reg.test( c_statement ) ){
               return;
            }

            c_statement = c_statement.replace( o_reg, mysql.escape( value ) );
            // mysql.escape( value );
            // a_params.push( value );
         } );
      }

      // console.log( 'c_statement', c_statement );
      // console.log( 'a_params', a_params );

      return {
         execute: () => {
            return this.query( c_statement, a_params );
         },// /execute()
         params: a_params,
         sql: c_statement,
         query: c_query,
      };
   }// /prepare()

   get_connection(){
      var resolve, reject;
      const o_promise = new Promise( ( res, rej ) => {
         resolve = res;
         reject = rej;
      });

      this.pool.getConnection( function( err, o_connection ){
         if ( err ) {
            this.emit( 'get_connection_error' );
            return reject( err );
         }

         resolve( o_connection );
      } );

      return o_promise;
   }// /get_connection()
}// class MysqlPool

module.exports = MysqlPool;
