import { isPlainRecord } from '../shared-piping-model/index.js';
import { requestError } from './errors.js';
export function exactRecord(value,keys,path){if(!isPlainRecord(value))throw requestError('RECORD_REQUIRED',path,`${path} must be a plain record.`);const actual=Object.keys(value).sort(),expected=[...keys].sort();if(JSON.stringify(actual)!==JSON.stringify(expected))throw requestError('EXACT_KEYS_REQUIRED',path,`${path} keys must be ${expected.join(', ')}.`);return value;}
export function nonEmptyString(value,path){if(typeof value!=='string'||!value.trim())throw requestError('STRING_REQUIRED',path,`${path} must be a non-empty string.`);return value.trim();}
export function uniqueIdentities(rows,key,path){const seen=new Set();rows.forEach((row,index)=>{const value=row[key];if(seen.has(value))throw requestError('DUPLICATE_IDENTITY',`${path}[${index}].${key}`,`Duplicate ${key} ${value}.`);seen.add(value);});}
export function codeSort(left,right){return left<right?-1:left>right?1:0;}
export function deepClone(value){return JSON.parse(JSON.stringify(value));}
