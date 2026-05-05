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
let liveRates=null, aedRate=6800; // store AED rate for shipping calc

async function fetchRates(){
  const btn=$('btnFetch'),st=$('rateStatus');
  btn.disabled=true;btn.querySelector('.icon').textContent='sync';btn.querySelector('.icon').classList.add('animate-spin');
  st.className='flex items-center gap-1 text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-400';st.innerHTML='⏳ Đang tải...';
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
      st.className='flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/10 text-green-400';
      st.innerHTML=`<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> Live · ${ts}`;
      $('curInfo').textContent=cur+' / VND';
      calc();
    }else throw new Error();
  }catch(e){st.className='flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-500/10 text-red-400';st.textContent='❌ Lỗi';}
  btn.disabled=false;btn.querySelector('.icon').classList.remove('animate-spin');btn.querySelector('.icon').textContent='update';
}

function getShipLegs(market, goodsType){
  const mk=MARKETS[market];
  const rmbRate=+$('rateRMB').value;
  const aed=+$('rateAED').value;
  if(mk.route==='direct') return [{label:'China → '+market,costPerKg:mk.directShip,note:'VND/kg'}];
  // Leg 1: China → UAE
  let leg1Rate;
  if(mk.route==='saudi') leg1Rate=SHIP_CN_SA[goodsType]||SHIP_CN_SA.normal;
  else if(mk.route==='uae') leg1Rate=SHIP_CN_UAE[goodsType]||SHIP_CN_UAE.normal;
  else leg1Rate=SHIP_CN_GCC[goodsType]||SHIP_CN_GCC.normal;
  const leg1VND=Math.round(leg1Rate*rmbRate);
  const legs=[{label:`China → UAE (${leg1Rate} RMB)`,costPerKg:leg1VND,note:`${leg1Rate} RMB × ${rmbRate} = ${fmt(leg1VND)} đ/kg`}];
  // Leg 2: UAE → Destination
  if(mk.route!=='uae'){
    let leg2AED=SHIP_UAE_DEST[market]||35;
    const cap=FREIGHT_CAP[goodsType]||40;
    if(leg2AED>cap) leg2AED=cap;
    const leg2VND=Math.round(leg2AED*aed);
    legs.push({label:`UAE → ${market} (${leg2AED} AED)`,costPerKg:leg2VND,note:`${leg2AED} AED × ${aed} = ${fmt(leg2VND)} đ/kg`});
  }
  return legs;
}

function renderShipLegs(){
  const market=$('marketSelect').value;
  const goodsType=$('goodsType').value;
  const legs=getShipLegs(market,goodsType);
  let h='';
  legs.forEach(l=>{h+=`<div class="flex flex-col gap-1 py-2 border-b border-slate-700/30"><span class="text-[11px] font-bold uppercase tracking-widest text-slate-400">${l.label}</span><span class="text-sm font-mono font-medium text-blue-300">${fmt(l.costPerKg)} đ/kg</span><span class="text-[10px] text-slate-500">${l.note}</span></div>`;});
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
  combos.forEach((c,i)=>{$(ids[i]+'CardQty').textContent=c.qty+' Sản phẩm';});
  // Update detail tables
  combos.forEach((c,i)=>{
    const id=ids[i];
    $(id+'DetailTitle').textContent=`COMBO ${i+1} (${c.qty} SP)`;
    $(id+'Revenue').textContent=fmt(c.rev);$(id+'Import').textContent=fmt(c.imp);
    $(id+'Ship').textContent=fmt(c.ship);$(id+'Pack').textContent=fmt(p.packFee);$(id+'PackR').textContent=fmt(p.packFee);
    $(id+'Del').textContent=fmt(p.deliveryFee);$(id+'Fail').textContent=fmt(p.failFee);
    $(id+'Ads').textContent=fmt(c.ads);
    $(id+'ProfitGTC').textContent=fmt(c.profitGTC);$(id+'ProfitGTC').className='p-3 text-sm font-mono font-medium text-right '+(c.profitGTC>=0?'text-green-400':'text-red-400');
    $(id+'LossRet').textContent=fmt(c.lossRet);
    $(id+'MarginGTC').innerHTML=`${pct(c.mGTC)}<br><span class="text-[10px] text-slate-500">${fmt(c.profitGTC)} ÷ ${fmt(c.rev)}</span>`;
    $(id+'MarginReal').innerHTML=`${pct(c.m100)}<br><span class="text-[10px] text-slate-500">${fmt(c.net100)} ÷ ${fmt(c.rev100)}</span>`;
  });
  // Compare table
  const gO=combos[0].gO,rO=combos[0].rO;
  const adsV=$('adsRate').value;
  $('targetRate').textContent=`TARGET: ${gO}% SUCCESS RATE`;
  combos.forEach((c,i)=>{
    const id=ids[i];
    const price=$(ids[i]+'Price').value;
    // Row values + formulas
    $(id+'CmpQty').textContent=c.qty;
    $(id+'CmpRev').innerHTML=`${fmt(c.rev)}<br><span class="text-[10px] text-slate-500">${price} × ${fmt(p.rateCur)}</span>`;
    $(id+'CmpProfit').innerHTML=`${fmt(c.profitGTC)}<br><span class="text-[10px] text-slate-500">${fmt(c.rev)} − ${fmt(c.cogs)} − ${fmt(p.packFee)} − ${fmt(p.deliveryFee)} − ${fmt(c.ads)}</span>`;
    $(id+'CmpLoss').innerHTML=`${fmt(c.lossRet)}<br><span class="text-[10px] text-slate-500">−(${fmt(p.packFee)} + ${fmt(p.failFee)})</span>`;
    $(id+'CmpGtc').innerHTML=`+${fmt(gO*c.profitGTC)}<br><span class="text-[10px] text-slate-500">${gO} × ${fmt(c.profitGTC)}</span>`;
    $(id+'CmpRet').innerHTML=`${fmt(rO*c.lossRet)}<br><span class="text-[10px] text-slate-500">${rO} × ${fmt(c.lossRet)}</span>`;
    $(id+'CmpNet').innerHTML=`${fmt(c.net100)}<br><span class="text-[10px] text-slate-500">${fmt(gO*c.profitGTC)} + (${fmt(rO*c.lossRet)})</span>`;
    $(id+'CmpMargin').innerHTML=`${pct(c.m100)}<br><span class="text-[10px] text-slate-500">${fmt(c.net100)} ÷ ${fmt(c.rev100)}</span>`;
  });
  const totalNet=combos.reduce((s,c)=>s+c.net100,0);
  const totalRev=combos.reduce((s,c)=>s+c.rev100,0);
  $('totalRevAll').innerHTML=`${fmt(totalRev)}<br><span class="text-xs text-slate-500 font-normal">${combos.map(c=>fmt(c.rev100)).join(' + ')}</span>`;
  $('totalProfit').innerHTML=`${fmt(totalNet)}<br><span class="text-xs text-slate-500 font-normal">${combos.map((c,i)=>fmt(c.net100)).join(' + ')}</span>`;
  $('totalMargin').innerHTML=`${pct(totalRev>0?totalNet/totalRev:0)}<br><span class="text-xs text-slate-500 font-normal">${fmt(totalNet)} ÷ ${fmt(totalRev)}</span>`;
}

document.addEventListener('DOMContentLoaded',()=>{
  // Build goods type selector
  const gt=$('goodsType');
  if(gt) GOODS_TYPES.forEach(g=>{const o=document.createElement('option');o.value=g.id;o.textContent=g.label;gt.appendChild(o);});
  // Build detail tables
  const dtEl=$('detailTables');
  if(dtEl)['c1','c2','c3'].forEach((id,i)=>{
    dtEl.innerHTML+=`<div class="glass-card rounded-xl overflow-hidden">
    <div class="bg-[#272a34] px-6 py-3 border-b border-slate-700"><h3 class="text-lg font-semibold text-blue-400" id="${id}DetailTitle">COMBO ${i+1}</h3></div>
    <table class="w-full text-left"><thead><tr class="bg-[#181b25] border-b border-slate-700">
    <th class="p-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Hạng Mục</th>
    <th class="p-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Đơn GTC</th>
    <th class="p-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Đơn Hoàn</th>
    </tr></thead><tbody class="divide-y divide-slate-700/20">
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">Doanh số</td><td id="${id}Revenue" class="p-3 text-sm font-mono text-right"></td><td class="p-3 text-sm font-mono text-right text-red-400">0</td></tr>
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">Giá nhập</td><td id="${id}Import" class="p-3 text-sm font-mono text-right"></td><td class="p-3 text-sm font-mono text-right">—</td></tr>
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">VC Quốc tế</td><td id="${id}Ship" class="p-3 text-sm font-mono text-right"></td><td class="p-3 text-sm font-mono text-right">—</td></tr>
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">Phí đóng gói</td><td id="${id}Pack" class="p-3 text-sm font-mono text-right"></td><td id="${id}PackR" class="p-3 text-sm font-mono text-right"></td></tr>
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">Phí giao hàng</td><td id="${id}Del" class="p-3 text-sm font-mono text-right"></td><td class="p-3 text-sm font-mono text-right">—</td></tr>
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">Phí đơn hoàn</td><td class="p-3 text-sm font-mono text-right">—</td><td id="${id}Fail" class="p-3 text-sm font-mono text-right text-red-400"></td></tr>
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">Chi phí Ads</td><td id="${id}Ads" class="p-3 text-sm font-mono text-right"></td><td class="p-3 text-sm font-mono text-right">—</td></tr>
    <tr class="bg-blue-500/5 font-bold"><td class="p-3 text-sm text-blue-400">Lợi nhuận</td><td id="${id}ProfitGTC" class="p-3 text-sm font-mono text-right text-green-400"></td><td id="${id}LossRet" class="p-3 text-sm font-mono text-right text-red-400"></td></tr>
    <tr class="hover:bg-[#31343f]"><td class="p-3 text-sm">Margin / đơn GTC</td><td id="${id}MarginGTC" class="p-3 text-sm font-mono text-right text-yellow-400 font-bold"></td><td class="p-3 text-sm font-mono text-right">—</td></tr>
    <tr class="bg-yellow-500/5"><td class="p-3 text-sm font-bold text-yellow-400">Margin thực tế (cả hoàn)</td><td id="${id}MarginReal" class="p-3 text-sm font-mono text-right text-yellow-400 font-bold" colspan="2"></td></tr>
    </tbody></table></div>`;
  });
  onMarketChange();fetchRates();
});
