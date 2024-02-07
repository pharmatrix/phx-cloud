'use strict'
import Bx from 'base-x'

const ENCODING_BASES: { [index: string]: string } = {
  'b32': 'ybndrfg8ejkmcpqxot1uwisza345h769',
  'b43': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFG',
  'b58': '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  'b62': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'b64': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  // 'b66': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_+!~'
}

function _random( min: number, max: number ): number{
  // Returns random number between defined interval
  return Math.floor( Math.random() * ( max - min )+ min )
}

function _encode( type: string, body: string ){
  return Bx( ENCODING_BASES[ type ] ).encode( Buffer.from( body ) )
}

function _decode( type: string, body: string ){
  return Bx( ENCODING_BASES[ type ] ).decode( body ).toString()
}

export const encode = ( arg: unknown, type?: string ) => {
  // Encoding
  if( !arg ) {
    // Console.log('[ENCODER::ERROR] Invalid Argument')
    return ''
  }

  const
  argtype = typeof arg, // Input regardless its type: Encoding,
  Bases = Object.keys( ENCODING_BASES )

  arg = argtype == 'object' ? JSON.stringify( arg ) : String( arg )
  type = type && type.toLowerCase()
  const Body = _encode( 'b32', arg as string )

  // Check requested type or assign random type
  if( !type || !Bases.includes( type ) )
    type = Bases[ _random( 0, Bases.length ) ]

  const Metadata = `[${ type }-Encoding]/type:${ argtype}` // Encoding metadata

  return `${_encode( type, Body ).split('').reverse().join('') }$${ _encode( 'b58', Metadata )}`
}

export const decode = ( arg: string ) => {
  // Decoding
  if( typeof arg !== 'string' ) {
    // Console.log('[ENCODER::ERROR] Invalid Argument <String Expected>')
    return ''
  }

  const Bases = Object.keys( ENCODING_BASES )
  let [ Body, Metadata ] = arg.split('$')

  if( !Metadata || !Body ) return arg
  Metadata = _decode( 'b58', Metadata )

  const [ _, type, argtype ] = Metadata.match(/^\[(.+)-Encoding\]\/type:(\w+)/) || []
  if( !type || !Bases.includes( type ) )
    return arg

  // Decoding type & first seal gate: base32
  Body = _decode( 'b32', _decode( type, Body.split('').reverse().join('') ) )

  // Return the argument in its encoding type
  switch( argtype ) {
    case 'number': return +Body
    case 'object': return JSON.parse( Body )
    case 'boolean': return Boolean( Body )
    default: return Body // String
  }
}

export default { dictionaries: ENCODING_BASES, encode, decode }