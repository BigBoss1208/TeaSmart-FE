import {test} from "node:test";
import assert from "node:assert/strict";
import {normalizeProductSearch,matchesProductSearch} from "../src/lib/productSearch.ts";
const p:any={name:"Trà Nõn Tôm",type:"Trà xanh",regionName:"Tân Cương",weight:"200g",note:"Hương cốm",taste:["Hậu ngọt"]};
test("Vietnamese search normalizes accents, d and whitespace",()=>assert.equal(normalizeProductSearch("  ĐẬM   vị "),"dam vi"));
test("Search combines real name, region and weight terms",()=>{for(const q of ["trà nõn tôm","tra non tom","NON TOM","tan cuong","tra non tom 200g","HẬU NGỌT"])assert.ok(matchesProductSearch(p,q),q);});
test("All tokens must match; missing data never creates results",()=>{assert.equal(matchesProductSearch(p,"tra 500g"),false);assert.equal(matchesProductSearch(p,"khong ton tai"),false);assert.ok(matchesProductSearch(p,"   "));});
