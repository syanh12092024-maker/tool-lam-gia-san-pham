const MARKETS={
QATAR:{flag:'🇶🇦',cur:'QAR',rate:6458,legs:[{l:'China → Dubai',c:196560},{l:'Dubai → Qatar',c:154440}],pack:24570,del:127868,fail:60021},
UAE:{flag:'🇦🇪',cur:'AED',rate:6800,legs:[{l:'China → Dubai',c:196560}],pack:24570,del:110000,fail:55000},
SAUDI:{flag:'🇸🇦',cur:'SAR',rate:6650,legs:[{l:'China → Dubai',c:196560},{l:'Dubai → Saudi',c:120000}],pack:24570,del:127868,fail:60021},
KUWAIT:{flag:'🇰🇼',cur:'KWD',rate:81000,legs:[{l:'China → Dubai',c:196560},{l:'Dubai → Kuwait',c:140000}],pack:24570,del:130000,fail:62000},
OMAN:{flag:'🇴🇲',cur:'OMR',rate:64800,legs:[{l:'China → Dubai',c:196560},{l:'Dubai → Oman',c:130000}],pack:24570,del:125000,fail:58000},
BAHRAIN:{flag:'🇧🇭',cur:'BHD',rate:66200,legs:[{l:'China → Dubai',c:196560},{l:'Dubai → Bahrain',c:125000}],pack:24570,del:120000,fail:56000},
JAPAN:{flag:'🇯🇵',cur:'JPY',rate:170,legs:[{l:'China → Nhật',c:280000}],pack:20000,del:100000,fail:50000},
TAIWAN:{flag:'🇹🇼',cur:'TWD',rate:810,legs:[{l:'China → Đài Loan',c:180000}],pack:18000,del:85000,fail:42000}
};
const $=id=>document.getElementById(id);
const fmt=n=>{if(!n&&n!==0)return'—';const a=Math.abs(Math.round(n));return(n<0?'-':'')+a.toLocaleString('vi-VN')};
const pct=n=>(n*100).toFixed(2)+'%';
let liveRates=null;

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
      const ts=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
      st.className='flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/10 text-green-400';
      st.innerHTML=`<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> Live · ${ts}`;
      $('curInfo').textContent=`${cur} / VND`;
      calc();
    }else throw new Error();
  }catch(e){st.className='flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-500/10 text-red-400';st.textContent='❌ Lỗi kết nối';}
  btn.disabled=false;btn.querySelector('.icon').classList.remove('animate-spin');btn.querySelector('.icon').textContent='update';
}

function onMarketChange(){
  const m=MARKETS[$('marketSelect').value];
  $('rateLabel').textContent='Tỷ giá '+m.cur+' / VND';
  $('packFee').value=m.pack;$('deliveryFee').value=m.del;$('failFee').value=m.fail;
  document.querySelectorAll('.cur-label').forEach(e=>e.textContent=m.cur);
  let h='';
  m.legs.forEach((leg,i)=>{h+=`<div class="flex flex-col gap-1 py-2 border-b border-slate-700/30"><span class="text-[11px] font-bold uppercase tracking-widest text-slate-400">VC ${leg.l} (đ/Kg)</span><input type="number" class="ship-leg bg-transparent text-sm font-mono font-medium text-blue-300 outline-none w-full" value="${leg.c}" step="100" oninput="calc()"/></div>`;});
  $('shipLegsContainer').innerHTML=h;
  if(liveRates&&liveRates[m.cur]){const v=Math.round(1/liveRates[m.cur]);$('rateCur').value=v;m.rate=v;}
  else{$('rateCur').value=m.rate;}
  $('curInfo').textContent=m.cur+' / VND';
  calc();
}

function getShipTotal(){let t=0;document.querySelectorAll('.ship-leg').forEach(e=>{t+=+e.value});return t;}

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
    shipTotal:getShipTotal(),packFee:+$('packFee').value,deliveryFee:+$('deliveryFee').value,failFee:+$('failFee').value,
    gtcRate:+$('gtcRate').value/100,adsRate:+$('adsRate').value/100};
  const ids=['c1','c2','c3'];
  const combos=ids.map(id=>calcCombo(+$(id+'Qty').value,+$(id+'Price').value,p));
  const adsV=$('adsRate').value;
  // Update combo overview cards
  combos.forEach((c,i)=>{
    const id=ids[i];
    $(id+'CardQty').textContent=c.qty+' Sản phẩm';
    $(id+'CardPrice').textContent=$(id+'Price').value+' '+cur;
  });
  // Update detail tables
  const legs=[];document.querySelectorAll('.ship-leg').forEach(e=>{const r=e.closest('div');legs.push({val:+e.value})});
  combos.forEach((c,i)=>{
    const id=ids[i];
    $(id+'DetailTitle').textContent=`COMBO ${i+1} (${c.qty} SP)`;
    $(id+'Revenue').textContent=fmt(c.rev);$(id+'Import').textContent=fmt(c.imp);
    $(id+'Ship').textContent=fmt(c.ship);$(id+'Pack').textContent=fmt(p.packFee);$(id+'PackR').textContent=fmt(p.packFee);
    $(id+'Del').textContent=fmt(p.deliveryFee);$(id+'Fail').textContent=fmt(p.failFee);
    $(id+'Ads').textContent=fmt(c.ads);
    $(id+'ProfitGTC').textContent=fmt(c.profitGTC);$(id+'ProfitGTC').className='p-3 text-sm font-mono font-medium text-right '+(c.profitGTC>=0?'text-green-400':'text-red-400');
    $(id+'LossRet').textContent=fmt(c.lossRet);
    $(id+'MarginGTC').textContent=pct(c.mGTC);
    $(id+'MarginReal').textContent=pct(c.m100);
  });
  // Compare table
  const gO=combos[0].gO,rO=combos[0].rO;
  $('targetRate').textContent=`TARGET: ${gO}% SUCCESS RATE`;
  combos.forEach((c,i)=>{
    const id=ids[i];
    $(id+'CmpQty').textContent=c.qty;$(id+'CmpRev').textContent=fmt(c.rev);
    $(id+'CmpProfit').textContent=fmt(c.profitGTC);$(id+'CmpLoss').textContent=fmt(c.lossRet);
    $(id+'CmpGtc').textContent='+'+fmt(gO*c.profitGTC);$(id+'CmpRet').textContent=fmt(rO*c.lossRet);
    $(id+'CmpNet').textContent=fmt(c.net100);$(id+'CmpMargin').textContent=pct(c.m100);
  });
  // Totals
  const totalNet=combos.reduce((s,c)=>s+c.net100,0);
  const totalRev=combos.reduce((s,c)=>s+c.rev100,0);
  $('totalProfit').textContent=fmt(totalNet);
  $('totalMargin').textContent=pct(totalNet/totalRev);
}

document.addEventListener('DOMContentLoaded',()=>{onMarketChange();fetchRates();});
