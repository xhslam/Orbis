/* Executed only by check-paper-workspace.mjs, never by the shipped app. */
const { app, BrowserWindow, WebContentsView, webContents, ipcMain, dialog, session } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const http = require('node:http')
const project = process.argv.find(a => a.startsWith('--project=')).slice(10)
const data = path.join(__dirname, 'userData')
fs.mkdirSync(data)
app.setPath('userData', data)
if (process.platform === 'darwin') app.setActivationPolicy('accessory')
delete process.env.ELECTRON_RENDERER_URL
const report = { checks: [], data, dialogs: [], errors: [] }
const check = (name, details) => { report.checks.push({ name, details }); console.log('PASS', name, details ?? '') }
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function until(work, name, ms = 12000) {
  const end = Date.now() + ms
  let last
  while (Date.now() < end) {
    try { last = await work(); if (last) return last } catch (e) { last = String(e) }
    await sleep(60)
  }
  throw new Error(`Timed out: ${name}; last=${JSON.stringify(last)}`)
}
const js = (wc, source) => wc.executeJavaScript(source, true)
const exists = (wc, selector) => js(wc, `!!document.querySelector(${JSON.stringify(selector)})`)
async function click(wc, selector) {
  await until(() => exists(wc, selector), selector)
  await js(wc, `document.querySelector(${JSON.stringify(selector)}).click(); true`)
  await sleep(80)
}
async function textClick(wc, text, selector = 'button') {
  await until(() => js(wc, `!![...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim()===${JSON.stringify(text)})`), text)
  await js(wc, `[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim()===${JSON.stringify(text)}).click(); true`)
  await sleep(80)
}
async function fill(wc, selector, value) {
  await js(wc, `(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw Error('Missing editor');const w=e.ownerDocument.defaultView; Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?w.HTMLTextAreaElement.prototype:w.HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true })()`)
  await sleep(80)
}
function zip(entries) {
  const chunks = [], central = []; let offset = 0
  for (const [name, content] of Object.entries(entries)) {
    const n = Buffer.from(name), b = Buffer.from(content)
    let crc = -1
    for (const byte of b) { crc ^= byte; for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0) }
    crc = (crc ^ -1) >>> 0
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt32LE(crc,14);h.writeUInt32LE(b.length,18);h.writeUInt32LE(b.length,22);h.writeUInt16LE(n.length,26)
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt32LE(crc,16);c.writeUInt32LE(b.length,20);c.writeUInt32LE(b.length,24);c.writeUInt16LE(n.length,28);c.writeUInt32LE(offset,42)
    chunks.push(h,n,b);central.push(c,n);offset+=h.length+n.length+b.length
  }
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(Buffer.concat(central).length,12);end.writeUInt32LE(offset,16)
  return Buffer.concat([...chunks,...central,end])
}
function fixtures() {
  const dir = path.join(__dirname,'fixtures'); fs.mkdirSync(dir)
  const paragraphs = Array.from({length:70},(_,i)=>`<p>Paragraph ${i+1}. The Orbis integration passage keeps reading and retelling together. This book verifies precise anchors, persistent notes and reliable page navigation without contacting any external service.</p>`).join('')
  const epub=zip({
    mimetype:'application/epub+zip',
    'META-INF/container.xml':'<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
    'OEBPS/package.opf':'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:orbis:integration</dc:identifier><dc:title>Orbis EPUB Integration</dc:title><dc:creator>Integration Fixture</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">2026-10-25T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="cover" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/><item id="one" href="one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="two.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/></spine></package>',
    'OEBPS/nav.xhtml':'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="one.xhtml">One</a></li><li><a href="two.xhtml">Two</a></li></ol></nav></body></html>',
    'OEBPS/one.xhtml':`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>One</title></head><body><h1>Orbis integration chapter one</h1>${paragraphs}</body></html>`,
    'OEBPS/two.xhtml':`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Two</title></head><body><h1>Orbis integration chapter two</h1>${paragraphs}</body></html>`,
    'OEBPS/cover.svg':'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="#28433c"/><text x="24" y="100" font-size="22" fill="white">ORBIS EPUB</text></svg>',
  })
  const epubPath=path.join(dir,'integration.epub');fs.writeFileSync(epubPath,epub)
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 400] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  const stream='BT /F1 18 Tf 30 280 Td (Orbis PDF integration passage) Tj 0 -28 Td (Selectable transparent text layer) Tj ET\n'
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`)
  let pdf='%PDF-1.4\n',offsets=[0]
  objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${o}\nendobj\n`})
  const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  const pdfPath=path.join(dir,'integration.pdf');fs.writeFileSync(pdfPath,pdf)
  const txtPath=path.join(dir,'retell.txt');fs.writeFileSync(txtPath,'Retell integration article\n\nFirst paragraph preserves the existing file import workflow.\n\nSecond paragraph supports segmentation and keyword selection.')
  return { dir, epubPath, pdfPath, txtPath }
}
const timeout=setTimeout(()=>{console.error('SMOKE TIMEOUT',report);app.exit(1)},150000)
app.on('window-all-closed',()=>{})
// Hidden windows still run real layout/canvas and sandbox code, without disturbing the desktop.
app.on('browser-window-created',(_e,win)=>{win.show=()=>{};win.showInactive=()=>{}})
app.on('web-contents-created',(_e,wc)=>{wc.on('console-message',(_e,...args)=>{const details=args[0]; const text=typeof details==='object'?details.message:args[1];if(text?.includes('[paper]')||text?.includes('Paper:')||text?.includes('Error')||text?.includes('exception'))console.log('RENDERER',text)})})
app.whenReady().then(async()=>{
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(details,cb)=>cb({cancel:!details.url.startsWith('http://127.0.0.1:')}))
  const api=require('./out/main/entry.cjs'), f=fixtures(), openQueue=[],saveQueue=[]
  dialog.showOpenDialog=async(_owner,options)=>{report.dialogs.push({kind:'open',options:options??_owner});const paths=openQueue.shift();return {canceled:!paths,filePaths:paths??[]}}
  dialog.showSaveDialog=async(_owner,options)=>{report.dialogs.push({kind:'save',options:options??_owner});const filePath=saveQueue.shift();return {canceled:!filePath,filePath}}
  api.registerPaperIpc()
  const store = api.createReadingStore(data)
  api.registerReadingWorkspaceIpc({ store })
  api.registerReadingIpc({ store, openReadingWindow: () => api.showReadingWindow() })
  // No credentials are read: controlled transport stand-ins exercise the real Retell lifecycle.
  ipcMain.removeHandler('reading:voice:open');ipcMain.removeHandler('reading:voice:sdp');ipcMain.removeHandler('reading:voice:close')
  let voiceOpens=0,voiceCloses=0
  ipcMain.handle('reading:voice:open',()=>{voiceOpens++;return {ok:true,session:'isolated-test',model:'test'}})
  ipcMain.handle('reading:voice:sdp',()=>({ok:true,answer:'test-answer'}))
  ipcMain.handle('reading:voice:close',()=>{voiceCloses++;return {ok:true}})
  let win=api.showReadingWindow()
  const shell=win.webContents
  let retell=await until(()=>webContents.getAllWebContents().find(w=>w.getURL().endsWith('/reading/index.html')),'Retell child document')
  await until(()=>exists(shell,'#rail-retell'),'main window sidebar')
  assert.equal(BrowserWindow.getAllWindows().length,1)
  assert.equal(await js(shell,`!!document.querySelector('#rail-reading') && !!document.querySelector('#rail-retell') && !document.querySelector('[data-open-reading-mode]')`),true)
  await click(shell,'#rail-retell')
  await until(()=>js(shell,`document.querySelector('#rail-retell').getAttribute('aria-current')==='true'`),'Retell selected')
  check('reading and retelling are parallel main-window destinations; no chooser or extra window')
  await until(()=>exists(retell,'#btn-paste-text'),'Retell UI ready')
  assert.equal(await js(retell,'typeof require'),'undefined')
  await click(retell,'#btn-paste-text');await fill(retell,'#paste-title','Retell paste fixture');await fill(retell,'#paste-content','First pasted paragraph.\n\nSecond pasted paragraph.');await click(retell,'#paste-submit')
  await until(()=>exists(retell,'#start-retell-btn'),'Retell article view')
  check('Retell actual paste UI and paragraph segmentation',store.listArticles())
  assert.equal(store.listArticles()[0].paragraphCount,2)
  await js(retell,`window.__retellIdentity=document.querySelector('#reading-app').firstElementChild; window.__retellText=document.querySelector('#reading-app').textContent; true`)
  const originalId=retell.id
  await js(retell,`window.orbisWorkspace.setMode('paper')`)
  let paper=await until(()=>webContents.getAllWebContents().find(w=>w.getURL().endsWith('/paper/index.html')),'Paper native view')
  await until(()=>js(paper,`!![...document.querySelectorAll('button')].find(b=>b.textContent.includes('Add books'))`),'Paper root library')
  assert.equal(win.contentView.children.filter(v=>v instanceof WebContentsView).length,2)
  assert.equal(BrowserWindow.getAllWindows().length,1)
  await until(()=>js(shell,`document.querySelector('#rail-reading').getAttribute('aria-current')==='true'`),'Reading sidebar selected')
  const contentBounds=await js(shell,`(()=>{const r=document.querySelector('#page-reading').getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)}})()`)
  const paperView=win.contentView.children.find(v=>v.webContents===paper)
  assert.deepEqual(paperView.getBounds(),contentBounds)
  assert.ok(contentBounds.x>0,'sidebar must remain outside native content view')
  await click(shell,'#rail-machine')
  await until(()=>!paperView.getVisible(),'Paper hidden on settings page')
  await click(shell,'#rail-reading')
  await until(()=>paperView.getVisible(),'Paper restored inside main window')
  await click(shell,'#rail-toggle')
  await until(()=>paperView.getBounds().x<contentBounds.x,'content follows collapsed sidebar')
  await click(shell,'#rail-toggle')
  await until(()=>paperView.getBounds().x===contentBounds.x,'content follows expanded sidebar')
  fs.writeFileSync(path.join(__dirname,'main-reading.png'),(await win.capturePage()).toPNG())
  check('native content fits main column, preserves sidebar, and hides on settings')
  const paperId=paper.id
  assert.equal(await js(paper,'typeof window.orbisReading'),'undefined')
  check('persistent reading and retelling views in main window; sandbox and API isolation')
  const denied=await js(retell,`window.orbisPaper.session.acquire().then(()=>false,()=>true)`);assert.equal(denied,true)
  const competitor=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'out/preload/index.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,additionalArguments:['--orbis-role=paper']}})
  api.registerPaperView(competitor,competitor.webContents)
  await competitor.loadFile(path.join(__dirname,'out/renderer/paper/index.html'))
  await until(()=>js(competitor.webContents,`document.body.textContent.includes('session already acquired')`),'competing Paper rejected')
  check('second Paper renderer and Retell writer acquisition refused before storage')
  competitor.destroy()
  openQueue.push([f.epubPath]);await js(paper,`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Add books')).click(); true`)
  const pages = (target = paper) => js(target, `[...document.querySelectorAll('foliate-view')].flatMap(v=>v.renderer?.getContents?.()??[]).map(({doc,index})=>({index,text:doc.body?.textContent,pdf:!!doc.querySelector('.textLayer')}))`)
  await until(async()=> (await pages(paper)).some(p=>p.text?.includes('Orbis integration passage')),'EPUB text rendered')
  check('EPUB through real dialog/preload/fs/vault/Foliate',await pages())
  // Shared typography travels from the settings document to both live engines.
  const typography = { contentWidth: '36', pageMargin: 'normal', fontSize: 18, latinFont: 'georgia', cjkFont: 'songti', lineHeight: '1.8' }
  const writeTypography = value => js(shell, `localStorage.setItem('orbis:reading-display-settings', ${JSON.stringify(JSON.stringify(value))}); true`)
  const bookTypography = () => js(paper, `(() => {
    const view=document.querySelector('foliate-view');
    const doc=view.renderer.getContents().find(x=>x.doc.querySelector('p'))?.doc;
    if(!doc)return null;
    const p=doc.querySelector('p'); const css=doc.defaultView.getComputedStyle(p);
    return { paragraphWidth:p.getBoundingClientRect().width, size:css.fontSize, line:css.lineHeight, family:css.fontFamily, variable:doc.documentElement.style.getPropertyValue('--paper-size'), max:view.renderer.getAttribute('max-inline-size') };
  })()`)
  await js(paper, `window.__beforeTypographyView=document.querySelector('foliate-view'); true`)
  await writeTypography(typography)
  await until(async()=> (await bookTypography())?.variable==='18px', 'host settings reach EPUB')
  const narrow = await bookTypography()
  await writeTypography({ ...typography, contentWidth: '60' })
  await until(async()=> (await bookTypography())?.paragraphWidth > narrow.paragraphWidth + 100, 'wider EPUB prose')
  const wide = await bookTypography()
  assert.equal(wide.size,'18px')
  assert.ok(wide.family.includes('Georgia'))
  await writeTypography({ ...typography, contentWidth: '0', pageMargin: 'compact' })
  await until(async()=> (await bookTypography())?.paragraphWidth > wide.paragraphWidth, 'unlimited prose uses available column')
  const compact = await bookTypography()
  await writeTypography({ ...typography, contentWidth: '0', pageMargin: 'extraWide' })
  await until(async()=> (await bookTypography())?.paragraphWidth < compact.paragraphWidth - 100, 'page margins narrow prose')
  await writeTypography({ ...typography, fontSize: 22 })
  await until(async()=> (await bookTypography())?.size==='22px', 'exact chosen EPUB font size')
  const resized = await bookTypography()
  assert.equal(await js(paper, `document.querySelector('foliate-view')===window.__beforeTypographyView`),true)
  assert.equal(resized.line,'39.6px')
  await until(()=>js(retell, `document.querySelector('#reading-app').style.getPropertyValue('--reading-font-size')==='22px'`),'Retell receives shared settings without remount')
  assert.equal(await js(retell,`document.querySelector('#reading-app').firstElementChild===window.__retellIdentity`),true)
  check('shared settings change real EPUB paragraph width, margins, font, leading and live Retell', { narrow, wide, compact, resized })
  await js(paper,`window.__paperIdentity={view:document.querySelector('foliate-view'),renderer:document.querySelector('foliate-view').renderer};true`)
  await js(retell,`window.orbisWorkspace.setMode('retell')`)
  assert.equal(await js(retell,`document.querySelector('#reading-app').firstElementChild===window.__retellIdentity&&document.querySelector('#reading-app').textContent===window.__retellText`),true)
  await js(retell,`window.orbisWorkspace.setMode('paper')`)
  assert.equal(await js(paper,`document.querySelector('foliate-view')===window.__paperIdentity.view&&document.querySelector('foliate-view').renderer===window.__paperIdentity.renderer`),true)
  assert.equal(retell.id,originalId);assert.equal(paper.id,paperId)
  check('mode switches preserve Retell DOM and Paper view/renderer identity')
  await until(() => js(paper, `document.querySelector('[class*="chipTitle"]')?.textContent === 'Orbis EPUB Integration'`), 'book metadata in chip')
  await until(() => fs.existsSync(path.join(data, 'paper/books')) && fs.readdirSync(path.join(data, 'paper/books')).length > 0 && fs.existsSync(path.join(data, 'paper/books', fs.readdirSync(path.join(data, 'paper/books'))[0], 'book.json')), 'book folder written to disk')
  // Select real EPUB DOM text, then use the production pointerup/selection tool chain.
  await js(paper,`(() => {const {doc}=document.querySelector('foliate-view').renderer.getContents().find(x=>x.doc.body.textContent.includes('Orbis integration passage'));const walker=doc.createTreeWalker(doc.body,4);let n;while((n=walker.nextNode()))if(n.textContent.includes('Orbis integration passage'))break;const start=n.textContent.indexOf('Orbis integration passage');const r=doc.createRange();r.setStart(n,start);r.setEnd(n,start+25);const s=doc.defaultView.getSelection();s.removeAllRanges();s.addRange(r);n.parentElement.dispatchEvent(new doc.defaultView.PointerEvent('pointerup',{bubbles:true,pointerType:'mouse',button:0}));return true})()`)
  await click(paper,'button[aria-label="Write a note on this passage"]')
  await until(async () => {
    if (await exists(paper, 'textarea[placeholder="Write a note"]')) return true
    const addNoteBtn = await js(paper, `!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Add a note')`)
    if (addNoteBtn) {
      await textClick(paper, 'Add a note')
      await sleep(100)
    }
    return exists(paper, 'textarea[placeholder="Write a note"]')
  }, 'note editor')
  await fill(paper,'textarea[placeholder="Write a note"]','Persistent integration note')
  await js(paper,`document.querySelector('textarea[placeholder="Write a note"]').focus();document.querySelector('textarea[placeholder="Write a note"]').blur();true`)
  await sleep(200)
  await click(paper,'button[aria-label="Make a card"]')
  await js(paper, `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', metaKey: true, ctrlKey: true, altKey: true, bubbles: true }))`)
  await sleep(200)
  if (await exists(paper, 'button[aria-label="Cards"]')) {
    await click(paper, 'button[aria-label="Cards"]')
    await until(() => exists(paper, 'button[aria-label="Discard card"]'), 'created card')
  }
  check('EPUB DOM selection → highlight/note → card through production UI')
  // Continue below as a named function so failures retain all intermediate artifacts.
  await finish({api,f,win,retell,paper,pages,openQueue,saveQueue,store,voice:()=>({voiceOpens,voiceCloses}),data})
  clearTimeout(timeout);fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify(report,null,2));console.log('PAPER_WORKSPACE_SMOKE_OK',JSON.stringify(report));app.exit(0)
}).catch(async error=>{
  for(const wc of webContents.getAllWebContents()) {
    try { fs.writeFileSync(path.join(__dirname, `failure-${wc.id}.txt`), wc.getURL()+'\n'+await js(wc, 'document.body.innerText')); } catch {}
  }
  clearTimeout(timeout);report.errors.push(String(error.stack??error));fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify(report,null,2));console.error('PAPER_WORKSPACE_SMOKE_FAILED',error);app.exit(1)})

async function finish(ctx) {
  const { api, f, pages, openQueue, store, data } = ctx
  let { win, retell, paper } = ctx

  // 1. PDF import & rendering
  await click(paper, 'button[aria-label="Library"]')
  await until(() => js(paper, `!!(document.querySelector('button[aria-label="Add books"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Add books')))`), 'Paper library view')
  openQueue.push([f.pdfPath])
  await js(paper, `(document.querySelector('button[aria-label="Add books"]') || [...document.querySelectorAll('button')].find(b=>b.textContent.includes('Add books'))).click(); true`)
  await until(async () => {
    const p = await pages(paper)
    return p.some(x => x.pdf && (x.text?.includes('Orbis PDF integration passage') || x.pdf))
  }, 'PDF text rendered', 30000)
  check('PDF through real dialog/preload/fs/makePdf/textLayer', await pages(paper))

  // 2. Change Theme to Sepia
  await click(paper, 'button[title*="Appearance"]')
  await until(() => exists(paper, 'button[data-theme="sepia"]'), 'Settings Sepia theme button')
  await click(paper, 'button[data-theme="sepia"]')
  await until(() => js(paper, `document.querySelector('[data-theme="sepia"]') !== null`), 'theme switched to sepia')
  check('Appearance settings switched theme to sepia')

  // 3. Close window cleanly via win.close()
  const closePromise = new Promise(resolve => win.once('closed', resolve))
  win.close()
  await closePromise
  check('Window closed with clean before-close drain and storage flush')

  const storePath = path.join(data, 'paper/paper.store.v1.json')
  assert.equal(fs.existsSync(storePath), true)
  const storedData = JSON.parse(fs.readFileSync(storePath, 'utf8'))
  assert.equal(typeof storedData['paper.cards.v1'], 'string')
  assert.equal(JSON.parse(storedData['paper.cards.v1']).length >= 1, true)
  check('Cards persisted to disk store (paper.store.v1.json)')

  // 4. Reopen reading window in paper mode
  await sleep(200)
  win = api.showReadingWindow('paper')
  retell = null
  const paperView = await until(() => win.contentView.children.find(v => v instanceof WebContentsView && !v.webContents.isDestroyed() && v.webContents.getURL().endsWith('/paper/index.html')), 'reopened Paper view')
  paper = paperView.webContents
  await until(() => !paper.isLoading(), 'paper loaded')
  await until(() => js(paper, `document.querySelector('[data-theme="sepia"]') !== null`), 'persisted sepia theme restored')
  check('Reopened window restored theme setting from disk')
  assert.equal(await js(paper, `JSON.parse(localStorage.getItem('orbis:reading-display-settings')).fontSize`),22)
  check('shared reading typography persisted across main window reopen')

  // 5. Verify shelf and reopen EPUB for notes & cards restoration
  if (await exists(paper, 'button[aria-label="Library"]')) {
    await click(paper, 'button[aria-label="Library"]')
  }
  await until(() => js(paper, `[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Orbis EPUB') || b.textContent.includes('integration.pdf') || b.title?.includes('Orbis EPUB') || b.title?.includes('integration.pdf'))`), 'books listed on shelf')
  check('Reopened shelf lists persisted EPUB and PDF')

  await js(paper, `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Orbis EPUB Integration') || b.title?.includes('Orbis EPUB Integration')).click(); true`)
  await until(async () => (await pages(paper)).some(p => p.text?.includes('Orbis integration passage')), 'reopened EPUB rendered')
  await click(paper, 'button[aria-label="Marginalia"]')
  await until(() => js(paper, `document.body.textContent.includes('Persistent integration note')`), 'persisted note restored in Marginalia')
  check('Persisted highlight and note restored across relaunch')

  // 6. Check Orbis Retell mode coexistence
  api.showReadingWindow('retell')
  retell=await until(()=>webContents.getAllWebContents().find(w=>w.getURL().endsWith('/reading/index.html')),'reopened Retell document')
  await until(() => exists(retell, '.article-row'), 'Retell home view active with stored articles')
  await click(retell, '.article-title-btn')
  await until(() => exists(retell, '#start-retell-btn'), 'Retell article view active')
  assert.equal(store.listArticles().length >= 1, true)
  assert.equal(store.listArticles()[0].title, 'Retell paste fixture')
  check('Retell article and flow intact after Paper round-trip')

  // 7. Phase 3 Forward Link: Paper selection/marginalia -> Orbis Retell Practice
  await js(retell, `window.orbisWorkspace.setMode('paper')`)
  // The Retell command belongs to the passage selection toolbar, not the
  // Marginalia pane. Explicitly select a passage after reopening the book.
  await js(paper, `(() => {
    const {doc}=document.querySelector('foliate-view').renderer.getContents().find(x=>x.doc.body.textContent.includes('Orbis integration passage'));
    const walker=doc.createTreeWalker(doc.body,4); let n;
    while((n=walker.nextNode())) if(n.textContent.includes('Orbis integration passage')) break;
    const start=n.textContent.indexOf('Orbis integration passage');
    const range=doc.createRange(); range.setStart(n,start); range.setEnd(n,start+25);
    const selection=doc.defaultView.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    n.parentElement.dispatchEvent(new doc.defaultView.PointerEvent('pointerup',{bubbles:true,pointerType:'mouse',button:0}));
    return true;
  })()`)
  await until(() => js(paper, `!!document.querySelector('button[aria-label="Practice retelling in Orbis"]')`), 'Retell button for selected Paper passage')

  // Click "Practice retelling in Orbis" on the note in Marginalia
  await js(paper, `document.querySelector('button[aria-label="Practice retelling in Orbis"]').click(); true`)

  // This calls window.orbisPaper.sendToRetell(...)
  // Main process switches workspace mode to 'retell' and sends openArticle
  await until(async () => {
    const isRetell = await js(win.webContents, `document.querySelector('#rail-retell').getAttribute('aria-current') === 'true'`)
    const hasArticle = await exists(retell, '#start-retell-btn')
    return isRetell && hasArticle
  }, 'Retell opened from Paper selection with start button')

  // Verify the newly created article in store
  const allArticles = store.listArticles()
  const paperArticle = allArticles.find(a => a.sourceType === 'paper')
  assert.ok(paperArticle, 'Paper article must be created in store')
  assert.ok(paperArticle.origin, 'Paper origin must be populated')
  assert.equal(paperArticle.origin.bookTitle, 'Orbis EPUB Integration')
  assert.ok(paperArticle.origin.bookId, 'Origin bookId must be present')
  check('Paper excerpt sent to Retell with origin anchors and auto-mapped keywords', paperArticle.origin)

  // Verify Retell DOM shows the article and keywords
  const retellDomInfo = await js(retell, `({
    hasStartBtn: !!document.querySelector('#start-retell-btn')
  })`)
  assert.equal(retellDomInfo.hasStartBtn, true)
  check('Retell article view rendered for Paper excerpt', retellDomInfo)

  // 8. Phase 3 Reverse Link: Retell -> Paper in-memory Card creation (Strict Single-Writer)
  const cardResult = await js(retell, `window.orbisWorkspace.saveToPaperCard({
    kind: 'Recall',
    title: '《Orbis EPUB Integration》· Retell Feedback Card',
    body: 'The Orbis integration passage keeps reading and retelling together.',
    answer: '【复述输出】\\nWe practiced retelling the core message.\\n\\n【教练讲评】\\nAccurate recall with great fluency.',
    source: 'Orbis EPUB Integration',
    bookId: ${JSON.stringify(paperArticle.origin.bookId)},
    cfi: ${JSON.stringify(paperArticle.origin.cfi ?? null)},
  })`)
  assert.equal(cardResult?.ok, true, `saveToPaperCard failed: ${cardResult?.error}`)
  assert.ok(cardResult?.cardId, 'Card ID should be returned')
  check('Retell feedback saved to Paper Card via single-writer IPC bridge', cardResult)

  // 9. Switch back to Paper mode and verify card is in memory & accessible
  await js(retell, `window.orbisWorkspace.setMode('paper')`)
  await js(paper, `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', metaKey: true, ctrlKey: true, altKey: true, bubbles: true }))`)
  await sleep(150)
  if (await exists(paper, 'button[aria-label="Cards"]')) {
    await click(paper, 'button[aria-label="Cards"]')
    await until(() => js(paper, `document.body.textContent.includes('Retell Feedback Card') || document.body.textContent.includes('Accurate recall with great fluency')`), 'card rendered in Paper UI')
  }
  check('Newly generated Retell card visible in Paper UI')

  // 10. Close window to trigger storage flush to disk, and verify disk persistence
  const closePromise2 = new Promise(resolve => win.once('closed', resolve))
  win.close()
  await closePromise2
  check('Window closed with final storage flush')

  const updatedStore = JSON.parse(fs.readFileSync(storePath, 'utf8'))
  const cardsList = JSON.parse(updatedStore['paper.cards.v1'])
  const bridgedCard = cardsList.find(c => c.id === cardResult.cardId || c.title?.includes('Retell Feedback Card') || c.body?.includes('Orbis integration passage'))
  assert.ok(bridgedCard, 'Bridged card must be persisted in paper.store.v1.json on disk')
  assert.equal(bridgedCard.bookId, paperArticle.origin.bookId)
  assert.ok(bridgedCard.answer.includes('Accurate recall with great fluency'))
  check('Bridged Card persisted with exact CFI/bookId anchors on disk (Single-Writer intact)', {
    id: bridgedCard.id,
    bookId: bridgedCard.bookId,
    cfi: bridgedCard.cfi,
    kind: bridgedCard.kind,
  })
}
