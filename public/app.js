'use strict';
const $=s=>document.querySelector(s);
const S={lang:localStorage.getItem('l')||'ar',me:null,cfg:{},v:'programs',arg:null,tab:'login',msg:'',q:'',sec:'',at:'kyc',setup:null};
const t=(a,b)=>S.lang==='ar'?b:a, L=o=>o[S.lang==='ar'?1:0];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const egp=n=>Number(n||0).toLocaleString(S.lang==='ar'?'ar-EG':'en-US')+' '+t('EGP','ج.م');
const dt=s=>new Date(s).toLocaleDateString(S.lang==='ar'?'ar-EG':'en-GB');
const fd=f=>Object.fromEntries(new FormData(f));
const SEV={critical:['Critical','حرجة'],high:['High','عالية'],medium:['Medium','متوسطة'],low:['Low','منخفضة']};
const ST={new:['New','جديد'],triaged:['Triaged','تم الفرز'],accepted:['Accepted','مقبول'],resolved:['Resolved','تم الإصلاح'],duplicate:['Duplicate','مكرر'],na:['Not applicable','غير منطبق']};
const SC={bank:['Banking & Fintech','البنوك والتقنية المالية'],telecom:['Telecom','الاتصالات'],ecommerce:['E-commerce','التجارة الإلكترونية'],health:['Healthcare','الصحة'],logistics:['Logistics','اللوجستيات'],gov:['Government','الحكومة'],other:['Other','أخرى']};
const ER={BAD_LOGIN:['Wrong email or password','البريد أو كلمة المرور غير صحيحة'],OTP_REQUIRED:['Enter your authenticator code','أدخل رمز المصادقة'],BAD_OTP:['Wrong authenticator code','رمز المصادقة غير صحيح'],EMAIL_NOT_VERIFIED:['Verify your email first','فعّل بريدك الإلكتروني أولاً'],LOCKED:['Too many attempts. Try again in 15 minutes','محاولات كثيرة. حاول بعد 15 دقيقة'],DUPLICATE:['Already exists','موجود بالفعل'],VALIDATION:['Please check the fields','تحقق من البيانات المدخلة'],COC_REQUIRED:['You must accept the Code of Conduct','يجب الموافقة على مدونة السلوك'],NOT_IN_SCOPE:['Asset is not in a verified in-scope domain','الأصل خارج النطاق الموثّق للبرنامج'],DNS_NOT_FOUND:['TXT record not found yet (DNS can take a while)','لم يتم العثور على سجل TXT بعد (قد يستغرق انتشار DNS وقتاً)'],DOMAIN_TAKEN:['Domain already verified by another company','النطاق موثّق لدى شركة أخرى'],NO_DOMAIN:['Add at least one valid domain','أضف نطاقاً صحيحاً واحداً على الأقل'],INSUFFICIENT_BALANCE:['Insufficient balance','الرصيد غير كافٍ'],ALREADY_PAID:['A bounty was already paid','تم صرف مكافأة لهذا التقرير'],BAD_STATUS:['Not allowed for this status','غير مسموح بهذه الحالة'],KYC_REQUIRED:['Identity verification is required first','يجب التحقق من الهوية أولاً'],KYC_LOCKED:['KYC already submitted','تم إرسال الهوية مسبقاً'],NO_EARNINGS:['No earnings yet','لا توجد أرباح بعد'],NAME_MISMATCH:['Account name must match your verified ID name','اسم الحساب يجب أن يطابق اسم البطاقة'],MIN_WITHDRAWAL:['Below the minimum withdrawal','أقل من الحد الأدنى للسحب'],FILE_TYPE:['File type not allowed','نوع الملف غير مسموح'],FILE_TOO_BIG:['File too large','الملف كبير جداً'],FORBIDDEN:['Not allowed','غير مسموح'],NOT_FOUND:['Not found','غير موجود']};
const msg=c=>ER[c]?L(ER[c]):c, fail=x=>toast(msg(x.code||x.message),1);
const toast=(m,bad)=>{const d=document.createElement('div');d.className='toast'+(bad?' bad':'');d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),3500)};
async function api(m,u,b,form){const o={method:m,headers:{}};if(form)o.body=form;else if(b){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}
 const r=await fetch('/api'+u,o),j=await r.json().catch(()=>({}));
 if(!r.ok){const x=new Error(j.code||'ERR');x.code=j.code||'ERR';if(x.code==='2FA_SETUP'&&S.me){S.me.totp_enabled=false;render()}else if(x.code==='AUTH'&&S.me){S.me=null;render()}throw x}return j}
const NAV={hacker:[['programs','Programs','البرامج'],['mine','My reports','تقاريري'],['wallet','Wallet','المحفظة'],['lb','Leaderboard','المتصدرون']],
 company:[['mine','Reports','التقارير'],['cprogs','My programs','برامجي'],['wallet','Wallet','المحفظة'],['lb','Leaderboard','المتصدرون']],
 admin:[['adm','Admin','الإدارة'],['mine','Reports','التقارير']]};
const HOME={hacker:'programs',company:'mine',admin:'adm'};
const IMP=[['N','None','بدون'],['L','Low','منخفض'],['H','High','مرتفع']];
const CV={AV:['Attack vector','متجه الهجوم',[['N','Network','شبكة'],['A','Adjacent','مجاور'],['L','Local','محلي'],['P','Physical','فيزيائي']]],AC:['Complexity','التعقيد',[['L','Low','منخفض'],['H','High','مرتفع']]],PR:['Privileges required','الصلاحيات المطلوبة',IMP],UI:['User interaction','تفاعل المستخدم',[['N','None','بدون'],['R','Required','مطلوب']]],S:['Scope','النطاق',[['U','Unchanged','ثابت'],['C','Changed','متغير']]],C:['Confidentiality','السرية',IMP],I:['Integrity','السلامة',IMP],A:['Availability','التوافر',IMP]};
const DEF={AV:'N',AC:'L',PR:'N',UI:'N',S:'U',C:'L',I:'L',A:'N'};
const COC=()=>t('I accept the Code of Conduct: I test only in-scope assets, never access, change or leak real user data, never run DoS or social engineering, never exploit a vulnerability for damage or extortion, disclose privately through EgyBounty only, and respect Egyptian law.','أوافق على مدونة السلوك: أختبر الأصول داخل النطاق فقط، ولا أصل إلى بيانات المستخدمين الحقيقية أو أعدلها أو أسربها، ولا أستخدم هجمات الحرمان من الخدمة أو الهندسة الاجتماعية، ولا أستغل الثغرة للتخريب أو الابتزاز، وأُبلغ بشكل خاص عبر EgyBounty فقط، وألتزم بالقانون المصري.');

// ---------- shell ----------
function head(){const m=S.me;return `<header><span class="logo"><b>Egy</b>Bounty</span><nav>${m&&m.totp_enabled?NAV[m.role].map(([k,a,b])=>`<a data-a="go" data-v="${k}" class="${S.v===k?'on':''}">${t(a,b)}</a>`).join(''):''}</nav><button class="btn s" data-a="lang">${S.lang==='ar'?'EN':'عربي'}</button>${m?`<button class="btn s" data-a="out">${e(m.handle)} ⎋</button>`:''}</header>`}
async function render(){document.documentElement.lang=S.lang;document.documentElement.dir=S.lang==='ar'?'rtl':'ltr';let x;
 try{x=!S.me?authView():!S.me.totp_enabled?await setupView():await VIEW[S.v]()}catch(z){x=`<div class="note bad">${e(msg(z.code||z.message))}</div>`}
 $('#app').innerHTML=head()+`<main>${x}</main>`}
const go=(v,a)=>{S.v=v;S.arg=a;render();scrollTo(0,0)};

// ---------- auth ----------
function authView(){const r=S.tab==='reg';return `<div class="hero"><h1>${t("Hack Egypt's apps. Get paid in EGP.",'اختبر تطبيقات مصر واحصل على مكافأتك بالجنيه.')}</h1><p>${t('The Egyptian platform that connects ethical hackers with companies through coordinated vulnerability disclosure.','المنصة المصرية التي تربط الهاكرز الأخلاقيين بالشركات عبر الإفصاح المنسّق عن الثغرات.')}</p></div>
<div class="card narrow"><div class="tabs"><a data-a="tab" data-v="login" class="${r?'':'on'}">${t('Log in','دخول')}</a><a data-a="tab" data-v="reg" class="${r?'on':''}">${t('Sign up','تسجيل')}</a></div>${S.msg?`<div class="note">${e(S.msg)}</div>`:''}
${r?`<form data-f="reg"><label>${t('Account type','نوع الحساب')}</label><select name="role"><option value="hacker">${t('Hacker','هاكر أخلاقي')}</option><option value="company">${t('Company','شركة')}</option></select>
<label>${t('Handle (alias)','الاسم المستعار')}</label><input name="handle" required minlength="3" maxlength="24" placeholder="MR.DOM">
<label>${t('Company name (companies only)','اسم الشركة (للشركات فقط)')}</label><input name="company_name">
<label>${t('Email','البريد الإلكتروني')}</label><input name="email" type="email" required>
<label>${t('Password (10+ characters)','كلمة المرور (10 أحرف على الأقل)')}</label><input name="password" type="password" required minlength="10">
<details class="note"><summary>${t('Code of Conduct','مدونة السلوك')}</summary>${COC()}</details>
<p><input type="checkbox" name="accept_coc" required><label>${t('I accept the Code of Conduct','أوافق على مدونة السلوك')}</label></p>
<button class="btn p">${t('Create account','إنشاء حساب')}</button></form>`
:`<form data-f="login"><label>${t('Email','البريد الإلكتروني')}</label><input name="email" type="email" required><label>${t('Password','كلمة المرور')}</label><input name="password" type="password" required>
<label>${t('Authenticator code (6 digits)','رمز المصادقة (6 أرقام)')}</label><input name="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button class="btn p">${t('Log in','دخول')}</button></form>`}</div>`}
async function setupView(){if(!S.setup)S.setup=await api('POST','/auth/2fa/setup');return `<div class="card narrow"><h1>${t('Enable two-step verification','تفعيل التحقق بخطوتين')}</h1><p>${t('Scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy), then enter the 6-digit code. This is required for every account.','امسح رمز QR بتطبيق مصادقة (Google Authenticator أو Microsoft Authenticator أو Authy) ثم أدخل الرمز المكوّن من 6 أرقام. هذه الخطوة إلزامية لكل الحسابات.')}</p>
<img class="qr" src="${S.setup.qr}" alt="QR"><p>${t('Or enter this key manually:','أو أدخل هذا المفتاح يدوياً:')} <code>${e(S.setup.secret)}</code></p>
<form data-f="otp"><label>${t('Code','الرمز')}</label><input name="otp" inputmode="numeric" maxlength="6" required><button class="btn p">${t('Enable','تفعيل')}</button></form></div>`}

// ---------- programs & reports ----------
const pcard=p=>`<div class="card k" data-a="prog" data-v="${p.id}"><b>${e(L([p.name,p.name_ar]))}</b><br><span class="tag">${e(L(SC[p.sector]||SC.other))}</span><p>${e(L([p.description,p.description_ar]).slice(0,110))}</p><span class="sev high">${t('Up to','حتى')}</span> ${egp(Math.max(...p.rewards))}</div>`;
async function vPrograms(){const ps=await api('GET','/programs?'+new URLSearchParams({q:S.q,sector:S.sec}));
 return `<h1>${t('Programs','البرامج')}</h1><form data-f="search" class="row"><input name="q" value="${e(S.q)}" placeholder="${t('Search…','ابحث…')}"><select name="sec"><option value="">${t('All sectors','كل القطاعات')}</option>${Object.keys(SC).map(k=>`<option value="${k}" ${S.sec===k?'selected':''}>${L(SC[k])}</option>`).join('')}</select><button class="btn">${t('Search','بحث')}</button></form><div class="grid">${ps.map(pcard).join('')||`<p>${t('No active programs yet','لا توجد برامج نشطة بعد')}</p>`}</div>`}
async function vProg(){const p=await api('GET','/programs/'+S.arg),hk=S.me.role==='hacker';
 return `<a class="back" data-a="go" data-v="programs">${t('← Back','→ رجوع')}</a><h1>${e(L([p.name,p.name_ar]))}</h1><span class="tag">${e(L(SC[p.sector]||SC.other))}</span><span class="tag">${e(p.company)}</span><p class="txt">${e(L([p.description,p.description_ar]))}</p>
<h2>${t('In scope (verified domains)','النطاق (نطاقات موثّقة)')}</h2><div class="card">${p.domains.map(d=>`<span class="tag">*.${e(d)}</span>`).join('')}</div>
<h2>${t('Rewards','المكافآت')}</h2><div class="tbl"><table><tr>${Object.keys(SEV).map(k=>`<th class="sev ${k}">${L(SEV[k])}</th>`).join('')}</tr><tr>${p.rewards.map(x=>`<td>${egp(x)}</td>`).join('')}</tr></table></div>
<div class="note">${t(`EgyBounty keeps ${S.cfg.commission}% of each bounty as a platform fee.`,`تحتفظ EgyBounty بنسبة ${S.cfg.commission}% من كل مكافأة كرسوم للمنصة.`)} ${COC()}</div>${hk?subForm(p):''}`}
function subForm(p){return `<h2>${t('Submit a report','إرسال تقرير')}</h2><form data-f="submit" data-v="${p.id}" class="card"><label>${t('Title','العنوان')}</label><input name="title" required maxlength="200">
<label>${t('Affected asset (URL or host in scope)','الأصل المتأثر (رابط أو نطاق داخل النطاق)')}</label><input name="asset" required placeholder="https://api.${e(p.domains[0]||'example.eg')}/..." dir="ltr">
<label>CVSS 3.1 ${t('(score is calculated by the server)','(تُحسب الدرجة على الخادم)')} <b id="cvp"></b></label><div class="row">${Object.entries(CV).map(([k,[a,b,o]])=>`<div><label>${t(a,b)}</label><select name="${k}" data-c="cv">${o.map(([v,x,y])=>`<option value="${v}" ${DEF[k]===v?'selected':''}>${t(x,y)}</option>`).join('')}</select></div>`).join('')}</div>
<label>${t('Description','الوصف')}</label><textarea name="description" rows="4" required></textarea><label>${t('Steps to reproduce','خطوات إعادة الإنتاج')}</label><textarea name="steps" rows="4"></textarea><label>${t('Impact','التأثير')}</label><textarea name="impact" rows="2"></textarea>
<button class="btn p">${t('Send report','إرسال التقرير')}</button></form>`}
async function vMine(){const rs=await api('GET','/reports'),co=S.me.role!=='hacker';
 return `<h1>${co?t('Reports','التقارير'):t('My reports','تقاريري')}</h1>`+(rs.length?`<div class="tbl"><table><tr><th>#</th><th>${t('Title','العنوان')}</th><th>${t('Program','البرنامج')}</th><th>${t('Severity','الخطورة')}</th><th>${t('Status','الحالة')}</th><th>${t('Bounty','المكافأة')}</th>${co?`<th>${t('Hacker','الهاكر')}</th>`:''}<th>${t('Date','التاريخ')}</th></tr>${rs.map(r=>`<tr><td>${r.id}</td><td><a data-a="rep" data-v="${r.id}"><b>${e(r.title)}</b></a>${r.dup_hint?` <span class="tag">${t('possible dup of','قد يكون مكرراً لـ')} #${r.dup_hint}</span>`:''}</td><td>${e(L([r.program,r.program_ar]))}</td><td class="sev ${r.severity}">${L(SEV[r.severity])} ${r.cvss_score??''}</td><td><span class="st">${L(ST[r.status])}</span></td><td>${Number(r.bounty)?egp(r.bounty):'—'}</td>${co?`<td>${e(r.handle)}</td>`:''}<td>${dt(r.created_at)}</td></tr>`).join('')}</table></div>`:`<p>${t('Nothing here yet.','لا شيء هنا بعد.')}</p>`)}
async function vRep(){const {report:r,comments:cs,attachments:as}=await api('GET','/reports/'+S.arg),co=S.me.role!=='hacker',cm=S.me.role==='company';
 return `<a class="back" data-a="go" data-v="mine">${t('← Back','→ رجوع')}</a><h1>#${r.id} ${e(r.title)}</h1>
<div><span class="sev ${r.severity}">${L(SEV[r.severity])} ${r.cvss_score??''}</span> <span class="st">${L(ST[r.status])}</span> <span class="tag">${e(L([r.program,r.program_ar]))}</span> <span class="tag">${e(r.handle)}</span> ${Number(r.bounty)?`<span class="tag">${egp(r.bounty)}</span>`:''}</div>
${r.dup_hint&&co?`<div class="note">${t('Possible duplicate of report','قد يكون مكرراً للتقرير')} #${r.dup_hint}</div>`:''}
<h2>${t('Asset','الأصل')}</h2><code>${e(r.asset)}</code>${r.cvss_vector?`<p><code>${e(r.cvss_vector)}</code></p>`:''}
<h2>${t('Description','الوصف')}</h2><div class="txt">${e(r.description)}</div><h2>${t('Steps to reproduce','خطوات إعادة الإنتاج')}</h2><div class="txt">${e(r.steps)}</div><h2>${t('Impact','التأثير')}</h2><div class="txt">${e(r.impact)}</div>
${co?`<h2>${t('Triage','الفرز')}</h2><div class="card"><label>${t('Status','الحالة')}</label><select data-c="status" data-v="${r.id}">${Object.keys(ST).map(k=>`<option value="${k}" ${r.status===k?'selected':''}>${L(ST[k])}</option>`).join('')}</select>
${cm&&!Number(r.bounty)&&!['duplicate','na'].includes(r.status)?`<form data-f="bounty" data-v="${r.id}" class="row"><input name="amount" type="number" min="1" step="0.01" required placeholder="${t('Bounty (EGP)','المكافأة (جنيه)')}"><button class="btn g">${t('Pay bounty','صرف المكافأة')}</button></form><small>${t(`Debited from your balance; the hacker receives ${100-S.cfg.commission}%.`,`تُخصم من رصيدك ويستلم الهاكر ${100-S.cfg.commission}%.`)}</small>`:''}</div>`:''}
<h2>${t('Attachments','المرفقات')}</h2><div class="card">${as.map(a=>`<div><a href="/api/attachments/${a.id}" target="_blank" rel="noopener">${e(a.filename)}</a> <small>(${Math.ceil(a.size/1024)} KB)</small></div>`).join('')||`<small>${t('None','لا توجد')}</small>`}
${S.me.role!=='admin'?`<form data-f="upload" data-v="${r.id}" class="row"><input type="file" name="file" required accept=".png,.jpg,.jpeg,.pdf,.mp4,.txt"><button class="btn">${t('Upload','رفع')}</button></form>`:''}</div>
<h2>${t('Comments','التعليقات')}</h2><div class="card">${cs.map(c=>`<div class="cm"><b>${e(c.handle)}</b> <small>${c.role==='company'?t('Company','الشركة'):''} · ${dt(c.created_at)}</small><div class="txt">${e(c.body)}</div></div>`).join('')}
<form data-f="comment" data-v="${r.id}"><textarea name="body" rows="2" required></textarea><button class="btn">${t('Send','إرسال')}</button></form></div>`}

// ---------- money ----------
async function vWallet(){const w=await api('GET','/wallet');
 if(S.me.role==='company')return `<h1>${t('Wallet','المحفظة')}</h1><div class="stats"><div class="stat"><b>${egp(w.balance)}</b><span>${t('Available balance','الرصيد المتاح')}</span></div></div>
<div class="note">${t('Transfer funds to the EgyBounty bank account, then submit the transfer reference. Your balance is credited after an admin confirms the transfer.','حوّل المبلغ إلى الحساب البنكي لـ EgyBounty ثم أرسل رقم مرجع التحويل. يُضاف الرصيد بعد تأكيد الإدارة.')}<br><b>${e(S.cfg.bank)}</b></div>
<form data-f="dep" class="card row"><input name="amount" type="number" min="1" step="0.01" required placeholder="${t('Amount (EGP)','المبلغ (جنيه)')}"><input name="reference" required placeholder="${t('Transfer reference','مرجع التحويل')}"><button class="btn p">${t('Submit deposit','إرسال الإيداع')}</button></form>
<div class="tbl"><table><tr><th>${t('Amount','المبلغ')}</th><th>${t('Reference','المرجع')}</th><th>${t('Status','الحالة')}</th><th>${t('Date','التاريخ')}</th></tr>${w.deposits.map(d=>`<tr><td>${egp(d.amount)}</td><td>${e(d.reference)}</td><td><span class="st">${e(d.status)}</span></td><td>${dt(d.created_at)}</td></tr>`).join('')}</table></div>`;
 const k=w.kyc_status;
 return `<h1>${t('Wallet','المحفظة')}</h1><div class="stats"><div class="stat"><b>${egp(w.earned)}</b><span>${t('Earned (after commission)','الأرباح (بعد العمولة)')}</span></div><div class="stat"><b>${egp(w.available)}</b><span>${t('Available','المتاح للسحب')}</span></div></div>
${k==='approved'?`<h2>${t('Withdraw','سحب')}</h2><form data-f="wd" class="card"><div class="row"><select name="method"><option value="bank">${t('Bank account','حساب بنكي')}</option><option value="instapay">InstaPay</option></select><input name="amount" type="number" min="${S.cfg.min_withdrawal}" step="0.01" required placeholder="${t('Amount','المبلغ')}"></div><input name="account_name" required placeholder="${t('Account holder name (must match your ID)','اسم صاحب الحساب (مطابق للبطاقة)')}"><input name="account_number" required dir="ltr" placeholder="IBAN / InstaPay"><button class="btn p">${t('Request withdrawal','طلب سحب')}</button></form>`
 :k==='pending'?`<div class="note">${t('Your identity is under review.','هويتك قيد المراجعة.')}</div>`
 :w.earned>0?`<h2>${t('Verify your identity','التحقق من الهوية')}</h2><div class="note">${t('Required before your first withdrawal: upload your national ID and enter your name exactly as on the bank account. The ID is used only for payment compliance.','مطلوب قبل أول سحب: ارفع صورة بطاقة الرقم القومي واكتب اسمك كما في الحساب البنكي. تُستخدم البطاقة لأغراض الامتثال المالي فقط.')}${k==='rejected'?` <b>${t('Previous attempt was rejected.','تم رفض المحاولة السابقة.')}</b>`:''}</div><form data-f="kyc" class="card"><input name="name" required minlength="5" placeholder="${t('Full name','الاسم الكامل')}"><input type="file" name="id_image" required accept=".png,.jpg,.jpeg,.pdf"><button class="btn p">${t('Submit','إرسال')}</button></form>`:`<div class="note">${t('Identity verification is requested when you earn your first bounty.','يُطلب التحقق من الهوية عند استحقاق أول مكافأة.')}</div>`}
<h2>${t('Withdrawals','عمليات السحب')}</h2><div class="tbl"><table>${w.withdrawals.map(x=>`<tr><td>${egp(x.amount)}</td><td>${e(x.method)}</td><td><span class="st">${e(x.status)}</span></td><td>${dt(x.created_at)}</td></tr>`).join('')||`<tr><td>${t('None','لا توجد')}</td></tr>`}</table></div>
<h2>${t('Payouts','المكافآت المستلمة')}</h2><div class="tbl"><table>${w.payouts.map(x=>`<tr><td>#${x.report_id}</td><td>${egp(x.gross)}</td><td>−${egp(x.fee)}</td><td><b>${egp(x.net)}</b></td><td>${dt(x.created_at)}</td></tr>`).join('')||`<tr><td>${t('None','لا توجد')}</td></tr>`}</table></div>`}
async function vLb(){const r=await api('GET','/leaderboard');return `<h1>${t('Leaderboard','المتصدرون')}</h1><div class="tbl"><table><tr><th>#</th><th>${t('Hacker','الهاكر')}</th><th>${t('Points','النقاط')}</th><th>${t('Valid reports','تقارير مقبولة')}</th></tr>${r.map((x,i)=>`<tr><td>${i+1}</td><td>${e(x.handle)}</td><td>${x.points}</td><td>${x.reports}</td></tr>`).join('')}</table></div>`}

// ---------- company programs ----------
async function vCprogs(){const ps=await api('GET','/programs/mine');
 return `<h1>${t('My programs','برامجي')}</h1>${ps.map(p=>`<div class="card"><b>${e(p.name)}</b> <span class="st">${e(p.status)}</span>${p.domains.map(d=>`<div class="cm"><b dir="ltr">${e(d.domain)}</b> ${d.verified?`<span class="st">✔ ${t('verified','موثّق')}</span>`:`<span class="st">${t('unverified','غير موثّق')}</span><div class="note">${t('Add a TXT record on this domain with this value, then press Verify:','أضف سجل TXT على هذا النطاق بالقيمة التالية ثم اضغط تحقق:')} <code>${e(d.token)}</code></div><button class="btn s p" data-a="vd" data-v="${p.id}:${d.id}">${t('Verify domain','تحقق من النطاق')}</button>`}</div>`).join('')}
<form data-f="adddom" data-v="${p.id}" class="row"><input name="domain" dir="ltr" placeholder="example.eg" required><button class="btn s">${t('Add domain','إضافة نطاق')}</button></form></div>`).join('')}
<h2>${t('New program','برنامج جديد')}</h2><form data-f="newprog" class="card"><div class="row"><input name="name" required placeholder="${t('Program name','اسم البرنامج')}"><input name="name_ar" placeholder="${t('Arabic name (optional)','الاسم بالعربية (اختياري)')}"></div><select name="sector">${Object.keys(SC).map(k=>`<option value="${k}">${L(SC[k])}</option>`).join('')}</select>
<textarea name="description" rows="3" required placeholder="${t('Description and rules','الوصف والقواعد')}"></textarea><textarea name="domains" rows="2" dir="ltr" required placeholder="example.eg&#10;app.example.eg"></textarea>
<label>${t('Rewards (EGP)','المكافآت (جنيه)')}: ${Object.keys(SEV).map(k=>L(SEV[k])).join(' / ')}</label><div class="row"><input name="r0" type="number" min="0" value="40000"><input name="r1" type="number" min="0" value="20000"><input name="r2" type="number" min="0" value="6000"><input name="r3" type="number" min="0" value="1500"></div>
<button class="btn p">${t('Create program','إنشاء البرنامج')}</button></form>`}

// ---------- admin ----------
async function vAdm(){const k=S.at,L2=await api('GET','/admin/'+k),tabs=[['kyc','Identity','الهويات'],['deposits','Deposits','الإيداعات'],['withdrawals','Withdrawals','السحوبات']];
 return `<h1>${t('Admin','الإدارة')}</h1><div class="tabs">${tabs.map(([x,a,b])=>`<a data-a="at" data-v="${x}" class="${k===x?'on':''}">${t(a,b)}</a>`).join('')}</div>`+(L2.length?L2.map(x=>`<div class="card">${k==='kyc'?`<b>${e(x.handle)}</b> · ${e(x.email)}<br>${t('Name','الاسم')}: <b>${e(x.kyc_name)}</b> <a href="/api/admin/kyc/${x.id}/file" target="_blank" rel="noopener">${t('View ID','عرض البطاقة')}</a><br><button class="btn s g" data-a="adm" data-v="kyc:${x.id}:approve">${t('Approve','موافقة')}</button> <button class="btn s" data-a="adm" data-v="kyc:${x.id}:reject">${t('Reject','رفض')}</button>`
 :k==='deposits'?`<b>${e(x.company)}</b> · ${egp(x.amount)} · ${e(x.reference)}<br><button class="btn s g" data-a="adm" data-v="deposits:${x.id}:confirm">${t('Confirm received','تأكيد الاستلام')}</button> <button class="btn s" data-a="adm" data-v="deposits:${x.id}:reject">${t('Reject','رفض')}</button>`
 :`<b>${e(x.handle)}</b> · ${egp(x.amount)} · ${e(x.method)}<br>${e(x.account_name)} · <code>${e(x.account_number)}</code><br><button class="btn s g" data-a="adm" data-v="withdrawals:${x.id}:paid">${t('Mark as paid','تم التحويل')}</button> <button class="btn s" data-a="adm" data-v="withdrawals:${x.id}:reject">${t('Reject','رفض')}</button>`}</div>`).join(''):`<p>${t('Nothing pending.','لا شيء معلّق.')}</p>`)}

const VIEW={programs:vPrograms,prog:vProg,mine:vMine,rep:vRep,wallet:vWallet,lb:vLb,cprogs:vCprogs,adm:vAdm};
// ---------- actions ----------
const A={go:v=>go(v),prog:v=>go('prog',v),rep:v=>go('rep',v),tab(v){S.tab=v;S.msg='';render()},at(v){S.at=v;render()},
 lang(){S.lang=S.lang==='ar'?'en':'ar';localStorage.setItem('l',S.lang);render()},
 async out(){await api('POST','/auth/logout');S.me=null;S.setup=null;render()},
 async vd(v){const[p,d]=v.split(':');try{await api('POST',`/programs/${p}/domains/${d}/verify`);toast(t('Domain verified','تم التحقق من النطاق'))}catch(x){fail(x)}render()},
 async adm(v){const[k,id,a]=v.split(':');try{await api('POST',k==='kyc'?`/admin/kyc/${id}`:`/admin/${k}/${id}/${a}`,k==='kyc'?{approve:a==='approve'}:undefined)}catch(x){fail(x)}render()}};
const C={async status(v,el){const b={status:el.value};if(el.value==='duplicate'){const d=prompt(t('Original report ID?','رقم التقرير الأصلي؟'));if(!d)return render();b.duplicate_of=+d}try{await api('PATCH',`/reports/${v}/status`,b)}catch(x){fail(x)}render()},
 async cv(v,el){const f=el.form,vec='CVSS:3.1/'+Object.keys(CV).map(k=>k+':'+f[k].value).join('/');try{const r=await api('GET','/cvss?vector='+encodeURIComponent(vec));$('#cvp').textContent=` ${r.score} (${L(SEV[r.severity])})`}catch{}}};
const done=(m,fn)=>{toast(m);fn?fn():render()};
const F={
 async login(f){S.me=(await api('POST','/auth/login',fd(f))).user;S.v=HOME[S.me.role];render()},
 async reg(f){const r=await api('POST','/auth/register',fd(f));S.tab='login';S.msg=r.verify?t('Check your email to verify your account, then log in.','تحقق من بريدك الإلكتروني لتفعيل الحساب ثم سجّل الدخول.'):t('Account created. You can log in.','تم إنشاء الحساب. يمكنك تسجيل الدخول.');render()},
 async otp(f){await api('POST','/auth/2fa/enable',fd(f));S.me=(await api('GET','/auth/me')).user;S.setup=null;S.v=HOME[S.me.role];render()},
 search(f){const d=fd(f);S.q=d.q;S.sec=d.sec;render()},
 async submit(f){const d=fd(f),r=await api('POST',`/programs/${f.dataset.v}/reports`,{title:d.title,asset:d.asset,cvss_vector:'CVSS:3.1/'+Object.keys(CV).map(k=>k+':'+d[k]).join('/'),description:d.description,steps:d.steps,impact:d.impact});toast(t('Report submitted','تم إرسال التقرير'));go('rep',r.id)},
 async comment(f){await api('POST',`/reports/${f.dataset.v}/comments`,fd(f));render()},
 async upload(f){await api('POST',`/reports/${f.dataset.v}/attachments`,null,new FormData(f));done(t('Uploaded','تم الرفع'))},
 async bounty(f){await api('POST',`/reports/${f.dataset.v}/bounty`,{amount:+fd(f).amount});done(t('Bounty paid','تم صرف المكافأة'))},
 async dep(f){await api('POST','/deposits',fd(f));done(t('Deposit submitted for confirmation','أُرسل الإيداع للتأكيد'))},
 async kyc(f){await api('POST','/kyc',null,new FormData(f));S.me.kyc_status='pending';done(t('Submitted for review','أُرسلت للمراجعة'))},
 async wd(f){await api('POST','/withdraw',fd(f));done(t('Withdrawal requested','تم طلب السحب'))},
 async adddom(f){await api('POST',`/programs/${f.dataset.v}/domains`,fd(f));render()},
 async newprog(f){const d=fd(f);await api('POST','/programs',{name:d.name,name_ar:d.name_ar,sector:d.sector,description:d.description,domains:d.domains.split(/[\s,]+/).filter(Boolean),rewards:[d.r0,d.r1,d.r2,d.r3].map(Number)});done(t('Program created. Verify your domain to activate it.','تم إنشاء البرنامج. وثّق النطاق لتفعيله.'))}};
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-a]');if(b){ev.preventDefault();A[b.dataset.a](b.dataset.v,b)}});
document.addEventListener('change',ev=>{const b=ev.target.closest('[data-c]');if(b)C[b.dataset.c](b.dataset.v,b)});
document.addEventListener('submit',async ev=>{const f=ev.target.closest('[data-f]');if(!f)return;ev.preventDefault();try{await F[f.dataset.f](f)}catch(x){fail(x)}});
(async()=>{try{S.cfg=await api('GET','/config')}catch{}try{S.me=(await api('GET','/auth/me')).user;S.v=HOME[S.me.role]}catch{S.me=null}
 if(new URLSearchParams(location.search).get('verified'))S.msg=t('Email verified. You can log in.','تم تفعيل البريد. يمكنك تسجيل الدخول.');render()})();
