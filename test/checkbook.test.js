const test=require('node:test'),assert=require('node:assert/strict');const{csv,check,markdown}=require('../scripts/checkbook');
const h='case,kind,expected,observed,tolerance,note\n';
test('numeric observations compare within stated tolerance',()=>{assert.equal(check(h+'a,number,1.3333333333,1.333333,0.000001,rounded')[0].pass,true);assert.equal(check(h+'a,number,10,10.1,0.01,drift')[0].pass,false);});
test('text observations preserve separators and exact spacing',()=>{assert.equal(check(h+'a,text,"1,234.50","1,234.50",,locale')[0].pass,true);assert.equal(check(h+'a,text,1 234.50,1234.50,,locale')[0].pass,false);});
test('quoted commas, newlines and doubled quotes survive CSV',()=>{assert.deepEqual(csv('"a,b","two\nlines","say ""yes"""\r\n'),[['a,b','two\nlines','say "yes"']]);assert.throws(()=>csv('"unfinished'),/Unclosed/);});
test('invalid numbers and blank observations are rejected',()=>{for(const x of ['NaN','Infinity','1,000',''])assert.throws(()=>check(h+`a,number,1,"${x}",0,note`));assert.throws(()=>check(h+'a,number,1,1,-1,note'));});
test('case identifiers are unique and schema is strict',()=>{assert.throws(()=>check(h+'a,text,x,x,,note\na,text,x,x,,note'),/duplicate/);assert.throws(()=>check('case,expected\na,1'),/header/);assert.throws(()=>check(h+'a,unknown,x,x,,note'),/kind/);});
test('Markdown escapes pipes without losing the observation',()=>assert.match(markdown(check(h+'a,text,x,x,,a|b')),/a\\\|b/));
test('supplied template contains six passing checks',()=>{const fs=require('fs'),path=require('path');const rows=check(fs.readFileSync(path.join(__dirname,'../data/example.csv'),'utf8'));assert.equal(rows.length,6);assert.ok(rows.every(r=>r.pass));});
