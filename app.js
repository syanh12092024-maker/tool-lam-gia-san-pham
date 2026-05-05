// ═══ SHIPPING RULES ═══
// Leg 1: China → UAE (RMB/kg) by goods type
const SHIP_CN_UAE = { normal: 43, cosmetic: 58, supplement: 58 };
// Leg 1 ALT: China → Saudi direct (RMB/kg)
const SHIP_CN_SA = { normal: 56, cosmetic: 97, supplement: 120 };
// Leg 1 ALT: China → Kuwait/Qatar/Oman/Bahrain (RMB/kg)
const SHIP_CN_GCC = { normal: 56, cosmetic: 99, supplement: 99 };
// Leg 2: UAE → Destination (AED/kg)
const SHIP_UAE_DEST = { UAE:0, SAUDI:25, KUWAIT:35, QATAR:35, OMAN:35, BAHRAIN:35 };
// Max freight caps (AED/kg) from UAE
const FREIGHT_CAP = { normal:40, cosmetic:35, supplement:40 };

const MARKETS={
QATAR:  {flag:'🇶🇦',cur:'QAR',rate:6458,pack:24570,del:127868,fail:60021,route:'gcc'},
UAE:    {flag:'🇦🇪',cur:'AED',rate:6800,pack:24570,del:110000,fail:55000,route:'uae'},
SAUDI:  {flag:'🇸🇦',cur:'SAR',rate:6650,pack:24570,del:127868,fail:60021,route:'saudi'},
KUWAIT: {flag:'🇰🇼',cur:'KWD',rate:81000,pack:24570,del:130000,fail:62000,route:'gcc'},
OMAN:   {flag:'🇴🇲',cur:'OMR',rate:64800,pack:24570,del:125000,fail:58000,route:'gcc'},
BAHRAIN:{flag:'🇧🇭',cur:'BHD',rate:66200,pack:24570,del:120000,fail:56000,route:'gcc'},
JAPAN:  {flag:'🇯🇵',cur:'JPY',rate:170,pack:20000,del:100000,fail:50000,route:'direct',directShip:280000},
TAIWAN: {flag:'🇹🇼',cur:'TWD',rate:810,pack:18000,del:85000,fail:42000,route:'direct',directShip:180000}
};

const GOODS_TYPES=[
  {id:'normal',label:'Hàng thường (Trang sức, quần áo)',icon:'checkroom'},
  {id:'cosmetic',label:'Mỹ phẩm / Dược phẩm',icon:'spa'},
  {id:'supplement',label:'Thực phẩm chức năng',icon:'medication'}
];

const $=id=>document.getElementById(id);
const fmt=n=>{if(!n&&n!==0)return'—';const a=Math.abs(Math.round(n));return(n<0?'-':'')+a.toLocaleString('vi-VN')};
const pct=n=>isNaN(n)?'0%':(n*100).toFixed(2)+'%';
// Wrap a value in a tooltip span showing the formula
const tip=(val,formula)=>`<span class="has-tip">${val}<span class="tip">${formula}</span></span>`;
let liveRates=null, aedRate=6800;

async function fetchRates(){
  const btn=$('btnFetch'),st=$('rateStatus');
  btn.disabled=true;btn.querySelector('.icon').textContent='sync';btn.querySelector('.icon').classList.add('animate-spin');
  st.className='flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20';st.innerHTML='⏳ Đang tải...';
  try{
    const res=await fetch('https://open.er-api.com/v6/latest/VND');
    const data=await res.json();
    if(data.result==='success'){
      liveRates=data.rates;
      const mk=$('marketSelect').value,cur=MARKETS[mk].cur;
      if(liveRates[cur]){const v=Math.round(1/liveRates[cur]);$('rateCur').value=v;MARKETS[mk].rate=v;}
      if(liveRates['CNY']){$('rateRMB').value=Math.round(1/liveRates['CNY']);}
      if(liveRates['AED']){aedRate=Math.round(1/liveRates['AED']);$('rateAED').value=aedRate;}
      const ts=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
      st.className='flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      st.innerHTML=`<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live · ${ts}`;
      $('curInfo').textContent=cur+' / VND';
      renderShipLegs();
      calc();
    }else throw new Error();
  }catch(e){st.className='flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20';st.textContent='❌ Lỗi';}
  btn.disabled=false;btn.querySelector('.icon').classList.remove('animate-spin');btn.querySelector('.icon').textContent='update';
}

function getShipLegs(market, goodsType){
  const mk=MARKETS[market];
  const rmbRate=+$('rateRMB').value;
  const aed=+$('rateAED').value;
  if(mk.route==='direct') return [{label:'China → '+market,costPerKg:mk.directShip,note:'VND/kg'}];
  let leg1Rate;
  if(mk.route==='saudi') leg1Rate=SHIP_CN_SA[goodsType]||SHIP_CN_SA.normal;
  else if(mk.route==='uae') leg1Rate=SHIP_CN_UAE[goodsType]||SHIP_CN_UAE.normal;
  else leg1Rate=SHIP_CN_GCC[goodsType]||SHIP_CN_GCC.normal;
  const leg1VND=Math.round(leg1Rate*rmbRate);
  const legs=[{label:`China → UAE (${leg1Rate} RMB)`,costPerKg:leg1VND,note:`${leg1Rate} RMB × ${fmt(rmbRate)} = ${fmt(leg1VND)} đ/kg`}];
  if(mk.route!=='uae'){
    let leg2AED=SHIP_UAE_DEST[market]||35;
    const cap=FREIGHT_CAP[goodsType]||40;
    if(leg2AED>cap) leg2AED=cap;
    const leg2VND=Math.round(leg2AED*aed);
    legs.push({label:`UAE → ${market} (${leg2AED} AED)`,costPerKg:leg2VND,note:`${leg2AED} AED × ${fmt(aed)} = ${fmt(leg2VND)} đ/kg`});
  }
  return legs;
}

function renderShipLegs(){
  const market=$('marketSelect').value;
  const goodsType=$('goodsType').value;
  const legs=getShipLegs(market,goodsType);
  let h='';
  legs.forEach(l=>{h+=`<div class="flex flex-col gap-0.5 py-2 border-b border-[#252934]"><span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">${l.label}</span><span class="text-xs mono font-medium num-info">${fmt(l.costPerKg)} đ/kg</span><span class="text-[9px] text-slate-600">${l.note}</span></div>`;});
  $('shipLegsContainer').innerHTML=h;
}

function onMarketChange(){
  const m=MARKETS[$('marketSelect').value];
  $('rateLabel').textContent='Tỷ giá '+m.cur+' / VND';
  $('packFee').value=m.pack;$('deliveryFee').value=m.del;$('failFee').value=m.fail;
  document.querySelectorAll('.cur-label').forEach(e=>e.textContent=m.cur);
  if(liveRates&&liveRates[m.cur]){const v=Math.round(1/liveRates[m.cur]);$('rateCur').value=v;m.rate=v;}
  else{$('rateCur').value=m.rate;}
  $('curInfo').textContent=m.cur+' / VND';
  renderShipLegs();
  calc();
}

function onGoodsTypeChange(){renderShipLegs();calc();}

function getShipTotalVND(){
  const market=$('marketSelect').value;
  const goodsType=$('goodsType').value;
  const legs=getShipLegs(market,goodsType);
  return legs.reduce((s,l)=>s+l.costPerKg,0);
}

function calcCombo(qty,price,p){
  const rev=price*p.rateCur,w=qty*p.w,imp=qty*p.priceRMB*p.rateRMB,ship=w*p.shipTotal,cogs=imp+ship;
  const ads=rev*p.adsRate,profitGTC=rev-cogs-p.packFee-p.deliveryFee-ads,lossRet=-(p.packFee+p.failFee);
  const mGTC=rev>0?profitGTC/rev:0;
  const gO=Math.round(100*p.gtcRate),rO=100-gO;
  const net100=gO*profitGTC+rO*lossRet,rev100=100*rev,m100=rev100>0?net100/rev100:0;
  return{qty,rev,w,imp,ship,cogs,ads,profitGTC,lossRet,mGTC,gO,rO,net100,rev100,m100};
}

function calc(){
  const cur=MARKETS[$('marketSelect').value].cur;
  const p={rateCur:+$('rateCur').value,rateRMB:+$('rateRMB').value,w:+$('weightPerSP').value,priceRMB:+$('priceRMB').value,
    shipTotal:getShipTotalVND(),packFee:+$('packFee').value,deliveryFee:+$('deliveryFee').value,failFee:+$('failFee').value,
    gtcRate:+$('gtcRate').value/100,adsRate:+$('adsRate').value/100};
  const ids=['c1','c2','c3'];
  const combos=ids.map(id=>calcCombo(+$(id+'Qty').value,+$(id+'Price').value,p));

  // Update combo cards
  combos.forEach((c,i)=>{
    $(ids[i]+'CardQty').textContent=c.qty+' Sản phẩm';
    $(ids[i]+'CardRev').textContent='≈ '+fmt(c.rev)+' đ';
  });

  // Update detail tables
  combos.forEach((c,i)=>{
    const id=ids[i];
    $(id+'DetailTitle').textContent=`COMBO ${i+1} · ${c.qty} SP`;
    $(id+'Revenue').textContent=fmt(c.rev);$(id+'Import').textContent=fmt(c.imp);
    $(id+'Ship').textContent=fmt(c.ship);$(id+'Pack').textContent=fmt(p.packFee);$(id+'PackR').textContent=fmt(p.packFee);
    $(id+'Del').textContent=fmt(p.deliveryFee);$(id+'Fail').textContent=fmt(p.failFee);
    $(id+'Ads').textContent=fmt(c.ads);
    $(id+'ProfitGTC').textContent=fmt(c.profitGTC);
    $(id+'ProfitGTC').className='text-right '+(c.profitGTC>=0?'num-pos':'num-neg');
    $(id+'LossRet').textContent=fmt(c.lossRet);
    $(id+'MarginGTC').innerHTML=tip(pct(c.mGTC),`${fmt(c.profitGTC)} ÷ ${fmt(c.rev)}`);
    $(id+'MarginReal').innerHTML=tip(pct(c.m100),`${fmt(c.net100)} ÷ ${fmt(c.rev100)}`);
  });

  // Compare table
  const gO=combos[0].gO,rO=combos[0].rO;
  $('targetRate').textContent=`TARGET: ${gO}% SUCCESS RATE`;
  combos.forEach((c,i)=>{
    const id=ids[i];
    const price=$(ids[i]+'Price').value;
    $(id+'CmpQty').textContent=c.qty;
    $(id+'CmpRev').innerHTML=tip(fmt(c.rev),`${price} × ${fmt(p.rateCur)}`);
    $(id+'CmpProfit').innerHTML=tip(fmt(c.profitGTC),`DT ${fmt(c.rev)} − COGS ${fmt(c.cogs)} − Gói ${fmt(p.packFee)} − VC ${fmt(p.deliveryFee)} − Ads ${fmt(c.ads)}`);
    $(id+'CmpLoss').innerHTML=tip(fmt(c.lossRet),`−(${fmt(p.packFee)} + ${fmt(p.failFee)})`);
    $(id+'CmpGtc').innerHTML=tip('+'+fmt(gO*c.profitGTC),`${gO} × ${fmt(c.profitGTC)}`);
    $(id+'CmpRet').innerHTML=tip(fmt(rO*c.lossRet),`${rO} × ${fmt(c.lossRet)}`);
    $(id+'CmpNet').innerHTML=tip(fmt(c.net100),`${fmt(gO*c.profitGTC)} + (${fmt(rO*c.lossRet)})`);
    $(id+'CmpMargin').innerHTML=tip(pct(c.m100),`${fmt(c.net100)} ÷ ${fmt(c.rev100)}`);
  });

  const totalNet=combos.reduce((s,c)=>s+c.net100,0);
  const totalRev=combos.reduce((s,c)=>s+c.rev100,0);
  $('totalRevAll').innerHTML=tip(fmt(totalRev),combos.map(c=>fmt(c.rev100)).join(' + '));
  $('totalProfit').innerHTML=tip(fmt(totalNet),combos.map(c=>fmt(c.net100)).join(' + '));
  $('totalMargin').innerHTML=tip(pct(totalRev>0?totalNet/totalRev:0),`${fmt(totalNet)} ÷ ${fmt(totalRev)}`);
}

document.addEventListener('DOMContentLoaded',()=>{
  // Build goods type selector
  const gt=$('goodsType');
  if(gt) GOODS_TYPES.forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.label;gt.appendChild(o);});

  // Build detail tables
  const dtEl=$('detailTables');
  if(dtEl)['c1','c2','c3'].forEach((id,i)=>{
    dtEl.innerHTML+=`<div class="glass-card overflow-hidden">
    <div class="bg-[#0F1219] px-4 py-2.5 border-b border-[#1E2130] flex items-center gap-2">
    <div class="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center"><span class="text-[10px] font-bold text-blue-400">${i+1}</span></div>
    <h3 class="text-xs font-bold text-white" id="${id}DetailTitle">COMBO ${i+1}</h3></div>
    <table class="detail-table"><thead><tr>
    <th class="text-left">Hạng Mục</th>
    <th class="text-right">Đơn GTC</th>
    <th class="text-right">Đơn Hoàn</th>
    </tr></thead><tbody>
    <tr><td class="!font-sans text-slate-400">Doanh số</td><td id="${id}Revenue" class="text-right text-white"></td><td class="text-right num-neg">0</td></tr>
    <tr><td class="!font-sans text-slate-400">Giá nhập</td><td id="${id}Import" class="text-right text-slate-300"></td><td class="text-right text-slate-600">—</td></tr>
    <tr><td class="!font-sans text-slate-400">VC Quốc tế</td><td id="${id}Ship" class="text-right text-slate-300"></td><td class="text-right text-slate-600">—</td></tr>
    <tr><td class="!font-sans text-slate-400">Phí đóng gói</td><td id="${id}Pack" class="text-right text-slate-300"></td><td id="${id}PackR" class="text-right text-slate-300"></td></tr>
    <tr><td class="!font-sans text-slate-400">Phí giao hàng</td><td id="${id}Del" class="text-right text-slate-300"></td><td class="text-right text-slate-600">—</td></tr>
    <tr><td class="!font-sans text-slate-400">Phí đơn hoàn</td><td class="text-right text-slate-600">—</td><td id="${id}Fail" class="text-right num-neg"></td></tr>
    <tr><td class="!font-sans text-slate-400">Chi phí Ads</td><td id="${id}Ads" class="text-right text-orange-400"></td><td class="text-right text-slate-600">—</td></tr>
    <tr style="background:rgba(59,130,246,.05)"><td class="!font-sans font-semibold num-info">Lợi nhuận</td><td id="${id}ProfitGTC" class="text-right num-pos font-bold"></td><td id="${id}LossRet" class="text-right num-neg font-bold"></td></tr>
    <tr><td class="!font-sans text-slate-400">Margin / đơn GTC</td><td id="${id}MarginGTC" class="text-right num-warn font-bold"></td><td class="text-right text-slate-600">—</td></tr>
    <tr style="background:rgba(250,204,21,.04)"><td class="!font-sans font-semibold num-warn">Margin thực tế (cả hoàn)</td><td id="${id}MarginReal" class="text-right num-warn font-bold" colspan="2"></td></tr>
    </tbody></table></div>`;
  });
  onMarketChange();fetchRates();
});
