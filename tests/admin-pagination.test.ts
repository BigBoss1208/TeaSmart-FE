import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";
const require=createRequire(import.meta.url),module={exports:{} as any};
const js=ts.transpileModule(readFileSync("src/components/AdminPagination.tsx","utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
new Function("require","module","exports",js)(require,module,module.exports);
test("pagination shows actual pages, bounds, gaps and no phantom page for empty data",()=>{
 const {pageNumbers,default:Pagination}=module.exports;
 assert.deepEqual(pageNumbers(0,0),[]);assert.deepEqual(pageNumbers(0,1),[0]);assert.deepEqual(pageNumbers(5,12),[0,"…",4,5,6,"…",11]);
 let selected=-1;const tree=Pagination({page:1,total:25,size:12,label:"sản phẩm",onChange:(n:number)=>selected=n});
 const nav=tree.props.children[1],buttons=nav.props.children.flat(Infinity).filter((x:any)=>x?.type==="button");
 const current=buttons.find((x:any)=>x.props["aria-current"]==="page");assert.equal(current.props.children,2);
 buttons[0].props.onClick();assert.equal(selected,0);buttons.at(-1).props.onClick();assert.equal(selected,2);
 const empty=Pagination({page:0,total:0,label:"danh mục",onChange:()=>{}});assert.equal(empty.props.children[1].props.children[0].props.disabled,true);
});
