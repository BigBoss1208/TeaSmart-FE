import test from 'node:test';
import assert from 'node:assert/strict';
import {api,errorMessage} from '../src/lib/commerce.ts';
test('API combines caller cancellation with timeout and preserves successful responses',async()=>{
 const oldFetch=globalThis.fetch, oldStorage=globalThis.sessionStorage, oldTimeout=AbortSignal.timeout;
 const deadline=new AbortController();
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:()=>null}});
 AbortSignal.timeout=((ms:number)=>{assert.equal(ms,20000);return deadline.signal}) as typeof AbortSignal.timeout;
 try {
  let signal:AbortSignal;
  globalThis.fetch=(async(_url,init)=>{signal=init!.signal as AbortSignal;return new Response('{}',{status:200})}) as typeof fetch;
  const caller=new AbortController();await api('/admin/categories',{signal:caller.signal});
  assert.equal(signal!.aborted,false);deadline.abort(new DOMException('timeout','TimeoutError'));
  assert.equal(signal!.reason.name,'TimeoutError');assert.equal(caller.signal.aborted,false);
  const other=new AbortController();AbortSignal.timeout=(()=>new AbortController().signal) as typeof AbortSignal.timeout;
  await api('/admin/categories',{signal:other.signal});other.abort();assert.equal(signal!.reason.name,'AbortError');
  assert.notEqual(errorMessage(new DOMException('','TimeoutError')),errorMessage(new DOMException('','AbortError')));
 } finally {globalThis.fetch=oldFetch;AbortSignal.timeout=oldTimeout;Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:oldStorage})}
});
