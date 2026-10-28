// 遊戲內「怎麼玩」教程內容
export const GUIDE=[
['start','畫面怎麼看',`<p class="lead">你是走進小貓的家去照顧牠。全程不用打字，點、拖、長按就夠了。</p>
<div class="pairs">
<div class="pair"><b>左上角</b><span>四條需求：飽足、水分、貓砂、精神。</span><small>綠色正常，黃色偏低，紅色危險。</small></div>
<div class="pair"><b>右上角</b><span>讀貓提示：牠的耳朵、尾巴、眼睛現在代表什麼。</span><small>不知道該做什麼時，先看這裡。</small></div>
<div class="pair"><b>下方工具列</b><span>摸摸、零食、逗貓棒。</span><small>點一下切換手上拿的東西。</small></div>
<div class="pair"><b>頁面最上方</b><span>時間流速、離開 3 小時、怎麼玩。</span><small>預設 1 秒 = 10 分鐘，遊戲裡一天約 2.4 分鐘。</small></div>
<div class="pair"><b>畫面下方</b><span>成長、性格、牠記得的事、生活手記。</span><small>看牠長到哪、發現了什麼性格、發生過什麼。</small></div>
</div>
<p>窩裡這些東西都能點：</p><div class="chips"><span>紅色飯碗</span><span>藍色水碗</span><span>貓砂盆</span><span>地上的黃色水漬</span><span>紙箱</span><span>毛線球</span><span>地板</span></div>`],
['first','前五分鐘',`<p class="lead">一開始只要做好三件事：碗和水保持滿的、讓牠習慣你的手、牠想上廁所時抱牠去貓砂盆。</p>
<ol class="steps">
<li><span><b>挑一隻小貓。</b>卡片上寫的是牠現在在做什麼，這就是性格線索。膽小的貓比較難摸，但最能看出信任慢慢建立。</span></li>
<li><span><b>倒飯、加水。</b>點紅色飯碗和藍色水碗各一次。</span></li>
<li><span><b>選「摸摸」，把手放在牠附近停住。</b>不要追，也不要甩滑鼠，等牠自己靠過來。</span></li>
<li><span><b>盯著右上角。</b>出現「想上廁所」，就照〈上廁所〉那一節抱牠去貓砂盆。</span></li>
<li><span><b>看到黃色水漬就清掉。</b>選「清潔」在上面抹一下。那是牠尿在外面，幼貓一開始常會這樣。</span></li>
</ol>
<div class="tip"><b>覺得太快？</b> 把時間流速切到「1 秒 = 1 分」，需求會掉得慢很多。</div>`],
['care','日常照顧',`<p class="lead">飯和水用「摸摸」點碗；髒的地方選「清潔」抹一下就好。</p>
<div class="pairs">
<div class="pair"><b>肚子餓</b><span>點<span class="kbd">紅色飯碗</span>，一次倒滿。</span><small>飽足條變短，或牠坐在空碗旁邊喵喵叫。</small></div>
<div class="pair"><b>口渴</b><span>點<span class="kbd">藍色水碗</span>，一次加滿。</span><small>水分條變短。</small></div>
<div class="pair"><b>貓砂髒</b><span>選<span class="kbd">清潔</span>抹過貓砂盆，或用「摸摸」點它。</span><small>盆裡有一坨坨，上面冒臭氣線條。</small></div>
<div class="pair"><b>地上有尿</b><span>選<span class="kbd">清潔</span>，在水漬上抹過去。</span><small>按住拖動，一次清好幾灘。</small></div>
<div class="pair"><b>想睡</b><span>什麼都不用做。</span><small>牠會自己去床上、陽光下或紙箱裡睡。</small></div>
</div>
<div class="warn"><b>零食不能當正餐。</b>一個零食只補一點飽足，每天只有 3 個，主要用來建立信任和道歉。</div>
<p>固定時間倒飯，牠會記住，到點就去碗旁邊等你。</p>`],
['pet','摸到牠',`<p class="lead">摸不到，通常是信任還不夠。牠一碰就跳開時，右上角會寫「還不讓你摸」。</p>
<h4 style="margin:0;font-size:16px">先讓牠信任你</h4>
<ol class="steps">
<li><span>選「摸摸」，把手移到牠附近，然後<b>停住不動</b>。手停越久，牠越信任你。幼貓學得特別快。</span></li>
<li><span>倒飯、餵零食都會加信任。選「零食」點地板或點牠，零食會放在那裡，牠會過來吃。</span></li>
<li><span>別甩滑鼠、別追牠、別硬摸睡覺的牠。這些都會讓牠記仇。</span></li>
</ol>
<h4 style="margin:0;font-size:16px">再摸牠</h4>
<ol class="steps">
<li><span>等牠走到手邊，在牠身上<b>按住並來回拖</b>。</span></li>
<li><span>摸頭最受歡迎，背部其次，尾巴大多不喜歡。</span></li>
<li><span>右上角寫「很舒服」就繼續；變成「摸夠了」就馬上放開。</span></li>
</ol>
<div class="tip"><b>抱牠：</b>在牠身上長按不動約半秒。拖到哪放開，牠就落在哪。牠亂蹬就快放下，不然會掙脫並記你一筆。</div>
<div class="pairs">
<div class="pair"><b>黏人型</b><span>幾乎一伸手就湊過來。</span></div>
<div class="pair"><b>謹慎型</b><span>手要靜止好幾秒，牠才走走停停地靠近。</span></div>
<div class="pair"><b>高冷型</b><span>常常不理你，這很正常。</span></div>
<div class="pair"><b>傲嬌型</b><span>坐到你旁邊卻背對你。等牠自己蹭你，才是摸的時機。</span></div>
</div>`],
['potty','上廁所與地板',`<p class="lead">地上的黃色水漬是牠尿在外面。幼貓還不太會用貓砂盆，要靠你教。</p>
<ol class="steps">
<li><span>等右上角出現<b>「想上廁所」</b>：牠會低頭聞地板、原地轉圈。</span></li>
<li><span>在牠身上<b>長按不動約半秒</b>，把牠抱起來。</span></li>
<li><span>拖到右後方的<b>貓砂盆</b>上面，放開。</span></li>
<li><span>牠會在盆裡上廁所。通常教兩、三次就會了，成長面板會打勾。</span></li>
</ol>
<h4 style="margin:0;font-size:16px">地上一直髒？</h4>
<div class="pairs">
<div class="pair"><b>還沒學會</b><span>照上面多教幾次；錯過了就擦掉，下次再教。</span></div>
<div class="pair"><b>貓砂太髒</b><span>盆裡堆了好幾坨，牠就不想進去。記得常鏟。</span></div>
<div class="pair"><b>愛乾淨的貓</b><span>有一點髒就寧可尿地上，要鏟得特別勤。</span></div>
</div>
<div class="warn">地上累積太多灘尿，會算成「沒照顧好」。幼貓時沒學會，長大後偶爾還會尿在外面。</div>`],
['play','陪玩',`<p class="lead">玩會提升玩興，也會推進成長任務。</p>
<div class="pairs">
<div class="pair"><b>逗貓棒</b><span>移動滑鼠讓羽毛晃，再<b>突然停住</b>。</span><small>牠會壓低身子、扭屁股，然後撲上去。好動的貓扭兩下就撲。</small></div>
<div class="pair"><b>毛線球</b><span>「摸摸」模式下按住毛線球，拖一下再放開。</span><small>愛玩的貓會追、會用爪子撥；牠無聊時也會自己去玩。</small></div>
<div class="pair"><b>零食</b><span>選「零食」，點地板或點牠。</span><small>膽小的貓會叼了就跑，貪吃的貓衝最快。</small></div>
<div class="pair"><b>敲地板</b><span>點空地板。</span><small>好奇的貓會跑去聞，膽小的貓會嚇一跳。</small></div>
<div class="pair"><b>敲紙箱</b><span>點紙箱。</span><small>躲在裡面的貓可能會嚇到。</small></div>
</div>
<p>牠也會自己找事做：看窗外的鳥、追小蟲、理毛、磨爪子、睡午覺。牠不一定每次都理你，這是設計好的。</p>`],
['door','破次元',`<p class="lead">惹得太兇，牠會做出超出畫面的事：拍螢幕、把門關上不見你。生氣會一步步升級：</p>
<ol class="steps">
<li><span><b>不耐煩</b>：耳朵壓向兩側、尾巴用力甩。這時停手就沒事。</span></li>
<li><span><b>拍你一下</b>：繼續摸，牠會伸爪拍手，然後走開。</span></li>
<li><span><b>隔空一掌</b>：對不耐煩的牠連點三下，一隻大爪子掃過整個畫面。</span></li>
<li><span><b>關門</b>：還在生氣又有積怨時，牠會走到鏡頭前把門關上。</span></li>
</ol>
<h4 style="margin:0;font-size:16px">門關上之後</h4>
<div class="pairs">
<div class="pair"><b>點門</b><span>等於敲門。</span><small>敲 3 次牠更氣；敲 5 次會從貓門伸爪拍你。</small></div>
<div class="pair"><b>放零食</b><span>切到「零食」再點門。</span><small>正確做法，牠會提早很多開門。</small></div>
<div class="pair"><b>等</b><span>氣消了會自己開門。</span><small>快開門時，貓門裡會先出現兩隻眼睛。</small></div>
</div>`],
['grow','成長與性格',`<p class="lead">時間到了牠就會長大，任務是選做的，不會卡住你。但你在每個階段做的事，會改變牠長大後的樣子。</p>
<div class="pairs">
<div class="pair"><b>幼貓</b><span>第 1–2 天</span><small>學會用貓砂盆、第一次讓你摸、自己吃飽一頓飯、第一次撲到玩具。</small></div>
<div class="pair"><b>少年貓</b><span>第 3–6 天</span><small>自己走到你手邊、一起玩 5 次、在你面前睡著、學會用貓抓板。</small></div>
<div class="pair"><b>成貓</b><span>第 7–24 天</span><small>對你慢慢眨眼、主動蹭你、踩踩、連續 3 天沒有挨餓。</small></div>
<div class="pair"><b>老貓</b><span>第 25 天起</span><small>陪牠曬太陽、被摸著也能繼續睡、老了也願意陪你玩。</small></div>
</div>
<p>例如：幼貓時常被摸，長大比較不怕手；沒學會貓砂盆，長大還會偶爾尿在外面。</p>
<h4 style="margin:0;font-size:16px">隱藏性格</h4>
<p>每隻貓天生有兩個特質，一開始是「？？？」，牠在某個情境表現出來才會解鎖。</p>
<div class="chips"><span>記仇</span><span>貪吃</span><span>愛乾淨</span><span>夜貓子</span><span>愛曬太陽</span><span>好奇寶寶</span><span>傲嬌</span><span>跟屁蟲</span><span>紙箱控</span></div>
<p><b>牠記得的事</b>是零碎的記憶，例如「睡覺時被摸醒過」。越淡代表快忘了，這些記憶會影響牠對你的態度。</p>`],
['warn','警告與回收',`<p class="lead">遊戲會累計牠「沒被照顧好」的時間。累計越久，警告越嚴重，最後養貓權限會被收回。</p>
<p>算沒照顧好的情況：飽足或水分見底、貓砂盆堆滿、地上很多灘尿。</p>
<div class="ladder">
<div><b>超過 8 小時</b><span>黃色橫條：寫出缺什麼、該點哪裡。牠耳朵尾巴垂下來。</span></div>
<div><b>超過 20 小時</b><span>紅色橫條：再不照顧就會被接走。</span></div>
<div><b>超過 36 小時</b><span>救助站把牠接走，要重新申請領養。</span></div>
</div>
<div class="tip"><b>怎麼讓警告消失：</b>照橫條寫的去點，把每項補好。橫條會變綠色「正在恢復中」，並顯示還要多久。恢復速度是累計的 3 倍。</div>
<p style="color:var(--muted);font-size:13px">時間指遊戲時間。</p>`],
['faq','常見問題',`<div class="pairs">
<div class="pair"><b>一碰就跳開</b><span>信任不夠。手停在牠附近不動、倒飯、餵零食，等牠自己靠近。</span></div>
<div class="pair"><b>一直說沒照顧好</b><span>有需求沒補，或還在恢復期。照橫條寫的去點，變綠色就是在恢復。</span></div>
<div class="pair"><b>地上一直髒</b><span>還沒學會貓砂盆或貓砂太髒。用「清潔」抹掉、常清貓砂盆、抱牠去盆裡。</span></div>
<div class="pair"><b>點碗沒反應</b><span>點碗要用「摸摸」，切回去再點。</span></div>
<div class="pair"><b>想摸卻抱起來了</b><span>按住後太久沒動。按下去就開始來回拖。</span></div>
<div class="pair"><b>看不到貓</b><span>牠關門了（用零食點門口），或躲進紙箱（等牠出來）。</span></div>
<div class="pair"><b>舊存檔的貓很怕我</b><span>累積了壞記憶。慢慢補回來，或重新領養。</span></div>
</div>
<div class="tip"><b>手機上：</b>手指按在貓身上拖曳是摸，長按是抱。零食模式點一下就會放下零食。</div>
<p><b>測試捷徑</b>在頁面最下方的「開發者視角」：跳到下一階段、惹毛牠、讓牠餓一整天、重新領養。頁面上方的「離開 3 小時」可以模擬你不在時牠的生活。</p>
<p style="color:var(--muted);font-size:13px">進度只存在這個瀏覽器裡，換裝置或清除瀏覽資料就會消失。</p>`],
];
