'use strict';

var Gamer = function(item) {
    if (item) {
        var obj = JSON.parse(item);
        this.address = obj.address;
        this.nickname = obj.nickname
        this.time = obj.time;
    } else {
        this.address = "";
        this.nickname = "";
        this.time = 0;
    }
};

Gamer.prototype = {
    toString: function() {
        return JSON.stringify(this);
    }
};


var FlopSpeedContract = function() {
    LocalContractStorage.defineProperty(this, "size");
    LocalContractStorage.defineMapProperty(this, "leaderBoard", {
        parse: function(item) {
            return new Gamer(item);
        },
        stringify: function(obj) {
            return obj.toString();
        }
    });
};



FlopSpeedContract.prototype = {
    init: function() {
      this.size = 0;
    },
    toString: function() {
        return JSON.stringify(this);
    },
    /*保存玩家数据到链上*/
    save: function(nickname, time) {
        // 自动获取当前钱包检测到的登录钱包地址
        var from = Blockchain.transaction.from;


        var hasGamer;

        for(var i=0; i<this.size; i++){
          var tempObj = JSON.parse(this.leaderBoard.get(i));
          if (tempObj.address === from) {
            this.leaderBoard.del(i);
            this.size --;

            hasGamer = new Gamer();

            hasGamer.address = from;
            hasGamer.nickname = nickname;
            hasGamer.time = time;

            this.leaderBoard.put(this.size, hasGamer);
            this.size ++;
          }
        }

        if (!hasGamer) {

          var item = new Gamer();
          item.address = from;
          item.nickname = nickname;
          item.time = time;


          this.leaderBoard.put(this.size, item);

          this.size ++;
        }
    },
    getLeaderBoard: function() {
      var from = Blockchain.transaction.from;
      var list = [];

      for(var i=0; i<this.size; i++){
        var tempObj = JSON.parse(this.leaderBoard.get(i));
        list.push(tempObj);
      }

      return list;
    },
    getGamerTime: function() {
      var from = Blockchain.transaction.from;

      var currGamer;

      for(var i=0; i<this.size; i++){
        var tempObj = JSON.parse(this.leaderBoard.get(i));
        if (tempObj.address === from) {
          currGamer = tempObj;
        }
      }

      if (currGamer) {
        return currGamer;
      } else {
        return 'no data';
      }
    }
};

module.exports = FlopSpeedContract;
