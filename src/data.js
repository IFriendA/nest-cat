// 貓的資料：毛色、性格庫、成長階段、任務、行為名稱
/* ================= data ================= */
export const COATS={
 cream:{fur:'#f0bc82',dark:'#d0935a',light:'#fcecd8',stripe:'#d68a4a',eye:'#c99f24',nose:'#e0898b',ear:'#f1aca3',line:'#5a3a2c',muzzle:true,stripes:true,chest:10},
 blue:{fur:'#8f99a7',dark:'#69727f',light:'#c9cfd8',stripe:null,eye:'#e2b03a',nose:'#8a7884',ear:'#c49fa8',line:'#3a3f48',muzzle:false,stripes:false,chest:7},
 tux:{fur:'#2b2a31',dark:'#17171b',light:'#f3f1ec',stripe:null,eye:'#a5d65e',nose:'#e2a0a6',ear:'#8e7280',line:'#a6a2ae',muzzle:true,stripes:false,chest:13,paw:'#f3f1ec'},
 tabby:{fur:'#a87b54',dark:'#7b583a',light:'#efe0ca',stripe:'#5b3f28',eye:'#bad04e',nose:'#cf837c',ear:'#d6a093',line:'#3c2a1c',muzzle:true,stripes:true,chest:10},
 black:{fur:'#2c2a31',dark:'#1a191e',light:'#3b3941',stripe:null,eye:'#efb93c',nose:'#4c3b42',ear:'#6a5560',line:'#a19dab',muzzle:false,stripes:false,chest:0},
 snow:{fur:'#f4f1ec',dark:'#d6d0c8',light:'#ffffff',stripe:null,eye:'#7fb2d9',nose:'#efa2a8',ear:'#f2b9bd',line:'#7a6e66',muzzle:false,stripes:false,chest:0},
};
export const NAMES={cream:['麻糬','布丁','奶茶'],blue:['墨墨','灰灰','芋圓'],tux:['芝麻','警長','黑白'],tabby:['米香','虎斑','栗子'],black:['黑糖','煤球','夜夜'],snow:['湯圓','雪球','棉花']};
export const ARCH=[
 {id:'cling',hint:'一看到你就搖搖晃晃走過來',p:{soc:.9,bold:.7,energy:.5,play:.55,tol:.85}},
 {id:'shy',hint:'縮在角落，偷偷看你',p:{soc:.55,bold:.18,energy:.4,play:.45,tol:.55}},
 {id:'cool',hint:'自顧自地舔毛，不太理人',p:{soc:.15,bold:.7,energy:.3,play:.3,tol:.3}},
 {id:'wild',hint:'一直在追自己的尾巴',p:{soc:.55,bold:.9,energy:.95,play:.95,tol:.45}},
 {id:'lazy',hint:'從頭睡到尾，叫也叫不醒',p:{soc:.6,bold:.55,energy:.18,play:.3,tol:.75}},
];
export const TRAITS={
 grudge:{n:'記仇',d:'被惹毛的事會記很久，下次直接翻臉。'},
 greedy:{n:'貪吃',d:'一聽到倒飼料就衝過來，空碗會一直叫。'},
 tidy:{n:'愛乾淨',d:'貓砂盆髒了寧可尿在外面，也很常理毛。'},
 night:{n:'夜貓子',d:'白天睡，晚上精神特別好。'},
 sunny:{n:'愛曬太陽',d:'白天總是睡在窗邊那塊陽光裡。'},
 curious:{n:'好奇寶寶',d:'有聲音就要去看，膽子再小也忍不住。'},
 tsun:{n:'傲嬌',d:'自己會坐到你旁邊，但你伸手牠就走開。'},
 clingy:{n:'跟屁蟲',d:'你的手到哪，牠就跟到哪。'},
 boxy:{n:'紙箱控',d:'最安心的地方是紙箱，連睡覺都要窩在裡面。'},
};
export const BAD_PAIRS=[['tsun','clingy'],['sunny','night']];
export const STAGES=[
 {id:'kitten',n:'幼貓',from:0,to:2},
 {id:'junior',n:'少年貓',from:2,to:6},
 {id:'adult',n:'成貓',from:6,to:24},
 {id:'senior',n:'老貓',from:24,to:60},
];
export const TASKS=[
 [['litter','學會用貓砂盆'],['pet','第一次讓你摸'],['bowl','自己吃飽一頓飯'],['toy','第一次撲到玩具']],
 [['approach','自己走到你手邊'],['play5','一起玩 5 次'],['sleepnear','在你面前睡著'],['scratch','學會用貓抓板']],
 [['blink','對你慢慢眨眼'],['rub','主動蹭你'],['knead','踩踩'],['care3','連續 3 天沒有挨餓']],
 [['sun','陪牠曬太陽'],['lap','被你摸著也能繼續睡'],['still','老了也願意陪你玩']],
];
export const BEH_LABEL={sit:'坐著發呆',wander:'閒晃',observe:'觀察你',approach:'朝你走來',avoid:'保持距離',flee:'嚇跑了',rub:'蹭你的手',petted:'被摸',swat:'拍你一下',stalk:'準備撲',pounce:'撲！',bat:'用爪子撥',chase:'追上去',watch:'盯著看',investigate:'過去聞聞',groom:'理毛',nap:'睡覺',zoom:'暴衝',startle:'嚇一跳',proud:'得意',eat:'吃飯',drink:'喝水',beg:'等飯',potty:'上廁所',hide:'躲紙箱',scratch:'磨爪子',knead:'踩踩',held:'被抱著',door:'走去關門',greet:'迎接你',stumble:'跌倒了',wake:'被吵醒',treat:'來吃零食',explore:'到處聞聞',stretch:'伸懶腰',tailchase:'追自己的尾巴',window:'看窗外',loaf:'母雞蹲'};
export const MIN_T={sit:1.2,wander:1.5,groom:3,nap:5,observe:.9,approach:.6,avoid:.9,flee:1,rub:1.5,stalk:.5,chase:.5,watch:1.5,investigate:1.5,zoom:2.2,proud:1.6,petted:.3,eat:1,drink:1,beg:2,hide:3,scratch:2,knead:2,greet:2,treat:.5,explore:1.5,stretch:2.6,tailchase:2.6,window:3,loaf:4};
export const POSE={crouch:0,sit:0,lie:0,arch:0,rearUp:0,headUp:0,headFwd:0,headTilt:0,earUp:.35,eyeOpen:1,pupil:.42,tailUp:.35,tailCurl:.05,tailAmp:.12,tailFreq:1.2,tipFlick:0,puff:0,purr:0,mouth:0,lean:0,paw:0,lick:0,wiggle:0,stretch:0,knead:0};
export const LERP_KEYS={tailAmp:3,tailFreq:3,purr:2.5,puff:3,tipFlick:4,wiggle:8,knead:6};
export const MEM_TXT={
 woke:['睡覺時被摸醒過。','還記著。'],overpet:['上次被摸太久了。',''],scared:['那隻手突然變得很快。',''],tail:['尾巴被碰過。','不喜歡。'],
 carried:['被抱起來，不太情願。',''],knock:['門外一直有敲門聲。',''],neglect:['餓過肚子。','很久。'],
 fed:['飯碗會在{h}滿起來。',''],treat:['你的手裡會有好吃的。',''],petgood:['頭被摸得很舒服。',''],play:['羽毛會飛，毛線球會滾。',''],
 helped:['被抱進貓砂盆過。',''],petsleep:['睡覺時有隻手輕輕的。',''],
};

