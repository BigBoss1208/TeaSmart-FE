import test from "node:test";
import assert from "node:assert/strict";
import {normalizeShippingPhone,validShippingPhone} from "../src/lib/phone.ts";
import {normalizeRegistrationPhone} from "../src/lib/registration.ts";
test("Shipping normalizes +84, whitespace and hyphens to Backend format",()=>{for(const value of ["0912345678","+84912345678"," +84 912-345-678 ","0912 345 678"]){assert.equal(normalizeShippingPhone(value),"0912345678");assert.ok(validShippingPhone(value))}assert.ok(validShippingPhone("0212345678"))});
test("Shipping rejects letters, punctuation, wrong lengths and prefixes",()=>{for(const value of ["","84912345678","+1 912345678","0912.345678","09123456789","091234567","0912abc678"]){assert.equal(validShippingPhone(value),false,value)}});
test("AUTH-03 still keeps its original punctuation rule",()=>assert.equal(normalizeRegistrationPhone("+84 912-345-678"),"0912-345-678"));
