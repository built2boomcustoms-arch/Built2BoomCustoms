const express=require('express');
const Stripe=require('stripe');
const path=require('path');
const app=express();
const PORT=process.env.PORT||3000;
const stripe=process.env.STRIPE_SECRET_KEY?Stripe(process.env.STRIPE_SECRET_KEY):null;
app.use(express.json({limit:'100kb'}));
app.use(express.static(__dirname));
const BOX={1800:15,2800:30,3800:40,4800:60,5800:90,9800:150};
const COLORS={Custom:25};
const BRANDS={'Customer Supplied':0,'Kenwood':40,'Pyle':40,'Skar Audio':50,'Pioneer':50,'Boss Audio':50,'DS18':60,'Memphis Audio':75,'Kicker':80,'JBL':80,'Infinity':80,'Rockford Fosgate':90,'Wet Sounds':150,'JL Audio':180};
const SUB_BRANDS={'Kicker':120,'Rockford Fosgate':130,'JBL':110,'DS18':100,'Skar Audio':90,'Memphis Audio':130,'Wet Sounds':250,'JL Audio':250,'Kenwood':100,'Pioneer':100,'Infinity':110,'Boss Audio':50,'Pyle':40,'Customer Supplied':0};
const POWER={'Include Battery and Charger Bundle':60,'DeWalt 20V':15,'Milwaukee M18':15,'Hart 20V':15,'Ryobi 18V':15,'Makita 18V':15,'Other':15};
function val(b,k){return b?.selections?.[k]?.value??''}
function calculate(build){
 const s=build?.selections||{};let total=0;
 const box=val(build,'case'); if(!(box in BOX))throw new Error('Invalid box selection.'); total+=BOX[box];
 const color=val(build,'color'); if(color==='Custom')total+=25;
 const count=Number((val(build,'count').match(/\d+/)||['0'])[0]); if(!count)throw new Error('Invalid speaker count.');
 const brand=val(build,'brand'); if(!(brand in BRANDS))throw new Error('Invalid speaker brand.'); total+=BRANDS[brand]*count/2;
 const sub=val(build,'sub')==='Yes'; const subCount=val(build,'subCount')==='2 Subwoofers'?2:(sub?1:0); if(sub){const subBrand=val(build,'subBrand'); if(!(subBrand in SUB_BRANDS))throw new Error('Invalid subwoofer brand.'); total+=SUB_BRANDS[subBrand]*subCount;}
 const power=val(build,'power'); if(!(power in POWER))throw new Error('Invalid power selection.'); total+=POWER[power];
 const tweeter=Number((val(build,'tweeters').match(/\d+/)||['0'])[0]); total+=tweeter*10;
 const extra=val(build,'extra'); const extras=extra==='None'?[]:extra.split(' + ').filter(Boolean); const allowedExtras=['Battery Voltage and Charging Port','Custom Name / Logo']; if(extras.some(x=>!allowedExtras.includes(x)) || new Set(extras).size!==extras.length)throw new Error('Invalid extras selection.'); if(extras.includes('Battery Voltage and Charging Port'))total+=25; if(extras.includes('Custom Name / Logo'))total+=20;
 const amp=Math.ceil(count/2)*25+subCount*25; total+=amp;
 return Math.round(total);
}
app.post('/api/create-checkout-session',async(req,res)=>{
 try{
  if(!stripe)return res.status(503).json({error:'Stripe is not connected yet. Add STRIPE_SECRET_KEY to the server environment.'});
  const {customer,build}=req.body||{}; if(!customer?.name||!customer?.email||!customer?.phone||!build)throw new Error('Missing customer or build information.');
  const amount=calculate(build); const base=process.env.PUBLIC_URL||`${req.protocol}://${req.get('host')}`;
  const compact=Object.values(build.selections||{}).map(x=>x.value).filter(Boolean).join(' | ').slice(0,450);
  const session=await stripe.checkout.sessions.create({mode:'payment',customer_email:customer.email,payment_method_types:['card'],line_items:[{price_data:{currency:'usd',product_data:{name:'Built2BoomCustoms Custom Speaker Build',description:compact},unit_amount:amount*100},quantity:1}],metadata:{customer_name:customer.name,customer_phone:customer.phone,build:compact},success_url:`${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${base}/checkout.html`});
  res.json({url:session.url});
 }catch(e){res.status(400).json({error:e.message||'Unable to create checkout.'});}
});
app.listen(PORT,()=>console.log(`Built2BoomCustoms running on ${PORT}`));
