import test from 'node:test';
import assert from 'node:assert/strict';
import {filterPlaces,isThaiNguyenPlace,type PublicPlace} from '../src/lib/publicPlaces.ts';
const place:PublicPlace={id:1,name:'Tân Cương',location:'Thái Nguyên',description:null,image:null};
test('search handles Vietnamese accents and combines location filter',()=>{assert.equal(filterPlaces([place],'tan cuong','Thái Nguyên').length,1);assert.equal(filterPlaces([place],'tan cuong','La Bằng').length,0);assert.equal(filterPlaces([place],'không tồn tại','').length,0)});
test('test records cannot become real Thai Nguyen businesses',()=>{assert.equal(isThaiNguyenPlace({...place,name:'test02'}),false);assert.equal(isThaiNguyenPlace({...place,description:'Store thử nghiệm'}),false);assert.equal(isThaiNguyenPlace({...place,name:'Hà Nội',location:null}),false);assert.equal(isThaiNguyenPlace(place),true)});
