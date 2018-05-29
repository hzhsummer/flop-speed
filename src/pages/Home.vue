<template>
<div class="fw">
  <div id="wrapper">
    <div id="banner" class="fw pr">
      <p class="tc rule_box"><a @click="showRules" class="rules">活动规则 >> </a></p>
    </div>

    <div id="btns" class="tc">
      <a class="fl btn btns_lf">
        <span id="time_desc">{{ timeDesc }}</span>
        <span id="time" class="fr tc">{{ time }}</span>
      </a>
      <a @click="showRanking" class="btn btns_rt fr pr">
        <span>查看排行榜</span>
        <span id="dot" v-if="showDot"></span>
      </a>
    </div>

    <div id="card_box" class="pr">
      <div id="cards">
          <div v-for="(card, $index) in cardArrs" :key="$index" class="card" :class="{ 'card-flipped': cardFlip }" ref='cards' :style="{ left: parseInt(cardWidth+13) * ($index%3) + 'px', top: parseInt(cardHeight+13) * Math.floor($index/3) + 'px' }" @click="clickCard(card['index'], $index)">
            <div class="face front"></div>
            <div class="face back" :class="{ 'flip': cardFlip }" :style="{ backgroundImage: `url(${card['logoImgUrl']})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center center', backgroundSize: 'contain' }"></div>
          </div>
      </div>

      <!--游戏玩法说明-->
      <div class="popover_ fw" v-if="isLock==0">
        <div class="modal_">
          <p class="tc rule_title">游戏玩法说明</p>
          <div id="rule_desc">
            <p>1. 在规定时间内，记忆牌面内容及位置；</p>
            <p>2. 游戏中，点击任意两张牌，若相同则可翻开，最短时间内全部配对成功即可；</p>
            <p>3. 可以将过关的最短时间上链；供链友膜拜你的超凡记忆力；</p>
          </div>
          <div id="mobile_box" class="tc">
            <input type="tel" name="mobile" v-model="nickName" maxlength="11" class="tc" placeholder="请输入你的昵称" id="mobile_ipt"/>
          </div>
          <p class="tc">
            <a class="start" :class="{ active: nickName }" @click="startGame"></a>
          </p>
        </div>
      </div>
    </div>
  </div>
  <!--排名-->
  <el-dialog title="链上排行榜" :visible.sync="dialogRankingVisible">
    <el-table :data="gridData">
        <el-table-column type="index" label="排名" width="60">
        </el-table-column>
        <el-table-column property="nickname" label="玩家昵称" width="120"></el-table-column>
        <el-table-column property="address" label="玩家地址"></el-table-column>
        <el-table-column property="time" label="挑战时长(s)" width="100" align="center"></el-table-column>
    </el-table>
  </el-dialog>

  <div class="logo-box">
    <img class="logo" src="../assets/img/logo.png">
    星云拼手速
  </div>

  <!--版权-->
  <div class="copyright">
    注意：请安装 <a href="https://github.com/ChengOrangeJu/WebExtensionWallet" target="_blank">WebExtensionWallet</a> 官方钱包插件后畅玩NAS翻牌拼手速游戏
  </div>
</div>
</template>

<style lang="css">
  @import '../assets/css/style';
  .logo-box{
    position: absolute;
    left: 10px;
    top: 10px;
    font-size: 24px;
  }
  .logo-box img{
    width: 50px;
    vertical-align: middle;
    margin-top: -5px;
  }
  .copyright{
    position: fixed;
    bottom: 10px;
    width: 100%;
    text-align: center;
    left: 0;
  }
</style>

<script>

  import Nebulas from 'nebulas'
  import NebPay from 'nebpay.js'
  import _ from 'lodash'

  var Neb = Nebulas.Neb
  var neb = new Neb(new Nebulas.HttpRequest('https://testnet.nebulas.io'))
  // var neb = new Neb(new Nebulas.HttpRequest('https://mainnet.nebulas.io'))
  var api = neb.api

  // 合约地址 test
  const dappAddress = 'n1mD4U6AsNCQ5TDDnv9uzvmbRKBtgHg7yio'


  // 显示提示框
  var toastTimer = null;
  function showToast(message, t) {
      var alert = document.getElementById('toast');
      if(alert == null) {
          alert = document.createElement("div");
          alert.id = 'toast';
          alert.className = 'fd';
          alert.innerText = message;
      } else {
          alert.style.opacity = .9;
      }
      document.body.appendChild(alert);
      t = t ? t : 1000;
      toastTimer = setTimeout(function() {
        hideToast();
      }, t);
  }

  // 隐藏提示框
  function hideToast() {
      var alert = document.getElementById('toast');
      if(alert != null) {
          document.body.removeChild(alert);
          clearTimeout(toastTimer);
      }
  }

  // 查找是否包含某classname
  var hasClass = (function(){
      var div = document.createElement("div") ;
      if( "classList" in div && typeof div.classList.contains === "function" ) {
          return function(elem, className){
              return elem.classList.contains(className) ;
          } ;
      } else {
          return function(elem, className){
              var classes = elem.className.split(/\s+/) ;
              for(var i= 0 ; i < classes.length ; i ++) {
                  if( classes[i] === className ) {
                      return true ;
                  }
              }
              return false ;
          } ;
      }
  })() ;

  const [ TM1, TM2 ] = [ 10, 30]; // 记忆时间和倒计时时间
  export default {
  	data() {
        return {
          time: TM1, // 倒计时时间
          timeDesc: '', // 区分是记忆时间还是倒计时
          timer: null, // 计时器
          showDot: false, // 是否显示圆点通知
          isLock: 0, // 游戏状态
          cardArrs: [], // 卡牌列表
          cardWidth: 80, // 卡牌宽度
          cardHeight: 80, // 卡牌高度
          cardFlip: '', // 卡牌翻转的样式
          cardSelectedArr: [], // 临时存放当前点击的卡牌信息
          cardSelectedNum: 0, // 存放已点卡牌的数量
          ruleContent: '', // 活动规则

          dialogRankingVisible: false,
          nickName: '', // 用户昵称
          userAddress: localStorage.getItem('userAddress') ? localStorage.getItem('userAddress') : 'n1cF2MYqf9Uxd7K68SpqDdc79wxg69JDkje', // 玩家地址
          blockchainTime: 0, // 链上已存在时间
          gridData: [{
            nickname: 'Tim',
            address: 'n1sbRguE7eZHLfXCCC1RjNMtfv3fjn1DbSy',
            time: 12
          }, {
            nickname: 'Tim',
            address: 'n1sbRguE7eZHLfXCCC1RjNMtfv3fjn1DbSy',
            time: 12
          }, {
            nickname: 'Tim',
            address: 'n1sbRguE7eZHLfXCCC1RjNMtfv3fjn1DbSy',
            time: 12
          }]
        }
      },
      mounted() {
	        this.init(); // 初始化
	    },
	    methods: {
	        async init() {
              let self = this;

              // 时间文案
              self.time = TM1;
              self.timeDesc = '记忆时间:';

              // 加载活动规则
              self.ruleContent = '填写昵称，在记忆时间内看一遍所有卡牌，记忆时间（10秒）结束后开始游戏，游戏时间30秒，每点击一张卡牌后，需要找到相同的另一张卡牌即可配对成功，所有卡牌匹配完成即可完成挑战。';


              // 重置卡牌选中的数量
              self.cardSelectedNum = 0;

              // 重置所有卡牌至背面
              self.cardFlip = '';

              // 加载卡牌列表（伪造数据）
              self.cardArrs = [
                  {
                      index: 0,
                      logoImgUrl: require('../assets/img/icon/cze.png')
                  },
                  {
                      index: 5,
                      logoImgUrl: require('../assets/img/icon/github.png')
                  },
                  {
                      index: 1,
                      logoImgUrl: require('../assets/img/icon/svk.png')
                  },
                  {
                      index: 4,
                      logoImgUrl: require('../assets/img/icon/apple.png')
                  },
                  {
                      index: 2,
                      logoImgUrl: require('../assets/img/icon/che.png')
                  },
                  {
                      index: 3,
                      logoImgUrl: require('../assets/img/icon/facebook.png')
                  },
                  {
                      index: 1,
                      logoImgUrl: require('../assets/img/icon/svk.png')
                  },
                  {
                      index: 0,
                      logoImgUrl: require('../assets/img/icon/cze.png')
                  },
                  {
                      index: 5,
                      logoImgUrl: require('../assets/img/icon/github.png')
                  },
                  {
                      index: 2,
                      logoImgUrl: require('../assets/img/icon/che.png')
                  },
                  {
                      index: 4,
                      logoImgUrl: require('../assets/img/icon/apple.png')
                  },
                  {
                      index: 3,
                      logoImgUrl: require('../assets/img/icon/facebook.png')
                  }
              ];

              // self.cardArrs = _.shuffle(self.cardArrs);
              // console.log(888, self.cardArrs);

              // 重置JS添加的卡牌classname 待优化
              if(this.$refs.cards) {
                  self.cardArrs.forEach(function(res, index) {
                      self.$refs.cards[index].className = 'card';
                  });
              }

              // 从缓存取手机号
              self.nickName = sessionStorage.getItem('nickName') || '';

              // 初始化游戏状态
              self.initStatus(0);
          },
          initStatus(status) {
              // 初始化游戏状态 0：未开始，1：记忆时间；2：倒计时时间
              this.isLock = status || 0;
              sessionStorage.setItem('CARD_ISLOCK', status || 0);
          },
          startGame() {
              // 记忆时间
              let self = this;

              if(!self.nickName) {
                  showToast('请输入你的昵称~');
              } else {
                  sessionStorage.setItem('nickName', self.nickName);

                  showToast('准备开始记忆啦~', 2000);
                  self.isLock  = sessionStorage.getItem('CARD_ISLOCK');
                  if(self.isLock == 0) {
                      self.initStatus(1); // 更改状态
                      setTimeout(function() {
                          self.cardFlip = 'card-flipped'; // 翻开牌子
                          self.countdown(); // 开始倒计时
                      }, 2500);
                  }
              }
          },
          startPlaying() {
              // 倒计时 开始游戏
              let self = this;
              showToast('游戏开始，加油！');
              setTimeout(function() {
                  self.initStatus(2); // 更改状态
                  self.countdown();
              }, 500);
          },
          clickCard(val, index) {
              // 点击卡牌 待优化
              this.isLock = sessionStorage.getItem('CARD_ISLOCK');
              if(this.isLock == 2) {
                  // 游戏中
                  var $fcards = this.$refs.cards;
                  var $fcard = $fcards[index];

                  // 防止重复点击已点开的卡牌
                  if(hasClass($fcard, "card-flipped")) {
                      return;
                  }

                  // 记录点击的卡牌信息
                  this.cardSelectedArr.push({ key: index, value: val });

                  // 给卡牌添加classname
                  $fcards.className = 'card';
                  $fcard.className = 'card card-flipped';

                  // 若翻动了两张牌，检测一致性
                  if(this.cardSelectedArr.length == 2) {
                      let self = this;
                      setTimeout(function() {
                          if(self.cardSelectedArr[0].value != self.cardSelectedArr[1].value) {
                              // 两张卡牌不一致，重置
                              self.cardSelectedArr.forEach(function(res) {
                                  $fcards[res.key].className = 'card';
                              });
                          } else {
                              self.cardSelectedNum += 2; // 记录成功的卡牌数量

                              if(self.cardSelectedNum == self.cardArrs.length) {
                                  // 判断已点开卡牌数量和总数量是否相等
                                  self.gameover();
                              }
                          }
                          self.cardSelectedArr = []; // 清空数组，为了保证数组里最多存在2条数据
                      }, 400);
                  }
              } else {
                  showToast('游戏还未开始！');
              }
          },
          callbackResult (response) {
            console.log("responseonse of push: " + JSON.stringify(response))
            var intervalQuery = setInterval(() => {
              api.getTransactionReceipt({hash: response["txhash"]}).then((receipt) => {
                  console.log("判断数据提交到区块链的状态", receipt)
                  if (receipt.from) {
                    this.userAddress = receipt.from;
                    // 存在localStorage
                    localStorage.setItem('userAddress', receipt.from);
                  }
                  // console.log(receipt)
                  if (receipt["status"] === 2) {
                      console.log("pending.....")
                  } else if (receipt["status"] === 1){
                      this.$notify({
                        title: '上链成功',
                        message: '赶快点击排行榜查看排名吧',
                        type: 'success'
                      })
                      //清除定时器
                      clearInterval(intervalQuery)
                  }else {
                      console.log("交易失败......")
                      //清除定时器
                      clearInterval(intervalQuery)
                  }
              });
            }, 3000);

          },
          gameover() {
              // 游戏结束
              console.log('闯关成功, 花费时间', this.time);

              clearTimeout(this.timer);

              if(this.blockchainTime < (30-this.time)) {
                this.init();

                this.$message({
                  message: '当前闯关时间大于您已上链上的时间，继续努力哦！',
                  type: 'warning'
                });
              } else {

                this.queryTime();

                // 上链
                this.$confirm('闯关成功, 花费时间: ' + (30-this.time), '提示', {
                      confirmButtonText: '上链',
                      cancelButtonText: '取消',
                      type: 'warning'
                    }).then(() => {
                      // 链上保存分数
                      var nebPay = new NebPay()

                      var nickname = this.nickName
                      var time = (30-this.time)

                      var value = "0"
                      var callFunction = "save"
                      var callArgs =JSON.stringify([nickname, time])
                      console.log(callArgs)

                      nebPay.call(
                        dappAddress,
                        value,
                        callFunction,
                        callArgs, {
                          listener: this.callbackResult
                        }
                      );

                    }).catch(() => {

                    });

              }

          },
          playAgain() {
              // 再玩一次
              this.init();
              // this.startGame();

              this.$message({
                message: '游戏结束，下次加油哦！',
                type: 'warning'
              });
          },
          /*展示规则*/
          showRules() {
            clearTimeout(this.timer); // 游戏中点击活动规则 暂停倒计时

            this.$alert(this.ruleContent, '活动规则', {
              confirmButtonText: '关闭',
              callback: action => {
                this.countdown(); // 关闭活动规则 继续开始计时器
              }
            });
          },
          /*查询链上时间*/
          queryTime () {
            var from = this.userAddress
            var value = '0'
            var nonce = '0'
            var gas_price = '1000000'
            var gas_limit = '2000000'

            // 获取排行榜列表
            var contract = {
                "function": "getGamerTime",
                "args": ""
            }

            neb.api.call(
              from,
              dappAddress,
              value,
              nonce,
              gas_price,
              gas_limit,
              contract
            ).then( (resp) => {
                  if (resp["result"] !== "null") {

                    this.currGamer = JSON.parse(resp["result"])
                    this.blockchainTime = this.currGamer.time
                    console.log("当前用户链上时间", this.currGamer.time)

                  } else {

                  }
              }).catch(function (err) {

                  console.log("error:" + err.message)
              })

          },
          /*展示排名*/
          showRanking() {
              // 关闭遮罩层
              console.log('排名');

              this.dialogRankingVisible = true;


              var from = this.userAddress
              var value = '0'
              var nonce = '0'
              var gas_price = '1000000'
              var gas_limit = '2000000'

              // 获取排行榜列表
              var contract = {
                  "function": "getLeaderBoard",
                  "args": ""
              }

              neb.api.call(
                from,
                dappAddress,
                value,
                nonce,
                gas_price,
                gas_limit,
                contract
              ).then( (resp) => {
                    console.log("数据查询完成", resp)
                    if (resp["result"] !== "null") {

                      this.leaderBoard = JSON.parse(resp["result"]);
                      // 按time进行排序
                      if (this.leaderBoard.length) {
                        this.leaderBoard = _.sortBy(this.leaderBoard, (obj, key) => {
                          return -obj.time
                        })
                      }

                    }
                }).catch(function (err) {

                    console.log("error:" + err.message)
                })
          },
          countdown() {
              // 倒计时
              let self = this;
              if(self.time == 0) {
                if(self.isLock == 1) {
                    self.cardFlip = '';
                    self.timeDesc = '倒计时间:';
                    self.time = TM2;
                    self.startPlaying();
                } else {
                    self.timeDesc = '记忆时间:';
                    self.time = TM1;
                    self.init();

                    self.playAgain();
                }
              } else {
                  self.time--;
                  self.timer = setTimeout(function() {
                      self.countdown();
                  }, 1000);
              }
          }
      }
	}
</script>
