(() => {
  var __defineProperty = Object.defineProperty;
  var __hasOwnProperty = Object.prototype.hasOwnProperty;
  var __assign = Object.assign;
  var __commonJS = (callback, module) => () => {
    if (!module) {
      module = {exports: {}};
      callback(module.exports, module);
    }
    return module.exports;
  };
  var __markAsModule = (target) => {
    return __defineProperty(target, "__esModule", {value: true});
  };
  var __exportStar = (target, module) => {
    __markAsModule(target);
    if (typeof module === "object" || typeof module === "function") {
      for (let key in module)
        if (__hasOwnProperty.call(module, key) && !__hasOwnProperty.call(target, key) && key !== "default")
          __defineProperty(target, key, {get: () => module[key], enumerable: true});
    }
    return target;
  };
  var __toModule = (module) => {
    if (module && module.__esModule)
      return module;
    return __exportStar(__defineProperty({}, "default", {value: module, enumerable: true}), module);
  };

  // node_modules/pako/lib/utils/common.js
  var require_common = __commonJS((exports) => {
    "use strict";
    var TYPED_OK = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Int32Array !== "undefined";
    function _has(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }
    exports.assign = function(obj) {
      var sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        var source = sources.shift();
        if (!source) {
          continue;
        }
        if (typeof source !== "object") {
          throw new TypeError(source + "must be non-object");
        }
        for (var p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }
      return obj;
    };
    exports.shrinkBuf = function(buf, size) {
      if (buf.length === size) {
        return buf;
      }
      if (buf.subarray) {
        return buf.subarray(0, size);
      }
      buf.length = size;
      return buf;
    };
    var fnTyped = {
      arraySet: function(dest, src, src_offs, len, dest_offs) {
        if (src.subarray && dest.subarray) {
          dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
          return;
        }
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      flattenChunks: function(chunks) {
        var i, l, len, pos, chunk, result;
        len = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          len += chunks[i].length;
        }
        result = new Uint8Array(len);
        pos = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          chunk = chunks[i];
          result.set(chunk, pos);
          pos += chunk.length;
        }
        return result;
      }
    };
    var fnUntyped = {
      arraySet: function(dest, src, src_offs, len, dest_offs) {
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      flattenChunks: function(chunks) {
        return [].concat.apply([], chunks);
      }
    };
    exports.setTyped = function(on) {
      if (on) {
        exports.Buf8 = Uint8Array;
        exports.Buf16 = Uint16Array;
        exports.Buf32 = Int32Array;
        exports.assign(exports, fnTyped);
      } else {
        exports.Buf8 = Array;
        exports.Buf16 = Array;
        exports.Buf32 = Array;
        exports.assign(exports, fnUntyped);
      }
    };
    exports.setTyped(TYPED_OK);
  });

  // node_modules/pako/lib/zlib/trees.js
  var require_trees = __commonJS((exports) => {
    "use strict";
    var utils = require_common();
    var Z_FIXED = 4;
    var Z_BINARY = 0;
    var Z_TEXT = 1;
    var Z_UNKNOWN = 2;
    function zero(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES = 2;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var Buf_size = 16;
    var MAX_BL_BITS = 7;
    var END_BLOCK = 256;
    var REP_3_6 = 16;
    var REPZ_3_10 = 17;
    var REPZ_11_138 = 18;
    var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
    var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
    var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
    var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    var DIST_CODE_LEN = 512;
    var static_ltree = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    var static_dtree = new Array(D_CODES * 2);
    zero(static_dtree);
    var _dist_code = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    var base_length = new Array(LENGTH_CODES);
    zero(base_length);
    var base_dist = new Array(D_CODES);
    zero(base_dist);
    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
      this.static_tree = static_tree;
      this.extra_bits = extra_bits;
      this.extra_base = extra_base;
      this.elems = elems;
      this.max_length = max_length;
      this.has_stree = static_tree && static_tree.length;
    }
    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;
    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;
      this.max_code = 0;
      this.stat_desc = stat_desc;
    }
    function d_code(dist) {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    }
    function put_short(s, w) {
      s.pending_buf[s.pending++] = w & 255;
      s.pending_buf[s.pending++] = w >>> 8 & 255;
    }
    function send_bits(s, value, length) {
      if (s.bi_valid > Buf_size - length) {
        s.bi_buf |= value << s.bi_valid & 65535;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> Buf_size - s.bi_valid;
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= value << s.bi_valid & 65535;
        s.bi_valid += length;
      }
    }
    function send_code(s, c, tree) {
      send_bits(s, tree[c * 2], tree[c * 2 + 1]);
    }
    function bi_reverse(code, len) {
      var res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    }
    function bi_flush(s) {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;
      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 255;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    }
    function gen_bitlen(s, desc) {
      var tree = desc.dyn_tree;
      var max_code = desc.max_code;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var extra = desc.stat_desc.extra_bits;
      var base = desc.stat_desc.extra_base;
      var max_length = desc.stat_desc.max_length;
      var h;
      var n, m;
      var bits;
      var xbits;
      var f;
      var overflow = 0;
      for (bits = 0; bits <= MAX_BITS; bits++) {
        s.bl_count[bits] = 0;
      }
      tree[s.heap[s.heap_max] * 2 + 1] = 0;
      for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n * 2 + 1] = bits;
        if (n > max_code) {
          continue;
        }
        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2];
        s.opt_len += f * (bits + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1] + xbits);
        }
      }
      if (overflow === 0) {
        return;
      }
      do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) {
          bits--;
        }
        s.bl_count[bits]--;
        s.bl_count[bits + 1] += 2;
        s.bl_count[max_length]--;
        overflow -= 2;
      } while (overflow > 0);
      for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) {
            continue;
          }
          if (tree[m * 2 + 1] !== bits) {
            s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
            tree[m * 2 + 1] = bits;
          }
          n--;
        }
      }
    }
    function gen_codes(tree, max_code, bl_count) {
      var next_code = new Array(MAX_BITS + 1);
      var code = 0;
      var bits;
      var n;
      for (bits = 1; bits <= MAX_BITS; bits++) {
        next_code[bits] = code = code + bl_count[bits - 1] << 1;
      }
      for (n = 0; n <= max_code; n++) {
        var len = tree[n * 2 + 1];
        if (len === 0) {
          continue;
        }
        tree[n * 2] = bi_reverse(next_code[len]++, len);
      }
    }
    function tr_static_init() {
      var n;
      var bits;
      var length;
      var code;
      var dist;
      var bl_count = new Array(MAX_BITS + 1);
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < 1 << extra_lbits[code]; n++) {
          _length_code[length++] = code;
        }
      }
      _length_code[length - 1] = code;
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < 1 << extra_dbits[code]; n++) {
          _dist_code[dist++] = code;
        }
      }
      dist >>= 7;
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < 1 << extra_dbits[code] - 7; n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }
      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1] = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1] = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1] = 8;
        n++;
        bl_count[8]++;
      }
      gen_codes(static_ltree, L_CODES + 1, bl_count);
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1] = 5;
        static_dtree[n * 2] = bi_reverse(n, 5);
      }
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
    }
    function init_block(s) {
      var n;
      for (n = 0; n < L_CODES; n++) {
        s.dyn_ltree[n * 2] = 0;
      }
      for (n = 0; n < D_CODES; n++) {
        s.dyn_dtree[n * 2] = 0;
      }
      for (n = 0; n < BL_CODES; n++) {
        s.bl_tree[n * 2] = 0;
      }
      s.dyn_ltree[END_BLOCK * 2] = 1;
      s.opt_len = s.static_len = 0;
      s.last_lit = s.matches = 0;
    }
    function bi_windup(s) {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    }
    function copy_block(s, buf, len, header) {
      bi_windup(s);
      if (header) {
        put_short(s, len);
        put_short(s, ~len);
      }
      utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
      s.pending += len;
    }
    function smaller(tree, n, m, depth) {
      var _n2 = n * 2;
      var _m2 = m * 2;
      return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m];
    }
    function pqdownheap(s, tree, k) {
      var v = s.heap[k];
      var j = k << 1;
      while (j <= s.heap_len) {
        if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        if (smaller(tree, v, s.heap[j], s.depth)) {
          break;
        }
        s.heap[k] = s.heap[j];
        k = j;
        j <<= 1;
      }
      s.heap[k] = v;
    }
    function compress_block(s, ltree, dtree) {
      var dist;
      var lc;
      var lx = 0;
      var code;
      var extra;
      if (s.last_lit !== 0) {
        do {
          dist = s.pending_buf[s.d_buf + lx * 2] << 8 | s.pending_buf[s.d_buf + lx * 2 + 1];
          lc = s.pending_buf[s.l_buf + lx];
          lx++;
          if (dist === 0) {
            send_code(s, lc, ltree);
          } else {
            code = _length_code[lc];
            send_code(s, code + LITERALS + 1, ltree);
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra);
            }
            dist--;
            code = d_code(dist);
            send_code(s, code, dtree);
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);
            }
          }
        } while (lx < s.last_lit);
      }
      send_code(s, END_BLOCK, ltree);
    }
    function build_tree(s, desc) {
      var tree = desc.dyn_tree;
      var stree = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var elems = desc.stat_desc.elems;
      var n, m;
      var max_code = -1;
      var node;
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE;
      for (n = 0; n < elems; n++) {
        if (tree[n * 2] !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;
        } else {
          tree[n * 2 + 1] = 0;
        }
      }
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
        tree[node * 2] = 1;
        s.depth[node] = 0;
        s.opt_len--;
        if (has_stree) {
          s.static_len -= stree[node * 2 + 1];
        }
      }
      desc.max_code = max_code;
      for (n = s.heap_len >> 1; n >= 1; n--) {
        pqdownheap(s, tree, n);
      }
      node = elems;
      do {
        n = s.heap[1];
        s.heap[1] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1);
        m = s.heap[1];
        s.heap[--s.heap_max] = n;
        s.heap[--s.heap_max] = m;
        tree[node * 2] = tree[n * 2] + tree[m * 2];
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1] = tree[m * 2 + 1] = node;
        s.heap[1] = node++;
        pqdownheap(s, tree, 1);
      } while (s.heap_len >= 2);
      s.heap[--s.heap_max] = s.heap[1];
      gen_bitlen(s, desc);
      gen_codes(tree, max_code, s.bl_count);
    }
    function scan_tree(s, tree, max_code) {
      var n;
      var prevlen = -1;
      var curlen;
      var nextlen = tree[0 * 2 + 1];
      var count = 0;
      var max_count = 7;
      var min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1] = 65535;
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          s.bl_tree[curlen * 2] += count;
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            s.bl_tree[curlen * 2]++;
          }
          s.bl_tree[REP_3_6 * 2]++;
        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2]++;
        } else {
          s.bl_tree[REPZ_11_138 * 2]++;
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function send_tree(s, tree, max_code) {
      var n;
      var prevlen = -1;
      var curlen;
      var nextlen = tree[0 * 2 + 1];
      var count = 0;
      var max_count = 7;
      var min_count = 4;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1];
        if (++count < max_count && curlen === nextlen) {
          continue;
        } else if (count < min_count) {
          do {
            send_code(s, curlen, s.bl_tree);
          } while (--count !== 0);
        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);
        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);
        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }
        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;
        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;
        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }
    function build_bl_tree(s) {
      var max_blindex;
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
      build_tree(s, s.bl_desc);
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
          break;
        }
      }
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      return max_blindex;
    }
    function send_all_trees(s, lcodes, dcodes, blcodes) {
      var rank;
      send_bits(s, lcodes - 257, 5);
      send_bits(s, dcodes - 1, 5);
      send_bits(s, blcodes - 4, 4);
      for (rank = 0; rank < blcodes; rank++) {
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
      }
      send_tree(s, s.dyn_ltree, lcodes - 1);
      send_tree(s, s.dyn_dtree, dcodes - 1);
    }
    function detect_data_type(s) {
      var black_mask = 4093624447;
      var n;
      for (n = 0; n <= 31; n++, black_mask >>>= 1) {
        if (black_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
          return Z_BINARY;
        }
      }
      if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
        return Z_TEXT;
      }
      for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2] !== 0) {
          return Z_TEXT;
        }
      }
      return Z_BINARY;
    }
    var static_init_done = false;
    function _tr_init(s) {
      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }
      s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
      s.bi_buf = 0;
      s.bi_valid = 0;
      init_block(s);
    }
    function _tr_stored_block(s, buf, stored_len, last) {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
      copy_block(s, buf, stored_len, true);
    }
    function _tr_align(s) {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    }
    function _tr_flush_block(s, buf, stored_len, last) {
      var opt_lenb, static_lenb;
      var max_blindex = 0;
      if (s.level > 0) {
        if (s.strm.data_type === Z_UNKNOWN) {
          s.strm.data_type = detect_data_type(s);
        }
        build_tree(s, s.l_desc);
        build_tree(s, s.d_desc);
        max_blindex = build_bl_tree(s);
        opt_lenb = s.opt_len + 3 + 7 >>> 3;
        static_lenb = s.static_len + 3 + 7 >>> 3;
        if (static_lenb <= opt_lenb) {
          opt_lenb = static_lenb;
        }
      } else {
        opt_lenb = static_lenb = stored_len + 5;
      }
      if (stored_len + 4 <= opt_lenb && buf !== -1) {
        _tr_stored_block(s, buf, stored_len, last);
      } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);
      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      init_block(s);
      if (last) {
        bi_windup(s);
      }
    }
    function _tr_tally(s, dist, lc) {
      s.pending_buf[s.d_buf + s.last_lit * 2] = dist >>> 8 & 255;
      s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 255;
      s.pending_buf[s.l_buf + s.last_lit] = lc & 255;
      s.last_lit++;
      if (dist === 0) {
        s.dyn_ltree[lc * 2]++;
      } else {
        s.matches++;
        dist--;
        s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
        s.dyn_dtree[d_code(dist) * 2]++;
      }
      return s.last_lit === s.lit_bufsize - 1;
    }
    exports._tr_init = _tr_init;
    exports._tr_stored_block = _tr_stored_block;
    exports._tr_flush_block = _tr_flush_block;
    exports._tr_tally = _tr_tally;
    exports._tr_align = _tr_align;
  });

  // node_modules/pako/lib/zlib/adler32.js
  var require_adler32 = __commonJS((exports, module) => {
    "use strict";
    function adler32(adler, buf, len, pos) {
      var s1 = adler & 65535 | 0, s2 = adler >>> 16 & 65535 | 0, n = 0;
      while (len !== 0) {
        n = len > 2e3 ? 2e3 : len;
        len -= n;
        do {
          s1 = s1 + buf[pos++] | 0;
          s2 = s2 + s1 | 0;
        } while (--n);
        s1 %= 65521;
        s2 %= 65521;
      }
      return s1 | s2 << 16 | 0;
    }
    module.exports = adler32;
  });

  // node_modules/pako/lib/zlib/crc32.js
  var require_crc32 = __commonJS((exports, module) => {
    "use strict";
    function makeTable() {
      var c, table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
        }
        table[n] = c;
      }
      return table;
    }
    var crcTable = makeTable();
    function crc32(crc, buf, len, pos) {
      var t = crcTable, end = pos + len;
      crc ^= -1;
      for (var i = pos; i < end; i++) {
        crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255];
      }
      return crc ^ -1;
    }
    module.exports = crc32;
  });

  // node_modules/pako/lib/zlib/messages.js
  var require_messages = __commonJS((exports, module) => {
    "use strict";
    module.exports = {
      2: "need dictionary",
      1: "stream end",
      0: "",
      "-1": "file error",
      "-2": "stream error",
      "-3": "data error",
      "-4": "insufficient memory",
      "-5": "buffer error",
      "-6": "incompatible version"
    };
  });

  // node_modules/pako/lib/zlib/deflate.js
  var require_deflate2 = __commonJS((exports) => {
    "use strict";
    var utils = require_common();
    var trees = require_trees();
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var msg = require_messages();
    var Z_NO_FLUSH = 0;
    var Z_PARTIAL_FLUSH = 1;
    var Z_FULL_FLUSH = 3;
    var Z_FINISH = 4;
    var Z_BLOCK = 5;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_STREAM_ERROR = -2;
    var Z_DATA_ERROR = -3;
    var Z_BUF_ERROR = -5;
    var Z_DEFAULT_COMPRESSION = -1;
    var Z_FILTERED = 1;
    var Z_HUFFMAN_ONLY = 2;
    var Z_RLE = 3;
    var Z_FIXED = 4;
    var Z_DEFAULT_STRATEGY = 0;
    var Z_UNKNOWN = 2;
    var Z_DEFLATED = 8;
    var MAX_MEM_LEVEL = 9;
    var MAX_WBITS = 15;
    var DEF_MEM_LEVEL = 8;
    var LENGTH_CODES = 29;
    var LITERALS = 256;
    var L_CODES = LITERALS + 1 + LENGTH_CODES;
    var D_CODES = 30;
    var BL_CODES = 19;
    var HEAP_SIZE = 2 * L_CODES + 1;
    var MAX_BITS = 15;
    var MIN_MATCH = 3;
    var MAX_MATCH = 258;
    var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
    var PRESET_DICT = 32;
    var INIT_STATE = 42;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;
    var BS_NEED_MORE = 1;
    var BS_BLOCK_DONE = 2;
    var BS_FINISH_STARTED = 3;
    var BS_FINISH_DONE = 4;
    var OS_CODE = 3;
    function err(strm, errorCode) {
      strm.msg = msg[errorCode];
      return errorCode;
    }
    function rank(f) {
      return (f << 1) - (f > 4 ? 9 : 0);
    }
    function zero(buf) {
      var len = buf.length;
      while (--len >= 0) {
        buf[len] = 0;
      }
    }
    function flush_pending(strm) {
      var s = strm.state;
      var len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) {
        return;
      }
      utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    }
    function flush_block_only(s, last) {
      trees._tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    }
    function put_byte(s, b) {
      s.pending_buf[s.pending++] = b;
    }
    function putShortMSB(s, b) {
      s.pending_buf[s.pending++] = b >>> 8 & 255;
      s.pending_buf[s.pending++] = b & 255;
    }
    function read_buf(strm, buf, start, size) {
      var len = strm.avail_in;
      if (len > size) {
        len = size;
      }
      if (len === 0) {
        return 0;
      }
      strm.avail_in -= len;
      utils.arraySet(buf, strm.input, strm.next_in, len, start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32(strm.adler, buf, len, start);
      } else if (strm.state.wrap === 2) {
        strm.adler = crc32(strm.adler, buf, len, start);
      }
      strm.next_in += len;
      strm.total_in += len;
      return len;
    }
    function longest_match(s, cur_match) {
      var chain_length = s.max_chain_length;
      var scan = s.strstart;
      var match;
      var len;
      var best_len = s.prev_length;
      var nice_match = s.nice_match;
      var limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;
      var _win = s.window;
      var wmask = s.w_mask;
      var prev = s.prev;
      var strend = s.strstart + MAX_MATCH;
      var scan_end1 = _win[scan + best_len - 1];
      var scan_end = _win[scan + best_len];
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      if (nice_match > s.lookahead) {
        nice_match = s.lookahead;
      }
      do {
        match = cur_match;
        if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) {
          continue;
        }
        scan += 2;
        match++;
        do {
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
        len = MAX_MATCH - (strend - scan);
        scan = strend - MAX_MATCH;
        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1 = _win[scan + best_len - 1];
          scan_end = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);
      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    }
    function fill_window(s) {
      var _w_size = s.w_size;
      var p, n, m, more, str;
      do {
        more = s.window_size - s.lookahead - s.strstart;
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
          utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          s.block_start -= _w_size;
          n = s.hash_size;
          p = n;
          do {
            m = s.head[--p];
            s.head[p] = m >= _w_size ? m - _w_size : 0;
          } while (--n);
          n = _w_size;
          p = n;
          do {
            m = s.prev[--p];
            s.prev[p] = m >= _w_size ? m - _w_size : 0;
          } while (--n);
          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;
        if (s.lookahead + s.insert >= MIN_MATCH) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + 1]) & s.hash_mask;
          while (s.insert) {
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH) {
              break;
            }
          }
        }
      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
    }
    function deflate_stored(s, flush) {
      var max_block_size = 65535;
      if (max_block_size > s.pending_buf_size - 5) {
        max_block_size = s.pending_buf_size - 5;
      }
      for (; ; ) {
        if (s.lookahead <= 1) {
          fill_window(s);
          if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.strstart += s.lookahead;
        s.lookahead = 0;
        var max_start = s.block_start + max_block_size;
        if (s.strstart === 0 || s.strstart >= max_start) {
          s.lookahead = s.strstart - max_start;
          s.strstart = max_start;
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
        if (s.strstart - s.block_start >= s.w_size - MIN_LOOKAHEAD) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.strstart > s.block_start) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_NEED_MORE;
    }
    function deflate_fast(s, flush) {
      var hash_head;
      var bflush;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) {
            s.match_length--;
            do {
              s.strstart++;
              s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            } while (--s.match_length !== 0);
            s.strstart++;
          } else {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + 1]) & s.hash_mask;
          }
        } else {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_slow(s, flush) {
      var hash_head;
      var bflush;
      var max_insert;
      for (; ; ) {
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        hash_head = 0;
        if (s.lookahead >= MIN_MATCH) {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
        }
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH - 1;
        if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) {
          s.match_length = longest_match(s, hash_head);
          if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) {
            s.match_length = MIN_MATCH - 1;
          }
        }
        if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH;
          bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH - 1;
          s.strstart++;
          if (bflush) {
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
          }
        } else if (s.match_available) {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
          if (bflush) {
            flush_block_only(s, false);
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      if (s.match_available) {
        bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_rle(s, flush) {
      var bflush;
      var prev;
      var scan, strend;
      var _win = s.window;
      for (; ; ) {
        if (s.lookahead <= MAX_MATCH) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break;
          }
        }
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH;
            do {
            } while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
            s.match_length = MAX_MATCH - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
        }
        if (s.match_length >= MIN_MATCH) {
          bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);
          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function deflate_huff(s, flush) {
      var bflush;
      for (; ; ) {
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;
          }
        }
        s.match_length = 0;
        bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      }
      return BS_BLOCK_DONE;
    }
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }
    var configuration_table;
    configuration_table = [
      new Config(0, 0, 0, 0, deflate_stored),
      new Config(4, 4, 8, 4, deflate_fast),
      new Config(4, 5, 16, 8, deflate_fast),
      new Config(4, 6, 32, 32, deflate_fast),
      new Config(4, 4, 16, 16, deflate_slow),
      new Config(8, 16, 32, 32, deflate_slow),
      new Config(8, 16, 128, 128, deflate_slow),
      new Config(8, 32, 128, 256, deflate_slow),
      new Config(32, 128, 258, 1024, deflate_slow),
      new Config(32, 258, 258, 4096, deflate_slow)
    ];
    function lm_init(s) {
      s.window_size = 2 * s.w_size;
      zero(s.head);
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;
      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      s.ins_h = 0;
    }
    function DeflateState() {
      this.strm = null;
      this.status = 0;
      this.pending_buf = null;
      this.pending_buf_size = 0;
      this.pending_out = 0;
      this.pending = 0;
      this.wrap = 0;
      this.gzhead = null;
      this.gzindex = 0;
      this.method = Z_DEFLATED;
      this.last_flush = -1;
      this.w_size = 0;
      this.w_bits = 0;
      this.w_mask = 0;
      this.window = null;
      this.window_size = 0;
      this.prev = null;
      this.head = null;
      this.ins_h = 0;
      this.hash_size = 0;
      this.hash_bits = 0;
      this.hash_mask = 0;
      this.hash_shift = 0;
      this.block_start = 0;
      this.match_length = 0;
      this.prev_match = 0;
      this.match_available = 0;
      this.strstart = 0;
      this.match_start = 0;
      this.lookahead = 0;
      this.prev_length = 0;
      this.max_chain_length = 0;
      this.max_lazy_match = 0;
      this.level = 0;
      this.strategy = 0;
      this.good_match = 0;
      this.nice_match = 0;
      this.dyn_ltree = new utils.Buf16(HEAP_SIZE * 2);
      this.dyn_dtree = new utils.Buf16((2 * D_CODES + 1) * 2);
      this.bl_tree = new utils.Buf16((2 * BL_CODES + 1) * 2);
      zero(this.dyn_ltree);
      zero(this.dyn_dtree);
      zero(this.bl_tree);
      this.l_desc = null;
      this.d_desc = null;
      this.bl_desc = null;
      this.bl_count = new utils.Buf16(MAX_BITS + 1);
      this.heap = new utils.Buf16(2 * L_CODES + 1);
      zero(this.heap);
      this.heap_len = 0;
      this.heap_max = 0;
      this.depth = new utils.Buf16(2 * L_CODES + 1);
      zero(this.depth);
      this.l_buf = 0;
      this.lit_bufsize = 0;
      this.last_lit = 0;
      this.d_buf = 0;
      this.opt_len = 0;
      this.static_len = 0;
      this.matches = 0;
      this.insert = 0;
      this.bi_buf = 0;
      this.bi_valid = 0;
    }
    function deflateResetKeep(strm) {
      var s;
      if (!strm || !strm.state) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN;
      s = strm.state;
      s.pending = 0;
      s.pending_out = 0;
      if (s.wrap < 0) {
        s.wrap = -s.wrap;
      }
      s.status = s.wrap ? INIT_STATE : BUSY_STATE;
      strm.adler = s.wrap === 2 ? 0 : 1;
      s.last_flush = Z_NO_FLUSH;
      trees._tr_init(s);
      return Z_OK;
    }
    function deflateReset(strm) {
      var ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    }
    function deflateSetHeader(strm, head) {
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      if (strm.state.wrap !== 2) {
        return Z_STREAM_ERROR;
      }
      strm.state.gzhead = head;
      return Z_OK;
    }
    function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      var wrap = 1;
      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else if (windowBits > 15) {
        wrap = 2;
        windowBits -= 16;
      }
      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED) {
        return err(strm, Z_STREAM_ERROR);
      }
      if (windowBits === 8) {
        windowBits = 9;
      }
      var s = new DeflateState();
      strm.state = s;
      s.strm = strm;
      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;
      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
      s.window = new utils.Buf8(s.w_size * 2);
      s.head = new utils.Buf16(s.hash_size);
      s.prev = new utils.Buf16(s.w_size);
      s.lit_bufsize = 1 << memLevel + 6;
      s.pending_buf_size = s.lit_bufsize * 4;
      s.pending_buf = new utils.Buf8(s.pending_buf_size);
      s.d_buf = 1 * s.lit_bufsize;
      s.l_buf = (1 + 2) * s.lit_bufsize;
      s.level = level;
      s.strategy = strategy;
      s.method = method;
      return deflateReset(strm);
    }
    function deflateInit(strm, level) {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    }
    function deflate(strm, flush) {
      var old_flush, s;
      var beg, val;
      if (!strm || !strm.state || flush > Z_BLOCK || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }
      s = strm.state;
      if (!strm.output || !strm.input && strm.avail_in !== 0 || s.status === FINISH_STATE && flush !== Z_FINISH) {
        return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }
      s.strm = strm;
      old_flush = s.last_flush;
      s.last_flush = flush;
      if (s.status === INIT_STATE) {
        if (s.wrap === 2) {
          strm.adler = 0;
          put_byte(s, 31);
          put_byte(s, 139);
          put_byte(s, 8);
          if (!s.gzhead) {
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
          } else {
            put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
            put_byte(s, s.gzhead.time & 255);
            put_byte(s, s.gzhead.time >> 8 & 255);
            put_byte(s, s.gzhead.time >> 16 & 255);
            put_byte(s, s.gzhead.time >> 24 & 255);
            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
            put_byte(s, s.gzhead.os & 255);
            if (s.gzhead.extra && s.gzhead.extra.length) {
              put_byte(s, s.gzhead.extra.length & 255);
              put_byte(s, s.gzhead.extra.length >> 8 & 255);
            }
            if (s.gzhead.hcrc) {
              strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
            }
            s.gzindex = 0;
            s.status = EXTRA_STATE;
          }
        } else {
          var header = Z_DEFLATED + (s.w_bits - 8 << 4) << 8;
          var level_flags = -1;
          if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
            level_flags = 0;
          } else if (s.level < 6) {
            level_flags = 1;
          } else if (s.level === 6) {
            level_flags = 2;
          } else {
            level_flags = 3;
          }
          header |= level_flags << 6;
          if (s.strstart !== 0) {
            header |= PRESET_DICT;
          }
          header += 31 - header % 31;
          s.status = BUSY_STATE;
          putShortMSB(s, header);
          if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 65535);
          }
          strm.adler = 1;
        }
      }
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra) {
          beg = s.pending;
          while (s.gzindex < (s.gzhead.extra.length & 65535)) {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                break;
              }
            }
            put_byte(s, s.gzhead.extra[s.gzindex] & 255);
            s.gzindex++;
          }
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (s.gzindex === s.gzhead.extra.length) {
            s.gzindex = 0;
            s.status = NAME_STATE;
          }
        } else {
          s.status = NAME_STATE;
        }
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name) {
          beg = s.pending;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.gzindex = 0;
            s.status = COMMENT_STATE;
          }
        } else {
          s.status = COMMENT_STATE;
        }
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment) {
          beg = s.pending;
          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.status = HCRC_STATE;
          }
        } else {
          s.status = HCRC_STATE;
        }
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
          }
          if (s.pending + 2 <= s.pending_buf_size) {
            put_byte(s, strm.adler & 255);
            put_byte(s, strm.adler >> 8 & 255);
            strm.adler = 0;
            s.status = BUSY_STATE;
          }
        } else {
          s.status = BUSY_STATE;
        }
      }
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
        return err(strm, Z_BUF_ERROR);
      }
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR);
      }
      if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH && s.status !== FINISH_STATE) {
        var bstate = s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
          }
          return Z_OK;
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            trees._tr_align(s);
          } else if (flush !== Z_BLOCK) {
            trees._tr_stored_block(s, 0, 0, false);
            if (flush === Z_FULL_FLUSH) {
              zero(s.head);
              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            return Z_OK;
          }
        }
      }
      if (flush !== Z_FINISH) {
        return Z_OK;
      }
      if (s.wrap <= 0) {
        return Z_STREAM_END;
      }
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 255);
        put_byte(s, strm.adler >> 8 & 255);
        put_byte(s, strm.adler >> 16 & 255);
        put_byte(s, strm.adler >> 24 & 255);
        put_byte(s, strm.total_in & 255);
        put_byte(s, strm.total_in >> 8 & 255);
        put_byte(s, strm.total_in >> 16 & 255);
        put_byte(s, strm.total_in >> 24 & 255);
      } else {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 65535);
      }
      flush_pending(strm);
      if (s.wrap > 0) {
        s.wrap = -s.wrap;
      }
      return s.pending !== 0 ? Z_OK : Z_STREAM_END;
    }
    function deflateEnd(strm) {
      var status;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      status = strm.state.status;
      if (status !== INIT_STATE && status !== EXTRA_STATE && status !== NAME_STATE && status !== COMMENT_STATE && status !== HCRC_STATE && status !== BUSY_STATE && status !== FINISH_STATE) {
        return err(strm, Z_STREAM_ERROR);
      }
      strm.state = null;
      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
    }
    function deflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;
      var s;
      var str, n;
      var wrap;
      var avail;
      var next;
      var input;
      var tmpDict;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      s = strm.state;
      wrap = s.wrap;
      if (wrap === 2 || wrap === 1 && s.status !== INIT_STATE || s.lookahead) {
        return Z_STREAM_ERROR;
      }
      if (wrap === 1) {
        strm.adler = adler32(strm.adler, dictionary, dictLength, 0);
      }
      s.wrap = 0;
      if (dictLength >= s.w_size) {
        if (wrap === 0) {
          zero(s.head);
          s.strstart = 0;
          s.block_start = 0;
          s.insert = 0;
        }
        tmpDict = new utils.Buf8(s.w_size);
        utils.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
      }
      avail = strm.avail_in;
      next = strm.next_in;
      input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s);
      while (s.lookahead >= MIN_MATCH) {
        str = s.strstart;
        n = s.lookahead - (MIN_MATCH - 1);
        do {
          s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH - 1;
        fill_window(s);
      }
      s.strstart += s.lookahead;
      s.block_start = s.strstart;
      s.insert = s.lookahead;
      s.lookahead = 0;
      s.match_length = s.prev_length = MIN_MATCH - 1;
      s.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s.wrap = wrap;
      return Z_OK;
    }
    exports.deflateInit = deflateInit;
    exports.deflateInit2 = deflateInit2;
    exports.deflateReset = deflateReset;
    exports.deflateResetKeep = deflateResetKeep;
    exports.deflateSetHeader = deflateSetHeader;
    exports.deflate = deflate;
    exports.deflateEnd = deflateEnd;
    exports.deflateSetDictionary = deflateSetDictionary;
    exports.deflateInfo = "pako deflate (from Nodeca project)";
  });

  // node_modules/pako/lib/utils/strings.js
  var require_strings = __commonJS((exports) => {
    "use strict";
    var utils = require_common();
    var STR_APPLY_OK = true;
    var STR_APPLY_UIA_OK = true;
    try {
      String.fromCharCode.apply(null, [0]);
    } catch (__) {
      STR_APPLY_OK = false;
    }
    try {
      String.fromCharCode.apply(null, new Uint8Array(1));
    } catch (__) {
      STR_APPLY_UIA_OK = false;
    }
    var _utf8len = new utils.Buf8(256);
    for (var q = 0; q < 256; q++) {
      _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
    }
    _utf8len[254] = _utf8len[254] = 1;
    exports.string2buf = function(str) {
      var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4;
      }
      buf = new utils.Buf8(buf_len);
      for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 64512) === 55296 && m_pos + 1 < str_len) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 64512) === 56320) {
            c = 65536 + (c - 55296 << 10) + (c2 - 56320);
            m_pos++;
          }
        }
        if (c < 128) {
          buf[i++] = c;
        } else if (c < 2048) {
          buf[i++] = 192 | c >>> 6;
          buf[i++] = 128 | c & 63;
        } else if (c < 65536) {
          buf[i++] = 224 | c >>> 12;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        } else {
          buf[i++] = 240 | c >>> 18;
          buf[i++] = 128 | c >>> 12 & 63;
          buf[i++] = 128 | c >>> 6 & 63;
          buf[i++] = 128 | c & 63;
        }
      }
      return buf;
    };
    function buf2binstring(buf, len) {
      if (len < 65534) {
        if (buf.subarray && STR_APPLY_UIA_OK || !buf.subarray && STR_APPLY_OK) {
          return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
        }
      }
      var result = "";
      for (var i = 0; i < len; i++) {
        result += String.fromCharCode(buf[i]);
      }
      return result;
    }
    exports.buf2binstring = function(buf) {
      return buf2binstring(buf, buf.length);
    };
    exports.binstring2buf = function(str) {
      var buf = new utils.Buf8(str.length);
      for (var i = 0, len = buf.length; i < len; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    };
    exports.buf2string = function(buf, max) {
      var i, out, c, c_len;
      var len = max || buf.length;
      var utf16buf = new Array(len * 2);
      for (out = 0, i = 0; i < len; ) {
        c = buf[i++];
        if (c < 128) {
          utf16buf[out++] = c;
          continue;
        }
        c_len = _utf8len[c];
        if (c_len > 4) {
          utf16buf[out++] = 65533;
          i += c_len - 1;
          continue;
        }
        c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7;
        while (c_len > 1 && i < len) {
          c = c << 6 | buf[i++] & 63;
          c_len--;
        }
        if (c_len > 1) {
          utf16buf[out++] = 65533;
          continue;
        }
        if (c < 65536) {
          utf16buf[out++] = c;
        } else {
          c -= 65536;
          utf16buf[out++] = 55296 | c >> 10 & 1023;
          utf16buf[out++] = 56320 | c & 1023;
        }
      }
      return buf2binstring(utf16buf, out);
    };
    exports.utf8border = function(buf, max) {
      var pos;
      max = max || buf.length;
      if (max > buf.length) {
        max = buf.length;
      }
      pos = max - 1;
      while (pos >= 0 && (buf[pos] & 192) === 128) {
        pos--;
      }
      if (pos < 0) {
        return max;
      }
      if (pos === 0) {
        return max;
      }
      return pos + _utf8len[buf[pos]] > max ? pos : max;
    };
  });

  // node_modules/pako/lib/zlib/zstream.js
  var require_zstream = __commonJS((exports, module) => {
    "use strict";
    function ZStream() {
      this.input = null;
      this.next_in = 0;
      this.avail_in = 0;
      this.total_in = 0;
      this.output = null;
      this.next_out = 0;
      this.avail_out = 0;
      this.total_out = 0;
      this.msg = "";
      this.state = null;
      this.data_type = 2;
      this.adler = 0;
    }
    module.exports = ZStream;
  });

  // node_modules/pako/lib/deflate.js
  var require_deflate = __commonJS((exports) => {
    "use strict";
    var zlib_deflate = require_deflate2();
    var utils = require_common();
    var strings = require_strings();
    var msg = require_messages();
    var ZStream = require_zstream();
    var toString = Object.prototype.toString;
    var Z_NO_FLUSH = 0;
    var Z_FINISH = 4;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_SYNC_FLUSH = 2;
    var Z_DEFAULT_COMPRESSION = -1;
    var Z_DEFAULT_STRATEGY = 0;
    var Z_DEFLATED = 8;
    function Deflate(options) {
      if (!(this instanceof Deflate))
        return new Deflate(options);
      this.options = utils.assign({
        level: Z_DEFAULT_COMPRESSION,
        method: Z_DEFLATED,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY,
        to: ""
      }, options || {});
      var opt = this.options;
      if (opt.raw && opt.windowBits > 0) {
        opt.windowBits = -opt.windowBits;
      } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
        opt.windowBits += 16;
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      var status = zlib_deflate.deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy);
      if (status !== Z_OK) {
        throw new Error(msg[status]);
      }
      if (opt.header) {
        zlib_deflate.deflateSetHeader(this.strm, opt.header);
      }
      if (opt.dictionary) {
        var dict;
        if (typeof opt.dictionary === "string") {
          dict = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }
        status = zlib_deflate.deflateSetDictionary(this.strm, dict);
        if (status !== Z_OK) {
          throw new Error(msg[status]);
        }
        this._dict_set = true;
      }
    }
    Deflate.prototype.push = function(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var status, _mode;
      if (this.ended) {
        return false;
      }
      _mode = mode === ~~mode ? mode : mode === true ? Z_FINISH : Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.string2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      do {
        if (strm.avail_out === 0) {
          strm.output = new utils.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_deflate.deflate(strm, _mode);
        if (status !== Z_STREAM_END && status !== Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.avail_out === 0 || strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH)) {
          if (this.options.to === "string") {
            this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
          } else {
            this.onData(utils.shrinkBuf(strm.output, strm.next_out));
          }
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);
      if (_mode === Z_FINISH) {
        status = zlib_deflate.deflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === Z_OK;
      }
      if (_mode === Z_SYNC_FLUSH) {
        this.onEnd(Z_OK);
        strm.avail_out = 0;
        return true;
      }
      return true;
    };
    Deflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Deflate.prototype.onEnd = function(status) {
      if (status === Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function deflate(input, options) {
      var deflator = new Deflate(options);
      deflator.push(input, true);
      if (deflator.err) {
        throw deflator.msg || msg[deflator.err];
      }
      return deflator.result;
    }
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate(input, options);
    }
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate(input, options);
    }
    exports.Deflate = Deflate;
    exports.deflate = deflate;
    exports.deflateRaw = deflateRaw;
    exports.gzip = gzip;
  });

  // node_modules/pako/lib/zlib/inffast.js
  var require_inffast = __commonJS((exports, module) => {
    "use strict";
    var BAD = 30;
    var TYPE = 12;
    module.exports = function inflate_fast(strm, start) {
      var state;
      var _in;
      var last;
      var _out;
      var beg;
      var end;
      var dmax;
      var wsize;
      var whave;
      var wnext;
      var s_window;
      var hold;
      var bits;
      var lcode;
      var dcode;
      var lmask;
      var dmask;
      var here;
      var op;
      var len;
      var dist;
      var from;
      var from_source;
      var input, output;
      state = strm.state;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
      dmax = state.dmax;
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;
      top:
        do {
          if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
          }
          here = lcode[hold & lmask];
          dolen:
            for (; ; ) {
              op = here >>> 24;
              hold >>>= op;
              bits -= op;
              op = here >>> 16 & 255;
              if (op === 0) {
                output[_out++] = here & 65535;
              } else if (op & 16) {
                len = here & 65535;
                op &= 15;
                if (op) {
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                  len += hold & (1 << op) - 1;
                  hold >>>= op;
                  bits -= op;
                }
                if (bits < 15) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  hold += input[_in++] << bits;
                  bits += 8;
                }
                here = dcode[hold & dmask];
                dodist:
                  for (; ; ) {
                    op = here >>> 24;
                    hold >>>= op;
                    bits -= op;
                    op = here >>> 16 & 255;
                    if (op & 16) {
                      dist = here & 65535;
                      op &= 15;
                      if (bits < op) {
                        hold += input[_in++] << bits;
                        bits += 8;
                        if (bits < op) {
                          hold += input[_in++] << bits;
                          bits += 8;
                        }
                      }
                      dist += hold & (1 << op) - 1;
                      if (dist > dmax) {
                        strm.msg = "invalid distance too far back";
                        state.mode = BAD;
                        break top;
                      }
                      hold >>>= op;
                      bits -= op;
                      op = _out - beg;
                      if (dist > op) {
                        op = dist - op;
                        if (op > whave) {
                          if (state.sane) {
                            strm.msg = "invalid distance too far back";
                            state.mode = BAD;
                            break top;
                          }
                        }
                        from = 0;
                        from_source = s_window;
                        if (wnext === 0) {
                          from += wsize - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        } else if (wnext < op) {
                          from += wsize + wnext - op;
                          op -= wnext;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = 0;
                            if (wnext < len) {
                              op = wnext;
                              len -= op;
                              do {
                                output[_out++] = s_window[from++];
                              } while (--op);
                              from = _out - dist;
                              from_source = output;
                            }
                          }
                        } else {
                          from += wnext - op;
                          if (op < len) {
                            len -= op;
                            do {
                              output[_out++] = s_window[from++];
                            } while (--op);
                            from = _out - dist;
                            from_source = output;
                          }
                        }
                        while (len > 2) {
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          output[_out++] = from_source[from++];
                          len -= 3;
                        }
                        if (len) {
                          output[_out++] = from_source[from++];
                          if (len > 1) {
                            output[_out++] = from_source[from++];
                          }
                        }
                      } else {
                        from = _out - dist;
                        do {
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          output[_out++] = output[from++];
                          len -= 3;
                        } while (len > 2);
                        if (len) {
                          output[_out++] = output[from++];
                          if (len > 1) {
                            output[_out++] = output[from++];
                          }
                        }
                      }
                    } else if ((op & 64) === 0) {
                      here = dcode[(here & 65535) + (hold & (1 << op) - 1)];
                      continue dodist;
                    } else {
                      strm.msg = "invalid distance code";
                      state.mode = BAD;
                      break top;
                    }
                    break;
                  }
              } else if ((op & 64) === 0) {
                here = lcode[(here & 65535) + (hold & (1 << op) - 1)];
                continue dolen;
              } else if (op & 32) {
                state.mode = TYPE;
                break top;
              } else {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break top;
              }
              break;
            }
        } while (_in < last && _out < end);
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
      strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
      state.hold = hold;
      state.bits = bits;
      return;
    };
  });

  // node_modules/pako/lib/zlib/inftrees.js
  var require_inftrees = __commonJS((exports, module) => {
    "use strict";
    var utils = require_common();
    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var lbase = [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      13,
      15,
      17,
      19,
      23,
      27,
      31,
      35,
      43,
      51,
      59,
      67,
      83,
      99,
      115,
      131,
      163,
      195,
      227,
      258,
      0,
      0
    ];
    var lext = [
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      16,
      17,
      17,
      17,
      17,
      18,
      18,
      18,
      18,
      19,
      19,
      19,
      19,
      20,
      20,
      20,
      20,
      21,
      21,
      21,
      21,
      16,
      72,
      78
    ];
    var dbase = [
      1,
      2,
      3,
      4,
      5,
      7,
      9,
      13,
      17,
      25,
      33,
      49,
      65,
      97,
      129,
      193,
      257,
      385,
      513,
      769,
      1025,
      1537,
      2049,
      3073,
      4097,
      6145,
      8193,
      12289,
      16385,
      24577,
      0,
      0
    ];
    var dext = [
      16,
      16,
      16,
      16,
      17,
      17,
      18,
      18,
      19,
      19,
      20,
      20,
      21,
      21,
      22,
      22,
      23,
      23,
      24,
      24,
      25,
      25,
      26,
      26,
      27,
      27,
      28,
      28,
      29,
      29,
      64,
      64
    ];
    module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
      var bits = opts.bits;
      var len = 0;
      var sym = 0;
      var min = 0, max = 0;
      var root = 0;
      var curr = 0;
      var drop = 0;
      var left = 0;
      var used = 0;
      var huff = 0;
      var incr;
      var fill;
      var low;
      var mask;
      var next;
      var base = null;
      var base_index = 0;
      var end;
      var count = new utils.Buf16(MAXBITS + 1);
      var offs = new utils.Buf16(MAXBITS + 1);
      var extra = null;
      var extra_index = 0;
      var here_bits, here_op, here_val;
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) {
          break;
        }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) {
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        table[table_index++] = 1 << 24 | 64 << 16 | 0;
        opts.bits = 1;
        return 0;
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) {
          break;
        }
      }
      if (root < min) {
        root = min;
      }
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }
      }
      if (left > 0 && (type === CODES || max !== 1)) {
        return -1;
      }
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }
      if (type === CODES) {
        base = extra = work;
        end = 19;
      } else if (type === LENS) {
        base = lbase;
        base_index -= 257;
        extra = lext;
        extra_index -= 257;
        end = 256;
      } else {
        base = dbase;
        extra = dext;
        end = -1;
      }
      huff = 0;
      sym = 0;
      len = min;
      next = table_index;
      curr = root;
      drop = 0;
      low = -1;
      used = 1 << root;
      mask = used - 1;
      if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
        return 1;
      }
      for (; ; ) {
        here_bits = len - drop;
        if (work[sym] < end) {
          here_op = 0;
          here_val = work[sym];
        } else if (work[sym] > end) {
          here_op = extra[extra_index + work[sym]];
          here_val = base[base_index + work[sym]];
        } else {
          here_op = 32 + 64;
          here_val = 0;
        }
        incr = 1 << len - drop;
        fill = 1 << curr;
        min = fill;
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0;
        } while (fill !== 0);
        incr = 1 << len - 1;
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }
        sym++;
        if (--count[len] === 0) {
          if (len === max) {
            break;
          }
          len = lens[lens_index + work[sym]];
        }
        if (len > root && (huff & mask) !== low) {
          if (drop === 0) {
            drop = root;
          }
          next += min;
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) {
              break;
            }
            curr++;
            left <<= 1;
          }
          used += 1 << curr;
          if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) {
            return 1;
          }
          low = huff & mask;
          table[low] = root << 24 | curr << 16 | next - table_index | 0;
        }
      }
      if (huff !== 0) {
        table[next + huff] = len - drop << 24 | 64 << 16 | 0;
      }
      opts.bits = root;
      return 0;
    };
  });

  // node_modules/pako/lib/zlib/inflate.js
  var require_inflate2 = __commonJS((exports) => {
    "use strict";
    var utils = require_common();
    var adler32 = require_adler32();
    var crc32 = require_crc32();
    var inflate_fast = require_inffast();
    var inflate_table = require_inftrees();
    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;
    var Z_FINISH = 4;
    var Z_BLOCK = 5;
    var Z_TREES = 6;
    var Z_OK = 0;
    var Z_STREAM_END = 1;
    var Z_NEED_DICT = 2;
    var Z_STREAM_ERROR = -2;
    var Z_DATA_ERROR = -3;
    var Z_MEM_ERROR = -4;
    var Z_BUF_ERROR = -5;
    var Z_DEFLATED = 8;
    var HEAD = 1;
    var FLAGS = 2;
    var TIME = 3;
    var OS = 4;
    var EXLEN = 5;
    var EXTRA = 6;
    var NAME = 7;
    var COMMENT = 8;
    var HCRC = 9;
    var DICTID = 10;
    var DICT = 11;
    var TYPE = 12;
    var TYPEDO = 13;
    var STORED = 14;
    var COPY_ = 15;
    var COPY = 16;
    var TABLE = 17;
    var LENLENS = 18;
    var CODELENS = 19;
    var LEN_ = 20;
    var LEN = 21;
    var LENEXT = 22;
    var DIST = 23;
    var DISTEXT = 24;
    var MATCH = 25;
    var LIT = 26;
    var CHECK = 27;
    var LENGTH = 28;
    var DONE = 29;
    var BAD = 30;
    var MEM = 31;
    var SYNC = 32;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    var MAX_WBITS = 15;
    var DEF_WBITS = MAX_WBITS;
    function zswap32(q) {
      return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24);
    }
    function InflateState() {
      this.mode = 0;
      this.last = false;
      this.wrap = 0;
      this.havedict = false;
      this.flags = 0;
      this.dmax = 0;
      this.check = 0;
      this.total = 0;
      this.head = null;
      this.wbits = 0;
      this.wsize = 0;
      this.whave = 0;
      this.wnext = 0;
      this.window = null;
      this.hold = 0;
      this.bits = 0;
      this.length = 0;
      this.offset = 0;
      this.extra = 0;
      this.lencode = null;
      this.distcode = null;
      this.lenbits = 0;
      this.distbits = 0;
      this.ncode = 0;
      this.nlen = 0;
      this.ndist = 0;
      this.have = 0;
      this.next = null;
      this.lens = new utils.Buf16(320);
      this.work = new utils.Buf16(288);
      this.lendyn = null;
      this.distdyn = null;
      this.sane = 0;
      this.back = 0;
      this.was = 0;
    }
    function inflateResetKeep(strm) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = "";
      if (state.wrap) {
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.dmax = 32768;
      state.head = null;
      state.hold = 0;
      state.bits = 0;
      state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
      state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);
      state.sane = 1;
      state.back = -1;
      return Z_OK;
    }
    function inflateReset(strm) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);
    }
    function inflateReset2(strm, windowBits) {
      var wrap;
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      } else {
        wrap = (windowBits >> 4) + 1;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    }
    function inflateInit2(strm, windowBits) {
      var ret;
      var state;
      if (!strm) {
        return Z_STREAM_ERROR;
      }
      state = new InflateState();
      strm.state = state;
      state.window = null;
      ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK) {
        strm.state = null;
      }
      return ret;
    }
    function inflateInit(strm) {
      return inflateInit2(strm, DEF_WBITS);
    }
    var virgin = true;
    var lenfix;
    var distfix;
    function fixedtables(state) {
      if (virgin) {
        var sym;
        lenfix = new utils.Buf32(512);
        distfix = new utils.Buf32(32);
        sym = 0;
        while (sym < 144) {
          state.lens[sym++] = 8;
        }
        while (sym < 256) {
          state.lens[sym++] = 9;
        }
        while (sym < 280) {
          state.lens[sym++] = 7;
        }
        while (sym < 288) {
          state.lens[sym++] = 8;
        }
        inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, {bits: 9});
        sym = 0;
        while (sym < 32) {
          state.lens[sym++] = 5;
        }
        inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, {bits: 5});
        virgin = false;
      }
      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    }
    function updatewindow(strm, src, end, copy) {
      var dist;
      var state = strm.state;
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;
        state.window = new utils.Buf8(state.wsize);
      }
      if (copy >= state.wsize) {
        utils.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
        state.wnext = 0;
        state.whave = state.wsize;
      } else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        utils.arraySet(state.window, src, end - copy, dist, state.wnext);
        copy -= dist;
        if (copy) {
          utils.arraySet(state.window, src, end - copy, copy, 0);
          state.wnext = copy;
          state.whave = state.wsize;
        } else {
          state.wnext += dist;
          if (state.wnext === state.wsize) {
            state.wnext = 0;
          }
          if (state.whave < state.wsize) {
            state.whave += dist;
          }
        }
      }
      return 0;
    }
    function inflate(strm, flush) {
      var state;
      var input, output;
      var next;
      var put;
      var have, left;
      var hold;
      var bits;
      var _in, _out;
      var copy;
      var from;
      var from_source;
      var here = 0;
      var here_bits, here_op, here_val;
      var last_bits, last_op, last_val;
      var len;
      var ret;
      var hbuf = new utils.Buf8(4);
      var opts;
      var n;
      var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
      if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.mode === TYPE) {
        state.mode = TYPEDO;
      }
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      _in = have;
      _out = left;
      ret = Z_OK;
      inf_leave:
        for (; ; ) {
          switch (state.mode) {
            case HEAD:
              if (state.wrap === 0) {
                state.mode = TYPEDO;
                break;
              }
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.wrap & 2 && hold === 35615) {
                state.check = 0;
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
                hold = 0;
                bits = 0;
                state.mode = FLAGS;
                break;
              }
              state.flags = 0;
              if (state.head) {
                state.head.done = false;
              }
              if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) {
                strm.msg = "incorrect header check";
                state.mode = BAD;
                break;
              }
              if ((hold & 15) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              hold >>>= 4;
              bits -= 4;
              len = (hold & 15) + 8;
              if (state.wbits === 0) {
                state.wbits = len;
              } else if (len > state.wbits) {
                strm.msg = "invalid window size";
                state.mode = BAD;
                break;
              }
              state.dmax = 1 << len;
              strm.adler = state.check = 1;
              state.mode = hold & 512 ? DICTID : TYPE;
              hold = 0;
              bits = 0;
              break;
            case FLAGS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.flags = hold;
              if ((state.flags & 255) !== Z_DEFLATED) {
                strm.msg = "unknown compression method";
                state.mode = BAD;
                break;
              }
              if (state.flags & 57344) {
                strm.msg = "unknown header flags set";
                state.mode = BAD;
                break;
              }
              if (state.head) {
                state.head.text = hold >> 8 & 1;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = TIME;
            case TIME:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.time = hold;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                hbuf[2] = hold >>> 16 & 255;
                hbuf[3] = hold >>> 24 & 255;
                state.check = crc32(state.check, hbuf, 4, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = OS;
            case OS:
              while (bits < 16) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (state.head) {
                state.head.xflags = hold & 255;
                state.head.os = hold >> 8;
              }
              if (state.flags & 512) {
                hbuf[0] = hold & 255;
                hbuf[1] = hold >>> 8 & 255;
                state.check = crc32(state.check, hbuf, 2, 0);
              }
              hold = 0;
              bits = 0;
              state.mode = EXLEN;
            case EXLEN:
              if (state.flags & 1024) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length = hold;
                if (state.head) {
                  state.head.extra_len = hold;
                }
                if (state.flags & 512) {
                  hbuf[0] = hold & 255;
                  hbuf[1] = hold >>> 8 & 255;
                  state.check = crc32(state.check, hbuf, 2, 0);
                }
                hold = 0;
                bits = 0;
              } else if (state.head) {
                state.head.extra = null;
              }
              state.mode = EXTRA;
            case EXTRA:
              if (state.flags & 1024) {
                copy = state.length;
                if (copy > have) {
                  copy = have;
                }
                if (copy) {
                  if (state.head) {
                    len = state.head.extra_len - state.length;
                    if (!state.head.extra) {
                      state.head.extra = new Array(state.head.extra_len);
                    }
                    utils.arraySet(state.head.extra, input, next, copy, len);
                  }
                  if (state.flags & 512) {
                    state.check = crc32(state.check, input, copy, next);
                  }
                  have -= copy;
                  next += copy;
                  state.length -= copy;
                }
                if (state.length) {
                  break inf_leave;
                }
              }
              state.length = 0;
              state.mode = NAME;
            case NAME:
              if (state.flags & 2048) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.name += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.name = null;
              }
              state.length = 0;
              state.mode = COMMENT;
            case COMMENT:
              if (state.flags & 4096) {
                if (have === 0) {
                  break inf_leave;
                }
                copy = 0;
                do {
                  len = input[next + copy++];
                  if (state.head && len && state.length < 65536) {
                    state.head.comment += String.fromCharCode(len);
                  }
                } while (len && copy < have);
                if (state.flags & 512) {
                  state.check = crc32(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                if (len) {
                  break inf_leave;
                }
              } else if (state.head) {
                state.head.comment = null;
              }
              state.mode = HCRC;
            case HCRC:
              if (state.flags & 512) {
                while (bits < 16) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (hold !== (state.check & 65535)) {
                  strm.msg = "header crc mismatch";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              if (state.head) {
                state.head.hcrc = state.flags >> 9 & 1;
                state.head.done = true;
              }
              strm.adler = state.check = 0;
              state.mode = TYPE;
              break;
            case DICTID:
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              strm.adler = state.check = zswap32(hold);
              hold = 0;
              bits = 0;
              state.mode = DICT;
            case DICT:
              if (state.havedict === 0) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                return Z_NEED_DICT;
              }
              strm.adler = state.check = 1;
              state.mode = TYPE;
            case TYPE:
              if (flush === Z_BLOCK || flush === Z_TREES) {
                break inf_leave;
              }
            case TYPEDO:
              if (state.last) {
                hold >>>= bits & 7;
                bits -= bits & 7;
                state.mode = CHECK;
                break;
              }
              while (bits < 3) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.last = hold & 1;
              hold >>>= 1;
              bits -= 1;
              switch (hold & 3) {
                case 0:
                  state.mode = STORED;
                  break;
                case 1:
                  fixedtables(state);
                  state.mode = LEN_;
                  if (flush === Z_TREES) {
                    hold >>>= 2;
                    bits -= 2;
                    break inf_leave;
                  }
                  break;
                case 2:
                  state.mode = TABLE;
                  break;
                case 3:
                  strm.msg = "invalid block type";
                  state.mode = BAD;
              }
              hold >>>= 2;
              bits -= 2;
              break;
            case STORED:
              hold >>>= bits & 7;
              bits -= bits & 7;
              while (bits < 32) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((hold & 65535) !== (hold >>> 16 ^ 65535)) {
                strm.msg = "invalid stored block lengths";
                state.mode = BAD;
                break;
              }
              state.length = hold & 65535;
              hold = 0;
              bits = 0;
              state.mode = COPY_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case COPY_:
              state.mode = COPY;
            case COPY:
              copy = state.length;
              if (copy) {
                if (copy > have) {
                  copy = have;
                }
                if (copy > left) {
                  copy = left;
                }
                if (copy === 0) {
                  break inf_leave;
                }
                utils.arraySet(output, input, next, copy, put);
                have -= copy;
                next += copy;
                left -= copy;
                put += copy;
                state.length -= copy;
                break;
              }
              state.mode = TYPE;
              break;
            case TABLE:
              while (bits < 14) {
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              state.nlen = (hold & 31) + 257;
              hold >>>= 5;
              bits -= 5;
              state.ndist = (hold & 31) + 1;
              hold >>>= 5;
              bits -= 5;
              state.ncode = (hold & 15) + 4;
              hold >>>= 4;
              bits -= 4;
              if (state.nlen > 286 || state.ndist > 30) {
                strm.msg = "too many length or distance symbols";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = LENLENS;
            case LENLENS:
              while (state.have < state.ncode) {
                while (bits < 3) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.lens[order[state.have++]] = hold & 7;
                hold >>>= 3;
                bits -= 3;
              }
              while (state.have < 19) {
                state.lens[order[state.have++]] = 0;
              }
              state.lencode = state.lendyn;
              state.lenbits = 7;
              opts = {bits: state.lenbits};
              ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid code lengths set";
                state.mode = BAD;
                break;
              }
              state.have = 0;
              state.mode = CODELENS;
            case CODELENS:
              while (state.have < state.nlen + state.ndist) {
                for (; ; ) {
                  here = state.lencode[hold & (1 << state.lenbits) - 1];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (here_val < 16) {
                  hold >>>= here_bits;
                  bits -= here_bits;
                  state.lens[state.have++] = here_val;
                } else {
                  if (here_val === 16) {
                    n = here_bits + 2;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    if (state.have === 0) {
                      strm.msg = "invalid bit length repeat";
                      state.mode = BAD;
                      break;
                    }
                    len = state.lens[state.have - 1];
                    copy = 3 + (hold & 3);
                    hold >>>= 2;
                    bits -= 2;
                  } else if (here_val === 17) {
                    n = here_bits + 3;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 3 + (hold & 7);
                    hold >>>= 3;
                    bits -= 3;
                  } else {
                    n = here_bits + 7;
                    while (bits < n) {
                      if (have === 0) {
                        break inf_leave;
                      }
                      have--;
                      hold += input[next++] << bits;
                      bits += 8;
                    }
                    hold >>>= here_bits;
                    bits -= here_bits;
                    len = 0;
                    copy = 11 + (hold & 127);
                    hold >>>= 7;
                    bits -= 7;
                  }
                  if (state.have + copy > state.nlen + state.ndist) {
                    strm.msg = "invalid bit length repeat";
                    state.mode = BAD;
                    break;
                  }
                  while (copy--) {
                    state.lens[state.have++] = len;
                  }
                }
              }
              if (state.mode === BAD) {
                break;
              }
              if (state.lens[256] === 0) {
                strm.msg = "invalid code -- missing end-of-block";
                state.mode = BAD;
                break;
              }
              state.lenbits = 9;
              opts = {bits: state.lenbits};
              ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
              state.lenbits = opts.bits;
              if (ret) {
                strm.msg = "invalid literal/lengths set";
                state.mode = BAD;
                break;
              }
              state.distbits = 6;
              state.distcode = state.distdyn;
              opts = {bits: state.distbits};
              ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
              state.distbits = opts.bits;
              if (ret) {
                strm.msg = "invalid distances set";
                state.mode = BAD;
                break;
              }
              state.mode = LEN_;
              if (flush === Z_TREES) {
                break inf_leave;
              }
            case LEN_:
              state.mode = LEN;
            case LEN:
              if (have >= 6 && left >= 258) {
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits;
                inflate_fast(strm, _out);
                put = strm.next_out;
                output = strm.output;
                left = strm.avail_out;
                next = strm.next_in;
                input = strm.input;
                have = strm.avail_in;
                hold = state.hold;
                bits = state.bits;
                if (state.mode === TYPE) {
                  state.back = -1;
                }
                break;
              }
              state.back = 0;
              for (; ; ) {
                here = state.lencode[hold & (1 << state.lenbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if (here_op && (here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              state.length = here_val;
              if (here_op === 0) {
                state.mode = LIT;
                break;
              }
              if (here_op & 32) {
                state.back = -1;
                state.mode = TYPE;
                break;
              }
              if (here_op & 64) {
                strm.msg = "invalid literal/length code";
                state.mode = BAD;
                break;
              }
              state.extra = here_op & 15;
              state.mode = LENEXT;
            case LENEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.length += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              state.was = state.length;
              state.mode = DIST;
            case DIST:
              for (; ; ) {
                here = state.distcode[hold & (1 << state.distbits) - 1];
                here_bits = here >>> 24;
                here_op = here >>> 16 & 255;
                here_val = here & 65535;
                if (here_bits <= bits) {
                  break;
                }
                if (have === 0) {
                  break inf_leave;
                }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              if ((here_op & 240) === 0) {
                last_bits = here_bits;
                last_op = here_op;
                last_val = here_val;
                for (; ; ) {
                  here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                  here_bits = here >>> 24;
                  here_op = here >>> 16 & 255;
                  here_val = here & 65535;
                  if (last_bits + here_bits <= bits) {
                    break;
                  }
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                hold >>>= last_bits;
                bits -= last_bits;
                state.back += last_bits;
              }
              hold >>>= here_bits;
              bits -= here_bits;
              state.back += here_bits;
              if (here_op & 64) {
                strm.msg = "invalid distance code";
                state.mode = BAD;
                break;
              }
              state.offset = here_val;
              state.extra = here_op & 15;
              state.mode = DISTEXT;
            case DISTEXT:
              if (state.extra) {
                n = state.extra;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                state.offset += hold & (1 << state.extra) - 1;
                hold >>>= state.extra;
                bits -= state.extra;
                state.back += state.extra;
              }
              if (state.offset > state.dmax) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break;
              }
              state.mode = MATCH;
            case MATCH:
              if (left === 0) {
                break inf_leave;
              }
              copy = _out - left;
              if (state.offset > copy) {
                copy = state.offset - copy;
                if (copy > state.whave) {
                  if (state.sane) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD;
                    break;
                  }
                }
                if (copy > state.wnext) {
                  copy -= state.wnext;
                  from = state.wsize - copy;
                } else {
                  from = state.wnext - copy;
                }
                if (copy > state.length) {
                  copy = state.length;
                }
                from_source = state.window;
              } else {
                from_source = output;
                from = put - state.offset;
                copy = state.length;
              }
              if (copy > left) {
                copy = left;
              }
              left -= copy;
              state.length -= copy;
              do {
                output[put++] = from_source[from++];
              } while (--copy);
              if (state.length === 0) {
                state.mode = LEN;
              }
              break;
            case LIT:
              if (left === 0) {
                break inf_leave;
              }
              output[put++] = state.length;
              left--;
              state.mode = LEN;
              break;
            case CHECK:
              if (state.wrap) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold |= input[next++] << bits;
                  bits += 8;
                }
                _out -= left;
                strm.total_out += _out;
                state.total += _out;
                if (_out) {
                  strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out);
                }
                _out = left;
                if ((state.flags ? hold : zswap32(hold)) !== state.check) {
                  strm.msg = "incorrect data check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = LENGTH;
            case LENGTH:
              if (state.wrap && state.flags) {
                while (bits < 32) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }
                if (hold !== (state.total & 4294967295)) {
                  strm.msg = "incorrect length check";
                  state.mode = BAD;
                  break;
                }
                hold = 0;
                bits = 0;
              }
              state.mode = DONE;
            case DONE:
              ret = Z_STREAM_END;
              break inf_leave;
            case BAD:
              ret = Z_DATA_ERROR;
              break inf_leave;
            case MEM:
              return Z_MEM_ERROR;
            case SYNC:
            default:
              return Z_STREAM_ERROR;
          }
        }
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
          state.mode = MEM;
          return Z_MEM_ERROR;
        }
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap && _out) {
        strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out);
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) {
        ret = Z_BUF_ERROR;
      }
      return ret;
    }
    function inflateEnd(strm) {
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      var state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK;
    }
    function inflateGetHeader(strm, head) {
      var state;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if ((state.wrap & 2) === 0) {
        return Z_STREAM_ERROR;
      }
      state.head = head;
      head.done = false;
      return Z_OK;
    }
    function inflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;
      var state;
      var dictid;
      var ret;
      if (!strm || !strm.state) {
        return Z_STREAM_ERROR;
      }
      state = strm.state;
      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR;
      }
      if (state.mode === DICT) {
        dictid = 1;
        dictid = adler32(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR;
        }
      }
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      return Z_OK;
    }
    exports.inflateReset = inflateReset;
    exports.inflateReset2 = inflateReset2;
    exports.inflateResetKeep = inflateResetKeep;
    exports.inflateInit = inflateInit;
    exports.inflateInit2 = inflateInit2;
    exports.inflate = inflate;
    exports.inflateEnd = inflateEnd;
    exports.inflateGetHeader = inflateGetHeader;
    exports.inflateSetDictionary = inflateSetDictionary;
    exports.inflateInfo = "pako inflate (from Nodeca project)";
  });

  // node_modules/pako/lib/zlib/constants.js
  var require_constants = __commonJS((exports, module) => {
    "use strict";
    module.exports = {
      Z_NO_FLUSH: 0,
      Z_PARTIAL_FLUSH: 1,
      Z_SYNC_FLUSH: 2,
      Z_FULL_FLUSH: 3,
      Z_FINISH: 4,
      Z_BLOCK: 5,
      Z_TREES: 6,
      Z_OK: 0,
      Z_STREAM_END: 1,
      Z_NEED_DICT: 2,
      Z_ERRNO: -1,
      Z_STREAM_ERROR: -2,
      Z_DATA_ERROR: -3,
      Z_BUF_ERROR: -5,
      Z_NO_COMPRESSION: 0,
      Z_BEST_SPEED: 1,
      Z_BEST_COMPRESSION: 9,
      Z_DEFAULT_COMPRESSION: -1,
      Z_FILTERED: 1,
      Z_HUFFMAN_ONLY: 2,
      Z_RLE: 3,
      Z_FIXED: 4,
      Z_DEFAULT_STRATEGY: 0,
      Z_BINARY: 0,
      Z_TEXT: 1,
      Z_UNKNOWN: 2,
      Z_DEFLATED: 8
    };
  });

  // node_modules/pako/lib/zlib/gzheader.js
  var require_gzheader = __commonJS((exports, module) => {
    "use strict";
    function GZheader() {
      this.text = 0;
      this.time = 0;
      this.xflags = 0;
      this.os = 0;
      this.extra = null;
      this.extra_len = 0;
      this.name = "";
      this.comment = "";
      this.hcrc = 0;
      this.done = false;
    }
    module.exports = GZheader;
  });

  // node_modules/pako/lib/inflate.js
  var require_inflate = __commonJS((exports) => {
    "use strict";
    var zlib_inflate = require_inflate2();
    var utils = require_common();
    var strings = require_strings();
    var c = require_constants();
    var msg = require_messages();
    var ZStream = require_zstream();
    var GZheader = require_gzheader();
    var toString = Object.prototype.toString;
    function Inflate(options) {
      if (!(this instanceof Inflate))
        return new Inflate(options);
      this.options = utils.assign({
        chunkSize: 16384,
        windowBits: 0,
        to: ""
      }, options || {});
      var opt = this.options;
      if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) {
          opt.windowBits = -15;
        }
      }
      if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
        opt.windowBits += 32;
      }
      if (opt.windowBits > 15 && opt.windowBits < 48) {
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }
      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];
      this.strm = new ZStream();
      this.strm.avail_out = 0;
      var status = zlib_inflate.inflateInit2(this.strm, opt.windowBits);
      if (status !== c.Z_OK) {
        throw new Error(msg[status]);
      }
      this.header = new GZheader();
      zlib_inflate.inflateGetHeader(this.strm, this.header);
      if (opt.dictionary) {
        if (typeof opt.dictionary === "string") {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString.call(opt.dictionary) === "[object ArrayBuffer]") {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) {
          status = zlib_inflate.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== c.Z_OK) {
            throw new Error(msg[status]);
          }
        }
      }
    }
    Inflate.prototype.push = function(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var dictionary = this.options.dictionary;
      var status, _mode;
      var next_out_utf8, tail, utf8str;
      var allowBufError = false;
      if (this.ended) {
        return false;
      }
      _mode = mode === ~~mode ? mode : mode === true ? c.Z_FINISH : c.Z_NO_FLUSH;
      if (typeof data === "string") {
        strm.input = strings.binstring2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }
      strm.next_in = 0;
      strm.avail_in = strm.input.length;
      do {
        if (strm.avail_out === 0) {
          strm.output = new utils.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);
        if (status === c.Z_NEED_DICT && dictionary) {
          status = zlib_inflate.inflateSetDictionary(this.strm, dictionary);
        }
        if (status === c.Z_BUF_ERROR && allowBufError === true) {
          status = c.Z_OK;
          allowBufError = false;
        }
        if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.next_out) {
          if (strm.avail_out === 0 || status === c.Z_STREAM_END || strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH)) {
            if (this.options.to === "string") {
              next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
              tail = strm.next_out - next_out_utf8;
              utf8str = strings.buf2string(strm.output, next_out_utf8);
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail) {
                utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0);
              }
              this.onData(utf8str);
            } else {
              this.onData(utils.shrinkBuf(strm.output, strm.next_out));
            }
          }
        }
        if (strm.avail_in === 0 && strm.avail_out === 0) {
          allowBufError = true;
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);
      if (status === c.Z_STREAM_END) {
        _mode = c.Z_FINISH;
      }
      if (_mode === c.Z_FINISH) {
        status = zlib_inflate.inflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === c.Z_OK;
      }
      if (_mode === c.Z_SYNC_FLUSH) {
        this.onEnd(c.Z_OK);
        strm.avail_out = 0;
        return true;
      }
      return true;
    };
    Inflate.prototype.onData = function(chunk) {
      this.chunks.push(chunk);
    };
    Inflate.prototype.onEnd = function(status) {
      if (status === c.Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = utils.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };
    function inflate(input, options) {
      var inflator = new Inflate(options);
      inflator.push(input, true);
      if (inflator.err) {
        throw inflator.msg || msg[inflator.err];
      }
      return inflator.result;
    }
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate(input, options);
    }
    exports.Inflate = Inflate;
    exports.inflate = inflate;
    exports.inflateRaw = inflateRaw;
    exports.ungzip = inflate;
  });

  // node_modules/pako/index.js
  var require_pako = __commonJS((exports, module) => {
    "use strict";
    var assign = require_common().assign;
    var deflate = require_deflate();
    var inflate = require_inflate();
    var constants4 = require_constants();
    var pako = {};
    assign(pako, deflate, inflate, constants4);
    module.exports = pako;
  });

  // node_modules/upng-js/UPNG.js
  var require_UPNG = __commonJS((exports, module) => {
    (function() {
      var UPNG2 = {};
      var pako;
      if (typeof module == "object") {
        module.exports = UPNG2;
      } else {
        window.UPNG = UPNG2;
      }
      if (true) {
        pako = require_pako();
      } else {
        pako = window.pako;
      }
      function log() {
        if (typeof process == "undefined" || true)
          console.log.apply(console, arguments);
      }
      (function(UPNG3, pako2) {
        UPNG3.toRGBA8 = function(out) {
          var w = out.width, h = out.height;
          if (out.tabs.acTL == null)
            return [UPNG3.toRGBA8.decodeImage(out.data, w, h, out).buffer];
          var frms = [];
          if (out.frames[0].data == null)
            out.frames[0].data = out.data;
          var img, empty = new Uint8Array(w * h * 4);
          for (var i = 0; i < out.frames.length; i++) {
            var frm = out.frames[i];
            var fx = frm.rect.x, fy = frm.rect.y, fw = frm.rect.width, fh = frm.rect.height;
            var fdata = UPNG3.toRGBA8.decodeImage(frm.data, fw, fh, out);
            if (i == 0)
              img = fdata;
            else if (frm.blend == 0)
              UPNG3._copyTile(fdata, fw, fh, img, w, h, fx, fy, 0);
            else if (frm.blend == 1)
              UPNG3._copyTile(fdata, fw, fh, img, w, h, fx, fy, 1);
            frms.push(img.buffer);
            img = img.slice(0);
            if (frm.dispose == 0) {
            } else if (frm.dispose == 1)
              UPNG3._copyTile(empty, fw, fh, img, w, h, fx, fy, 0);
            else if (frm.dispose == 2) {
              var pi = i - 1;
              while (out.frames[pi].dispose == 2)
                pi--;
              img = new Uint8Array(frms[pi]).slice(0);
            }
          }
          return frms;
        };
        UPNG3.toRGBA8.decodeImage = function(data, w, h, out) {
          var area = w * h, bpp = UPNG3.decode._getBPP(out);
          var bpl = Math.ceil(w * bpp / 8);
          var bf = new Uint8Array(area * 4), bf32 = new Uint32Array(bf.buffer);
          var ctype = out.ctype, depth = out.depth;
          var rs = UPNG3._bin.readUshort;
          if (ctype == 6) {
            var qarea = area << 2;
            if (depth == 8)
              for (var i = 0; i < qarea; i++) {
                bf[i] = data[i];
              }
            if (depth == 16)
              for (var i = 0; i < qarea; i++) {
                bf[i] = data[i << 1];
              }
          } else if (ctype == 2) {
            var ts = out.tabs["tRNS"], tr = -1, tg = -1, tb = -1;
            if (ts) {
              tr = ts[0];
              tg = ts[1];
              tb = ts[2];
            }
            if (depth == 8)
              for (var i = 0; i < area; i++) {
                var qi = i << 2, ti = i * 3;
                bf[qi] = data[ti];
                bf[qi + 1] = data[ti + 1];
                bf[qi + 2] = data[ti + 2];
                bf[qi + 3] = 255;
                if (tr != -1 && data[ti] == tr && data[ti + 1] == tg && data[ti + 2] == tb)
                  bf[qi + 3] = 0;
              }
            if (depth == 16)
              for (var i = 0; i < area; i++) {
                var qi = i << 2, ti = i * 6;
                bf[qi] = data[ti];
                bf[qi + 1] = data[ti + 2];
                bf[qi + 2] = data[ti + 4];
                bf[qi + 3] = 255;
                if (tr != -1 && rs(data, ti) == tr && rs(data, ti + 2) == tg && rs(data, ti + 4) == tb)
                  bf[qi + 3] = 0;
              }
          } else if (ctype == 3) {
            var p = out.tabs["PLTE"], ap = out.tabs["tRNS"], tl = ap ? ap.length : 0;
            if (depth == 1)
              for (var y = 0; y < h; y++) {
                var s0 = y * bpl, t0 = y * w;
                for (var i = 0; i < w; i++) {
                  var qi = t0 + i << 2, j = data[s0 + (i >> 3)] >> 7 - ((i & 7) << 0) & 1, cj = 3 * j;
                  bf[qi] = p[cj];
                  bf[qi + 1] = p[cj + 1];
                  bf[qi + 2] = p[cj + 2];
                  bf[qi + 3] = j < tl ? ap[j] : 255;
                }
              }
            if (depth == 2)
              for (var y = 0; y < h; y++) {
                var s0 = y * bpl, t0 = y * w;
                for (var i = 0; i < w; i++) {
                  var qi = t0 + i << 2, j = data[s0 + (i >> 2)] >> 6 - ((i & 3) << 1) & 3, cj = 3 * j;
                  bf[qi] = p[cj];
                  bf[qi + 1] = p[cj + 1];
                  bf[qi + 2] = p[cj + 2];
                  bf[qi + 3] = j < tl ? ap[j] : 255;
                }
              }
            if (depth == 4)
              for (var y = 0; y < h; y++) {
                var s0 = y * bpl, t0 = y * w;
                for (var i = 0; i < w; i++) {
                  var qi = t0 + i << 2, j = data[s0 + (i >> 1)] >> 4 - ((i & 1) << 2) & 15, cj = 3 * j;
                  bf[qi] = p[cj];
                  bf[qi + 1] = p[cj + 1];
                  bf[qi + 2] = p[cj + 2];
                  bf[qi + 3] = j < tl ? ap[j] : 255;
                }
              }
            if (depth == 8)
              for (var i = 0; i < area; i++) {
                var qi = i << 2, j = data[i], cj = 3 * j;
                bf[qi] = p[cj];
                bf[qi + 1] = p[cj + 1];
                bf[qi + 2] = p[cj + 2];
                bf[qi + 3] = j < tl ? ap[j] : 255;
              }
          } else if (ctype == 4) {
            if (depth == 8)
              for (var i = 0; i < area; i++) {
                var qi = i << 2, di = i << 1, gr = data[di];
                bf[qi] = gr;
                bf[qi + 1] = gr;
                bf[qi + 2] = gr;
                bf[qi + 3] = data[di + 1];
              }
            if (depth == 16)
              for (var i = 0; i < area; i++) {
                var qi = i << 2, di = i << 2, gr = data[di];
                bf[qi] = gr;
                bf[qi + 1] = gr;
                bf[qi + 2] = gr;
                bf[qi + 3] = data[di + 2];
              }
          } else if (ctype == 0) {
            var tr = out.tabs["tRNS"] ? out.tabs["tRNS"] : -1;
            if (depth == 1)
              for (var i = 0; i < area; i++) {
                var gr = 255 * (data[i >> 3] >> 7 - (i & 7) & 1), al = gr == tr * 255 ? 0 : 255;
                bf32[i] = al << 24 | gr << 16 | gr << 8 | gr;
              }
            if (depth == 2)
              for (var i = 0; i < area; i++) {
                var gr = 85 * (data[i >> 2] >> 6 - ((i & 3) << 1) & 3), al = gr == tr * 85 ? 0 : 255;
                bf32[i] = al << 24 | gr << 16 | gr << 8 | gr;
              }
            if (depth == 4)
              for (var i = 0; i < area; i++) {
                var gr = 17 * (data[i >> 1] >> 4 - ((i & 1) << 2) & 15), al = gr == tr * 17 ? 0 : 255;
                bf32[i] = al << 24 | gr << 16 | gr << 8 | gr;
              }
            if (depth == 8)
              for (var i = 0; i < area; i++) {
                var gr = data[i], al = gr == tr ? 0 : 255;
                bf32[i] = al << 24 | gr << 16 | gr << 8 | gr;
              }
            if (depth == 16)
              for (var i = 0; i < area; i++) {
                var gr = data[i << 1], al = rs(data, i << 1) == tr ? 0 : 255;
                bf32[i] = al << 24 | gr << 16 | gr << 8 | gr;
              }
          }
          return bf;
        };
        UPNG3.decode = function(buff) {
          var data = new Uint8Array(buff), offset = 8, bin = UPNG3._bin, rUs = bin.readUshort, rUi = bin.readUint;
          var out = {tabs: {}, frames: []};
          var dd = new Uint8Array(data.length), doff = 0;
          var fd, foff = 0;
          var mgck = [137, 80, 78, 71, 13, 10, 26, 10];
          for (var i = 0; i < 8; i++)
            if (data[i] != mgck[i])
              throw "The input is not a PNG file!";
          while (offset < data.length) {
            var len = bin.readUint(data, offset);
            offset += 4;
            var type = bin.readASCII(data, offset, 4);
            offset += 4;
            if (type == "IHDR") {
              UPNG3.decode._IHDR(data, offset, out);
            } else if (type == "IDAT") {
              for (var i = 0; i < len; i++)
                dd[doff + i] = data[offset + i];
              doff += len;
            } else if (type == "acTL") {
              out.tabs[type] = {num_frames: rUi(data, offset), num_plays: rUi(data, offset + 4)};
              fd = new Uint8Array(data.length);
            } else if (type == "fcTL") {
              if (foff != 0) {
                var fr = out.frames[out.frames.length - 1];
                fr.data = UPNG3.decode._decompress(out, fd.slice(0, foff), fr.rect.width, fr.rect.height);
                foff = 0;
              }
              var rct = {x: rUi(data, offset + 12), y: rUi(data, offset + 16), width: rUi(data, offset + 4), height: rUi(data, offset + 8)};
              var del = rUs(data, offset + 22);
              del = rUs(data, offset + 20) / (del == 0 ? 100 : del);
              var frm = {rect: rct, delay: Math.round(del * 1e3), dispose: data[offset + 24], blend: data[offset + 25]};
              out.frames.push(frm);
            } else if (type == "fdAT") {
              for (var i = 0; i < len - 4; i++)
                fd[foff + i] = data[offset + i + 4];
              foff += len - 4;
            } else if (type == "pHYs") {
              out.tabs[type] = [bin.readUint(data, offset), bin.readUint(data, offset + 4), data[offset + 8]];
            } else if (type == "cHRM") {
              out.tabs[type] = [];
              for (var i = 0; i < 8; i++)
                out.tabs[type].push(bin.readUint(data, offset + i * 4));
            } else if (type == "tEXt") {
              if (out.tabs[type] == null)
                out.tabs[type] = {};
              var nz = bin.nextZero(data, offset);
              var keyw = bin.readASCII(data, offset, nz - offset);
              var text = bin.readASCII(data, nz + 1, offset + len - nz - 1);
              out.tabs[type][keyw] = text;
            } else if (type == "iTXt") {
              if (out.tabs[type] == null)
                out.tabs[type] = {};
              var nz = 0, off = offset;
              nz = bin.nextZero(data, off);
              var keyw = bin.readASCII(data, off, nz - off);
              off = nz + 1;
              var cflag = data[off], cmeth = data[off + 1];
              off += 2;
              nz = bin.nextZero(data, off);
              var ltag = bin.readASCII(data, off, nz - off);
              off = nz + 1;
              nz = bin.nextZero(data, off);
              var tkeyw = bin.readUTF8(data, off, nz - off);
              off = nz + 1;
              var text = bin.readUTF8(data, off, len - (off - offset));
              out.tabs[type][keyw] = text;
            } else if (type == "PLTE") {
              out.tabs[type] = bin.readBytes(data, offset, len);
            } else if (type == "hIST") {
              var pl = out.tabs["PLTE"].length / 3;
              out.tabs[type] = [];
              for (var i = 0; i < pl; i++)
                out.tabs[type].push(rUs(data, offset + i * 2));
            } else if (type == "tRNS") {
              if (out.ctype == 3)
                out.tabs[type] = bin.readBytes(data, offset, len);
              else if (out.ctype == 0)
                out.tabs[type] = rUs(data, offset);
              else if (out.ctype == 2)
                out.tabs[type] = [rUs(data, offset), rUs(data, offset + 2), rUs(data, offset + 4)];
            } else if (type == "gAMA")
              out.tabs[type] = bin.readUint(data, offset) / 1e5;
            else if (type == "sRGB")
              out.tabs[type] = data[offset];
            else if (type == "bKGD") {
              if (out.ctype == 0 || out.ctype == 4)
                out.tabs[type] = [rUs(data, offset)];
              else if (out.ctype == 2 || out.ctype == 6)
                out.tabs[type] = [rUs(data, offset), rUs(data, offset + 2), rUs(data, offset + 4)];
              else if (out.ctype == 3)
                out.tabs[type] = data[offset];
            } else if (type == "IEND") {
              if (foff != 0) {
                var fr = out.frames[out.frames.length - 1];
                fr.data = UPNG3.decode._decompress(out, fd.slice(0, foff), fr.rect.width, fr.rect.height);
                foff = 0;
              }
              out.data = UPNG3.decode._decompress(out, dd, out.width, out.height);
              break;
            }
            offset += len;
            var crc = bin.readUint(data, offset);
            offset += 4;
          }
          delete out.compress;
          delete out.interlace;
          delete out.filter;
          return out;
        };
        UPNG3.decode._decompress = function(out, dd, w, h) {
          if (out.compress == 0)
            dd = UPNG3.decode._inflate(dd);
          if (out.interlace == 0)
            dd = UPNG3.decode._filterZero(dd, out, 0, w, h);
          else if (out.interlace == 1)
            dd = UPNG3.decode._readInterlace(dd, out);
          return dd;
        };
        UPNG3.decode._inflate = function(data) {
          return pako2["inflate"](data);
        };
        UPNG3.decode._readInterlace = function(data, out) {
          var w = out.width, h = out.height;
          var bpp = UPNG3.decode._getBPP(out), cbpp = bpp >> 3, bpl = Math.ceil(w * bpp / 8);
          var img = new Uint8Array(h * bpl);
          var di = 0;
          var starting_row = [0, 0, 4, 0, 2, 0, 1];
          var starting_col = [0, 4, 0, 2, 0, 1, 0];
          var row_increment = [8, 8, 8, 4, 4, 2, 2];
          var col_increment = [8, 8, 4, 4, 2, 2, 1];
          var pass = 0;
          while (pass < 7) {
            var ri = row_increment[pass], ci = col_increment[pass];
            var sw = 0, sh = 0;
            var cr = starting_row[pass];
            while (cr < h) {
              cr += ri;
              sh++;
            }
            var cc = starting_col[pass];
            while (cc < w) {
              cc += ci;
              sw++;
            }
            var bpll = Math.ceil(sw * bpp / 8);
            UPNG3.decode._filterZero(data, out, di, sw, sh);
            var y = 0, row = starting_row[pass];
            while (row < h) {
              var col = starting_col[pass];
              var cdi = di + y * bpll << 3;
              while (col < w) {
                if (bpp == 1) {
                  var val = data[cdi >> 3];
                  val = val >> 7 - (cdi & 7) & 1;
                  img[row * bpl + (col >> 3)] |= val << 7 - ((col & 3) << 0);
                }
                if (bpp == 2) {
                  var val = data[cdi >> 3];
                  val = val >> 6 - (cdi & 7) & 3;
                  img[row * bpl + (col >> 2)] |= val << 6 - ((col & 3) << 1);
                }
                if (bpp == 4) {
                  var val = data[cdi >> 3];
                  val = val >> 4 - (cdi & 7) & 15;
                  img[row * bpl + (col >> 1)] |= val << 4 - ((col & 1) << 2);
                }
                if (bpp >= 8) {
                  var ii = row * bpl + col * cbpp;
                  for (var j = 0; j < cbpp; j++)
                    img[ii + j] = data[(cdi >> 3) + j];
                }
                cdi += bpp;
                col += ci;
              }
              y++;
              row += ri;
            }
            if (sw * sh != 0)
              di += sh * (1 + bpll);
            pass = pass + 1;
          }
          return img;
        };
        UPNG3.decode._getBPP = function(out) {
          var noc = [1, null, 3, 1, 2, null, 4][out.ctype];
          return noc * out.depth;
        };
        UPNG3.decode._filterZero = function(data, out, off, w, h) {
          var bpp = UPNG3.decode._getBPP(out), bpl = Math.ceil(w * bpp / 8), paeth = UPNG3.decode._paeth;
          bpp = Math.ceil(bpp / 8);
          for (var y = 0; y < h; y++) {
            var i = off + y * bpl, di = i + y + 1;
            var type = data[di - 1];
            if (type == 0)
              for (var x = 0; x < bpl; x++)
                data[i + x] = data[di + x];
            else if (type == 1) {
              for (var x = 0; x < bpp; x++)
                data[i + x] = data[di + x];
              for (var x = bpp; x < bpl; x++)
                data[i + x] = data[di + x] + data[i + x - bpp] & 255;
            } else if (y == 0) {
              for (var x = 0; x < bpp; x++)
                data[i + x] = data[di + x];
              if (type == 2)
                for (var x = bpp; x < bpl; x++)
                  data[i + x] = data[di + x] & 255;
              if (type == 3)
                for (var x = bpp; x < bpl; x++)
                  data[i + x] = data[di + x] + (data[i + x - bpp] >> 1) & 255;
              if (type == 4)
                for (var x = bpp; x < bpl; x++)
                  data[i + x] = data[di + x] + paeth(data[i + x - bpp], 0, 0) & 255;
            } else {
              if (type == 2) {
                for (var x = 0; x < bpl; x++)
                  data[i + x] = data[di + x] + data[i + x - bpl] & 255;
              }
              if (type == 3) {
                for (var x = 0; x < bpp; x++)
                  data[i + x] = data[di + x] + (data[i + x - bpl] >> 1) & 255;
                for (var x = bpp; x < bpl; x++)
                  data[i + x] = data[di + x] + (data[i + x - bpl] + data[i + x - bpp] >> 1) & 255;
              }
              if (type == 4) {
                for (var x = 0; x < bpp; x++)
                  data[i + x] = data[di + x] + paeth(0, data[i + x - bpl], 0) & 255;
                for (var x = bpp; x < bpl; x++)
                  data[i + x] = data[di + x] + paeth(data[i + x - bpp], data[i + x - bpl], data[i + x - bpp - bpl]) & 255;
              }
            }
          }
          return data;
        };
        UPNG3.decode._paeth = function(a, b, c) {
          var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          if (pa <= pb && pa <= pc)
            return a;
          else if (pb <= pc)
            return b;
          return c;
        };
        UPNG3.decode._IHDR = function(data, offset, out) {
          var bin = UPNG3._bin;
          out.width = bin.readUint(data, offset);
          offset += 4;
          out.height = bin.readUint(data, offset);
          offset += 4;
          out.depth = data[offset];
          offset++;
          out.ctype = data[offset];
          offset++;
          out.compress = data[offset];
          offset++;
          out.filter = data[offset];
          offset++;
          out.interlace = data[offset];
          offset++;
        };
        UPNG3._bin = {
          nextZero: function(data, p) {
            while (data[p] != 0)
              p++;
            return p;
          },
          readUshort: function(buff, p) {
            return buff[p] << 8 | buff[p + 1];
          },
          writeUshort: function(buff, p, n) {
            buff[p] = n >> 8 & 255;
            buff[p + 1] = n & 255;
          },
          readUint: function(buff, p) {
            return buff[p] * (256 * 256 * 256) + (buff[p + 1] << 16 | buff[p + 2] << 8 | buff[p + 3]);
          },
          writeUint: function(buff, p, n) {
            buff[p] = n >> 24 & 255;
            buff[p + 1] = n >> 16 & 255;
            buff[p + 2] = n >> 8 & 255;
            buff[p + 3] = n & 255;
          },
          readASCII: function(buff, p, l) {
            var s = "";
            for (var i = 0; i < l; i++)
              s += String.fromCharCode(buff[p + i]);
            return s;
          },
          writeASCII: function(data, p, s) {
            for (var i = 0; i < s.length; i++)
              data[p + i] = s.charCodeAt(i);
          },
          readBytes: function(buff, p, l) {
            var arr = [];
            for (var i = 0; i < l; i++)
              arr.push(buff[p + i]);
            return arr;
          },
          pad: function(n) {
            return n.length < 2 ? "0" + n : n;
          },
          readUTF8: function(buff, p, l) {
            var s = "", ns;
            for (var i = 0; i < l; i++)
              s += "%" + UPNG3._bin.pad(buff[p + i].toString(16));
            try {
              ns = decodeURIComponent(s);
            } catch (e) {
              return UPNG3._bin.readASCII(buff, p, l);
            }
            return ns;
          }
        };
        UPNG3._copyTile = function(sb, sw, sh, tb, tw, th, xoff, yoff, mode) {
          var w = Math.min(sw, tw), h = Math.min(sh, th);
          var si = 0, ti = 0;
          for (var y = 0; y < h; y++)
            for (var x = 0; x < w; x++) {
              if (xoff >= 0 && yoff >= 0) {
                si = y * sw + x << 2;
                ti = (yoff + y) * tw + xoff + x << 2;
              } else {
                si = (-yoff + y) * sw - xoff + x << 2;
                ti = y * tw + x << 2;
              }
              if (mode == 0) {
                tb[ti] = sb[si];
                tb[ti + 1] = sb[si + 1];
                tb[ti + 2] = sb[si + 2];
                tb[ti + 3] = sb[si + 3];
              } else if (mode == 1) {
                var fa = sb[si + 3] * (1 / 255), fr = sb[si] * fa, fg = sb[si + 1] * fa, fb = sb[si + 2] * fa;
                var ba = tb[ti + 3] * (1 / 255), br = tb[ti] * ba, bg = tb[ti + 1] * ba, bb = tb[ti + 2] * ba;
                var ifa = 1 - fa, oa = fa + ba * ifa, ioa = oa == 0 ? 0 : 1 / oa;
                tb[ti + 3] = 255 * oa;
                tb[ti + 0] = (fr + br * ifa) * ioa;
                tb[ti + 1] = (fg + bg * ifa) * ioa;
                tb[ti + 2] = (fb + bb * ifa) * ioa;
              } else if (mode == 2) {
                var fa = sb[si + 3], fr = sb[si], fg = sb[si + 1], fb = sb[si + 2];
                var ba = tb[ti + 3], br = tb[ti], bg = tb[ti + 1], bb = tb[ti + 2];
                if (fa == ba && fr == br && fg == bg && fb == bb) {
                  tb[ti] = 0;
                  tb[ti + 1] = 0;
                  tb[ti + 2] = 0;
                  tb[ti + 3] = 0;
                } else {
                  tb[ti] = fr;
                  tb[ti + 1] = fg;
                  tb[ti + 2] = fb;
                  tb[ti + 3] = fa;
                }
              } else if (mode == 3) {
                var fa = sb[si + 3], fr = sb[si], fg = sb[si + 1], fb = sb[si + 2];
                var ba = tb[ti + 3], br = tb[ti], bg = tb[ti + 1], bb = tb[ti + 2];
                if (fa == ba && fr == br && fg == bg && fb == bb)
                  continue;
                if (fa < 220 && ba > 20)
                  return false;
              }
            }
          return true;
        };
        UPNG3.encode = function(bufs, w, h, ps, dels, forbidPlte) {
          if (ps == null)
            ps = 0;
          if (forbidPlte == null)
            forbidPlte = false;
          var data = new Uint8Array(bufs[0].byteLength * bufs.length + 100);
          var wr = [137, 80, 78, 71, 13, 10, 26, 10];
          for (var i = 0; i < 8; i++)
            data[i] = wr[i];
          var offset = 8, bin = UPNG3._bin, crc = UPNG3.crc.crc, wUi = bin.writeUint, wUs = bin.writeUshort, wAs = bin.writeASCII;
          var nimg = UPNG3.encode.compressPNG(bufs, w, h, ps, forbidPlte);
          wUi(data, offset, 13);
          offset += 4;
          wAs(data, offset, "IHDR");
          offset += 4;
          wUi(data, offset, w);
          offset += 4;
          wUi(data, offset, h);
          offset += 4;
          data[offset] = nimg.depth;
          offset++;
          data[offset] = nimg.ctype;
          offset++;
          data[offset] = 0;
          offset++;
          data[offset] = 0;
          offset++;
          data[offset] = 0;
          offset++;
          wUi(data, offset, crc(data, offset - 17, 17));
          offset += 4;
          wUi(data, offset, 1);
          offset += 4;
          wAs(data, offset, "sRGB");
          offset += 4;
          data[offset] = 1;
          offset++;
          wUi(data, offset, crc(data, offset - 5, 5));
          offset += 4;
          var anim = bufs.length > 1;
          if (anim) {
            wUi(data, offset, 8);
            offset += 4;
            wAs(data, offset, "acTL");
            offset += 4;
            wUi(data, offset, bufs.length);
            offset += 4;
            wUi(data, offset, 0);
            offset += 4;
            wUi(data, offset, crc(data, offset - 12, 12));
            offset += 4;
          }
          if (nimg.ctype == 3) {
            var dl = nimg.plte.length;
            wUi(data, offset, dl * 3);
            offset += 4;
            wAs(data, offset, "PLTE");
            offset += 4;
            for (var i = 0; i < dl; i++) {
              var ti = i * 3, c = nimg.plte[i], r = c & 255, g = c >> 8 & 255, b = c >> 16 & 255;
              data[offset + ti + 0] = r;
              data[offset + ti + 1] = g;
              data[offset + ti + 2] = b;
            }
            offset += dl * 3;
            wUi(data, offset, crc(data, offset - dl * 3 - 4, dl * 3 + 4));
            offset += 4;
            if (nimg.gotAlpha) {
              wUi(data, offset, dl);
              offset += 4;
              wAs(data, offset, "tRNS");
              offset += 4;
              for (var i = 0; i < dl; i++)
                data[offset + i] = nimg.plte[i] >> 24 & 255;
              offset += dl;
              wUi(data, offset, crc(data, offset - dl - 4, dl + 4));
              offset += 4;
            }
          }
          var fi = 0;
          for (var j = 0; j < nimg.frames.length; j++) {
            var fr = nimg.frames[j];
            if (anim) {
              wUi(data, offset, 26);
              offset += 4;
              wAs(data, offset, "fcTL");
              offset += 4;
              wUi(data, offset, fi++);
              offset += 4;
              wUi(data, offset, fr.rect.width);
              offset += 4;
              wUi(data, offset, fr.rect.height);
              offset += 4;
              wUi(data, offset, fr.rect.x);
              offset += 4;
              wUi(data, offset, fr.rect.y);
              offset += 4;
              wUs(data, offset, dels[j]);
              offset += 2;
              wUs(data, offset, 1e3);
              offset += 2;
              data[offset] = fr.dispose;
              offset++;
              data[offset] = fr.blend;
              offset++;
              wUi(data, offset, crc(data, offset - 30, 30));
              offset += 4;
            }
            var imgd = fr.cimg, dl = imgd.length;
            wUi(data, offset, dl + (j == 0 ? 0 : 4));
            offset += 4;
            var ioff = offset;
            wAs(data, offset, j == 0 ? "IDAT" : "fdAT");
            offset += 4;
            if (j != 0) {
              wUi(data, offset, fi++);
              offset += 4;
            }
            for (var i = 0; i < dl; i++)
              data[offset + i] = imgd[i];
            offset += dl;
            wUi(data, offset, crc(data, ioff, offset - ioff));
            offset += 4;
          }
          wUi(data, offset, 0);
          offset += 4;
          wAs(data, offset, "IEND");
          offset += 4;
          wUi(data, offset, crc(data, offset - 4, 4));
          offset += 4;
          return data.buffer.slice(0, offset);
        };
        UPNG3.encode.compressPNG = function(bufs, w, h, ps, forbidPlte) {
          var out = UPNG3.encode.compress(bufs, w, h, ps, false, forbidPlte);
          for (var i = 0; i < bufs.length; i++) {
            var frm = out.frames[i], nw = frm.rect.width, nh = frm.rect.height, bpl = frm.bpl, bpp = frm.bpp;
            var fdata = new Uint8Array(nh * bpl + nh);
            frm.cimg = UPNG3.encode._filterZero(frm.img, nh, bpp, bpl, fdata);
          }
          return out;
        };
        UPNG3.encode.compress = function(bufs, w, h, ps, forGIF, forbidPlte) {
          if (forbidPlte == null)
            forbidPlte = false;
          var ctype = 6, depth = 8, bpp = 4, alphaAnd = 255;
          for (var j = 0; j < bufs.length; j++) {
            var img = new Uint8Array(bufs[j]), ilen = img.length;
            for (var i = 0; i < ilen; i += 4)
              alphaAnd &= img[i + 3];
          }
          var gotAlpha = alphaAnd != 255;
          var cmap = {}, plte = [];
          if (bufs.length != 0) {
            cmap[0] = 0;
            plte.push(0);
            if (ps != 0)
              ps--;
          }
          if (ps != 0) {
            var qres = UPNG3.quantize(bufs, ps, forGIF);
            bufs = qres.bufs;
            for (var i = 0; i < qres.plte.length; i++) {
              var c = qres.plte[i].est.rgba;
              if (cmap[c] == null) {
                cmap[c] = plte.length;
                plte.push(c);
              }
            }
          } else {
            for (var j = 0; j < bufs.length; j++) {
              var img32 = new Uint32Array(bufs[j]), ilen = img32.length;
              for (var i = 0; i < ilen; i++) {
                var c = img32[i];
                if ((i < w || c != img32[i - 1] && c != img32[i - w]) && cmap[c] == null) {
                  cmap[c] = plte.length;
                  plte.push(c);
                  if (plte.length >= 300)
                    break;
                }
              }
            }
          }
          var brute = gotAlpha ? forGIF : false;
          var cc = plte.length;
          if (cc <= 256 && forbidPlte == false) {
            if (cc <= 2)
              depth = 1;
            else if (cc <= 4)
              depth = 2;
            else if (cc <= 16)
              depth = 4;
            else
              depth = 8;
            if (forGIF)
              depth = 8;
            gotAlpha = true;
          }
          var frms = [];
          for (var j = 0; j < bufs.length; j++) {
            var cimg = new Uint8Array(bufs[j]), cimg32 = new Uint32Array(cimg.buffer);
            var nx = 0, ny = 0, nw = w, nh = h, blend = 0;
            if (j != 0 && !brute) {
              var tlim = forGIF || j == 1 || frms[frms.length - 2].dispose == 2 ? 1 : 2, tstp = 0, tarea = 1e9;
              for (var it = 0; it < tlim; it++) {
                var pimg = new Uint8Array(bufs[j - 1 - it]), p32 = new Uint32Array(bufs[j - 1 - it]);
                var mix = w, miy = h, max = -1, may = -1;
                for (var y = 0; y < h; y++)
                  for (var x = 0; x < w; x++) {
                    var i = y * w + x;
                    if (cimg32[i] != p32[i]) {
                      if (x < mix)
                        mix = x;
                      if (x > max)
                        max = x;
                      if (y < miy)
                        miy = y;
                      if (y > may)
                        may = y;
                    }
                  }
                var sarea = max == -1 ? 1 : (max - mix + 1) * (may - miy + 1);
                if (sarea < tarea) {
                  tarea = sarea;
                  tstp = it;
                  if (max == -1) {
                    nx = ny = 0;
                    nw = nh = 1;
                  } else {
                    nx = mix;
                    ny = miy;
                    nw = max - mix + 1;
                    nh = may - miy + 1;
                  }
                }
              }
              var pimg = new Uint8Array(bufs[j - 1 - tstp]);
              if (tstp == 1)
                frms[frms.length - 1].dispose = 2;
              var nimg = new Uint8Array(nw * nh * 4), nimg32 = new Uint32Array(nimg.buffer);
              UPNG3._copyTile(pimg, w, h, nimg, nw, nh, -nx, -ny, 0);
              if (UPNG3._copyTile(cimg, w, h, nimg, nw, nh, -nx, -ny, 3)) {
                UPNG3._copyTile(cimg, w, h, nimg, nw, nh, -nx, -ny, 2);
                blend = 1;
              } else {
                UPNG3._copyTile(cimg, w, h, nimg, nw, nh, -nx, -ny, 0);
                blend = 0;
              }
              cimg = nimg;
              cimg32 = new Uint32Array(cimg.buffer);
            }
            var bpl = 4 * nw;
            if (cc <= 256 && forbidPlte == false) {
              bpl = Math.ceil(depth * nw / 8);
              var nimg = new Uint8Array(bpl * nh);
              for (var y = 0; y < nh; y++) {
                var i = y * bpl, ii = y * nw;
                if (depth == 8)
                  for (var x = 0; x < nw; x++)
                    nimg[i + x] = cmap[cimg32[ii + x]];
                else if (depth == 4)
                  for (var x = 0; x < nw; x++)
                    nimg[i + (x >> 1)] |= cmap[cimg32[ii + x]] << 4 - (x & 1) * 4;
                else if (depth == 2)
                  for (var x = 0; x < nw; x++)
                    nimg[i + (x >> 2)] |= cmap[cimg32[ii + x]] << 6 - (x & 3) * 2;
                else if (depth == 1)
                  for (var x = 0; x < nw; x++)
                    nimg[i + (x >> 3)] |= cmap[cimg32[ii + x]] << 7 - (x & 7) * 1;
              }
              cimg = nimg;
              ctype = 3;
              bpp = 1;
            } else if (gotAlpha == false && bufs.length == 1) {
              var nimg = new Uint8Array(nw * nh * 3), area = nw * nh;
              for (var i = 0; i < area; i++) {
                var ti = i * 3, qi = i * 4;
                nimg[ti] = cimg[qi];
                nimg[ti + 1] = cimg[qi + 1];
                nimg[ti + 2] = cimg[qi + 2];
              }
              cimg = nimg;
              ctype = 2;
              bpp = 3;
              bpl = 3 * nw;
            }
            frms.push({rect: {x: nx, y: ny, width: nw, height: nh}, img: cimg, bpl, bpp, blend, dispose: brute ? 1 : 0});
          }
          return {ctype, depth, plte, gotAlpha, frames: frms};
        };
        UPNG3.encode._filterZero = function(img, h, bpp, bpl, data) {
          var fls = [];
          for (var t = 0; t < 5; t++) {
            if (h * bpl > 5e5 && (t == 2 || t == 3 || t == 4))
              continue;
            for (var y = 0; y < h; y++)
              UPNG3.encode._filterLine(data, img, y, bpl, bpp, t);
            fls.push(pako2["deflate"](data));
            if (bpp == 1)
              break;
          }
          var ti, tsize = 1e9;
          for (var i = 0; i < fls.length; i++)
            if (fls[i].length < tsize) {
              ti = i;
              tsize = fls[i].length;
            }
          return fls[ti];
        };
        UPNG3.encode._filterLine = function(data, img, y, bpl, bpp, type) {
          var i = y * bpl, di = i + y, paeth = UPNG3.decode._paeth;
          data[di] = type;
          di++;
          if (type == 0)
            for (var x = 0; x < bpl; x++)
              data[di + x] = img[i + x];
          else if (type == 1) {
            for (var x = 0; x < bpp; x++)
              data[di + x] = img[i + x];
            for (var x = bpp; x < bpl; x++)
              data[di + x] = img[i + x] - img[i + x - bpp] + 256 & 255;
          } else if (y == 0) {
            for (var x = 0; x < bpp; x++)
              data[di + x] = img[i + x];
            if (type == 2)
              for (var x = bpp; x < bpl; x++)
                data[di + x] = img[i + x];
            if (type == 3)
              for (var x = bpp; x < bpl; x++)
                data[di + x] = img[i + x] - (img[i + x - bpp] >> 1) + 256 & 255;
            if (type == 4)
              for (var x = bpp; x < bpl; x++)
                data[di + x] = img[i + x] - paeth(img[i + x - bpp], 0, 0) + 256 & 255;
          } else {
            if (type == 2) {
              for (var x = 0; x < bpl; x++)
                data[di + x] = img[i + x] + 256 - img[i + x - bpl] & 255;
            }
            if (type == 3) {
              for (var x = 0; x < bpp; x++)
                data[di + x] = img[i + x] + 256 - (img[i + x - bpl] >> 1) & 255;
              for (var x = bpp; x < bpl; x++)
                data[di + x] = img[i + x] + 256 - (img[i + x - bpl] + img[i + x - bpp] >> 1) & 255;
            }
            if (type == 4) {
              for (var x = 0; x < bpp; x++)
                data[di + x] = img[i + x] + 256 - paeth(0, img[i + x - bpl], 0) & 255;
              for (var x = bpp; x < bpl; x++)
                data[di + x] = img[i + x] + 256 - paeth(img[i + x - bpp], img[i + x - bpl], img[i + x - bpp - bpl]) & 255;
            }
          }
        };
        UPNG3.crc = {
          table: function() {
            var tab = new Uint32Array(256);
            for (var n = 0; n < 256; n++) {
              var c = n;
              for (var k = 0; k < 8; k++) {
                if (c & 1)
                  c = 3988292384 ^ c >>> 1;
                else
                  c = c >>> 1;
              }
              tab[n] = c;
            }
            return tab;
          }(),
          update: function(c, buf, off, len) {
            for (var i = 0; i < len; i++)
              c = UPNG3.crc.table[(c ^ buf[off + i]) & 255] ^ c >>> 8;
            return c;
          },
          crc: function(b, o, l) {
            return UPNG3.crc.update(4294967295, b, o, l) ^ 4294967295;
          }
        };
        UPNG3.quantize = function(bufs, ps, roundAlpha) {
          var imgs = [], totl = 0;
          for (var i = 0; i < bufs.length; i++) {
            imgs.push(UPNG3.encode.alphaMul(new Uint8Array(bufs[i]), roundAlpha));
            totl += bufs[i].byteLength;
          }
          var nimg = new Uint8Array(totl), nimg32 = new Uint32Array(nimg.buffer), noff = 0;
          for (var i = 0; i < imgs.length; i++) {
            var img = imgs[i], il = img.length;
            for (var j = 0; j < il; j++)
              nimg[noff + j] = img[j];
            noff += il;
          }
          var root = {i0: 0, i1: nimg.length, bst: null, est: null, tdst: 0, left: null, right: null};
          root.bst = UPNG3.quantize.stats(nimg, root.i0, root.i1);
          root.est = UPNG3.quantize.estats(root.bst);
          var leafs = [root];
          while (leafs.length < ps) {
            var maxL = 0, mi = 0;
            for (var i = 0; i < leafs.length; i++)
              if (leafs[i].est.L > maxL) {
                maxL = leafs[i].est.L;
                mi = i;
              }
            if (maxL < 1e-3)
              break;
            var node = leafs[mi];
            var s0 = UPNG3.quantize.splitPixels(nimg, nimg32, node.i0, node.i1, node.est.e, node.est.eMq255);
            var ln = {i0: node.i0, i1: s0, bst: null, est: null, tdst: 0, left: null, right: null};
            ln.bst = UPNG3.quantize.stats(nimg, ln.i0, ln.i1);
            ln.est = UPNG3.quantize.estats(ln.bst);
            var rn = {i0: s0, i1: node.i1, bst: null, est: null, tdst: 0, left: null, right: null};
            rn.bst = {R: [], m: [], N: node.bst.N - ln.bst.N};
            for (var i = 0; i < 16; i++)
              rn.bst.R[i] = node.bst.R[i] - ln.bst.R[i];
            for (var i = 0; i < 4; i++)
              rn.bst.m[i] = node.bst.m[i] - ln.bst.m[i];
            rn.est = UPNG3.quantize.estats(rn.bst);
            node.left = ln;
            node.right = rn;
            leafs[mi] = ln;
            leafs.push(rn);
          }
          leafs.sort(function(a2, b2) {
            return b2.bst.N - a2.bst.N;
          });
          for (var ii = 0; ii < imgs.length; ii++) {
            var planeDst = UPNG3.quantize.planeDst;
            var sb = new Uint8Array(imgs[ii].buffer), tb = new Uint32Array(imgs[ii].buffer), len = sb.length;
            var stack = [], si = 0;
            for (var i = 0; i < len; i += 4) {
              var r = sb[i] * (1 / 255), g = sb[i + 1] * (1 / 255), b = sb[i + 2] * (1 / 255), a = sb[i + 3] * (1 / 255);
              var nd = root;
              while (nd.left)
                nd = planeDst(nd.est, r, g, b, a) <= 0 ? nd.left : nd.right;
              tb[i >> 2] = nd.est.rgba;
            }
            imgs[ii] = tb.buffer;
          }
          return {bufs: imgs, plte: leafs};
        };
        UPNG3.quantize.getNearest = function(nd, r, g, b, a) {
          if (nd.left == null) {
            nd.tdst = UPNG3.quantize.dist(nd.est.q, r, g, b, a);
            return nd;
          }
          var planeDst = UPNG3.quantize.planeDst(nd.est, r, g, b, a);
          var node0 = nd.left, node1 = nd.right;
          if (planeDst > 0) {
            node0 = nd.right;
            node1 = nd.left;
          }
          var ln = UPNG3.quantize.getNearest(node0, r, g, b, a);
          if (ln.tdst <= planeDst * planeDst)
            return ln;
          var rn = UPNG3.quantize.getNearest(node1, r, g, b, a);
          return rn.tdst < ln.tdst ? rn : ln;
        };
        UPNG3.quantize.planeDst = function(est, r, g, b, a) {
          var e = est.e;
          return e[0] * r + e[1] * g + e[2] * b + e[3] * a - est.eMq;
        };
        UPNG3.quantize.dist = function(q, r, g, b, a) {
          var d0 = r - q[0], d1 = g - q[1], d2 = b - q[2], d3 = a - q[3];
          return d0 * d0 + d1 * d1 + d2 * d2 + d3 * d3;
        };
        UPNG3.quantize.splitPixels = function(nimg, nimg32, i0, i1, e, eMq) {
          var vecDot = UPNG3.quantize.vecDot;
          i1 -= 4;
          var shfs = 0;
          while (i0 < i1) {
            while (vecDot(nimg, i0, e) <= eMq)
              i0 += 4;
            while (vecDot(nimg, i1, e) > eMq)
              i1 -= 4;
            if (i0 >= i1)
              break;
            var t = nimg32[i0 >> 2];
            nimg32[i0 >> 2] = nimg32[i1 >> 2];
            nimg32[i1 >> 2] = t;
            i0 += 4;
            i1 -= 4;
          }
          while (vecDot(nimg, i0, e) > eMq)
            i0 -= 4;
          return i0 + 4;
        };
        UPNG3.quantize.vecDot = function(nimg, i, e) {
          return nimg[i] * e[0] + nimg[i + 1] * e[1] + nimg[i + 2] * e[2] + nimg[i + 3] * e[3];
        };
        UPNG3.quantize.stats = function(nimg, i0, i1) {
          var R = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          var m = [0, 0, 0, 0];
          var N = i1 - i0 >> 2;
          for (var i = i0; i < i1; i += 4) {
            var r = nimg[i] * (1 / 255), g = nimg[i + 1] * (1 / 255), b = nimg[i + 2] * (1 / 255), a = nimg[i + 3] * (1 / 255);
            m[0] += r;
            m[1] += g;
            m[2] += b;
            m[3] += a;
            R[0] += r * r;
            R[1] += r * g;
            R[2] += r * b;
            R[3] += r * a;
            R[5] += g * g;
            R[6] += g * b;
            R[7] += g * a;
            R[10] += b * b;
            R[11] += b * a;
            R[15] += a * a;
          }
          R[4] = R[1];
          R[8] = R[2];
          R[12] = R[3];
          R[9] = R[6];
          R[13] = R[7];
          R[14] = R[11];
          return {R, m, N};
        };
        UPNG3.quantize.estats = function(stats) {
          var R = stats.R, m = stats.m, N = stats.N;
          var m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3], iN = N == 0 ? 0 : 1 / N;
          var Rj = [
            R[0] - m0 * m0 * iN,
            R[1] - m0 * m1 * iN,
            R[2] - m0 * m2 * iN,
            R[3] - m0 * m3 * iN,
            R[4] - m1 * m0 * iN,
            R[5] - m1 * m1 * iN,
            R[6] - m1 * m2 * iN,
            R[7] - m1 * m3 * iN,
            R[8] - m2 * m0 * iN,
            R[9] - m2 * m1 * iN,
            R[10] - m2 * m2 * iN,
            R[11] - m2 * m3 * iN,
            R[12] - m3 * m0 * iN,
            R[13] - m3 * m1 * iN,
            R[14] - m3 * m2 * iN,
            R[15] - m3 * m3 * iN
          ];
          var A = Rj, M = UPNG3.M4;
          var b = [0.5, 0.5, 0.5, 0.5], mi = 0, tmi = 0;
          if (N != 0)
            for (var i = 0; i < 10; i++) {
              b = M.multVec(A, b);
              tmi = Math.sqrt(M.dot(b, b));
              b = M.sml(1 / tmi, b);
              if (Math.abs(tmi - mi) < 1e-9)
                break;
              mi = tmi;
            }
          var q = [m0 * iN, m1 * iN, m2 * iN, m3 * iN];
          var eMq255 = M.dot(M.sml(255, q), b);
          var ia = q[3] < 1e-3 ? 0 : 1 / q[3];
          return {
            Cov: Rj,
            q,
            e: b,
            L: mi,
            eMq255,
            eMq: M.dot(b, q),
            rgba: (Math.round(255 * q[3]) << 24 | Math.round(255 * q[2] * ia) << 16 | Math.round(255 * q[1] * ia) << 8 | Math.round(255 * q[0] * ia) << 0) >>> 0
          };
        };
        UPNG3.M4 = {
          multVec: function(m, v) {
            return [
              m[0] * v[0] + m[1] * v[1] + m[2] * v[2] + m[3] * v[3],
              m[4] * v[0] + m[5] * v[1] + m[6] * v[2] + m[7] * v[3],
              m[8] * v[0] + m[9] * v[1] + m[10] * v[2] + m[11] * v[3],
              m[12] * v[0] + m[13] * v[1] + m[14] * v[2] + m[15] * v[3]
            ];
          },
          dot: function(x, y) {
            return x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3];
          },
          sml: function(a, y) {
            return [a * y[0], a * y[1], a * y[2], a * y[3]];
          }
        };
        UPNG3.encode.alphaMul = function(img, roundA) {
          var nimg = new Uint8Array(img.length), area = img.length >> 2;
          for (var i = 0; i < area; i++) {
            var qi = i << 2, ia = img[qi + 3];
            if (roundA)
              ia = ia < 128 ? 0 : 255;
            var a = ia * (1 / 255);
            nimg[qi + 0] = img[qi + 0] * a;
            nimg[qi + 1] = img[qi + 1] * a;
            nimg[qi + 2] = img[qi + 2] * a;
            nimg[qi + 3] = ia;
          }
          return nimg;
        };
      })(UPNG2, pako);
    })();
  });

  // node_modules/pica/dist/pica.js
  var require_pica = __commonJS((exports, module) => {
    /*!
    
    pica
    https://github.com/nodeca/pica
    
    */
    (function(f) {
      if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = f();
      } else if (typeof define === "function" && define.amd) {
        define([], f);
      } else {
        var g;
        if (typeof window !== "undefined") {
          g = window;
        } else if (typeof global !== "undefined") {
          g = global;
        } else if (typeof self !== "undefined") {
          g = self;
        } else {
          g = this;
        }
        g.pica = f();
      }
    })(function() {
      var define2, module2, exports2;
      return function() {
        function r(e, n, t) {
          function o(i2, f) {
            if (!n[i2]) {
              if (!e[i2]) {
                var c = false;
                if (!f && c)
                  return c(i2, true);
                if (u)
                  return u(i2, true);
                var a = new Error("Cannot find module '" + i2 + "'");
                throw a.code = "MODULE_NOT_FOUND", a;
              }
              var p = n[i2] = {exports: {}};
              e[i2][0].call(p.exports, function(r2) {
                var n2 = e[i2][1][r2];
                return o(n2 || r2);
              }, p, p.exports, r, e, n, t);
            }
            return n[i2].exports;
          }
          for (var u = false, i = 0; i < t.length; i++)
            o(t[i]);
          return o;
        }
        return r;
      }()({1: [function(_dereq_, module3, exports3) {
        "use strict";
        var inherits = _dereq_("inherits");
        var Multimath = _dereq_("multimath");
        var mm_unsharp_mask = _dereq_("multimath/lib/unsharp_mask");
        var mm_resize = _dereq_("./mm_resize");
        function MathLib(requested_features) {
          var __requested_features = requested_features || [];
          var features = {
            js: __requested_features.indexOf("js") >= 0,
            wasm: __requested_features.indexOf("wasm") >= 0
          };
          Multimath.call(this, features);
          this.features = {
            js: features.js,
            wasm: features.wasm && this.has_wasm()
          };
          this.use(mm_unsharp_mask);
          this.use(mm_resize);
        }
        inherits(MathLib, Multimath);
        MathLib.prototype.resizeAndUnsharp = function resizeAndUnsharp(options, cache) {
          var result = this.resize(options, cache);
          if (options.unsharpAmount) {
            this.unsharp_mask(result, options.toWidth, options.toHeight, options.unsharpAmount, options.unsharpRadius, options.unsharpThreshold);
          }
          return result;
        };
        module3.exports = MathLib;
      }, {"./mm_resize": 4, inherits: 15, multimath: 16, "multimath/lib/unsharp_mask": 19}], 2: [function(_dereq_, module3, exports3) {
        "use strict";
        function clampTo8(i) {
          return i < 0 ? 0 : i > 255 ? 255 : i;
        }
        function convolveHorizontally(src, dest, srcW, srcH, destW, filters) {
          var r, g, b, a;
          var filterPtr, filterShift, filterSize;
          var srcPtr, srcY, destX, filterVal;
          var srcOffset = 0, destOffset = 0;
          for (srcY = 0; srcY < srcH; srcY++) {
            filterPtr = 0;
            for (destX = 0; destX < destW; destX++) {
              filterShift = filters[filterPtr++];
              filterSize = filters[filterPtr++];
              srcPtr = srcOffset + filterShift * 4 | 0;
              r = g = b = a = 0;
              for (; filterSize > 0; filterSize--) {
                filterVal = filters[filterPtr++];
                a = a + filterVal * src[srcPtr + 3] | 0;
                b = b + filterVal * src[srcPtr + 2] | 0;
                g = g + filterVal * src[srcPtr + 1] | 0;
                r = r + filterVal * src[srcPtr] | 0;
                srcPtr = srcPtr + 4 | 0;
              }
              dest[destOffset + 3] = clampTo8(a + (1 << 13) >> 14);
              dest[destOffset + 2] = clampTo8(b + (1 << 13) >> 14);
              dest[destOffset + 1] = clampTo8(g + (1 << 13) >> 14);
              dest[destOffset] = clampTo8(r + (1 << 13) >> 14);
              destOffset = destOffset + srcH * 4 | 0;
            }
            destOffset = (srcY + 1) * 4 | 0;
            srcOffset = (srcY + 1) * srcW * 4 | 0;
          }
        }
        function convolveVertically(src, dest, srcW, srcH, destW, filters) {
          var r, g, b, a;
          var filterPtr, filterShift, filterSize;
          var srcPtr, srcY, destX, filterVal;
          var srcOffset = 0, destOffset = 0;
          for (srcY = 0; srcY < srcH; srcY++) {
            filterPtr = 0;
            for (destX = 0; destX < destW; destX++) {
              filterShift = filters[filterPtr++];
              filterSize = filters[filterPtr++];
              srcPtr = srcOffset + filterShift * 4 | 0;
              r = g = b = a = 0;
              for (; filterSize > 0; filterSize--) {
                filterVal = filters[filterPtr++];
                a = a + filterVal * src[srcPtr + 3] | 0;
                b = b + filterVal * src[srcPtr + 2] | 0;
                g = g + filterVal * src[srcPtr + 1] | 0;
                r = r + filterVal * src[srcPtr] | 0;
                srcPtr = srcPtr + 4 | 0;
              }
              dest[destOffset + 3] = clampTo8(a + (1 << 13) >> 14);
              dest[destOffset + 2] = clampTo8(b + (1 << 13) >> 14);
              dest[destOffset + 1] = clampTo8(g + (1 << 13) >> 14);
              dest[destOffset] = clampTo8(r + (1 << 13) >> 14);
              destOffset = destOffset + srcH * 4 | 0;
            }
            destOffset = (srcY + 1) * 4 | 0;
            srcOffset = (srcY + 1) * srcW * 4 | 0;
          }
        }
        module3.exports = {
          convolveHorizontally,
          convolveVertically
        };
      }, {}], 3: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = "AGFzbQEAAAABFAJgBn9/f39/fwBgB39/f39/f38AAg8BA2VudgZtZW1vcnkCAAEDAwIAAQQEAXAAAAcZAghjb252b2x2ZQAACmNvbnZvbHZlSFYAAQkBAArmAwLBAwEQfwJAIANFDQAgBEUNACAFQQRqIRVBACEMQQAhDQNAIA0hDkEAIRFBACEHA0AgB0ECaiESAn8gBSAHQQF0IgdqIgZBAmouAQAiEwRAQQAhCEEAIBNrIRQgFSAHaiEPIAAgDCAGLgEAakECdGohEEEAIQlBACEKQQAhCwNAIBAoAgAiB0EYdiAPLgEAIgZsIAtqIQsgB0H/AXEgBmwgCGohCCAHQRB2Qf8BcSAGbCAKaiEKIAdBCHZB/wFxIAZsIAlqIQkgD0ECaiEPIBBBBGohECAUQQFqIhQNAAsgEiATagwBC0EAIQtBACEKQQAhCUEAIQggEgshByABIA5BAnRqIApBgMAAakEOdSIGQf8BIAZB/wFIG0EQdEGAgPwHcUEAIAZBAEobIAtBgMAAakEOdSIGQf8BIAZB/wFIG0EYdEEAIAZBAEobciAJQYDAAGpBDnUiBkH/ASAGQf8BSBtBCHRBgP4DcUEAIAZBAEobciAIQYDAAGpBDnUiBkH/ASAGQf8BSBtB/wFxQQAgBkEAShtyNgIAIA4gA2ohDiARQQFqIhEgBEcNAAsgDCACaiEMIA1BAWoiDSADRw0ACwsLIQACQEEAIAIgAyAEIAUgABAAIAJBACAEIAUgBiABEAALCw==";
      }, {}], 4: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = {
          name: "resize",
          fn: _dereq_("./resize"),
          wasm_fn: _dereq_("./resize_wasm"),
          wasm_src: _dereq_("./convolve_wasm_base64")
        };
      }, {"./convolve_wasm_base64": 3, "./resize": 5, "./resize_wasm": 8}], 5: [function(_dereq_, module3, exports3) {
        "use strict";
        var createFilters = _dereq_("./resize_filter_gen");
        var convolveHorizontally = _dereq_("./convolve").convolveHorizontally;
        var convolveVertically = _dereq_("./convolve").convolveVertically;
        function resetAlpha(dst, width2, height2) {
          var ptr = 3, len = width2 * height2 * 4 | 0;
          while (ptr < len) {
            dst[ptr] = 255;
            ptr = ptr + 4 | 0;
          }
        }
        module3.exports = function resize(options) {
          var src = options.src;
          var srcW = options.width;
          var srcH = options.height;
          var destW = options.toWidth;
          var destH = options.toHeight;
          var scaleX = options.scaleX || options.toWidth / options.width;
          var scaleY = options.scaleY || options.toHeight / options.height;
          var offsetX = options.offsetX || 0;
          var offsetY = options.offsetY || 0;
          var dest = options.dest || new Uint8Array(destW * destH * 4);
          var quality = typeof options.quality === "undefined" ? 3 : options.quality;
          var alpha = options.alpha || false;
          var filtersX = createFilters(quality, srcW, destW, scaleX, offsetX), filtersY = createFilters(quality, srcH, destH, scaleY, offsetY);
          var tmp = new Uint8Array(destW * srcH * 4);
          convolveHorizontally(src, tmp, srcW, srcH, destW, filtersX);
          convolveVertically(tmp, dest, srcH, destW, destH, filtersY);
          if (!alpha)
            resetAlpha(dest, destW, destH);
          return dest;
        };
      }, {"./convolve": 2, "./resize_filter_gen": 6}], 6: [function(_dereq_, module3, exports3) {
        "use strict";
        var FILTER_INFO = _dereq_("./resize_filter_info");
        var FIXED_FRAC_BITS = 14;
        function toFixedPoint(num) {
          return Math.round(num * ((1 << FIXED_FRAC_BITS) - 1));
        }
        module3.exports = function resizeFilterGen(quality, srcSize, destSize, scale, offset) {
          var filterFunction = FILTER_INFO[quality].filter;
          var scaleInverted = 1 / scale;
          var scaleClamped = Math.min(1, scale);
          var srcWindow = FILTER_INFO[quality].win / scaleClamped;
          var destPixel, srcPixel, srcFirst, srcLast, filterElementSize, floatFilter, fxpFilter, total, pxl, idx, floatVal, filterTotal, filterVal;
          var leftNotEmpty, rightNotEmpty, filterShift, filterSize;
          var maxFilterElementSize = Math.floor((srcWindow + 1) * 2);
          var packedFilter = new Int16Array((maxFilterElementSize + 2) * destSize);
          var packedFilterPtr = 0;
          var slowCopy = !packedFilter.subarray || !packedFilter.set;
          for (destPixel = 0; destPixel < destSize; destPixel++) {
            srcPixel = (destPixel + 0.5) * scaleInverted + offset;
            srcFirst = Math.max(0, Math.floor(srcPixel - srcWindow));
            srcLast = Math.min(srcSize - 1, Math.ceil(srcPixel + srcWindow));
            filterElementSize = srcLast - srcFirst + 1;
            floatFilter = new Float32Array(filterElementSize);
            fxpFilter = new Int16Array(filterElementSize);
            total = 0;
            for (pxl = srcFirst, idx = 0; pxl <= srcLast; pxl++, idx++) {
              floatVal = filterFunction((pxl + 0.5 - srcPixel) * scaleClamped);
              total += floatVal;
              floatFilter[idx] = floatVal;
            }
            filterTotal = 0;
            for (idx = 0; idx < floatFilter.length; idx++) {
              filterVal = floatFilter[idx] / total;
              filterTotal += filterVal;
              fxpFilter[idx] = toFixedPoint(filterVal);
            }
            fxpFilter[destSize >> 1] += toFixedPoint(1 - filterTotal);
            leftNotEmpty = 0;
            while (leftNotEmpty < fxpFilter.length && fxpFilter[leftNotEmpty] === 0) {
              leftNotEmpty++;
            }
            if (leftNotEmpty < fxpFilter.length) {
              rightNotEmpty = fxpFilter.length - 1;
              while (rightNotEmpty > 0 && fxpFilter[rightNotEmpty] === 0) {
                rightNotEmpty--;
              }
              filterShift = srcFirst + leftNotEmpty;
              filterSize = rightNotEmpty - leftNotEmpty + 1;
              packedFilter[packedFilterPtr++] = filterShift;
              packedFilter[packedFilterPtr++] = filterSize;
              if (!slowCopy) {
                packedFilter.set(fxpFilter.subarray(leftNotEmpty, rightNotEmpty + 1), packedFilterPtr);
                packedFilterPtr += filterSize;
              } else {
                for (idx = leftNotEmpty; idx <= rightNotEmpty; idx++) {
                  packedFilter[packedFilterPtr++] = fxpFilter[idx];
                }
              }
            } else {
              packedFilter[packedFilterPtr++] = 0;
              packedFilter[packedFilterPtr++] = 0;
            }
          }
          return packedFilter;
        };
      }, {"./resize_filter_info": 7}], 7: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = [{
          win: 0.5,
          filter: function filter(x) {
            return x >= -0.5 && x < 0.5 ? 1 : 0;
          }
        }, {
          win: 1,
          filter: function filter(x) {
            if (x <= -1 || x >= 1) {
              return 0;
            }
            if (x > -11920929e-14 && x < 11920929e-14) {
              return 1;
            }
            var xpi = x * Math.PI;
            return Math.sin(xpi) / xpi * (0.54 + 0.46 * Math.cos(xpi / 1));
          }
        }, {
          win: 2,
          filter: function filter(x) {
            if (x <= -2 || x >= 2) {
              return 0;
            }
            if (x > -11920929e-14 && x < 11920929e-14) {
              return 1;
            }
            var xpi = x * Math.PI;
            return Math.sin(xpi) / xpi * Math.sin(xpi / 2) / (xpi / 2);
          }
        }, {
          win: 3,
          filter: function filter(x) {
            if (x <= -3 || x >= 3) {
              return 0;
            }
            if (x > -11920929e-14 && x < 11920929e-14) {
              return 1;
            }
            var xpi = x * Math.PI;
            return Math.sin(xpi) / xpi * Math.sin(xpi / 3) / (xpi / 3);
          }
        }];
      }, {}], 8: [function(_dereq_, module3, exports3) {
        "use strict";
        var createFilters = _dereq_("./resize_filter_gen");
        function resetAlpha(dst, width2, height2) {
          var ptr = 3, len = width2 * height2 * 4 | 0;
          while (ptr < len) {
            dst[ptr] = 255;
            ptr = ptr + 4 | 0;
          }
        }
        function asUint8Array(src) {
          return new Uint8Array(src.buffer, 0, src.byteLength);
        }
        var IS_LE = true;
        try {
          IS_LE = new Uint32Array(new Uint8Array([1, 0, 0, 0]).buffer)[0] === 1;
        } catch (__) {
        }
        function copyInt16asLE(src, target, target_offset) {
          if (IS_LE) {
            target.set(asUint8Array(src), target_offset);
            return;
          }
          for (var ptr = target_offset, i = 0; i < src.length; i++) {
            var data = src[i];
            target[ptr++] = data & 255;
            target[ptr++] = data >> 8 & 255;
          }
        }
        module3.exports = function resize_wasm(options) {
          var src = options.src;
          var srcW = options.width;
          var srcH = options.height;
          var destW = options.toWidth;
          var destH = options.toHeight;
          var scaleX = options.scaleX || options.toWidth / options.width;
          var scaleY = options.scaleY || options.toHeight / options.height;
          var offsetX = options.offsetX || 0;
          var offsetY = options.offsetY || 0;
          var dest = options.dest || new Uint8Array(destW * destH * 4);
          var quality = typeof options.quality === "undefined" ? 3 : options.quality;
          var alpha = options.alpha || false;
          var filtersX = createFilters(quality, srcW, destW, scaleX, offsetX), filtersY = createFilters(quality, srcH, destH, scaleY, offsetY);
          var src_offset = 0;
          var tmp_offset = this.__align(src_offset + Math.max(src.byteLength, dest.byteLength));
          var filtersX_offset = this.__align(tmp_offset + srcH * destW * 4);
          var filtersY_offset = this.__align(filtersX_offset + filtersX.byteLength);
          var alloc_bytes = filtersY_offset + filtersY.byteLength;
          var instance = this.__instance("resize", alloc_bytes);
          var mem = new Uint8Array(this.__memory.buffer);
          var mem32 = new Uint32Array(this.__memory.buffer);
          var src32 = new Uint32Array(src.buffer);
          mem32.set(src32);
          copyInt16asLE(filtersX, mem, filtersX_offset);
          copyInt16asLE(filtersY, mem, filtersY_offset);
          var fn = instance.exports.convolveHV || instance.exports._convolveHV;
          fn(filtersX_offset, filtersY_offset, tmp_offset, srcW, srcH, destW, destH);
          var dest32 = new Uint32Array(dest.buffer);
          dest32.set(new Uint32Array(this.__memory.buffer, 0, destH * destW));
          if (!alpha)
            resetAlpha(dest, destW, destH);
          return dest;
        };
      }, {"./resize_filter_gen": 6}], 9: [function(_dereq_, module3, exports3) {
        "use strict";
        var GC_INTERVAL = 100;
        function Pool(create, idle) {
          this.create = create;
          this.available = [];
          this.acquired = {};
          this.lastId = 1;
          this.timeoutId = 0;
          this.idle = idle || 2e3;
        }
        Pool.prototype.acquire = function() {
          var _this = this;
          var resource;
          if (this.available.length !== 0) {
            resource = this.available.pop();
          } else {
            resource = this.create();
            resource.id = this.lastId++;
            resource.release = function() {
              return _this.release(resource);
            };
          }
          this.acquired[resource.id] = resource;
          return resource;
        };
        Pool.prototype.release = function(resource) {
          var _this2 = this;
          delete this.acquired[resource.id];
          resource.lastUsed = Date.now();
          this.available.push(resource);
          if (this.timeoutId === 0) {
            this.timeoutId = setTimeout(function() {
              return _this2.gc();
            }, GC_INTERVAL);
          }
        };
        Pool.prototype.gc = function() {
          var _this3 = this;
          var now = Date.now();
          this.available = this.available.filter(function(resource) {
            if (now - resource.lastUsed > _this3.idle) {
              resource.destroy();
              return false;
            }
            return true;
          });
          if (this.available.length !== 0) {
            this.timeoutId = setTimeout(function() {
              return _this3.gc();
            }, GC_INTERVAL);
          } else {
            this.timeoutId = 0;
          }
        };
        module3.exports = Pool;
      }, {}], 10: [function(_dereq_, module3, exports3) {
        "use strict";
        var MIN_INNER_TILE_SIZE = 2;
        module3.exports = function createStages(fromWidth, fromHeight, toWidth, toHeight, srcTileSize, destTileBorder) {
          var scaleX = toWidth / fromWidth;
          var scaleY = toHeight / fromHeight;
          var minScale = (2 * destTileBorder + MIN_INNER_TILE_SIZE + 1) / srcTileSize;
          if (minScale > 0.5)
            return [[toWidth, toHeight]];
          var stageCount = Math.ceil(Math.log(Math.min(scaleX, scaleY)) / Math.log(minScale));
          if (stageCount <= 1)
            return [[toWidth, toHeight]];
          var result = [];
          for (var i = 0; i < stageCount; i++) {
            var width2 = Math.round(Math.pow(Math.pow(fromWidth, stageCount - i - 1) * Math.pow(toWidth, i + 1), 1 / stageCount));
            var height2 = Math.round(Math.pow(Math.pow(fromHeight, stageCount - i - 1) * Math.pow(toHeight, i + 1), 1 / stageCount));
            result.push([width2, height2]);
          }
          return result;
        };
      }, {}], 11: [function(_dereq_, module3, exports3) {
        "use strict";
        var PIXEL_EPSILON = 1e-5;
        function pixelFloor(x) {
          var nearest = Math.round(x);
          if (Math.abs(x - nearest) < PIXEL_EPSILON) {
            return nearest;
          }
          return Math.floor(x);
        }
        function pixelCeil(x) {
          var nearest = Math.round(x);
          if (Math.abs(x - nearest) < PIXEL_EPSILON) {
            return nearest;
          }
          return Math.ceil(x);
        }
        module3.exports = function createRegions(options) {
          var scaleX = options.toWidth / options.width;
          var scaleY = options.toHeight / options.height;
          var innerTileWidth = pixelFloor(options.srcTileSize * scaleX) - 2 * options.destTileBorder;
          var innerTileHeight = pixelFloor(options.srcTileSize * scaleY) - 2 * options.destTileBorder;
          if (innerTileWidth < 1 || innerTileHeight < 1) {
            throw new Error("Internal error in pica: target tile width/height is too small.");
          }
          var x, y;
          var innerX, innerY, toTileWidth, toTileHeight;
          var tiles = [];
          var tile;
          for (innerY = 0; innerY < options.toHeight; innerY += innerTileHeight) {
            for (innerX = 0; innerX < options.toWidth; innerX += innerTileWidth) {
              x = innerX - options.destTileBorder;
              if (x < 0) {
                x = 0;
              }
              toTileWidth = innerX + innerTileWidth + options.destTileBorder - x;
              if (x + toTileWidth >= options.toWidth) {
                toTileWidth = options.toWidth - x;
              }
              y = innerY - options.destTileBorder;
              if (y < 0) {
                y = 0;
              }
              toTileHeight = innerY + innerTileHeight + options.destTileBorder - y;
              if (y + toTileHeight >= options.toHeight) {
                toTileHeight = options.toHeight - y;
              }
              tile = {
                toX: x,
                toY: y,
                toWidth: toTileWidth,
                toHeight: toTileHeight,
                toInnerX: innerX,
                toInnerY: innerY,
                toInnerWidth: innerTileWidth,
                toInnerHeight: innerTileHeight,
                offsetX: x / scaleX - pixelFloor(x / scaleX),
                offsetY: y / scaleY - pixelFloor(y / scaleY),
                scaleX,
                scaleY,
                x: pixelFloor(x / scaleX),
                y: pixelFloor(y / scaleY),
                width: pixelCeil(toTileWidth / scaleX),
                height: pixelCeil(toTileHeight / scaleY)
              };
              tiles.push(tile);
            }
          }
          return tiles;
        };
      }, {}], 12: [function(_dereq_, module3, exports3) {
        "use strict";
        function objClass(obj) {
          return Object.prototype.toString.call(obj);
        }
        module3.exports.isCanvas = function isCanvas(element) {
          var cname = objClass(element);
          return cname === "[object HTMLCanvasElement]" || cname === "[object OffscreenCanvas]" || cname === "[object Canvas]";
        };
        module3.exports.isImage = function isImage(element) {
          return objClass(element) === "[object HTMLImageElement]";
        };
        module3.exports.isImageBitmap = function isImageBitmap(element) {
          return objClass(element) === "[object ImageBitmap]";
        };
        module3.exports.limiter = function limiter(concurrency) {
          var active = 0, queue = [];
          function roll() {
            if (active < concurrency && queue.length) {
              active++;
              queue.shift()();
            }
          }
          return function limit(fn) {
            return new Promise(function(resolve, reject) {
              queue.push(function() {
                fn().then(function(result) {
                  resolve(result);
                  active--;
                  roll();
                }, function(err) {
                  reject(err);
                  active--;
                  roll();
                });
              });
              roll();
            });
          };
        };
        module3.exports.cib_quality_name = function cib_quality_name(num) {
          switch (num) {
            case 0:
              return "pixelated";
            case 1:
              return "low";
            case 2:
              return "medium";
          }
          return "high";
        };
        module3.exports.cib_support = function cib_support(createCanvas) {
          return Promise.resolve().then(function() {
            if (typeof createImageBitmap === "undefined") {
              return false;
            }
            var c = createCanvas(100, 100);
            return createImageBitmap(c, 0, 0, 100, 100, {
              resizeWidth: 10,
              resizeHeight: 10,
              resizeQuality: "high"
            }).then(function(bitmap) {
              var status = bitmap.width === 10;
              bitmap.close();
              c = null;
              return status;
            });
          })["catch"](function() {
            return false;
          });
        };
      }, {}], 13: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = function() {
          var MathLib = _dereq_("./mathlib");
          var mathLib;
          onmessage = function onmessage2(ev) {
            var opts = ev.data.opts;
            if (!mathLib)
              mathLib = new MathLib(ev.data.features);
            var result = mathLib.resizeAndUnsharp(opts);
            postMessage({
              result
            }, [result.buffer]);
          };
        };
      }, {"./mathlib": 1}], 14: [function(_dereq_, module3, exports3) {
        var a0, a1, a2, a3, b1, b2, left_corner, right_corner;
        function gaussCoef(sigma) {
          if (sigma < 0.5) {
            sigma = 0.5;
          }
          var a = Math.exp(0.726 * 0.726) / sigma, g1 = Math.exp(-a), g2 = Math.exp(-2 * a), k = (1 - g1) * (1 - g1) / (1 + 2 * a * g1 - g2);
          a0 = k;
          a1 = k * (a - 1) * g1;
          a2 = k * (a + 1) * g1;
          a3 = -k * g2;
          b1 = 2 * g1;
          b2 = -g2;
          left_corner = (a0 + a1) / (1 - b1 - b2);
          right_corner = (a2 + a3) / (1 - b1 - b2);
          return new Float32Array([a0, a1, a2, a3, b1, b2, left_corner, right_corner]);
        }
        function convolveMono16(src, out, line, coeff, width2, height2) {
          var prev_src, curr_src, curr_out, prev_out, prev_prev_out;
          var src_index, out_index, line_index;
          var i, j;
          var coeff_a0, coeff_a1, coeff_b1, coeff_b2;
          for (i = 0; i < height2; i++) {
            src_index = i * width2;
            out_index = i;
            line_index = 0;
            prev_src = src[src_index];
            prev_prev_out = prev_src * coeff[6];
            prev_out = prev_prev_out;
            coeff_a0 = coeff[0];
            coeff_a1 = coeff[1];
            coeff_b1 = coeff[4];
            coeff_b2 = coeff[5];
            for (j = 0; j < width2; j++) {
              curr_src = src[src_index];
              curr_out = curr_src * coeff_a0 + prev_src * coeff_a1 + prev_out * coeff_b1 + prev_prev_out * coeff_b2;
              prev_prev_out = prev_out;
              prev_out = curr_out;
              prev_src = curr_src;
              line[line_index] = prev_out;
              line_index++;
              src_index++;
            }
            src_index--;
            line_index--;
            out_index += height2 * (width2 - 1);
            prev_src = src[src_index];
            prev_prev_out = prev_src * coeff[7];
            prev_out = prev_prev_out;
            curr_src = prev_src;
            coeff_a0 = coeff[2];
            coeff_a1 = coeff[3];
            for (j = width2 - 1; j >= 0; j--) {
              curr_out = curr_src * coeff_a0 + prev_src * coeff_a1 + prev_out * coeff_b1 + prev_prev_out * coeff_b2;
              prev_prev_out = prev_out;
              prev_out = curr_out;
              prev_src = curr_src;
              curr_src = src[src_index];
              out[out_index] = line[line_index] + prev_out;
              src_index--;
              line_index--;
              out_index -= height2;
            }
          }
        }
        function blurMono16(src, width2, height2, radius) {
          if (!radius) {
            return;
          }
          var out = new Uint16Array(src.length), tmp_line = new Float32Array(Math.max(width2, height2));
          var coeff = gaussCoef(radius);
          convolveMono16(src, out, tmp_line, coeff, width2, height2, radius);
          convolveMono16(out, src, tmp_line, coeff, height2, width2, radius);
        }
        module3.exports = blurMono16;
      }, {}], 15: [function(_dereq_, module3, exports3) {
        if (typeof Object.create === "function") {
          module3.exports = function inherits(ctor, superCtor) {
            if (superCtor) {
              ctor.super_ = superCtor;
              ctor.prototype = Object.create(superCtor.prototype, {
                constructor: {
                  value: ctor,
                  enumerable: false,
                  writable: true,
                  configurable: true
                }
              });
            }
          };
        } else {
          module3.exports = function inherits(ctor, superCtor) {
            if (superCtor) {
              ctor.super_ = superCtor;
              var TempCtor = function() {
              };
              TempCtor.prototype = superCtor.prototype;
              ctor.prototype = new TempCtor();
              ctor.prototype.constructor = ctor;
            }
          };
        }
      }, {}], 16: [function(_dereq_, module3, exports3) {
        "use strict";
        var assign = _dereq_("object-assign");
        var base64decode = _dereq_("./lib/base64decode");
        var hasWebAssembly = _dereq_("./lib/wa_detect");
        var DEFAULT_OPTIONS = {
          js: true,
          wasm: true
        };
        function MultiMath(options) {
          if (!(this instanceof MultiMath))
            return new MultiMath(options);
          var opts = assign({}, DEFAULT_OPTIONS, options || {});
          this.options = opts;
          this.__cache = {};
          this.__init_promise = null;
          this.__modules = opts.modules || {};
          this.__memory = null;
          this.__wasm = {};
          this.__isLE = new Uint32Array(new Uint8Array([1, 0, 0, 0]).buffer)[0] === 1;
          if (!this.options.js && !this.options.wasm) {
            throw new Error('mathlib: at least "js" or "wasm" should be enabled');
          }
        }
        MultiMath.prototype.has_wasm = hasWebAssembly;
        MultiMath.prototype.use = function(module4) {
          this.__modules[module4.name] = module4;
          if (this.options.wasm && this.has_wasm() && module4.wasm_fn) {
            this[module4.name] = module4.wasm_fn;
          } else {
            this[module4.name] = module4.fn;
          }
          return this;
        };
        MultiMath.prototype.init = function() {
          if (this.__init_promise)
            return this.__init_promise;
          if (!this.options.js && this.options.wasm && !this.has_wasm()) {
            return Promise.reject(new Error(`mathlib: only "wasm" was enabled, but it's not supported`));
          }
          var self2 = this;
          this.__init_promise = Promise.all(Object.keys(self2.__modules).map(function(name) {
            var module4 = self2.__modules[name];
            if (!self2.options.wasm || !self2.has_wasm() || !module4.wasm_fn)
              return null;
            if (self2.__wasm[name])
              return null;
            return WebAssembly.compile(self2.__base64decode(module4.wasm_src)).then(function(m) {
              self2.__wasm[name] = m;
            });
          })).then(function() {
            return self2;
          });
          return this.__init_promise;
        };
        MultiMath.prototype.__base64decode = base64decode;
        MultiMath.prototype.__reallocate = function mem_grow_to(bytes) {
          if (!this.__memory) {
            this.__memory = new WebAssembly.Memory({
              initial: Math.ceil(bytes / (64 * 1024))
            });
            return this.__memory;
          }
          var mem_size = this.__memory.buffer.byteLength;
          if (mem_size < bytes) {
            this.__memory.grow(Math.ceil((bytes - mem_size) / (64 * 1024)));
          }
          return this.__memory;
        };
        MultiMath.prototype.__instance = function instance(name, memsize, env_extra) {
          if (memsize)
            this.__reallocate(memsize);
          if (!this.__wasm[name]) {
            var module4 = this.__modules[name];
            this.__wasm[name] = new WebAssembly.Module(this.__base64decode(module4.wasm_src));
          }
          if (!this.__cache[name]) {
            var env_base = {
              memoryBase: 0,
              memory: this.__memory,
              tableBase: 0,
              table: new WebAssembly.Table({initial: 0, element: "anyfunc"})
            };
            this.__cache[name] = new WebAssembly.Instance(this.__wasm[name], {
              env: assign(env_base, env_extra || {})
            });
          }
          return this.__cache[name];
        };
        MultiMath.prototype.__align = function align(number, base) {
          base = base || 8;
          var reminder = number % base;
          return number + (reminder ? base - reminder : 0);
        };
        module3.exports = MultiMath;
      }, {"./lib/base64decode": 17, "./lib/wa_detect": 23, "object-assign": 24}], 17: [function(_dereq_, module3, exports3) {
        "use strict";
        var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        module3.exports = function base64decode(str) {
          var input = str.replace(/[\r\n=]/g, ""), max = input.length;
          var out = new Uint8Array(max * 3 >> 2);
          var bits = 0;
          var ptr = 0;
          for (var idx = 0; idx < max; idx++) {
            if (idx % 4 === 0 && idx) {
              out[ptr++] = bits >> 16 & 255;
              out[ptr++] = bits >> 8 & 255;
              out[ptr++] = bits & 255;
            }
            bits = bits << 6 | BASE64_MAP.indexOf(input.charAt(idx));
          }
          var tailbits = max % 4 * 6;
          if (tailbits === 0) {
            out[ptr++] = bits >> 16 & 255;
            out[ptr++] = bits >> 8 & 255;
            out[ptr++] = bits & 255;
          } else if (tailbits === 18) {
            out[ptr++] = bits >> 10 & 255;
            out[ptr++] = bits >> 2 & 255;
          } else if (tailbits === 12) {
            out[ptr++] = bits >> 4 & 255;
          }
          return out;
        };
      }, {}], 18: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = function hsl_l16_js(img, width2, height2) {
          var size = width2 * height2;
          var out = new Uint16Array(size);
          var r, g, b, min, max;
          for (var i = 0; i < size; i++) {
            r = img[4 * i];
            g = img[4 * i + 1];
            b = img[4 * i + 2];
            max = r >= g && r >= b ? r : g >= b && g >= r ? g : b;
            min = r <= g && r <= b ? r : g <= b && g <= r ? g : b;
            out[i] = (max + min) * 257 >> 1;
          }
          return out;
        };
      }, {}], 19: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = {
          name: "unsharp_mask",
          fn: _dereq_("./unsharp_mask"),
          wasm_fn: _dereq_("./unsharp_mask_wasm"),
          wasm_src: _dereq_("./unsharp_mask_wasm_base64")
        };
      }, {"./unsharp_mask": 20, "./unsharp_mask_wasm": 21, "./unsharp_mask_wasm_base64": 22}], 20: [function(_dereq_, module3, exports3) {
        "use strict";
        var glur_mono16 = _dereq_("glur/mono16");
        var hsl_l16 = _dereq_("./hsl_l16");
        module3.exports = function unsharp(img, width2, height2, amount, radius, threshold) {
          var r, g, b;
          var h, s, l;
          var min, max;
          var m1, m2, hShifted;
          var diff, iTimes4;
          if (amount === 0 || radius < 0.5) {
            return;
          }
          if (radius > 2) {
            radius = 2;
          }
          var lightness = hsl_l16(img, width2, height2);
          var blured = new Uint16Array(lightness);
          glur_mono16(blured, width2, height2, radius);
          var amountFp = amount / 100 * 4096 + 0.5 | 0;
          var thresholdFp = threshold * 257 | 0;
          var size = width2 * height2;
          for (var i = 0; i < size; i++) {
            diff = 2 * (lightness[i] - blured[i]);
            if (Math.abs(diff) >= thresholdFp) {
              iTimes4 = i * 4;
              r = img[iTimes4];
              g = img[iTimes4 + 1];
              b = img[iTimes4 + 2];
              max = r >= g && r >= b ? r : g >= r && g >= b ? g : b;
              min = r <= g && r <= b ? r : g <= r && g <= b ? g : b;
              l = (max + min) * 257 >> 1;
              if (min === max) {
                h = s = 0;
              } else {
                s = l <= 32767 ? (max - min) * 4095 / (max + min) | 0 : (max - min) * 4095 / (2 * 255 - max - min) | 0;
                h = r === max ? (g - b) * 65535 / (6 * (max - min)) | 0 : g === max ? 21845 + ((b - r) * 65535 / (6 * (max - min)) | 0) : 43690 + ((r - g) * 65535 / (6 * (max - min)) | 0);
              }
              l += amountFp * diff + 2048 >> 12;
              if (l > 65535) {
                l = 65535;
              } else if (l < 0) {
                l = 0;
              }
              if (s === 0) {
                r = g = b = l >> 8;
              } else {
                m2 = l <= 32767 ? l * (4096 + s) + 2048 >> 12 : l + ((65535 - l) * s + 2048 >> 12);
                m1 = 2 * l - m2 >> 8;
                m2 >>= 8;
                hShifted = h + 21845 & 65535;
                r = hShifted >= 43690 ? m1 : hShifted >= 32767 ? m1 + ((m2 - m1) * 6 * (43690 - hShifted) + 32768 >> 16) : hShifted >= 10922 ? m2 : m1 + ((m2 - m1) * 6 * hShifted + 32768 >> 16);
                hShifted = h & 65535;
                g = hShifted >= 43690 ? m1 : hShifted >= 32767 ? m1 + ((m2 - m1) * 6 * (43690 - hShifted) + 32768 >> 16) : hShifted >= 10922 ? m2 : m1 + ((m2 - m1) * 6 * hShifted + 32768 >> 16);
                hShifted = h - 21845 & 65535;
                b = hShifted >= 43690 ? m1 : hShifted >= 32767 ? m1 + ((m2 - m1) * 6 * (43690 - hShifted) + 32768 >> 16) : hShifted >= 10922 ? m2 : m1 + ((m2 - m1) * 6 * hShifted + 32768 >> 16);
              }
              img[iTimes4] = r;
              img[iTimes4 + 1] = g;
              img[iTimes4 + 2] = b;
            }
          }
        };
      }, {"./hsl_l16": 18, "glur/mono16": 14}], 21: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = function unsharp(img, width2, height2, amount, radius, threshold) {
          if (amount === 0 || radius < 0.5) {
            return;
          }
          if (radius > 2) {
            radius = 2;
          }
          var pixels = width2 * height2;
          var img_bytes_cnt = pixels * 4;
          var hsl_bytes_cnt = pixels * 2;
          var blur_bytes_cnt = pixels * 2;
          var blur_line_byte_cnt = Math.max(width2, height2) * 4;
          var blur_coeffs_byte_cnt = 8 * 4;
          var img_offset = 0;
          var hsl_offset = img_bytes_cnt;
          var blur_offset = hsl_offset + hsl_bytes_cnt;
          var blur_tmp_offset = blur_offset + blur_bytes_cnt;
          var blur_line_offset = blur_tmp_offset + blur_bytes_cnt;
          var blur_coeffs_offset = blur_line_offset + blur_line_byte_cnt;
          var instance = this.__instance("unsharp_mask", img_bytes_cnt + hsl_bytes_cnt + blur_bytes_cnt * 2 + blur_line_byte_cnt + blur_coeffs_byte_cnt, {exp: Math.exp});
          var img32 = new Uint32Array(img.buffer);
          var mem32 = new Uint32Array(this.__memory.buffer);
          mem32.set(img32);
          var fn = instance.exports.hsl_l16 || instance.exports._hsl_l16;
          fn(img_offset, hsl_offset, width2, height2);
          fn = instance.exports.blurMono16 || instance.exports._blurMono16;
          fn(hsl_offset, blur_offset, blur_tmp_offset, blur_line_offset, blur_coeffs_offset, width2, height2, radius);
          fn = instance.exports.unsharp || instance.exports._unsharp;
          fn(img_offset, img_offset, hsl_offset, blur_offset, width2, height2, amount, threshold);
          img32.set(new Uint32Array(this.__memory.buffer, 0, pixels));
        };
      }, {}], 22: [function(_dereq_, module3, exports3) {
        "use strict";
        module3.exports = "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";
      }, {}], 23: [function(_dereq_, module3, exports3) {
        "use strict";
        var wa;
        module3.exports = function hasWebAssembly() {
          if (typeof wa !== "undefined")
            return wa;
          wa = false;
          if (typeof WebAssembly === "undefined")
            return wa;
          try {
            var bin = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 1, 127, 1, 127, 3, 2, 1, 0, 5, 3, 1, 0, 1, 7, 8, 1, 4, 116, 101, 115, 116, 0, 0, 10, 16, 1, 14, 0, 32, 0, 65, 1, 54, 2, 0, 32, 0, 40, 2, 0, 11]);
            var module4 = new WebAssembly.Module(bin);
            var instance = new WebAssembly.Instance(module4, {});
            if (instance.exports.test(4) !== 0)
              wa = true;
            return wa;
          } catch (__) {
          }
          return wa;
        };
      }, {}], 24: [function(_dereq_, module3, exports3) {
        /*
        object-assign
        (c) Sindre Sorhus
        @license MIT
        */
        "use strict";
        var getOwnPropertySymbols = Object.getOwnPropertySymbols;
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var propIsEnumerable = Object.prototype.propertyIsEnumerable;
        function toObject(val) {
          if (val === null || val === void 0) {
            throw new TypeError("Object.assign cannot be called with null or undefined");
          }
          return Object(val);
        }
        function shouldUseNative() {
          try {
            if (!Object.assign) {
              return false;
            }
            var test1 = new String("abc");
            test1[5] = "de";
            if (Object.getOwnPropertyNames(test1)[0] === "5") {
              return false;
            }
            var test2 = {};
            for (var i = 0; i < 10; i++) {
              test2["_" + String.fromCharCode(i)] = i;
            }
            var order2 = Object.getOwnPropertyNames(test2).map(function(n) {
              return test2[n];
            });
            if (order2.join("") !== "0123456789") {
              return false;
            }
            var test3 = {};
            "abcdefghijklmnopqrst".split("").forEach(function(letter) {
              test3[letter] = letter;
            });
            if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
              return false;
            }
            return true;
          } catch (err) {
            return false;
          }
        }
        module3.exports = shouldUseNative() ? Object.assign : function(target, source) {
          var from;
          var to = toObject(target);
          var symbols;
          for (var s = 1; s < arguments.length; s++) {
            from = Object(arguments[s]);
            for (var key in from) {
              if (hasOwnProperty.call(from, key)) {
                to[key] = from[key];
              }
            }
            if (getOwnPropertySymbols) {
              symbols = getOwnPropertySymbols(from);
              for (var i = 0; i < symbols.length; i++) {
                if (propIsEnumerable.call(from, symbols[i])) {
                  to[symbols[i]] = from[symbols[i]];
                }
              }
            }
          }
          return to;
        };
      }, {}], 25: [function(_dereq_, module3, exports3) {
        var bundleFn = arguments[3];
        var sources = arguments[4];
        var cache = arguments[5];
        var stringify = JSON.stringify;
        module3.exports = function(fn, options) {
          var wkey;
          var cacheKeys = Object.keys(cache);
          for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            var exp = cache[key].exports;
            if (exp === fn || exp && exp.default === fn) {
              wkey = key;
              break;
            }
          }
          if (!wkey) {
            wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
            var wcache = {};
            for (var i = 0, l = cacheKeys.length; i < l; i++) {
              var key = cacheKeys[i];
              wcache[key] = key;
            }
            sources[wkey] = [
              "function(require,module,exports){" + fn + "(self); }",
              wcache
            ];
          }
          var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
          var scache = {};
          scache[wkey] = wkey;
          sources[skey] = [
            "function(require,module,exports){var f = require(" + stringify(wkey) + ");(f.default ? f.default : f)(self);}",
            scache
          ];
          var workerSources = {};
          resolveSources(skey);
          function resolveSources(key2) {
            workerSources[key2] = true;
            for (var depPath in sources[key2][1]) {
              var depKey = sources[key2][1][depPath];
              if (!workerSources[depKey]) {
                resolveSources(depKey);
              }
            }
          }
          var src = "(" + bundleFn + ")({" + Object.keys(workerSources).map(function(key2) {
            return stringify(key2) + ":[" + sources[key2][0] + "," + stringify(sources[key2][1]) + "]";
          }).join(",") + "},{},[" + stringify(skey) + "])";
          var URL2 = window.URL || window.webkitURL || window.mozURL || window.msURL;
          var blob = new Blob([src], {type: "text/javascript"});
          if (options && options.bare) {
            return blob;
          }
          var workerUrl = URL2.createObjectURL(blob);
          var worker = new Worker(workerUrl);
          worker.objectURL = workerUrl;
          return worker;
        };
      }, {}], "/index.js": [function(_dereq_, module3, exports3) {
        "use strict";
        function _slicedToArray(arr, i) {
          return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
        }
        function _nonIterableRest() {
          throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
        }
        function _unsupportedIterableToArray(o, minLen) {
          if (!o)
            return;
          if (typeof o === "string")
            return _arrayLikeToArray(o, minLen);
          var n = Object.prototype.toString.call(o).slice(8, -1);
          if (n === "Object" && o.constructor)
            n = o.constructor.name;
          if (n === "Map" || n === "Set")
            return Array.from(o);
          if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
            return _arrayLikeToArray(o, minLen);
        }
        function _arrayLikeToArray(arr, len) {
          if (len == null || len > arr.length)
            len = arr.length;
          for (var i = 0, arr2 = new Array(len); i < len; i++) {
            arr2[i] = arr[i];
          }
          return arr2;
        }
        function _iterableToArrayLimit(arr, i) {
          if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr)))
            return;
          var _arr = [];
          var _n = true;
          var _d = false;
          var _e = void 0;
          try {
            for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
              _arr.push(_s.value);
              if (i && _arr.length === i)
                break;
            }
          } catch (err) {
            _d = true;
            _e = err;
          } finally {
            try {
              if (!_n && _i["return"] != null)
                _i["return"]();
            } finally {
              if (_d)
                throw _e;
            }
          }
          return _arr;
        }
        function _arrayWithHoles(arr) {
          if (Array.isArray(arr))
            return arr;
        }
        var assign = _dereq_("object-assign");
        var webworkify = _dereq_("webworkify");
        var MathLib = _dereq_("./lib/mathlib");
        var Pool = _dereq_("./lib/pool");
        var utils = _dereq_("./lib/utils");
        var worker = _dereq_("./lib/worker");
        var createStages = _dereq_("./lib/stepper");
        var createRegions = _dereq_("./lib/tiler");
        var singletones = {};
        var NEED_SAFARI_FIX = false;
        try {
          if (typeof navigator !== "undefined" && navigator.userAgent) {
            NEED_SAFARI_FIX = navigator.userAgent.indexOf("Safari") >= 0;
          }
        } catch (e) {
        }
        var concurrency = 1;
        if (typeof navigator !== "undefined") {
          concurrency = Math.min(navigator.hardwareConcurrency || 1, 4);
        }
        var DEFAULT_PICA_OPTS = {
          tile: 1024,
          concurrency,
          features: ["js", "wasm", "ww"],
          idle: 2e3,
          createCanvas: function createCanvas(width2, height2) {
            var tmpCanvas = document.createElement("canvas");
            tmpCanvas.width = width2;
            tmpCanvas.height = height2;
            return tmpCanvas;
          }
        };
        var DEFAULT_RESIZE_OPTS = {
          quality: 3,
          alpha: false,
          unsharpAmount: 0,
          unsharpRadius: 0,
          unsharpThreshold: 0
        };
        var CAN_NEW_IMAGE_DATA;
        var CAN_CREATE_IMAGE_BITMAP;
        function workerFabric() {
          return {
            value: webworkify(worker),
            destroy: function destroy() {
              this.value.terminate();
              if (typeof window !== "undefined") {
                var url = window.URL || window.webkitURL || window.mozURL || window.msURL;
                if (url && url.revokeObjectURL && this.value.objectURL) {
                  url.revokeObjectURL(this.value.objectURL);
                }
              }
            }
          };
        }
        function Pica2(options) {
          if (!(this instanceof Pica2))
            return new Pica2(options);
          this.options = assign({}, DEFAULT_PICA_OPTS, options || {});
          var limiter_key = "lk_".concat(this.options.concurrency);
          this.__limit = singletones[limiter_key] || utils.limiter(this.options.concurrency);
          if (!singletones[limiter_key])
            singletones[limiter_key] = this.__limit;
          this.features = {
            js: false,
            wasm: false,
            cib: false,
            ww: false
          };
          this.__workersPool = null;
          this.__requested_features = [];
          this.__mathlib = null;
        }
        Pica2.prototype.init = function() {
          var _this = this;
          if (this.__initPromise)
            return this.__initPromise;
          if (CAN_NEW_IMAGE_DATA !== false && CAN_NEW_IMAGE_DATA !== true) {
            CAN_NEW_IMAGE_DATA = false;
            if (typeof ImageData !== "undefined" && typeof Uint8ClampedArray !== "undefined") {
              try {
                new ImageData(new Uint8ClampedArray(400), 10, 10);
                CAN_NEW_IMAGE_DATA = true;
              } catch (__) {
              }
            }
          }
          if (CAN_CREATE_IMAGE_BITMAP !== false && CAN_CREATE_IMAGE_BITMAP !== true) {
            CAN_CREATE_IMAGE_BITMAP = false;
            if (typeof ImageBitmap !== "undefined") {
              if (ImageBitmap.prototype && ImageBitmap.prototype.close) {
                CAN_CREATE_IMAGE_BITMAP = true;
              } else {
                this.debug("ImageBitmap does not support .close(), disabled");
              }
            }
          }
          var features = this.options.features.slice();
          if (features.indexOf("all") >= 0) {
            features = ["cib", "wasm", "js", "ww"];
          }
          this.__requested_features = features;
          this.__mathlib = new MathLib(features);
          if (features.indexOf("ww") >= 0) {
            if (typeof window !== "undefined" && "Worker" in window) {
              try {
                var wkr = _dereq_("webworkify")(function() {
                });
                wkr.terminate();
                this.features.ww = true;
                var wpool_key = "wp_".concat(JSON.stringify(this.options));
                if (singletones[wpool_key]) {
                  this.__workersPool = singletones[wpool_key];
                } else {
                  this.__workersPool = new Pool(workerFabric, this.options.idle);
                  singletones[wpool_key] = this.__workersPool;
                }
              } catch (__) {
              }
            }
          }
          var initMath = this.__mathlib.init().then(function(mathlib) {
            assign(_this.features, mathlib.features);
          });
          var checkCibResize;
          if (!CAN_CREATE_IMAGE_BITMAP) {
            checkCibResize = Promise.resolve(false);
          } else {
            checkCibResize = utils.cib_support(this.options.createCanvas).then(function(status) {
              if (_this.features.cib && features.indexOf("cib") < 0) {
                _this.debug("createImageBitmap() resize supported, but disabled by config");
                return;
              }
              if (features.indexOf("cib") >= 0)
                _this.features.cib = status;
            });
          }
          this.__initPromise = Promise.all([initMath, checkCibResize]).then(function() {
            return _this;
          });
          return this.__initPromise;
        };
        Pica2.prototype.resize = function(from, to, options) {
          var _this2 = this;
          this.debug("Start resize...");
          var opts = assign({}, DEFAULT_RESIZE_OPTS);
          if (!isNaN(options)) {
            opts = assign(opts, {
              quality: options
            });
          } else if (options) {
            opts = assign(opts, options);
          }
          opts.toWidth = to.width;
          opts.toHeight = to.height;
          opts.width = from.naturalWidth || from.width;
          opts.height = from.naturalHeight || from.height;
          if (to.width === 0 || to.height === 0) {
            return Promise.reject(new Error("Invalid output size: ".concat(to.width, "x").concat(to.height)));
          }
          if (opts.unsharpRadius > 2)
            opts.unsharpRadius = 2;
          var canceled = false;
          var cancelToken = null;
          if (opts.cancelToken) {
            cancelToken = opts.cancelToken.then(function(data) {
              canceled = true;
              throw data;
            }, function(err) {
              canceled = true;
              throw err;
            });
          }
          var DEST_TILE_BORDER = 3;
          var destTileBorder = Math.ceil(Math.max(DEST_TILE_BORDER, 2.5 * opts.unsharpRadius | 0));
          return this.init().then(function() {
            if (canceled)
              return cancelToken;
            if (_this2.features.cib) {
              var toCtx = to.getContext("2d", {
                alpha: Boolean(opts.alpha)
              });
              _this2.debug("Resize via createImageBitmap()");
              return createImageBitmap(from, {
                resizeWidth: opts.toWidth,
                resizeHeight: opts.toHeight,
                resizeQuality: utils.cib_quality_name(opts.quality)
              }).then(function(imageBitmap) {
                if (canceled)
                  return cancelToken;
                if (!opts.unsharpAmount) {
                  toCtx.drawImage(imageBitmap, 0, 0);
                  imageBitmap.close();
                  toCtx = null;
                  _this2.debug("Finished!");
                  return to;
                }
                _this2.debug("Unsharp result");
                var tmpCanvas = _this2.options.createCanvas(opts.toWidth, opts.toHeight);
                var tmpCtx = tmpCanvas.getContext("2d", {
                  alpha: Boolean(opts.alpha)
                });
                tmpCtx.drawImage(imageBitmap, 0, 0);
                imageBitmap.close();
                var iData = tmpCtx.getImageData(0, 0, opts.toWidth, opts.toHeight);
                _this2.__mathlib.unsharp_mask(iData.data, opts.toWidth, opts.toHeight, opts.unsharpAmount, opts.unsharpRadius, opts.unsharpThreshold);
                toCtx.putImageData(iData, 0, 0);
                iData = tmpCtx = tmpCanvas = toCtx = null;
                _this2.debug("Finished!");
                return to;
              });
            }
            var cache = {};
            var invokeResize = function invokeResize2(opts2) {
              return Promise.resolve().then(function() {
                if (!_this2.features.ww)
                  return _this2.__mathlib.resizeAndUnsharp(opts2, cache);
                return new Promise(function(resolve, reject) {
                  var w = _this2.__workersPool.acquire();
                  if (cancelToken)
                    cancelToken["catch"](function(err) {
                      return reject(err);
                    });
                  w.value.onmessage = function(ev) {
                    w.release();
                    if (ev.data.err)
                      reject(ev.data.err);
                    else
                      resolve(ev.data.result);
                  };
                  w.value.postMessage({
                    opts: opts2,
                    features: _this2.__requested_features,
                    preload: {
                      wasm_nodule: _this2.__mathlib.__
                    }
                  }, [opts2.src.buffer]);
                });
              });
            };
            var tileAndResize = function tileAndResize2(from2, to2, opts2) {
              var srcCtx;
              var srcImageBitmap;
              var isImageBitmapReused = false;
              var toCtx2;
              var processTile = function processTile2(tile) {
                return _this2.__limit(function() {
                  if (canceled)
                    return cancelToken;
                  var srcImageData;
                  if (utils.isCanvas(from2)) {
                    _this2.debug("Get tile pixel data");
                    srcImageData = srcCtx.getImageData(tile.x, tile.y, tile.width, tile.height);
                  } else {
                    _this2.debug("Draw tile imageBitmap/image to temporary canvas");
                    var tmpCanvas = _this2.options.createCanvas(tile.width, tile.height);
                    var tmpCtx = tmpCanvas.getContext("2d", {
                      alpha: Boolean(opts2.alpha)
                    });
                    tmpCtx.globalCompositeOperation = "copy";
                    tmpCtx.drawImage(srcImageBitmap || from2, tile.x, tile.y, tile.width, tile.height, 0, 0, tile.width, tile.height);
                    _this2.debug("Get tile pixel data");
                    srcImageData = tmpCtx.getImageData(0, 0, tile.width, tile.height);
                    tmpCtx = tmpCanvas = null;
                  }
                  var o = {
                    src: srcImageData.data,
                    width: tile.width,
                    height: tile.height,
                    toWidth: tile.toWidth,
                    toHeight: tile.toHeight,
                    scaleX: tile.scaleX,
                    scaleY: tile.scaleY,
                    offsetX: tile.offsetX,
                    offsetY: tile.offsetY,
                    quality: opts2.quality,
                    alpha: opts2.alpha,
                    unsharpAmount: opts2.unsharpAmount,
                    unsharpRadius: opts2.unsharpRadius,
                    unsharpThreshold: opts2.unsharpThreshold
                  };
                  _this2.debug("Invoke resize math");
                  return Promise.resolve().then(function() {
                    return invokeResize(o);
                  }).then(function(result) {
                    if (canceled)
                      return cancelToken;
                    srcImageData = null;
                    var toImageData;
                    _this2.debug("Convert raw rgba tile result to ImageData");
                    if (CAN_NEW_IMAGE_DATA) {
                      toImageData = new ImageData(new Uint8ClampedArray(result), tile.toWidth, tile.toHeight);
                    } else {
                      toImageData = toCtx2.createImageData(tile.toWidth, tile.toHeight);
                      if (toImageData.data.set) {
                        toImageData.data.set(result);
                      } else {
                        for (var i = toImageData.data.length - 1; i >= 0; i--) {
                          toImageData.data[i] = result[i];
                        }
                      }
                    }
                    _this2.debug("Draw tile");
                    if (NEED_SAFARI_FIX) {
                      toCtx2.putImageData(toImageData, tile.toX, tile.toY, tile.toInnerX - tile.toX, tile.toInnerY - tile.toY, tile.toInnerWidth + 1e-5, tile.toInnerHeight + 1e-5);
                    } else {
                      toCtx2.putImageData(toImageData, tile.toX, tile.toY, tile.toInnerX - tile.toX, tile.toInnerY - tile.toY, tile.toInnerWidth, tile.toInnerHeight);
                    }
                    return null;
                  });
                });
              };
              return Promise.resolve().then(function() {
                toCtx2 = to2.getContext("2d", {
                  alpha: Boolean(opts2.alpha)
                });
                if (utils.isCanvas(from2)) {
                  srcCtx = from2.getContext("2d", {
                    alpha: Boolean(opts2.alpha)
                  });
                  return null;
                }
                if (utils.isImageBitmap(from2)) {
                  srcImageBitmap = from2;
                  isImageBitmapReused = true;
                  return null;
                }
                if (utils.isImage(from2)) {
                  if (!CAN_CREATE_IMAGE_BITMAP)
                    return null;
                  _this2.debug("Decode image via createImageBitmap");
                  return createImageBitmap(from2).then(function(imageBitmap) {
                    srcImageBitmap = imageBitmap;
                  })["catch"](function(e) {
                    return null;
                  });
                }
                throw new Error('Pica: ".from" should be Image, Canvas or ImageBitmap');
              }).then(function() {
                if (canceled)
                  return cancelToken;
                _this2.debug("Calculate tiles");
                var regions = createRegions({
                  width: opts2.width,
                  height: opts2.height,
                  srcTileSize: _this2.options.tile,
                  toWidth: opts2.toWidth,
                  toHeight: opts2.toHeight,
                  destTileBorder
                });
                var jobs = regions.map(function(tile) {
                  return processTile(tile);
                });
                function cleanup() {
                  if (srcImageBitmap) {
                    if (!isImageBitmapReused)
                      srcImageBitmap.close();
                    srcImageBitmap = null;
                  }
                }
                _this2.debug("Process tiles");
                return Promise.all(jobs).then(function() {
                  _this2.debug("Finished!");
                  cleanup();
                  return to2;
                }, function(err) {
                  cleanup();
                  throw err;
                });
              });
            };
            var processStages = function processStages2(stages2, from2, to2, opts2) {
              if (canceled)
                return cancelToken;
              var _stages$shift = stages2.shift(), _stages$shift2 = _slicedToArray(_stages$shift, 2), toWidth = _stages$shift2[0], toHeight = _stages$shift2[1];
              var isLastStage = stages2.length === 0;
              opts2 = assign({}, opts2, {
                toWidth,
                toHeight,
                quality: isLastStage ? opts2.quality : Math.min(1, opts2.quality)
              });
              var tmpCanvas;
              if (!isLastStage) {
                tmpCanvas = _this2.options.createCanvas(toWidth, toHeight);
              }
              return tileAndResize(from2, isLastStage ? to2 : tmpCanvas, opts2).then(function() {
                if (isLastStage)
                  return to2;
                opts2.width = toWidth;
                opts2.height = toHeight;
                return processStages2(stages2, tmpCanvas, to2, opts2);
              });
            };
            var stages = createStages(opts.width, opts.height, opts.toWidth, opts.toHeight, _this2.options.tile, destTileBorder);
            return processStages(stages, from, to, opts);
          });
        };
        Pica2.prototype.resizeBuffer = function(options) {
          var _this3 = this;
          var opts = assign({}, DEFAULT_RESIZE_OPTS, options);
          return this.init().then(function() {
            return _this3.__mathlib.resizeAndUnsharp(opts);
          });
        };
        Pica2.prototype.toBlob = function(canvas, mimeType, quality) {
          mimeType = mimeType || "image/png";
          return new Promise(function(resolve) {
            if (canvas.toBlob) {
              canvas.toBlob(function(blob) {
                return resolve(blob);
              }, mimeType, quality);
              return;
            }
            if (canvas.convertToBlob) {
              resolve(canvas.convertToBlob({
                type: mimeType,
                quality
              }));
              return;
            }
            var asString = atob(canvas.toDataURL(mimeType, quality).split(",")[1]);
            var len = asString.length;
            var asBuffer = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              asBuffer[i] = asString.charCodeAt(i);
            }
            resolve(new Blob([asBuffer], {
              type: mimeType
            }));
          });
        };
        Pica2.prototype.debug = function() {
        };
        module3.exports = Pica2;
      }, {"./lib/mathlib": 1, "./lib/pool": 9, "./lib/stepper": 10, "./lib/tiler": 11, "./lib/utils": 12, "./lib/worker": 13, "object-assign": 24, webworkify: 25}]}, {}, [])("/index.js");
    });
  });

  // src/constants.ts
  var STAGES;
  (function(STAGES2) {
    STAGES2[STAGES2["CHOOSE_FRAMES"] = 0] = "CHOOSE_FRAMES";
    STAGES2[STAGES2["PREVIEW_OUTPUT"] = 1] = "PREVIEW_OUTPUT";
    STAGES2[STAGES2["RESPONSIVE_PREVIEW"] = 2] = "RESPONSIVE_PREVIEW";
    STAGES2[STAGES2["SAVE_OUTPUT"] = 3] = "SAVE_OUTPUT";
  })(STAGES || (STAGES = {}));
  var MSG_EVENTS;
  (function(MSG_EVENTS3) {
    MSG_EVENTS3[MSG_EVENTS3["FOUND_FRAMES"] = 0] = "FOUND_FRAMES";
    MSG_EVENTS3[MSG_EVENTS3["NO_FRAMES"] = 1] = "NO_FRAMES";
    MSG_EVENTS3[MSG_EVENTS3["RENDER"] = 2] = "RENDER";
    MSG_EVENTS3[MSG_EVENTS3["CLOSE"] = 3] = "CLOSE";
    MSG_EVENTS3[MSG_EVENTS3["ERROR"] = 4] = "ERROR";
    MSG_EVENTS3[MSG_EVENTS3["UPDATE_HEADLINES"] = 5] = "UPDATE_HEADLINES";
    MSG_EVENTS3[MSG_EVENTS3["COMPRESS_IMAGE"] = 6] = "COMPRESS_IMAGE";
    MSG_EVENTS3[MSG_EVENTS3["GET_ROOT_FRAMES"] = 7] = "GET_ROOT_FRAMES";
  })(MSG_EVENTS || (MSG_EVENTS = {}));
  var OUTPUT_FORMATS;
  (function(OUTPUT_FORMATS2) {
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["INLINE"] = 0] = "INLINE";
    OUTPUT_FORMATS2[OUTPUT_FORMATS2["IFRAME"] = 1] = "IFRAME";
  })(OUTPUT_FORMATS || (OUTPUT_FORMATS = {}));
  var HEADLINE_NODE_NAMES;
  (function(HEADLINE_NODE_NAMES2) {
    HEADLINE_NODE_NAMES2["HEADLINE"] = "headline";
    HEADLINE_NODE_NAMES2["SUBHEAD"] = "subhead";
    HEADLINE_NODE_NAMES2["SOURCE"] = "source";
  })(HEADLINE_NODE_NAMES || (HEADLINE_NODE_NAMES = {}));

  // src/utils/messages.ts
  class Postman {
    constructor(props) {
      this.TIMEOUT = 3e4;
      this.receive = async (event) => {
        var _a;
        const msgBody = this.inFigmaSandbox ? event : (_a = event == null ? void 0 : event.data) == null ? void 0 : _a.pluginMessage;
        const {data, workload, name, uid, returning, err} = msgBody || {};
        try {
          if (this.name !== name)
            return;
          if (returning && !this.callbackStore[uid]) {
            throw new Error(`Missing callback: ${uid}`);
          }
          if (!returning && !this.workers[workload]) {
            throw new Error(`No workload registered: ${workload}`);
          }
          if (returning) {
            this.callbackStore[uid](data, err);
          } else {
            const workloadResult = await this.workers[workload](data);
            this.postBack({data: workloadResult, uid});
          }
        } catch (err2) {
          this.postBack({uid, err: "Postman failed"});
          console.error("Postman failed", err2);
        }
      };
      this.registerWorker = (eventType, fn) => {
        this.workers[eventType] = fn;
      };
      this.postBack = (props) => this.postMessage({
        name: this.name,
        uid: props.uid,
        data: props.data,
        returning: true,
        err: props.err
      });
      this.postMessage = (messageBody) => this.inFigmaSandbox ? figma.ui.postMessage(messageBody) : parent.postMessage({pluginMessage: messageBody}, "*");
      this.send = (props) => {
        return new Promise((resolve, reject) => {
          const {workload, data} = props;
          const randomId = Math.random().toString(36).substr(5);
          this.postMessage({
            name: this.name,
            uid: randomId,
            workload,
            data
          });
          this.callbackStore[randomId] = (result, err) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          };
          setTimeout(() => reject(new Error("Timed out")), this.TIMEOUT);
        });
      };
      this.name = (props == null ? void 0 : props.messageName) || "POSTMAN";
      this.inFigmaSandbox = typeof figma === "object";
      this.callbackStore = {};
      this.workers = {};
      this.inFigmaSandbox ? figma.ui.on("message", this.receive) : window.addEventListener("message", this.receive);
    }
  }
  const postMan = new Postman();

  // src/helpers/figmaText.ts
  function getNodeText(rootNode, nodeName) {
    const foundNode = rootNode.findChild((node) => node.name === nodeName);
    return foundNode && foundNode.type === "TEXT" ? foundNode.characters : void 0;
  }
  function calculateLetterSpacing(fontFamily, letterSpacing) {
    const {unit: letterUnit, value: letterVal} = letterSpacing;
    let letterSpaceValue = "0";
    console.log(letterUnit, letterSpacing, fontFamily);
    switch (letterUnit) {
      case "PIXELS":
        if (fontFamily === "Telesans Text") {
          letterSpaceValue = `${letterVal - 0.33}px`;
        } else if (fontFamily === "Telesans Agate") {
          letterSpaceValue = `${letterVal - 0.19}px`;
        } else {
          letterSpaceValue = `${letterVal}px`;
        }
        break;
      case "PERCENT":
        letterSpaceValue = `${letterVal / 100}em`;
        if (fontFamily === "Telesans Text") {
          letterSpaceValue = `${letterVal / 100 - 0.022}em`;
        } else if (fontFamily === "Telesans Agate") {
          letterSpaceValue = `${letterVal / 100 - 0.015}em`;
        } else {
          letterSpaceValue = `${letterVal / 100}em`;
        }
        break;
      default:
        if (fontFamily === "Telesans Text") {
          letterSpaceValue = "-0.37px";
        } else if (fontFamily === "Telesans Agate") {
          letterSpaceValue = "-0.19px";
        } else {
          letterSpaceValue = `0`;
        }
        break;
    }
    return letterSpaceValue;
  }
  function getTextNodes(frame) {
    const textNodes = frame.findAll(({type}) => type === "TEXT");
    const {absoluteTransform} = frame;
    const rootX = absoluteTransform[0][2];
    const rootY = absoluteTransform[1][2];
    return textNodes.map((node) => {
      const {
        absoluteTransform: absoluteTransform2,
        width: width2,
        height: height2,
        fontSize: fontSizeData,
        fontName,
        fills,
        characters,
        lineHeight,
        letterSpacing,
        textAlignHorizontal,
        textAlignVertical
      } = node;
      const textX = absoluteTransform2[0][2];
      const textY = absoluteTransform2[1][2];
      const x = textX - rootX;
      const y = textY - rootY;
      let colour = {r: 0, g: 0, b: 0, a: 1};
      function getTextRangeValues(textNode) {
        const {characters: characters2} = node;
        console.log(JSON.stringify(characters2));
        console.log(characters2.length);
        const letterSpacing2 = [];
        let startRange = 0;
        let props = {start: 0, end: 0, value: 0};
        for (let i = 1; i < characters2.length; i++) {
          const sizeValue = textNode.getRangeLetterSpacing(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            letterSpacing2.push(__assign({}, props));
            break;
          }
          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            letterSpacing2.push(__assign({}, props));
            startRange = i;
          } else {
            props = {
              start: startRange,
              end: i,
              value: sizeValue
            };
          }
        }
        console.log("letter spacing", letterSpacing2);
        const lineHeights = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const sizeValue = textNode.getRangeLineHeight(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            lineHeights.push(__assign({}, props));
            break;
          }
          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            lineHeights.push(__assign({}, props));
            startRange = i;
          } else {
            let value = void 0;
            if (sizeValue.unit !== "AUTO") {
              value = sizeValue.unit === "PIXELS" ? `${sizeValue.value}px` : `${sizeValue.value / 100}rem`;
            }
            props = {start: startRange, end: i, value};
          }
        }
        console.log(lineHeights);
        const fontSizes = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const sizeValue = textNode.getRangeFontSize(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            fontSizes.push(__assign({}, props));
            break;
          }
          if (sizeValue === figma.mixed) {
            props.end = i - 1;
            fontSizes.push(__assign({}, props));
            startRange = i;
          } else {
            props = {start: startRange, end: i, value: sizeValue};
          }
        }
        console.log(fontSizes);
        const paints = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const paintValue = textNode.getRangeFills(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            paints.push(__assign({}, props));
            break;
          }
          if (paintValue === figma.mixed) {
            props.end = i - 1;
            paints.push(__assign({}, props));
            startRange = i;
          } else {
            let colour2 = {r: 0, g: 0, b: 0};
            if (paintValue[0].type === "SOLID") {
              colour2 = __assign({}, paintValue[0].color);
            }
            props = {
              start: startRange,
              end: i - 1,
              value: colour2
            };
          }
        }
        console.log(paints);
        const fonts = [];
        startRange = 0;
        props = {start: 0, end: 0, value: 16};
        for (let i = 1; i < characters2.length; i++) {
          const fontValue = textNode.getRangeFontName(startRange, i);
          if (i === characters2.length - 1) {
            props.end = characters2.length;
            fonts.push(__assign({}, props));
            console.log("ENDING FONTS", i, props);
            break;
          }
          if (fontValue === figma.mixed) {
            props.end = i - 1;
            fonts.push(__assign({}, props));
            startRange = i;
          } else {
            props = {start: startRange, end: i, value: fontValue};
          }
        }
        console.log(fonts);
        const ends = [
          ...fonts.map((f) => f.end),
          ...paints.map((f) => f.end),
          ...fontSizes.map((f) => f.end),
          ...letterSpacing2.map((f) => f.end),
          ...lineHeights.map((f) => f.end)
        ].sort((a, b) => a > b ? 1 : -1).filter((n, i, self2) => self2.indexOf(n) === i);
        console.log("ends", ends);
        const styles2 = [];
        let startIndex = 0;
        for (let end of ends) {
          if (startIndex === end) {
            end++;
          }
          console.log(`Start: ${startIndex}, End: ${end}, chars: ${JSON.stringify(characters2.substring(startIndex, end))}`);
          const colour2 = paints.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const font = fonts.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const fontSize = fontSizes.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const letterSpace = letterSpacing2.find((f) => startIndex + 1 >= f.start && end <= f.end);
          const lineHeight2 = lineHeights.find((f) => startIndex + 1 >= f.start && end <= f.end);
          if (!fontSize) {
            console.log("Missing font size", startIndex, end, JSON.stringify(characters2.substring(startIndex, end)));
          }
          if (!font) {
            console.log("missing font", startIndex, end, font, JSON.stringify(characters2.substring(startIndex, end)));
          }
          const style = {
            start: startIndex,
            end,
            chars: characters2.substring(startIndex, end),
            font: font.value,
            colour: colour2.value,
            size: fontSize == null ? void 0 : fontSize.value,
            letterSpace: calculateLetterSpacing(font.value.family, letterSpace == null ? void 0 : letterSpace.value),
            lineHeight: lineHeight2 == null ? void 0 : lineHeight2.value
          };
          styles2.push(style);
          startIndex = end;
        }
        return styles2;
      }
      const styles = getTextRangeValues(node);
      console.log(styles);
      const fontFamily = fontName !== figma.mixed ? fontName.family : "Arial";
      const fontStyle = fontName !== figma.mixed ? fontName.style : "Regular";
      return {
        x,
        y,
        width: width2,
        height: height2,
        fontSize: 12,
        fontFamily,
        fontStyle,
        colour: {r: 0, g: 0, b: 0},
        characters,
        lineHeight: "AUTO",
        letterSpacing: "auto",
        textAlignHorizontal,
        textAlignVertical,
        styles
      };
    });
  }

  // src/helpers.ts
  const upng_js = __toModule(require_UPNG());
  const pica = __toModule(require_pica());
  var IMAGE_FORMATS;
  (function(IMAGE_FORMATS2) {
    IMAGE_FORMATS2[IMAGE_FORMATS2["PNG"] = 0] = "PNG";
    IMAGE_FORMATS2[IMAGE_FORMATS2["JPEG"] = 1] = "JPEG";
    IMAGE_FORMATS2[IMAGE_FORMATS2["GIF"] = 2] = "GIF";
    IMAGE_FORMATS2[IMAGE_FORMATS2["UNKNOWN"] = 3] = "UNKNOWN";
  })(IMAGE_FORMATS || (IMAGE_FORMATS = {}));
  function supportsFills(node) {
    return node.type !== "SLICE" && node.type !== "GROUP";
  }
  async function renderFrames(frameIds) {
    const outputNode = figma.createFrame();
    outputNode.name = "output";
    try {
      const frames = figma.currentPage.children.filter(({id}) => frameIds.includes(id));
      const maxWidth = Math.max(...frames.map((f) => f.width));
      const maxHeight = Math.max(...frames.map((f) => f.height));
      outputNode.resizeWithoutConstraints(maxWidth, maxHeight);
      for (const frame of frames) {
        const clone = frame == null ? void 0 : frame.clone();
        clone.findAll((n) => n.type === "TEXT").forEach((n) => n.remove());
        outputNode.appendChild(clone);
        clone.x = 0;
        clone.y = 0;
        clone.name = frame.id;
      }
      const nodesWithImages = outputNode.findAll((node) => supportsFills(node) && node.fills !== figma.mixed && node.fills.some((fill) => fill.type === "IMAGE"));
      const imageCache = {};
      for (const node of nodesWithImages) {
        if (supportsFills(node) && node.fills !== figma.mixed) {
          const dimensions = {
            width: node.width,
            height: node.height,
            id: node.id
          };
          const imgPaint = [...node.fills].find((p) => p.type === "IMAGE");
          if ((imgPaint == null ? void 0 : imgPaint.type) === "IMAGE" && imgPaint.imageHash) {
            if (imageCache[imgPaint.imageHash]) {
              imageCache[imgPaint.imageHash].push(dimensions);
            } else {
              imageCache[imgPaint.imageHash] = [dimensions];
            }
          }
        }
      }
      for (const imageHash in imageCache) {
        const bytes = await figma.getImageByHash(imageHash).getBytesAsync();
        const compressedImage = await postMan.send({
          workload: MSG_EVENTS.COMPRESS_IMAGE,
          data: {
            imgData: bytes,
            nodeDimensions: imageCache[imageHash]
          }
        });
        const newImageHash = figma.createImage(compressedImage).hash;
        nodesWithImages.forEach((node) => {
          if (supportsFills(node) && node.fills !== figma.mixed) {
            const imgPaint = [...node.fills].find((p) => p.type === "IMAGE" && p.imageHash === imageHash);
            if (imgPaint) {
              const newPaint = JSON.parse(JSON.stringify(imgPaint));
              newPaint.imageHash = newImageHash;
              node.fills = [newPaint];
            }
          }
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      const svg = await outputNode.exportAsync({
        format: "SVG",
        svgSimplifyStroke: true,
        svgOutlineText: false,
        svgIdAttribute: true
      });
      return svg;
    } catch (err) {
      throw new Error(err);
    } finally {
      outputNode.remove();
    }
  }
  function setHeadlinesAndSource(props) {
    const pageNode = figma.currentPage;
    const frames = pageNode.findChildren((node) => node.type === "FRAME");
    const mostLeftPos = Math.min(...frames.map((node) => node.x));
    const mostTopPos = Math.min(...frames.map((node) => node.y));
    for (const name of Object.values(HEADLINE_NODE_NAMES)) {
      let node = pageNode.findChild((node2) => node2.name === name && node2.type === "TEXT") || null;
      const textContent = props[name];
      if (node && !textContent) {
        node.remove();
        return;
      }
      if (!textContent) {
        return;
      }
      if (!node) {
        node = figma.createText();
        node.name = name;
        let y = mostTopPos - 60;
        if (name === HEADLINE_NODE_NAMES.HEADLINE) {
          y -= 60;
        } else if (name === HEADLINE_NODE_NAMES.SUBHEAD) {
          y -= 30;
        }
        node.relativeTransform = [
          [1, 0, mostLeftPos],
          [0, 1, y]
        ];
      }
      node.locked = true;
      const fontName = node.fontName !== figma.mixed ? node.fontName.family : "Roboto";
      const fontStyle = node.fontName !== figma.mixed ? node.fontName.style : "Regular";
      figma.loadFontAsync({family: fontName, style: fontStyle}).then(() => {
        node.characters = props[name] || "";
      }).catch((err) => {
        console.error("Failed to load font", err);
      });
    }
  }
  function getRootFrames() {
    const {currentPage} = figma;
    const rootFrames = currentPage.children.filter((node) => node.type === "FRAME");
    const framesData = rootFrames.map((frame) => {
      const {name, width: width2, height: height2, id} = frame;
      const textNodes = getTextNodes(frame);
      return {
        name,
        width: width2,
        height: height2,
        id,
        textNodes
      };
    });
    return {
      frames: framesData,
      headline: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
      subhead: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE),
      source: getNodeText(currentPage, HEADLINE_NODE_NAMES.HEADLINE)
    };
  }

  // src/index.tsx
  postMan.registerWorker(MSG_EVENTS.GET_ROOT_FRAMES, getRootFrames);
  postMan.registerWorker(MSG_EVENTS.RENDER, renderFrames);
  postMan.registerWorker(MSG_EVENTS.UPDATE_HEADLINES, setHeadlinesAndSource);
  figma.showUI(__html__);
  const {width, height} = figma.viewport.bounds;
  const {zoom} = figma.viewport;
  const initialWindowWidth = Math.round(width * zoom);
  const initialWindowHeight = Math.round(height * zoom);
  figma.ui.resize(initialWindowWidth, initialWindowHeight);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibm9kZV9tb2R1bGVzL3Bha28vbGliL3V0aWxzL2NvbW1vbi5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvemxpYi90cmVlcy5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvemxpYi9hZGxlcjMyLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2NyYzMyLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL21lc3NhZ2VzLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2RlZmxhdGUuanMiLCAibm9kZV9tb2R1bGVzL3Bha28vbGliL3V0aWxzL3N0cmluZ3MuanMiLCAibm9kZV9tb2R1bGVzL3Bha28vbGliL3psaWIvenN0cmVhbS5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvZGVmbGF0ZS5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvemxpYi9pbmZmYXN0LmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2luZnRyZWVzLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2luZmxhdGUuanMiLCAibm9kZV9tb2R1bGVzL3Bha28vbGliL3psaWIvY29uc3RhbnRzLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2d6aGVhZGVyLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi9pbmZsYXRlLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2luZGV4LmpzIiwgIm5vZGVfbW9kdWxlcy91cG5nLWpzL1VQTkcuanMiLCAibm9kZV9tb2R1bGVzL3BpY2EvZGlzdC9waWNhLmpzIiwgInNyYy9jb25zdGFudHMudHMiLCAic3JjL3V0aWxzL21lc3NhZ2VzLnRzIiwgInNyYy9oZWxwZXJzL2ZpZ21hVGV4dC50cyIsICJzcmMvaGVscGVycy50cyIsICJzcmMvaW5kZXgudHN4Il0sCiAgInNvdXJjZXNDb250ZW50IjogWyIndXNlIHN0cmljdCc7XG5cblxudmFyIFRZUEVEX09LID0gICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpICYmXG4gICAgICAgICAgICAgICAgKHR5cGVvZiBVaW50MTZBcnJheSAhPT0gJ3VuZGVmaW5lZCcpICYmXG4gICAgICAgICAgICAgICAgKHR5cGVvZiBJbnQzMkFycmF5ICE9PSAndW5kZWZpbmVkJyk7XG5cbmZ1bmN0aW9uIF9oYXMob2JqLCBrZXkpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG59XG5cbmV4cG9ydHMuYXNzaWduID0gZnVuY3Rpb24gKG9iaiAvKmZyb20xLCBmcm9tMiwgZnJvbTMsIC4uLiovKSB7XG4gIHZhciBzb3VyY2VzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgd2hpbGUgKHNvdXJjZXMubGVuZ3RoKSB7XG4gICAgdmFyIHNvdXJjZSA9IHNvdXJjZXMuc2hpZnQoKTtcbiAgICBpZiAoIXNvdXJjZSkgeyBjb250aW51ZTsgfVxuXG4gICAgaWYgKHR5cGVvZiBzb3VyY2UgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHNvdXJjZSArICdtdXN0IGJlIG5vbi1vYmplY3QnKTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBwIGluIHNvdXJjZSkge1xuICAgICAgaWYgKF9oYXMoc291cmNlLCBwKSkge1xuICAgICAgICBvYmpbcF0gPSBzb3VyY2VbcF07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cblxuLy8gcmVkdWNlIGJ1ZmZlciBzaXplLCBhdm9pZGluZyBtZW0gY29weVxuZXhwb3J0cy5zaHJpbmtCdWYgPSBmdW5jdGlvbiAoYnVmLCBzaXplKSB7XG4gIGlmIChidWYubGVuZ3RoID09PSBzaXplKSB7IHJldHVybiBidWY7IH1cbiAgaWYgKGJ1Zi5zdWJhcnJheSkgeyByZXR1cm4gYnVmLnN1YmFycmF5KDAsIHNpemUpOyB9XG4gIGJ1Zi5sZW5ndGggPSBzaXplO1xuICByZXR1cm4gYnVmO1xufTtcblxuXG52YXIgZm5UeXBlZCA9IHtcbiAgYXJyYXlTZXQ6IGZ1bmN0aW9uIChkZXN0LCBzcmMsIHNyY19vZmZzLCBsZW4sIGRlc3Rfb2Zmcykge1xuICAgIGlmIChzcmMuc3ViYXJyYXkgJiYgZGVzdC5zdWJhcnJheSkge1xuICAgICAgZGVzdC5zZXQoc3JjLnN1YmFycmF5KHNyY19vZmZzLCBzcmNfb2ZmcyArIGxlbiksIGRlc3Rfb2Zmcyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIEZhbGxiYWNrIHRvIG9yZGluYXJ5IGFycmF5XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgZGVzdFtkZXN0X29mZnMgKyBpXSA9IHNyY1tzcmNfb2ZmcyArIGldO1xuICAgIH1cbiAgfSxcbiAgLy8gSm9pbiBhcnJheSBvZiBjaHVua3MgdG8gc2luZ2xlIGFycmF5LlxuICBmbGF0dGVuQ2h1bmtzOiBmdW5jdGlvbiAoY2h1bmtzKSB7XG4gICAgdmFyIGksIGwsIGxlbiwgcG9zLCBjaHVuaywgcmVzdWx0O1xuXG4gICAgLy8gY2FsY3VsYXRlIGRhdGEgbGVuZ3RoXG4gICAgbGVuID0gMDtcbiAgICBmb3IgKGkgPSAwLCBsID0gY2h1bmtzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbGVuICs9IGNodW5rc1tpXS5sZW5ndGg7XG4gICAgfVxuXG4gICAgLy8gam9pbiBjaHVua3NcbiAgICByZXN1bHQgPSBuZXcgVWludDhBcnJheShsZW4pO1xuICAgIHBvcyA9IDA7XG4gICAgZm9yIChpID0gMCwgbCA9IGNodW5rcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGNodW5rID0gY2h1bmtzW2ldO1xuICAgICAgcmVzdWx0LnNldChjaHVuaywgcG9zKTtcbiAgICAgIHBvcyArPSBjaHVuay5sZW5ndGg7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxufTtcblxudmFyIGZuVW50eXBlZCA9IHtcbiAgYXJyYXlTZXQ6IGZ1bmN0aW9uIChkZXN0LCBzcmMsIHNyY19vZmZzLCBsZW4sIGRlc3Rfb2Zmcykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGRlc3RbZGVzdF9vZmZzICsgaV0gPSBzcmNbc3JjX29mZnMgKyBpXTtcbiAgICB9XG4gIH0sXG4gIC8vIEpvaW4gYXJyYXkgb2YgY2h1bmtzIHRvIHNpbmdsZSBhcnJheS5cbiAgZmxhdHRlbkNodW5rczogZnVuY3Rpb24gKGNodW5rcykge1xuICAgIHJldHVybiBbXS5jb25jYXQuYXBwbHkoW10sIGNodW5rcyk7XG4gIH1cbn07XG5cblxuLy8gRW5hYmxlL0Rpc2FibGUgdHlwZWQgYXJyYXlzIHVzZSwgZm9yIHRlc3Rpbmdcbi8vXG5leHBvcnRzLnNldFR5cGVkID0gZnVuY3Rpb24gKG9uKSB7XG4gIGlmIChvbikge1xuICAgIGV4cG9ydHMuQnVmOCAgPSBVaW50OEFycmF5O1xuICAgIGV4cG9ydHMuQnVmMTYgPSBVaW50MTZBcnJheTtcbiAgICBleHBvcnRzLkJ1ZjMyID0gSW50MzJBcnJheTtcbiAgICBleHBvcnRzLmFzc2lnbihleHBvcnRzLCBmblR5cGVkKTtcbiAgfSBlbHNlIHtcbiAgICBleHBvcnRzLkJ1ZjggID0gQXJyYXk7XG4gICAgZXhwb3J0cy5CdWYxNiA9IEFycmF5O1xuICAgIGV4cG9ydHMuQnVmMzIgPSBBcnJheTtcbiAgICBleHBvcnRzLmFzc2lnbihleHBvcnRzLCBmblVudHlwZWQpO1xuICB9XG59O1xuXG5leHBvcnRzLnNldFR5cGVkKFRZUEVEX09LKTtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxuLyogZXNsaW50LWRpc2FibGUgc3BhY2UtdW5hcnktb3BzICovXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL2NvbW1vbicpO1xuXG4vKiBQdWJsaWMgY29uc3RhbnRzID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuXG4vL3ZhciBaX0ZJTFRFUkVEICAgICAgICAgID0gMTtcbi8vdmFyIFpfSFVGRk1BTl9PTkxZICAgICAgPSAyO1xuLy92YXIgWl9STEUgICAgICAgICAgICAgICA9IDM7XG52YXIgWl9GSVhFRCAgICAgICAgICAgICAgID0gNDtcbi8vdmFyIFpfREVGQVVMVF9TVFJBVEVHWSAgPSAwO1xuXG4vKiBQb3NzaWJsZSB2YWx1ZXMgb2YgdGhlIGRhdGFfdHlwZSBmaWVsZCAodGhvdWdoIHNlZSBpbmZsYXRlKCkpICovXG52YXIgWl9CSU5BUlkgICAgICAgICAgICAgID0gMDtcbnZhciBaX1RFWFQgICAgICAgICAgICAgICAgPSAxO1xuLy92YXIgWl9BU0NJSSAgICAgICAgICAgICA9IDE7IC8vID0gWl9URVhUXG52YXIgWl9VTktOT1dOICAgICAgICAgICAgID0gMjtcblxuLyo9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuXG5mdW5jdGlvbiB6ZXJvKGJ1ZikgeyB2YXIgbGVuID0gYnVmLmxlbmd0aDsgd2hpbGUgKC0tbGVuID49IDApIHsgYnVmW2xlbl0gPSAwOyB9IH1cblxuLy8gRnJvbSB6dXRpbC5oXG5cbnZhciBTVE9SRURfQkxPQ0sgPSAwO1xudmFyIFNUQVRJQ19UUkVFUyA9IDE7XG52YXIgRFlOX1RSRUVTICAgID0gMjtcbi8qIFRoZSB0aHJlZSBraW5kcyBvZiBibG9jayB0eXBlICovXG5cbnZhciBNSU5fTUFUQ0ggICAgPSAzO1xudmFyIE1BWF9NQVRDSCAgICA9IDI1ODtcbi8qIFRoZSBtaW5pbXVtIGFuZCBtYXhpbXVtIG1hdGNoIGxlbmd0aHMgKi9cblxuLy8gRnJvbSBkZWZsYXRlLmhcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogSW50ZXJuYWwgY29tcHJlc3Npb24gc3RhdGUuXG4gKi9cblxudmFyIExFTkdUSF9DT0RFUyAgPSAyOTtcbi8qIG51bWJlciBvZiBsZW5ndGggY29kZXMsIG5vdCBjb3VudGluZyB0aGUgc3BlY2lhbCBFTkRfQkxPQ0sgY29kZSAqL1xuXG52YXIgTElURVJBTFMgICAgICA9IDI1Njtcbi8qIG51bWJlciBvZiBsaXRlcmFsIGJ5dGVzIDAuLjI1NSAqL1xuXG52YXIgTF9DT0RFUyAgICAgICA9IExJVEVSQUxTICsgMSArIExFTkdUSF9DT0RFUztcbi8qIG51bWJlciBvZiBMaXRlcmFsIG9yIExlbmd0aCBjb2RlcywgaW5jbHVkaW5nIHRoZSBFTkRfQkxPQ0sgY29kZSAqL1xuXG52YXIgRF9DT0RFUyAgICAgICA9IDMwO1xuLyogbnVtYmVyIG9mIGRpc3RhbmNlIGNvZGVzICovXG5cbnZhciBCTF9DT0RFUyAgICAgID0gMTk7XG4vKiBudW1iZXIgb2YgY29kZXMgdXNlZCB0byB0cmFuc2ZlciB0aGUgYml0IGxlbmd0aHMgKi9cblxudmFyIEhFQVBfU0laRSAgICAgPSAyICogTF9DT0RFUyArIDE7XG4vKiBtYXhpbXVtIGhlYXAgc2l6ZSAqL1xuXG52YXIgTUFYX0JJVFMgICAgICA9IDE1O1xuLyogQWxsIGNvZGVzIG11c3Qgbm90IGV4Y2VlZCBNQVhfQklUUyBiaXRzICovXG5cbnZhciBCdWZfc2l6ZSAgICAgID0gMTY7XG4vKiBzaXplIG9mIGJpdCBidWZmZXIgaW4gYmlfYnVmICovXG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb25zdGFudHNcbiAqL1xuXG52YXIgTUFYX0JMX0JJVFMgPSA3O1xuLyogQml0IGxlbmd0aCBjb2RlcyBtdXN0IG5vdCBleGNlZWQgTUFYX0JMX0JJVFMgYml0cyAqL1xuXG52YXIgRU5EX0JMT0NLICAgPSAyNTY7XG4vKiBlbmQgb2YgYmxvY2sgbGl0ZXJhbCBjb2RlICovXG5cbnZhciBSRVBfM182ICAgICA9IDE2O1xuLyogcmVwZWF0IHByZXZpb3VzIGJpdCBsZW5ndGggMy02IHRpbWVzICgyIGJpdHMgb2YgcmVwZWF0IGNvdW50KSAqL1xuXG52YXIgUkVQWl8zXzEwICAgPSAxNztcbi8qIHJlcGVhdCBhIHplcm8gbGVuZ3RoIDMtMTAgdGltZXMgICgzIGJpdHMgb2YgcmVwZWF0IGNvdW50KSAqL1xuXG52YXIgUkVQWl8xMV8xMzggPSAxODtcbi8qIHJlcGVhdCBhIHplcm8gbGVuZ3RoIDExLTEzOCB0aW1lcyAgKDcgYml0cyBvZiByZXBlYXQgY291bnQpICovXG5cbi8qIGVzbGludC1kaXNhYmxlIGNvbW1hLXNwYWNpbmcsYXJyYXktYnJhY2tldC1zcGFjaW5nICovXG52YXIgZXh0cmFfbGJpdHMgPSAgIC8qIGV4dHJhIGJpdHMgZm9yIGVhY2ggbGVuZ3RoIGNvZGUgKi9cbiAgWzAsMCwwLDAsMCwwLDAsMCwxLDEsMSwxLDIsMiwyLDIsMywzLDMsMyw0LDQsNCw0LDUsNSw1LDUsMF07XG5cbnZhciBleHRyYV9kYml0cyA9ICAgLyogZXh0cmEgYml0cyBmb3IgZWFjaCBkaXN0YW5jZSBjb2RlICovXG4gIFswLDAsMCwwLDEsMSwyLDIsMywzLDQsNCw1LDUsNiw2LDcsNyw4LDgsOSw5LDEwLDEwLDExLDExLDEyLDEyLDEzLDEzXTtcblxudmFyIGV4dHJhX2JsYml0cyA9ICAvKiBleHRyYSBiaXRzIGZvciBlYWNoIGJpdCBsZW5ndGggY29kZSAqL1xuICBbMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwyLDMsN107XG5cbnZhciBibF9vcmRlciA9XG4gIFsxNiwxNywxOCwwLDgsNyw5LDYsMTAsNSwxMSw0LDEyLDMsMTMsMiwxNCwxLDE1XTtcbi8qIGVzbGludC1lbmFibGUgY29tbWEtc3BhY2luZyxhcnJheS1icmFja2V0LXNwYWNpbmcgKi9cblxuLyogVGhlIGxlbmd0aHMgb2YgdGhlIGJpdCBsZW5ndGggY29kZXMgYXJlIHNlbnQgaW4gb3JkZXIgb2YgZGVjcmVhc2luZ1xuICogcHJvYmFiaWxpdHksIHRvIGF2b2lkIHRyYW5zbWl0dGluZyB0aGUgbGVuZ3RocyBmb3IgdW51c2VkIGJpdCBsZW5ndGggY29kZXMuXG4gKi9cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBMb2NhbCBkYXRhLiBUaGVzZSBhcmUgaW5pdGlhbGl6ZWQgb25seSBvbmNlLlxuICovXG5cbi8vIFdlIHByZS1maWxsIGFycmF5cyB3aXRoIDAgdG8gYXZvaWQgdW5pbml0aWFsaXplZCBnYXBzXG5cbnZhciBESVNUX0NPREVfTEVOID0gNTEyOyAvKiBzZWUgZGVmaW5pdGlvbiBvZiBhcnJheSBkaXN0X2NvZGUgYmVsb3cgKi9cblxuLy8gISEhISBVc2UgZmxhdCBhcnJheSBpbnN0ZWFkIG9mIHN0cnVjdHVyZSwgRnJlcSA9IGkqMiwgTGVuID0gaSoyKzFcbnZhciBzdGF0aWNfbHRyZWUgID0gbmV3IEFycmF5KChMX0NPREVTICsgMikgKiAyKTtcbnplcm8oc3RhdGljX2x0cmVlKTtcbi8qIFRoZSBzdGF0aWMgbGl0ZXJhbCB0cmVlLiBTaW5jZSB0aGUgYml0IGxlbmd0aHMgYXJlIGltcG9zZWQsIHRoZXJlIGlzIG5vXG4gKiBuZWVkIGZvciB0aGUgTF9DT0RFUyBleHRyYSBjb2RlcyB1c2VkIGR1cmluZyBoZWFwIGNvbnN0cnVjdGlvbi4gSG93ZXZlclxuICogVGhlIGNvZGVzIDI4NiBhbmQgMjg3IGFyZSBuZWVkZWQgdG8gYnVpbGQgYSBjYW5vbmljYWwgdHJlZSAoc2VlIF90cl9pbml0XG4gKiBiZWxvdykuXG4gKi9cblxudmFyIHN0YXRpY19kdHJlZSAgPSBuZXcgQXJyYXkoRF9DT0RFUyAqIDIpO1xuemVybyhzdGF0aWNfZHRyZWUpO1xuLyogVGhlIHN0YXRpYyBkaXN0YW5jZSB0cmVlLiAoQWN0dWFsbHkgYSB0cml2aWFsIHRyZWUgc2luY2UgYWxsIGNvZGVzIHVzZVxuICogNSBiaXRzLilcbiAqL1xuXG52YXIgX2Rpc3RfY29kZSAgICA9IG5ldyBBcnJheShESVNUX0NPREVfTEVOKTtcbnplcm8oX2Rpc3RfY29kZSk7XG4vKiBEaXN0YW5jZSBjb2Rlcy4gVGhlIGZpcnN0IDI1NiB2YWx1ZXMgY29ycmVzcG9uZCB0byB0aGUgZGlzdGFuY2VzXG4gKiAzIC4uIDI1OCwgdGhlIGxhc3QgMjU2IHZhbHVlcyBjb3JyZXNwb25kIHRvIHRoZSB0b3AgOCBiaXRzIG9mXG4gKiB0aGUgMTUgYml0IGRpc3RhbmNlcy5cbiAqL1xuXG52YXIgX2xlbmd0aF9jb2RlICA9IG5ldyBBcnJheShNQVhfTUFUQ0ggLSBNSU5fTUFUQ0ggKyAxKTtcbnplcm8oX2xlbmd0aF9jb2RlKTtcbi8qIGxlbmd0aCBjb2RlIGZvciBlYWNoIG5vcm1hbGl6ZWQgbWF0Y2ggbGVuZ3RoICgwID09IE1JTl9NQVRDSCkgKi9cblxudmFyIGJhc2VfbGVuZ3RoICAgPSBuZXcgQXJyYXkoTEVOR1RIX0NPREVTKTtcbnplcm8oYmFzZV9sZW5ndGgpO1xuLyogRmlyc3Qgbm9ybWFsaXplZCBsZW5ndGggZm9yIGVhY2ggY29kZSAoMCA9IE1JTl9NQVRDSCkgKi9cblxudmFyIGJhc2VfZGlzdCAgICAgPSBuZXcgQXJyYXkoRF9DT0RFUyk7XG56ZXJvKGJhc2VfZGlzdCk7XG4vKiBGaXJzdCBub3JtYWxpemVkIGRpc3RhbmNlIGZvciBlYWNoIGNvZGUgKDAgPSBkaXN0YW5jZSBvZiAxKSAqL1xuXG5cbmZ1bmN0aW9uIFN0YXRpY1RyZWVEZXNjKHN0YXRpY190cmVlLCBleHRyYV9iaXRzLCBleHRyYV9iYXNlLCBlbGVtcywgbWF4X2xlbmd0aCkge1xuXG4gIHRoaXMuc3RhdGljX3RyZWUgID0gc3RhdGljX3RyZWU7ICAvKiBzdGF0aWMgdHJlZSBvciBOVUxMICovXG4gIHRoaXMuZXh0cmFfYml0cyAgID0gZXh0cmFfYml0czsgICAvKiBleHRyYSBiaXRzIGZvciBlYWNoIGNvZGUgb3IgTlVMTCAqL1xuICB0aGlzLmV4dHJhX2Jhc2UgICA9IGV4dHJhX2Jhc2U7ICAgLyogYmFzZSBpbmRleCBmb3IgZXh0cmFfYml0cyAqL1xuICB0aGlzLmVsZW1zICAgICAgICA9IGVsZW1zOyAgICAgICAgLyogbWF4IG51bWJlciBvZiBlbGVtZW50cyBpbiB0aGUgdHJlZSAqL1xuICB0aGlzLm1heF9sZW5ndGggICA9IG1heF9sZW5ndGg7ICAgLyogbWF4IGJpdCBsZW5ndGggZm9yIHRoZSBjb2RlcyAqL1xuXG4gIC8vIHNob3cgaWYgYHN0YXRpY190cmVlYCBoYXMgZGF0YSBvciBkdW1teSAtIG5lZWRlZCBmb3IgbW9ub21vcnBoaWMgb2JqZWN0c1xuICB0aGlzLmhhc19zdHJlZSAgICA9IHN0YXRpY190cmVlICYmIHN0YXRpY190cmVlLmxlbmd0aDtcbn1cblxuXG52YXIgc3RhdGljX2xfZGVzYztcbnZhciBzdGF0aWNfZF9kZXNjO1xudmFyIHN0YXRpY19ibF9kZXNjO1xuXG5cbmZ1bmN0aW9uIFRyZWVEZXNjKGR5bl90cmVlLCBzdGF0X2Rlc2MpIHtcbiAgdGhpcy5keW5fdHJlZSA9IGR5bl90cmVlOyAgICAgLyogdGhlIGR5bmFtaWMgdHJlZSAqL1xuICB0aGlzLm1heF9jb2RlID0gMDsgICAgICAgICAgICAvKiBsYXJnZXN0IGNvZGUgd2l0aCBub24gemVybyBmcmVxdWVuY3kgKi9cbiAgdGhpcy5zdGF0X2Rlc2MgPSBzdGF0X2Rlc2M7ICAgLyogdGhlIGNvcnJlc3BvbmRpbmcgc3RhdGljIHRyZWUgKi9cbn1cblxuXG5cbmZ1bmN0aW9uIGRfY29kZShkaXN0KSB7XG4gIHJldHVybiBkaXN0IDwgMjU2ID8gX2Rpc3RfY29kZVtkaXN0XSA6IF9kaXN0X2NvZGVbMjU2ICsgKGRpc3QgPj4+IDcpXTtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIE91dHB1dCBhIHNob3J0IExTQiBmaXJzdCBvbiB0aGUgc3RyZWFtLlxuICogSU4gYXNzZXJ0aW9uOiB0aGVyZSBpcyBlbm91Z2ggcm9vbSBpbiBwZW5kaW5nQnVmLlxuICovXG5mdW5jdGlvbiBwdXRfc2hvcnQocywgdykge1xuLy8gICAgcHV0X2J5dGUocywgKHVjaCkoKHcpICYgMHhmZikpO1xuLy8gICAgcHV0X2J5dGUocywgKHVjaCkoKHVzaCkodykgPj4gOCkpO1xuICBzLnBlbmRpbmdfYnVmW3MucGVuZGluZysrXSA9ICh3KSAmIDB4ZmY7XG4gIHMucGVuZGluZ19idWZbcy5wZW5kaW5nKytdID0gKHcgPj4+IDgpICYgMHhmZjtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFNlbmQgYSB2YWx1ZSBvbiBhIGdpdmVuIG51bWJlciBvZiBiaXRzLlxuICogSU4gYXNzZXJ0aW9uOiBsZW5ndGggPD0gMTYgYW5kIHZhbHVlIGZpdHMgaW4gbGVuZ3RoIGJpdHMuXG4gKi9cbmZ1bmN0aW9uIHNlbmRfYml0cyhzLCB2YWx1ZSwgbGVuZ3RoKSB7XG4gIGlmIChzLmJpX3ZhbGlkID4gKEJ1Zl9zaXplIC0gbGVuZ3RoKSkge1xuICAgIHMuYmlfYnVmIHw9ICh2YWx1ZSA8PCBzLmJpX3ZhbGlkKSAmIDB4ZmZmZjtcbiAgICBwdXRfc2hvcnQocywgcy5iaV9idWYpO1xuICAgIHMuYmlfYnVmID0gdmFsdWUgPj4gKEJ1Zl9zaXplIC0gcy5iaV92YWxpZCk7XG4gICAgcy5iaV92YWxpZCArPSBsZW5ndGggLSBCdWZfc2l6ZTtcbiAgfSBlbHNlIHtcbiAgICBzLmJpX2J1ZiB8PSAodmFsdWUgPDwgcy5iaV92YWxpZCkgJiAweGZmZmY7XG4gICAgcy5iaV92YWxpZCArPSBsZW5ndGg7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzZW5kX2NvZGUocywgYywgdHJlZSkge1xuICBzZW5kX2JpdHMocywgdHJlZVtjICogMl0vKi5Db2RlKi8sIHRyZWVbYyAqIDIgKyAxXS8qLkxlbiovKTtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFJldmVyc2UgdGhlIGZpcnN0IGxlbiBiaXRzIG9mIGEgY29kZSwgdXNpbmcgc3RyYWlnaHRmb3J3YXJkIGNvZGUgKGEgZmFzdGVyXG4gKiBtZXRob2Qgd291bGQgdXNlIGEgdGFibGUpXG4gKiBJTiBhc3NlcnRpb246IDEgPD0gbGVuIDw9IDE1XG4gKi9cbmZ1bmN0aW9uIGJpX3JldmVyc2UoY29kZSwgbGVuKSB7XG4gIHZhciByZXMgPSAwO1xuICBkbyB7XG4gICAgcmVzIHw9IGNvZGUgJiAxO1xuICAgIGNvZGUgPj4+PSAxO1xuICAgIHJlcyA8PD0gMTtcbiAgfSB3aGlsZSAoLS1sZW4gPiAwKTtcbiAgcmV0dXJuIHJlcyA+Pj4gMTtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEZsdXNoIHRoZSBiaXQgYnVmZmVyLCBrZWVwaW5nIGF0IG1vc3QgNyBiaXRzIGluIGl0LlxuICovXG5mdW5jdGlvbiBiaV9mbHVzaChzKSB7XG4gIGlmIChzLmJpX3ZhbGlkID09PSAxNikge1xuICAgIHB1dF9zaG9ydChzLCBzLmJpX2J1Zik7XG4gICAgcy5iaV9idWYgPSAwO1xuICAgIHMuYmlfdmFsaWQgPSAwO1xuXG4gIH0gZWxzZSBpZiAocy5iaV92YWxpZCA+PSA4KSB7XG4gICAgcy5wZW5kaW5nX2J1ZltzLnBlbmRpbmcrK10gPSBzLmJpX2J1ZiAmIDB4ZmY7XG4gICAgcy5iaV9idWYgPj49IDg7XG4gICAgcy5iaV92YWxpZCAtPSA4O1xuICB9XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb21wdXRlIHRoZSBvcHRpbWFsIGJpdCBsZW5ndGhzIGZvciBhIHRyZWUgYW5kIHVwZGF0ZSB0aGUgdG90YWwgYml0IGxlbmd0aFxuICogZm9yIHRoZSBjdXJyZW50IGJsb2NrLlxuICogSU4gYXNzZXJ0aW9uOiB0aGUgZmllbGRzIGZyZXEgYW5kIGRhZCBhcmUgc2V0LCBoZWFwW2hlYXBfbWF4XSBhbmRcbiAqICAgIGFib3ZlIGFyZSB0aGUgdHJlZSBub2RlcyBzb3J0ZWQgYnkgaW5jcmVhc2luZyBmcmVxdWVuY3kuXG4gKiBPVVQgYXNzZXJ0aW9uczogdGhlIGZpZWxkIGxlbiBpcyBzZXQgdG8gdGhlIG9wdGltYWwgYml0IGxlbmd0aCwgdGhlXG4gKiAgICAgYXJyYXkgYmxfY291bnQgY29udGFpbnMgdGhlIGZyZXF1ZW5jaWVzIGZvciBlYWNoIGJpdCBsZW5ndGguXG4gKiAgICAgVGhlIGxlbmd0aCBvcHRfbGVuIGlzIHVwZGF0ZWQ7IHN0YXRpY19sZW4gaXMgYWxzbyB1cGRhdGVkIGlmIHN0cmVlIGlzXG4gKiAgICAgbm90IG51bGwuXG4gKi9cbmZ1bmN0aW9uIGdlbl9iaXRsZW4ocywgZGVzYylcbi8vICAgIGRlZmxhdGVfc3RhdGUgKnM7XG4vLyAgICB0cmVlX2Rlc2MgKmRlc2M7ICAgIC8qIHRoZSB0cmVlIGRlc2NyaXB0b3IgKi9cbntcbiAgdmFyIHRyZWUgICAgICAgICAgICA9IGRlc2MuZHluX3RyZWU7XG4gIHZhciBtYXhfY29kZSAgICAgICAgPSBkZXNjLm1heF9jb2RlO1xuICB2YXIgc3RyZWUgICAgICAgICAgID0gZGVzYy5zdGF0X2Rlc2Muc3RhdGljX3RyZWU7XG4gIHZhciBoYXNfc3RyZWUgICAgICAgPSBkZXNjLnN0YXRfZGVzYy5oYXNfc3RyZWU7XG4gIHZhciBleHRyYSAgICAgICAgICAgPSBkZXNjLnN0YXRfZGVzYy5leHRyYV9iaXRzO1xuICB2YXIgYmFzZSAgICAgICAgICAgID0gZGVzYy5zdGF0X2Rlc2MuZXh0cmFfYmFzZTtcbiAgdmFyIG1heF9sZW5ndGggICAgICA9IGRlc2Muc3RhdF9kZXNjLm1heF9sZW5ndGg7XG4gIHZhciBoOyAgICAgICAgICAgICAgLyogaGVhcCBpbmRleCAqL1xuICB2YXIgbiwgbTsgICAgICAgICAgIC8qIGl0ZXJhdGUgb3ZlciB0aGUgdHJlZSBlbGVtZW50cyAqL1xuICB2YXIgYml0czsgICAgICAgICAgIC8qIGJpdCBsZW5ndGggKi9cbiAgdmFyIHhiaXRzOyAgICAgICAgICAvKiBleHRyYSBiaXRzICovXG4gIHZhciBmOyAgICAgICAgICAgICAgLyogZnJlcXVlbmN5ICovXG4gIHZhciBvdmVyZmxvdyA9IDA7ICAgLyogbnVtYmVyIG9mIGVsZW1lbnRzIHdpdGggYml0IGxlbmd0aCB0b28gbGFyZ2UgKi9cblxuICBmb3IgKGJpdHMgPSAwOyBiaXRzIDw9IE1BWF9CSVRTOyBiaXRzKyspIHtcbiAgICBzLmJsX2NvdW50W2JpdHNdID0gMDtcbiAgfVxuXG4gIC8qIEluIGEgZmlyc3QgcGFzcywgY29tcHV0ZSB0aGUgb3B0aW1hbCBiaXQgbGVuZ3RocyAod2hpY2ggbWF5XG4gICAqIG92ZXJmbG93IGluIHRoZSBjYXNlIG9mIHRoZSBiaXQgbGVuZ3RoIHRyZWUpLlxuICAgKi9cbiAgdHJlZVtzLmhlYXBbcy5oZWFwX21heF0gKiAyICsgMV0vKi5MZW4qLyA9IDA7IC8qIHJvb3Qgb2YgdGhlIGhlYXAgKi9cblxuICBmb3IgKGggPSBzLmhlYXBfbWF4ICsgMTsgaCA8IEhFQVBfU0laRTsgaCsrKSB7XG4gICAgbiA9IHMuaGVhcFtoXTtcbiAgICBiaXRzID0gdHJlZVt0cmVlW24gKiAyICsgMV0vKi5EYWQqLyAqIDIgKyAxXS8qLkxlbiovICsgMTtcbiAgICBpZiAoYml0cyA+IG1heF9sZW5ndGgpIHtcbiAgICAgIGJpdHMgPSBtYXhfbGVuZ3RoO1xuICAgICAgb3ZlcmZsb3crKztcbiAgICB9XG4gICAgdHJlZVtuICogMiArIDFdLyouTGVuKi8gPSBiaXRzO1xuICAgIC8qIFdlIG92ZXJ3cml0ZSB0cmVlW25dLkRhZCB3aGljaCBpcyBubyBsb25nZXIgbmVlZGVkICovXG5cbiAgICBpZiAobiA+IG1heF9jb2RlKSB7IGNvbnRpbnVlOyB9IC8qIG5vdCBhIGxlYWYgbm9kZSAqL1xuXG4gICAgcy5ibF9jb3VudFtiaXRzXSsrO1xuICAgIHhiaXRzID0gMDtcbiAgICBpZiAobiA+PSBiYXNlKSB7XG4gICAgICB4Yml0cyA9IGV4dHJhW24gLSBiYXNlXTtcbiAgICB9XG4gICAgZiA9IHRyZWVbbiAqIDJdLyouRnJlcSovO1xuICAgIHMub3B0X2xlbiArPSBmICogKGJpdHMgKyB4Yml0cyk7XG4gICAgaWYgKGhhc19zdHJlZSkge1xuICAgICAgcy5zdGF0aWNfbGVuICs9IGYgKiAoc3RyZWVbbiAqIDIgKyAxXS8qLkxlbiovICsgeGJpdHMpO1xuICAgIH1cbiAgfVxuICBpZiAob3ZlcmZsb3cgPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgLy8gVHJhY2UoKHN0ZGVycixcIlxcbmJpdCBsZW5ndGggb3ZlcmZsb3dcXG5cIikpO1xuICAvKiBUaGlzIGhhcHBlbnMgZm9yIGV4YW1wbGUgb24gb2JqMiBhbmQgcGljIG9mIHRoZSBDYWxnYXJ5IGNvcnB1cyAqL1xuXG4gIC8qIEZpbmQgdGhlIGZpcnN0IGJpdCBsZW5ndGggd2hpY2ggY291bGQgaW5jcmVhc2U6ICovXG4gIGRvIHtcbiAgICBiaXRzID0gbWF4X2xlbmd0aCAtIDE7XG4gICAgd2hpbGUgKHMuYmxfY291bnRbYml0c10gPT09IDApIHsgYml0cy0tOyB9XG4gICAgcy5ibF9jb3VudFtiaXRzXS0tOyAgICAgIC8qIG1vdmUgb25lIGxlYWYgZG93biB0aGUgdHJlZSAqL1xuICAgIHMuYmxfY291bnRbYml0cyArIDFdICs9IDI7IC8qIG1vdmUgb25lIG92ZXJmbG93IGl0ZW0gYXMgaXRzIGJyb3RoZXIgKi9cbiAgICBzLmJsX2NvdW50W21heF9sZW5ndGhdLS07XG4gICAgLyogVGhlIGJyb3RoZXIgb2YgdGhlIG92ZXJmbG93IGl0ZW0gYWxzbyBtb3ZlcyBvbmUgc3RlcCB1cCxcbiAgICAgKiBidXQgdGhpcyBkb2VzIG5vdCBhZmZlY3QgYmxfY291bnRbbWF4X2xlbmd0aF1cbiAgICAgKi9cbiAgICBvdmVyZmxvdyAtPSAyO1xuICB9IHdoaWxlIChvdmVyZmxvdyA+IDApO1xuXG4gIC8qIE5vdyByZWNvbXB1dGUgYWxsIGJpdCBsZW5ndGhzLCBzY2FubmluZyBpbiBpbmNyZWFzaW5nIGZyZXF1ZW5jeS5cbiAgICogaCBpcyBzdGlsbCBlcXVhbCB0byBIRUFQX1NJWkUuIChJdCBpcyBzaW1wbGVyIHRvIHJlY29uc3RydWN0IGFsbFxuICAgKiBsZW5ndGhzIGluc3RlYWQgb2YgZml4aW5nIG9ubHkgdGhlIHdyb25nIG9uZXMuIFRoaXMgaWRlYSBpcyB0YWtlblxuICAgKiBmcm9tICdhcicgd3JpdHRlbiBieSBIYXJ1aGlrbyBPa3VtdXJhLilcbiAgICovXG4gIGZvciAoYml0cyA9IG1heF9sZW5ndGg7IGJpdHMgIT09IDA7IGJpdHMtLSkge1xuICAgIG4gPSBzLmJsX2NvdW50W2JpdHNdO1xuICAgIHdoaWxlIChuICE9PSAwKSB7XG4gICAgICBtID0gcy5oZWFwWy0taF07XG4gICAgICBpZiAobSA+IG1heF9jb2RlKSB7IGNvbnRpbnVlOyB9XG4gICAgICBpZiAodHJlZVttICogMiArIDFdLyouTGVuKi8gIT09IGJpdHMpIHtcbiAgICAgICAgLy8gVHJhY2UoKHN0ZGVycixcImNvZGUgJWQgYml0cyAlZC0+JWRcXG5cIiwgbSwgdHJlZVttXS5MZW4sIGJpdHMpKTtcbiAgICAgICAgcy5vcHRfbGVuICs9IChiaXRzIC0gdHJlZVttICogMiArIDFdLyouTGVuKi8pICogdHJlZVttICogMl0vKi5GcmVxKi87XG4gICAgICAgIHRyZWVbbSAqIDIgKyAxXS8qLkxlbiovID0gYml0cztcbiAgICAgIH1cbiAgICAgIG4tLTtcbiAgICB9XG4gIH1cbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEdlbmVyYXRlIHRoZSBjb2RlcyBmb3IgYSBnaXZlbiB0cmVlIGFuZCBiaXQgY291bnRzICh3aGljaCBuZWVkIG5vdCBiZVxuICogb3B0aW1hbCkuXG4gKiBJTiBhc3NlcnRpb246IHRoZSBhcnJheSBibF9jb3VudCBjb250YWlucyB0aGUgYml0IGxlbmd0aCBzdGF0aXN0aWNzIGZvclxuICogdGhlIGdpdmVuIHRyZWUgYW5kIHRoZSBmaWVsZCBsZW4gaXMgc2V0IGZvciBhbGwgdHJlZSBlbGVtZW50cy5cbiAqIE9VVCBhc3NlcnRpb246IHRoZSBmaWVsZCBjb2RlIGlzIHNldCBmb3IgYWxsIHRyZWUgZWxlbWVudHMgb2Ygbm9uXG4gKiAgICAgemVybyBjb2RlIGxlbmd0aC5cbiAqL1xuZnVuY3Rpb24gZ2VuX2NvZGVzKHRyZWUsIG1heF9jb2RlLCBibF9jb3VudClcbi8vICAgIGN0X2RhdGEgKnRyZWU7ICAgICAgICAgICAgIC8qIHRoZSB0cmVlIHRvIGRlY29yYXRlICovXG4vLyAgICBpbnQgbWF4X2NvZGU7ICAgICAgICAgICAgICAvKiBsYXJnZXN0IGNvZGUgd2l0aCBub24gemVybyBmcmVxdWVuY3kgKi9cbi8vICAgIHVzaGYgKmJsX2NvdW50OyAgICAgICAgICAgIC8qIG51bWJlciBvZiBjb2RlcyBhdCBlYWNoIGJpdCBsZW5ndGggKi9cbntcbiAgdmFyIG5leHRfY29kZSA9IG5ldyBBcnJheShNQVhfQklUUyArIDEpOyAvKiBuZXh0IGNvZGUgdmFsdWUgZm9yIGVhY2ggYml0IGxlbmd0aCAqL1xuICB2YXIgY29kZSA9IDA7ICAgICAgICAgICAgICAvKiBydW5uaW5nIGNvZGUgdmFsdWUgKi9cbiAgdmFyIGJpdHM7ICAgICAgICAgICAgICAgICAgLyogYml0IGluZGV4ICovXG4gIHZhciBuOyAgICAgICAgICAgICAgICAgICAgIC8qIGNvZGUgaW5kZXggKi9cblxuICAvKiBUaGUgZGlzdHJpYnV0aW9uIGNvdW50cyBhcmUgZmlyc3QgdXNlZCB0byBnZW5lcmF0ZSB0aGUgY29kZSB2YWx1ZXNcbiAgICogd2l0aG91dCBiaXQgcmV2ZXJzYWwuXG4gICAqL1xuICBmb3IgKGJpdHMgPSAxOyBiaXRzIDw9IE1BWF9CSVRTOyBiaXRzKyspIHtcbiAgICBuZXh0X2NvZGVbYml0c10gPSBjb2RlID0gKGNvZGUgKyBibF9jb3VudFtiaXRzIC0gMV0pIDw8IDE7XG4gIH1cbiAgLyogQ2hlY2sgdGhhdCB0aGUgYml0IGNvdW50cyBpbiBibF9jb3VudCBhcmUgY29uc2lzdGVudC4gVGhlIGxhc3QgY29kZVxuICAgKiBtdXN0IGJlIGFsbCBvbmVzLlxuICAgKi9cbiAgLy9Bc3NlcnQgKGNvZGUgKyBibF9jb3VudFtNQVhfQklUU10tMSA9PSAoMTw8TUFYX0JJVFMpLTEsXG4gIC8vICAgICAgICBcImluY29uc2lzdGVudCBiaXQgY291bnRzXCIpO1xuICAvL1RyYWNldigoc3RkZXJyLFwiXFxuZ2VuX2NvZGVzOiBtYXhfY29kZSAlZCBcIiwgbWF4X2NvZGUpKTtcblxuICBmb3IgKG4gPSAwOyAgbiA8PSBtYXhfY29kZTsgbisrKSB7XG4gICAgdmFyIGxlbiA9IHRyZWVbbiAqIDIgKyAxXS8qLkxlbiovO1xuICAgIGlmIChsZW4gPT09IDApIHsgY29udGludWU7IH1cbiAgICAvKiBOb3cgcmV2ZXJzZSB0aGUgYml0cyAqL1xuICAgIHRyZWVbbiAqIDJdLyouQ29kZSovID0gYmlfcmV2ZXJzZShuZXh0X2NvZGVbbGVuXSsrLCBsZW4pO1xuXG4gICAgLy9UcmFjZWN2KHRyZWUgIT0gc3RhdGljX2x0cmVlLCAoc3RkZXJyLFwiXFxubiAlM2QgJWMgbCAlMmQgYyAlNHggKCV4KSBcIixcbiAgICAvLyAgICAgbiwgKGlzZ3JhcGgobikgPyBuIDogJyAnKSwgbGVuLCB0cmVlW25dLkNvZGUsIG5leHRfY29kZVtsZW5dLTEpKTtcbiAgfVxufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogSW5pdGlhbGl6ZSB0aGUgdmFyaW91cyAnY29uc3RhbnQnIHRhYmxlcy5cbiAqL1xuZnVuY3Rpb24gdHJfc3RhdGljX2luaXQoKSB7XG4gIHZhciBuOyAgICAgICAgLyogaXRlcmF0ZXMgb3ZlciB0cmVlIGVsZW1lbnRzICovXG4gIHZhciBiaXRzOyAgICAgLyogYml0IGNvdW50ZXIgKi9cbiAgdmFyIGxlbmd0aDsgICAvKiBsZW5ndGggdmFsdWUgKi9cbiAgdmFyIGNvZGU7ICAgICAvKiBjb2RlIHZhbHVlICovXG4gIHZhciBkaXN0OyAgICAgLyogZGlzdGFuY2UgaW5kZXggKi9cbiAgdmFyIGJsX2NvdW50ID0gbmV3IEFycmF5KE1BWF9CSVRTICsgMSk7XG4gIC8qIG51bWJlciBvZiBjb2RlcyBhdCBlYWNoIGJpdCBsZW5ndGggZm9yIGFuIG9wdGltYWwgdHJlZSAqL1xuXG4gIC8vIGRvIGNoZWNrIGluIF90cl9pbml0KClcbiAgLy9pZiAoc3RhdGljX2luaXRfZG9uZSkgcmV0dXJuO1xuXG4gIC8qIEZvciBzb21lIGVtYmVkZGVkIHRhcmdldHMsIGdsb2JhbCB2YXJpYWJsZXMgYXJlIG5vdCBpbml0aWFsaXplZDogKi9cbi8qI2lmZGVmIE5PX0lOSVRfR0xPQkFMX1BPSU5URVJTXG4gIHN0YXRpY19sX2Rlc2Muc3RhdGljX3RyZWUgPSBzdGF0aWNfbHRyZWU7XG4gIHN0YXRpY19sX2Rlc2MuZXh0cmFfYml0cyA9IGV4dHJhX2xiaXRzO1xuICBzdGF0aWNfZF9kZXNjLnN0YXRpY190cmVlID0gc3RhdGljX2R0cmVlO1xuICBzdGF0aWNfZF9kZXNjLmV4dHJhX2JpdHMgPSBleHRyYV9kYml0cztcbiAgc3RhdGljX2JsX2Rlc2MuZXh0cmFfYml0cyA9IGV4dHJhX2JsYml0cztcbiNlbmRpZiovXG5cbiAgLyogSW5pdGlhbGl6ZSB0aGUgbWFwcGluZyBsZW5ndGggKDAuLjI1NSkgLT4gbGVuZ3RoIGNvZGUgKDAuLjI4KSAqL1xuICBsZW5ndGggPSAwO1xuICBmb3IgKGNvZGUgPSAwOyBjb2RlIDwgTEVOR1RIX0NPREVTIC0gMTsgY29kZSsrKSB7XG4gICAgYmFzZV9sZW5ndGhbY29kZV0gPSBsZW5ndGg7XG4gICAgZm9yIChuID0gMDsgbiA8ICgxIDw8IGV4dHJhX2xiaXRzW2NvZGVdKTsgbisrKSB7XG4gICAgICBfbGVuZ3RoX2NvZGVbbGVuZ3RoKytdID0gY29kZTtcbiAgICB9XG4gIH1cbiAgLy9Bc3NlcnQgKGxlbmd0aCA9PSAyNTYsIFwidHJfc3RhdGljX2luaXQ6IGxlbmd0aCAhPSAyNTZcIik7XG4gIC8qIE5vdGUgdGhhdCB0aGUgbGVuZ3RoIDI1NSAobWF0Y2ggbGVuZ3RoIDI1OCkgY2FuIGJlIHJlcHJlc2VudGVkXG4gICAqIGluIHR3byBkaWZmZXJlbnQgd2F5czogY29kZSAyODQgKyA1IGJpdHMgb3IgY29kZSAyODUsIHNvIHdlXG4gICAqIG92ZXJ3cml0ZSBsZW5ndGhfY29kZVsyNTVdIHRvIHVzZSB0aGUgYmVzdCBlbmNvZGluZzpcbiAgICovXG4gIF9sZW5ndGhfY29kZVtsZW5ndGggLSAxXSA9IGNvZGU7XG5cbiAgLyogSW5pdGlhbGl6ZSB0aGUgbWFwcGluZyBkaXN0ICgwLi4zMkspIC0+IGRpc3QgY29kZSAoMC4uMjkpICovXG4gIGRpc3QgPSAwO1xuICBmb3IgKGNvZGUgPSAwOyBjb2RlIDwgMTY7IGNvZGUrKykge1xuICAgIGJhc2VfZGlzdFtjb2RlXSA9IGRpc3Q7XG4gICAgZm9yIChuID0gMDsgbiA8ICgxIDw8IGV4dHJhX2RiaXRzW2NvZGVdKTsgbisrKSB7XG4gICAgICBfZGlzdF9jb2RlW2Rpc3QrK10gPSBjb2RlO1xuICAgIH1cbiAgfVxuICAvL0Fzc2VydCAoZGlzdCA9PSAyNTYsIFwidHJfc3RhdGljX2luaXQ6IGRpc3QgIT0gMjU2XCIpO1xuICBkaXN0ID4+PSA3OyAvKiBmcm9tIG5vdyBvbiwgYWxsIGRpc3RhbmNlcyBhcmUgZGl2aWRlZCBieSAxMjggKi9cbiAgZm9yICg7IGNvZGUgPCBEX0NPREVTOyBjb2RlKyspIHtcbiAgICBiYXNlX2Rpc3RbY29kZV0gPSBkaXN0IDw8IDc7XG4gICAgZm9yIChuID0gMDsgbiA8ICgxIDw8IChleHRyYV9kYml0c1tjb2RlXSAtIDcpKTsgbisrKSB7XG4gICAgICBfZGlzdF9jb2RlWzI1NiArIGRpc3QrK10gPSBjb2RlO1xuICAgIH1cbiAgfVxuICAvL0Fzc2VydCAoZGlzdCA9PSAyNTYsIFwidHJfc3RhdGljX2luaXQ6IDI1NitkaXN0ICE9IDUxMlwiKTtcblxuICAvKiBDb25zdHJ1Y3QgdGhlIGNvZGVzIG9mIHRoZSBzdGF0aWMgbGl0ZXJhbCB0cmVlICovXG4gIGZvciAoYml0cyA9IDA7IGJpdHMgPD0gTUFYX0JJVFM7IGJpdHMrKykge1xuICAgIGJsX2NvdW50W2JpdHNdID0gMDtcbiAgfVxuXG4gIG4gPSAwO1xuICB3aGlsZSAobiA8PSAxNDMpIHtcbiAgICBzdGF0aWNfbHRyZWVbbiAqIDIgKyAxXS8qLkxlbiovID0gODtcbiAgICBuKys7XG4gICAgYmxfY291bnRbOF0rKztcbiAgfVxuICB3aGlsZSAobiA8PSAyNTUpIHtcbiAgICBzdGF0aWNfbHRyZWVbbiAqIDIgKyAxXS8qLkxlbiovID0gOTtcbiAgICBuKys7XG4gICAgYmxfY291bnRbOV0rKztcbiAgfVxuICB3aGlsZSAobiA8PSAyNzkpIHtcbiAgICBzdGF0aWNfbHRyZWVbbiAqIDIgKyAxXS8qLkxlbiovID0gNztcbiAgICBuKys7XG4gICAgYmxfY291bnRbN10rKztcbiAgfVxuICB3aGlsZSAobiA8PSAyODcpIHtcbiAgICBzdGF0aWNfbHRyZWVbbiAqIDIgKyAxXS8qLkxlbiovID0gODtcbiAgICBuKys7XG4gICAgYmxfY291bnRbOF0rKztcbiAgfVxuICAvKiBDb2RlcyAyODYgYW5kIDI4NyBkbyBub3QgZXhpc3QsIGJ1dCB3ZSBtdXN0IGluY2x1ZGUgdGhlbSBpbiB0aGVcbiAgICogdHJlZSBjb25zdHJ1Y3Rpb24gdG8gZ2V0IGEgY2Fub25pY2FsIEh1ZmZtYW4gdHJlZSAobG9uZ2VzdCBjb2RlXG4gICAqIGFsbCBvbmVzKVxuICAgKi9cbiAgZ2VuX2NvZGVzKHN0YXRpY19sdHJlZSwgTF9DT0RFUyArIDEsIGJsX2NvdW50KTtcblxuICAvKiBUaGUgc3RhdGljIGRpc3RhbmNlIHRyZWUgaXMgdHJpdmlhbDogKi9cbiAgZm9yIChuID0gMDsgbiA8IERfQ09ERVM7IG4rKykge1xuICAgIHN0YXRpY19kdHJlZVtuICogMiArIDFdLyouTGVuKi8gPSA1O1xuICAgIHN0YXRpY19kdHJlZVtuICogMl0vKi5Db2RlKi8gPSBiaV9yZXZlcnNlKG4sIDUpO1xuICB9XG5cbiAgLy8gTm93IGRhdGEgcmVhZHkgYW5kIHdlIGNhbiBpbml0IHN0YXRpYyB0cmVlc1xuICBzdGF0aWNfbF9kZXNjID0gbmV3IFN0YXRpY1RyZWVEZXNjKHN0YXRpY19sdHJlZSwgZXh0cmFfbGJpdHMsIExJVEVSQUxTICsgMSwgTF9DT0RFUywgTUFYX0JJVFMpO1xuICBzdGF0aWNfZF9kZXNjID0gbmV3IFN0YXRpY1RyZWVEZXNjKHN0YXRpY19kdHJlZSwgZXh0cmFfZGJpdHMsIDAsICAgICAgICAgIERfQ09ERVMsIE1BWF9CSVRTKTtcbiAgc3RhdGljX2JsX2Rlc2MgPSBuZXcgU3RhdGljVHJlZURlc2MobmV3IEFycmF5KDApLCBleHRyYV9ibGJpdHMsIDAsICAgICAgICAgQkxfQ09ERVMsIE1BWF9CTF9CSVRTKTtcblxuICAvL3N0YXRpY19pbml0X2RvbmUgPSB0cnVlO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogSW5pdGlhbGl6ZSBhIG5ldyBibG9jay5cbiAqL1xuZnVuY3Rpb24gaW5pdF9ibG9jayhzKSB7XG4gIHZhciBuOyAvKiBpdGVyYXRlcyBvdmVyIHRyZWUgZWxlbWVudHMgKi9cblxuICAvKiBJbml0aWFsaXplIHRoZSB0cmVlcy4gKi9cbiAgZm9yIChuID0gMDsgbiA8IExfQ09ERVM7ICBuKyspIHsgcy5keW5fbHRyZWVbbiAqIDJdLyouRnJlcSovID0gMDsgfVxuICBmb3IgKG4gPSAwOyBuIDwgRF9DT0RFUzsgIG4rKykgeyBzLmR5bl9kdHJlZVtuICogMl0vKi5GcmVxKi8gPSAwOyB9XG4gIGZvciAobiA9IDA7IG4gPCBCTF9DT0RFUzsgbisrKSB7IHMuYmxfdHJlZVtuICogMl0vKi5GcmVxKi8gPSAwOyB9XG5cbiAgcy5keW5fbHRyZWVbRU5EX0JMT0NLICogMl0vKi5GcmVxKi8gPSAxO1xuICBzLm9wdF9sZW4gPSBzLnN0YXRpY19sZW4gPSAwO1xuICBzLmxhc3RfbGl0ID0gcy5tYXRjaGVzID0gMDtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEZsdXNoIHRoZSBiaXQgYnVmZmVyIGFuZCBhbGlnbiB0aGUgb3V0cHV0IG9uIGEgYnl0ZSBib3VuZGFyeVxuICovXG5mdW5jdGlvbiBiaV93aW5kdXAocylcbntcbiAgaWYgKHMuYmlfdmFsaWQgPiA4KSB7XG4gICAgcHV0X3Nob3J0KHMsIHMuYmlfYnVmKTtcbiAgfSBlbHNlIGlmIChzLmJpX3ZhbGlkID4gMCkge1xuICAgIC8vcHV0X2J5dGUocywgKEJ5dGUpcy0+YmlfYnVmKTtcbiAgICBzLnBlbmRpbmdfYnVmW3MucGVuZGluZysrXSA9IHMuYmlfYnVmO1xuICB9XG4gIHMuYmlfYnVmID0gMDtcbiAgcy5iaV92YWxpZCA9IDA7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ29weSBhIHN0b3JlZCBibG9jaywgc3RvcmluZyBmaXJzdCB0aGUgbGVuZ3RoIGFuZCBpdHNcbiAqIG9uZSdzIGNvbXBsZW1lbnQgaWYgcmVxdWVzdGVkLlxuICovXG5mdW5jdGlvbiBjb3B5X2Jsb2NrKHMsIGJ1ZiwgbGVuLCBoZWFkZXIpXG4vL0RlZmxhdGVTdGF0ZSAqcztcbi8vY2hhcmYgICAgKmJ1ZjsgICAgLyogdGhlIGlucHV0IGRhdGEgKi9cbi8vdW5zaWduZWQgbGVuOyAgICAgLyogaXRzIGxlbmd0aCAqL1xuLy9pbnQgICAgICBoZWFkZXI7ICAvKiB0cnVlIGlmIGJsb2NrIGhlYWRlciBtdXN0IGJlIHdyaXR0ZW4gKi9cbntcbiAgYmlfd2luZHVwKHMpOyAgICAgICAgLyogYWxpZ24gb24gYnl0ZSBib3VuZGFyeSAqL1xuXG4gIGlmIChoZWFkZXIpIHtcbiAgICBwdXRfc2hvcnQocywgbGVuKTtcbiAgICBwdXRfc2hvcnQocywgfmxlbik7XG4gIH1cbi8vICB3aGlsZSAobGVuLS0pIHtcbi8vICAgIHB1dF9ieXRlKHMsICpidWYrKyk7XG4vLyAgfVxuICB1dGlscy5hcnJheVNldChzLnBlbmRpbmdfYnVmLCBzLndpbmRvdywgYnVmLCBsZW4sIHMucGVuZGluZyk7XG4gIHMucGVuZGluZyArPSBsZW47XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ29tcGFyZXMgdG8gc3VidHJlZXMsIHVzaW5nIHRoZSB0cmVlIGRlcHRoIGFzIHRpZSBicmVha2VyIHdoZW5cbiAqIHRoZSBzdWJ0cmVlcyBoYXZlIGVxdWFsIGZyZXF1ZW5jeS4gVGhpcyBtaW5pbWl6ZXMgdGhlIHdvcnN0IGNhc2UgbGVuZ3RoLlxuICovXG5mdW5jdGlvbiBzbWFsbGVyKHRyZWUsIG4sIG0sIGRlcHRoKSB7XG4gIHZhciBfbjIgPSBuICogMjtcbiAgdmFyIF9tMiA9IG0gKiAyO1xuICByZXR1cm4gKHRyZWVbX24yXS8qLkZyZXEqLyA8IHRyZWVbX20yXS8qLkZyZXEqLyB8fFxuICAgICAgICAgKHRyZWVbX24yXS8qLkZyZXEqLyA9PT0gdHJlZVtfbTJdLyouRnJlcSovICYmIGRlcHRoW25dIDw9IGRlcHRoW21dKSk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogUmVzdG9yZSB0aGUgaGVhcCBwcm9wZXJ0eSBieSBtb3ZpbmcgZG93biB0aGUgdHJlZSBzdGFydGluZyBhdCBub2RlIGssXG4gKiBleGNoYW5naW5nIGEgbm9kZSB3aXRoIHRoZSBzbWFsbGVzdCBvZiBpdHMgdHdvIHNvbnMgaWYgbmVjZXNzYXJ5LCBzdG9wcGluZ1xuICogd2hlbiB0aGUgaGVhcCBwcm9wZXJ0eSBpcyByZS1lc3RhYmxpc2hlZCAoZWFjaCBmYXRoZXIgc21hbGxlciB0aGFuIGl0c1xuICogdHdvIHNvbnMpLlxuICovXG5mdW5jdGlvbiBwcWRvd25oZWFwKHMsIHRyZWUsIGspXG4vLyAgICBkZWZsYXRlX3N0YXRlICpzO1xuLy8gICAgY3RfZGF0YSAqdHJlZTsgIC8qIHRoZSB0cmVlIHRvIHJlc3RvcmUgKi9cbi8vICAgIGludCBrOyAgICAgICAgICAgICAgIC8qIG5vZGUgdG8gbW92ZSBkb3duICovXG57XG4gIHZhciB2ID0gcy5oZWFwW2tdO1xuICB2YXIgaiA9IGsgPDwgMTsgIC8qIGxlZnQgc29uIG9mIGsgKi9cbiAgd2hpbGUgKGogPD0gcy5oZWFwX2xlbikge1xuICAgIC8qIFNldCBqIHRvIHRoZSBzbWFsbGVzdCBvZiB0aGUgdHdvIHNvbnM6ICovXG4gICAgaWYgKGogPCBzLmhlYXBfbGVuICYmXG4gICAgICBzbWFsbGVyKHRyZWUsIHMuaGVhcFtqICsgMV0sIHMuaGVhcFtqXSwgcy5kZXB0aCkpIHtcbiAgICAgIGorKztcbiAgICB9XG4gICAgLyogRXhpdCBpZiB2IGlzIHNtYWxsZXIgdGhhbiBib3RoIHNvbnMgKi9cbiAgICBpZiAoc21hbGxlcih0cmVlLCB2LCBzLmhlYXBbal0sIHMuZGVwdGgpKSB7IGJyZWFrOyB9XG5cbiAgICAvKiBFeGNoYW5nZSB2IHdpdGggdGhlIHNtYWxsZXN0IHNvbiAqL1xuICAgIHMuaGVhcFtrXSA9IHMuaGVhcFtqXTtcbiAgICBrID0gajtcblxuICAgIC8qIEFuZCBjb250aW51ZSBkb3duIHRoZSB0cmVlLCBzZXR0aW5nIGogdG8gdGhlIGxlZnQgc29uIG9mIGsgKi9cbiAgICBqIDw8PSAxO1xuICB9XG4gIHMuaGVhcFtrXSA9IHY7XG59XG5cblxuLy8gaW5saW5lZCBtYW51YWxseVxuLy8gdmFyIFNNQUxMRVNUID0gMTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBTZW5kIHRoZSBibG9jayBkYXRhIGNvbXByZXNzZWQgdXNpbmcgdGhlIGdpdmVuIEh1ZmZtYW4gdHJlZXNcbiAqL1xuZnVuY3Rpb24gY29tcHJlc3NfYmxvY2socywgbHRyZWUsIGR0cmVlKVxuLy8gICAgZGVmbGF0ZV9zdGF0ZSAqcztcbi8vICAgIGNvbnN0IGN0X2RhdGEgKmx0cmVlOyAvKiBsaXRlcmFsIHRyZWUgKi9cbi8vICAgIGNvbnN0IGN0X2RhdGEgKmR0cmVlOyAvKiBkaXN0YW5jZSB0cmVlICovXG57XG4gIHZhciBkaXN0OyAgICAgICAgICAgLyogZGlzdGFuY2Ugb2YgbWF0Y2hlZCBzdHJpbmcgKi9cbiAgdmFyIGxjOyAgICAgICAgICAgICAvKiBtYXRjaCBsZW5ndGggb3IgdW5tYXRjaGVkIGNoYXIgKGlmIGRpc3QgPT0gMCkgKi9cbiAgdmFyIGx4ID0gMDsgICAgICAgICAvKiBydW5uaW5nIGluZGV4IGluIGxfYnVmICovXG4gIHZhciBjb2RlOyAgICAgICAgICAgLyogdGhlIGNvZGUgdG8gc2VuZCAqL1xuICB2YXIgZXh0cmE7ICAgICAgICAgIC8qIG51bWJlciBvZiBleHRyYSBiaXRzIHRvIHNlbmQgKi9cblxuICBpZiAocy5sYXN0X2xpdCAhPT0gMCkge1xuICAgIGRvIHtcbiAgICAgIGRpc3QgPSAocy5wZW5kaW5nX2J1ZltzLmRfYnVmICsgbHggKiAyXSA8PCA4KSB8IChzLnBlbmRpbmdfYnVmW3MuZF9idWYgKyBseCAqIDIgKyAxXSk7XG4gICAgICBsYyA9IHMucGVuZGluZ19idWZbcy5sX2J1ZiArIGx4XTtcbiAgICAgIGx4Kys7XG5cbiAgICAgIGlmIChkaXN0ID09PSAwKSB7XG4gICAgICAgIHNlbmRfY29kZShzLCBsYywgbHRyZWUpOyAvKiBzZW5kIGEgbGl0ZXJhbCBieXRlICovXG4gICAgICAgIC8vVHJhY2Vjdihpc2dyYXBoKGxjKSwgKHN0ZGVycixcIiAnJWMnIFwiLCBsYykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLyogSGVyZSwgbGMgaXMgdGhlIG1hdGNoIGxlbmd0aCAtIE1JTl9NQVRDSCAqL1xuICAgICAgICBjb2RlID0gX2xlbmd0aF9jb2RlW2xjXTtcbiAgICAgICAgc2VuZF9jb2RlKHMsIGNvZGUgKyBMSVRFUkFMUyArIDEsIGx0cmVlKTsgLyogc2VuZCB0aGUgbGVuZ3RoIGNvZGUgKi9cbiAgICAgICAgZXh0cmEgPSBleHRyYV9sYml0c1tjb2RlXTtcbiAgICAgICAgaWYgKGV4dHJhICE9PSAwKSB7XG4gICAgICAgICAgbGMgLT0gYmFzZV9sZW5ndGhbY29kZV07XG4gICAgICAgICAgc2VuZF9iaXRzKHMsIGxjLCBleHRyYSk7ICAgICAgIC8qIHNlbmQgdGhlIGV4dHJhIGxlbmd0aCBiaXRzICovXG4gICAgICAgIH1cbiAgICAgICAgZGlzdC0tOyAvKiBkaXN0IGlzIG5vdyB0aGUgbWF0Y2ggZGlzdGFuY2UgLSAxICovXG4gICAgICAgIGNvZGUgPSBkX2NvZGUoZGlzdCk7XG4gICAgICAgIC8vQXNzZXJ0IChjb2RlIDwgRF9DT0RFUywgXCJiYWQgZF9jb2RlXCIpO1xuXG4gICAgICAgIHNlbmRfY29kZShzLCBjb2RlLCBkdHJlZSk7ICAgICAgIC8qIHNlbmQgdGhlIGRpc3RhbmNlIGNvZGUgKi9cbiAgICAgICAgZXh0cmEgPSBleHRyYV9kYml0c1tjb2RlXTtcbiAgICAgICAgaWYgKGV4dHJhICE9PSAwKSB7XG4gICAgICAgICAgZGlzdCAtPSBiYXNlX2Rpc3RbY29kZV07XG4gICAgICAgICAgc2VuZF9iaXRzKHMsIGRpc3QsIGV4dHJhKTsgICAvKiBzZW5kIHRoZSBleHRyYSBkaXN0YW5jZSBiaXRzICovXG4gICAgICAgIH1cbiAgICAgIH0gLyogbGl0ZXJhbCBvciBtYXRjaCBwYWlyID8gKi9cblxuICAgICAgLyogQ2hlY2sgdGhhdCB0aGUgb3ZlcmxheSBiZXR3ZWVuIHBlbmRpbmdfYnVmIGFuZCBkX2J1ZitsX2J1ZiBpcyBvazogKi9cbiAgICAgIC8vQXNzZXJ0KCh1SW50KShzLT5wZW5kaW5nKSA8IHMtPmxpdF9idWZzaXplICsgMipseCxcbiAgICAgIC8vICAgICAgIFwicGVuZGluZ0J1ZiBvdmVyZmxvd1wiKTtcblxuICAgIH0gd2hpbGUgKGx4IDwgcy5sYXN0X2xpdCk7XG4gIH1cblxuICBzZW5kX2NvZGUocywgRU5EX0JMT0NLLCBsdHJlZSk7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb25zdHJ1Y3Qgb25lIEh1ZmZtYW4gdHJlZSBhbmQgYXNzaWducyB0aGUgY29kZSBiaXQgc3RyaW5ncyBhbmQgbGVuZ3Rocy5cbiAqIFVwZGF0ZSB0aGUgdG90YWwgYml0IGxlbmd0aCBmb3IgdGhlIGN1cnJlbnQgYmxvY2suXG4gKiBJTiBhc3NlcnRpb246IHRoZSBmaWVsZCBmcmVxIGlzIHNldCBmb3IgYWxsIHRyZWUgZWxlbWVudHMuXG4gKiBPVVQgYXNzZXJ0aW9uczogdGhlIGZpZWxkcyBsZW4gYW5kIGNvZGUgYXJlIHNldCB0byB0aGUgb3B0aW1hbCBiaXQgbGVuZ3RoXG4gKiAgICAgYW5kIGNvcnJlc3BvbmRpbmcgY29kZS4gVGhlIGxlbmd0aCBvcHRfbGVuIGlzIHVwZGF0ZWQ7IHN0YXRpY19sZW4gaXNcbiAqICAgICBhbHNvIHVwZGF0ZWQgaWYgc3RyZWUgaXMgbm90IG51bGwuIFRoZSBmaWVsZCBtYXhfY29kZSBpcyBzZXQuXG4gKi9cbmZ1bmN0aW9uIGJ1aWxkX3RyZWUocywgZGVzYylcbi8vICAgIGRlZmxhdGVfc3RhdGUgKnM7XG4vLyAgICB0cmVlX2Rlc2MgKmRlc2M7IC8qIHRoZSB0cmVlIGRlc2NyaXB0b3IgKi9cbntcbiAgdmFyIHRyZWUgICAgID0gZGVzYy5keW5fdHJlZTtcbiAgdmFyIHN0cmVlICAgID0gZGVzYy5zdGF0X2Rlc2Muc3RhdGljX3RyZWU7XG4gIHZhciBoYXNfc3RyZWUgPSBkZXNjLnN0YXRfZGVzYy5oYXNfc3RyZWU7XG4gIHZhciBlbGVtcyAgICA9IGRlc2Muc3RhdF9kZXNjLmVsZW1zO1xuICB2YXIgbiwgbTsgICAgICAgICAgLyogaXRlcmF0ZSBvdmVyIGhlYXAgZWxlbWVudHMgKi9cbiAgdmFyIG1heF9jb2RlID0gLTE7IC8qIGxhcmdlc3QgY29kZSB3aXRoIG5vbiB6ZXJvIGZyZXF1ZW5jeSAqL1xuICB2YXIgbm9kZTsgICAgICAgICAgLyogbmV3IG5vZGUgYmVpbmcgY3JlYXRlZCAqL1xuXG4gIC8qIENvbnN0cnVjdCB0aGUgaW5pdGlhbCBoZWFwLCB3aXRoIGxlYXN0IGZyZXF1ZW50IGVsZW1lbnQgaW5cbiAgICogaGVhcFtTTUFMTEVTVF0uIFRoZSBzb25zIG9mIGhlYXBbbl0gYXJlIGhlYXBbMipuXSBhbmQgaGVhcFsyKm4rMV0uXG4gICAqIGhlYXBbMF0gaXMgbm90IHVzZWQuXG4gICAqL1xuICBzLmhlYXBfbGVuID0gMDtcbiAgcy5oZWFwX21heCA9IEhFQVBfU0laRTtcblxuICBmb3IgKG4gPSAwOyBuIDwgZWxlbXM7IG4rKykge1xuICAgIGlmICh0cmVlW24gKiAyXS8qLkZyZXEqLyAhPT0gMCkge1xuICAgICAgcy5oZWFwWysrcy5oZWFwX2xlbl0gPSBtYXhfY29kZSA9IG47XG4gICAgICBzLmRlcHRoW25dID0gMDtcblxuICAgIH0gZWxzZSB7XG4gICAgICB0cmVlW24gKiAyICsgMV0vKi5MZW4qLyA9IDA7XG4gICAgfVxuICB9XG5cbiAgLyogVGhlIHBremlwIGZvcm1hdCByZXF1aXJlcyB0aGF0IGF0IGxlYXN0IG9uZSBkaXN0YW5jZSBjb2RlIGV4aXN0cyxcbiAgICogYW5kIHRoYXQgYXQgbGVhc3Qgb25lIGJpdCBzaG91bGQgYmUgc2VudCBldmVuIGlmIHRoZXJlIGlzIG9ubHkgb25lXG4gICAqIHBvc3NpYmxlIGNvZGUuIFNvIHRvIGF2b2lkIHNwZWNpYWwgY2hlY2tzIGxhdGVyIG9uIHdlIGZvcmNlIGF0IGxlYXN0XG4gICAqIHR3byBjb2RlcyBvZiBub24gemVybyBmcmVxdWVuY3kuXG4gICAqL1xuICB3aGlsZSAocy5oZWFwX2xlbiA8IDIpIHtcbiAgICBub2RlID0gcy5oZWFwWysrcy5oZWFwX2xlbl0gPSAobWF4X2NvZGUgPCAyID8gKyttYXhfY29kZSA6IDApO1xuICAgIHRyZWVbbm9kZSAqIDJdLyouRnJlcSovID0gMTtcbiAgICBzLmRlcHRoW25vZGVdID0gMDtcbiAgICBzLm9wdF9sZW4tLTtcblxuICAgIGlmIChoYXNfc3RyZWUpIHtcbiAgICAgIHMuc3RhdGljX2xlbiAtPSBzdHJlZVtub2RlICogMiArIDFdLyouTGVuKi87XG4gICAgfVxuICAgIC8qIG5vZGUgaXMgMCBvciAxIHNvIGl0IGRvZXMgbm90IGhhdmUgZXh0cmEgYml0cyAqL1xuICB9XG4gIGRlc2MubWF4X2NvZGUgPSBtYXhfY29kZTtcblxuICAvKiBUaGUgZWxlbWVudHMgaGVhcFtoZWFwX2xlbi8yKzEgLi4gaGVhcF9sZW5dIGFyZSBsZWF2ZXMgb2YgdGhlIHRyZWUsXG4gICAqIGVzdGFibGlzaCBzdWItaGVhcHMgb2YgaW5jcmVhc2luZyBsZW5ndGhzOlxuICAgKi9cbiAgZm9yIChuID0gKHMuaGVhcF9sZW4gPj4gMS8qaW50IC8yKi8pOyBuID49IDE7IG4tLSkgeyBwcWRvd25oZWFwKHMsIHRyZWUsIG4pOyB9XG5cbiAgLyogQ29uc3RydWN0IHRoZSBIdWZmbWFuIHRyZWUgYnkgcmVwZWF0ZWRseSBjb21iaW5pbmcgdGhlIGxlYXN0IHR3b1xuICAgKiBmcmVxdWVudCBub2Rlcy5cbiAgICovXG4gIG5vZGUgPSBlbGVtczsgICAgICAgICAgICAgIC8qIG5leHQgaW50ZXJuYWwgbm9kZSBvZiB0aGUgdHJlZSAqL1xuICBkbyB7XG4gICAgLy9wcXJlbW92ZShzLCB0cmVlLCBuKTsgIC8qIG4gPSBub2RlIG9mIGxlYXN0IGZyZXF1ZW5jeSAqL1xuICAgIC8qKiogcHFyZW1vdmUgKioqL1xuICAgIG4gPSBzLmhlYXBbMS8qU01BTExFU1QqL107XG4gICAgcy5oZWFwWzEvKlNNQUxMRVNUKi9dID0gcy5oZWFwW3MuaGVhcF9sZW4tLV07XG4gICAgcHFkb3duaGVhcChzLCB0cmVlLCAxLypTTUFMTEVTVCovKTtcbiAgICAvKioqL1xuXG4gICAgbSA9IHMuaGVhcFsxLypTTUFMTEVTVCovXTsgLyogbSA9IG5vZGUgb2YgbmV4dCBsZWFzdCBmcmVxdWVuY3kgKi9cblxuICAgIHMuaGVhcFstLXMuaGVhcF9tYXhdID0gbjsgLyoga2VlcCB0aGUgbm9kZXMgc29ydGVkIGJ5IGZyZXF1ZW5jeSAqL1xuICAgIHMuaGVhcFstLXMuaGVhcF9tYXhdID0gbTtcblxuICAgIC8qIENyZWF0ZSBhIG5ldyBub2RlIGZhdGhlciBvZiBuIGFuZCBtICovXG4gICAgdHJlZVtub2RlICogMl0vKi5GcmVxKi8gPSB0cmVlW24gKiAyXS8qLkZyZXEqLyArIHRyZWVbbSAqIDJdLyouRnJlcSovO1xuICAgIHMuZGVwdGhbbm9kZV0gPSAocy5kZXB0aFtuXSA+PSBzLmRlcHRoW21dID8gcy5kZXB0aFtuXSA6IHMuZGVwdGhbbV0pICsgMTtcbiAgICB0cmVlW24gKiAyICsgMV0vKi5EYWQqLyA9IHRyZWVbbSAqIDIgKyAxXS8qLkRhZCovID0gbm9kZTtcblxuICAgIC8qIGFuZCBpbnNlcnQgdGhlIG5ldyBub2RlIGluIHRoZSBoZWFwICovXG4gICAgcy5oZWFwWzEvKlNNQUxMRVNUKi9dID0gbm9kZSsrO1xuICAgIHBxZG93bmhlYXAocywgdHJlZSwgMS8qU01BTExFU1QqLyk7XG5cbiAgfSB3aGlsZSAocy5oZWFwX2xlbiA+PSAyKTtcblxuICBzLmhlYXBbLS1zLmhlYXBfbWF4XSA9IHMuaGVhcFsxLypTTUFMTEVTVCovXTtcblxuICAvKiBBdCB0aGlzIHBvaW50LCB0aGUgZmllbGRzIGZyZXEgYW5kIGRhZCBhcmUgc2V0LiBXZSBjYW4gbm93XG4gICAqIGdlbmVyYXRlIHRoZSBiaXQgbGVuZ3Rocy5cbiAgICovXG4gIGdlbl9iaXRsZW4ocywgZGVzYyk7XG5cbiAgLyogVGhlIGZpZWxkIGxlbiBpcyBub3cgc2V0LCB3ZSBjYW4gZ2VuZXJhdGUgdGhlIGJpdCBjb2RlcyAqL1xuICBnZW5fY29kZXModHJlZSwgbWF4X2NvZGUsIHMuYmxfY291bnQpO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogU2NhbiBhIGxpdGVyYWwgb3IgZGlzdGFuY2UgdHJlZSB0byBkZXRlcm1pbmUgdGhlIGZyZXF1ZW5jaWVzIG9mIHRoZSBjb2Rlc1xuICogaW4gdGhlIGJpdCBsZW5ndGggdHJlZS5cbiAqL1xuZnVuY3Rpb24gc2Nhbl90cmVlKHMsIHRyZWUsIG1heF9jb2RlKVxuLy8gICAgZGVmbGF0ZV9zdGF0ZSAqcztcbi8vICAgIGN0X2RhdGEgKnRyZWU7ICAgLyogdGhlIHRyZWUgdG8gYmUgc2Nhbm5lZCAqL1xuLy8gICAgaW50IG1heF9jb2RlOyAgICAvKiBhbmQgaXRzIGxhcmdlc3QgY29kZSBvZiBub24gemVybyBmcmVxdWVuY3kgKi9cbntcbiAgdmFyIG47ICAgICAgICAgICAgICAgICAgICAgLyogaXRlcmF0ZXMgb3ZlciBhbGwgdHJlZSBlbGVtZW50cyAqL1xuICB2YXIgcHJldmxlbiA9IC0xOyAgICAgICAgICAvKiBsYXN0IGVtaXR0ZWQgbGVuZ3RoICovXG4gIHZhciBjdXJsZW47ICAgICAgICAgICAgICAgIC8qIGxlbmd0aCBvZiBjdXJyZW50IGNvZGUgKi9cblxuICB2YXIgbmV4dGxlbiA9IHRyZWVbMCAqIDIgKyAxXS8qLkxlbiovOyAvKiBsZW5ndGggb2YgbmV4dCBjb2RlICovXG5cbiAgdmFyIGNvdW50ID0gMDsgICAgICAgICAgICAgLyogcmVwZWF0IGNvdW50IG9mIHRoZSBjdXJyZW50IGNvZGUgKi9cbiAgdmFyIG1heF9jb3VudCA9IDc7ICAgICAgICAgLyogbWF4IHJlcGVhdCBjb3VudCAqL1xuICB2YXIgbWluX2NvdW50ID0gNDsgICAgICAgICAvKiBtaW4gcmVwZWF0IGNvdW50ICovXG5cbiAgaWYgKG5leHRsZW4gPT09IDApIHtcbiAgICBtYXhfY291bnQgPSAxMzg7XG4gICAgbWluX2NvdW50ID0gMztcbiAgfVxuICB0cmVlWyhtYXhfY29kZSArIDEpICogMiArIDFdLyouTGVuKi8gPSAweGZmZmY7IC8qIGd1YXJkICovXG5cbiAgZm9yIChuID0gMDsgbiA8PSBtYXhfY29kZTsgbisrKSB7XG4gICAgY3VybGVuID0gbmV4dGxlbjtcbiAgICBuZXh0bGVuID0gdHJlZVsobiArIDEpICogMiArIDFdLyouTGVuKi87XG5cbiAgICBpZiAoKytjb3VudCA8IG1heF9jb3VudCAmJiBjdXJsZW4gPT09IG5leHRsZW4pIHtcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgfSBlbHNlIGlmIChjb3VudCA8IG1pbl9jb3VudCkge1xuICAgICAgcy5ibF90cmVlW2N1cmxlbiAqIDJdLyouRnJlcSovICs9IGNvdW50O1xuXG4gICAgfSBlbHNlIGlmIChjdXJsZW4gIT09IDApIHtcblxuICAgICAgaWYgKGN1cmxlbiAhPT0gcHJldmxlbikgeyBzLmJsX3RyZWVbY3VybGVuICogMl0vKi5GcmVxKi8rKzsgfVxuICAgICAgcy5ibF90cmVlW1JFUF8zXzYgKiAyXS8qLkZyZXEqLysrO1xuXG4gICAgfSBlbHNlIGlmIChjb3VudCA8PSAxMCkge1xuICAgICAgcy5ibF90cmVlW1JFUFpfM18xMCAqIDJdLyouRnJlcSovKys7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgcy5ibF90cmVlW1JFUFpfMTFfMTM4ICogMl0vKi5GcmVxKi8rKztcbiAgICB9XG5cbiAgICBjb3VudCA9IDA7XG4gICAgcHJldmxlbiA9IGN1cmxlbjtcblxuICAgIGlmIChuZXh0bGVuID09PSAwKSB7XG4gICAgICBtYXhfY291bnQgPSAxMzg7XG4gICAgICBtaW5fY291bnQgPSAzO1xuXG4gICAgfSBlbHNlIGlmIChjdXJsZW4gPT09IG5leHRsZW4pIHtcbiAgICAgIG1heF9jb3VudCA9IDY7XG4gICAgICBtaW5fY291bnQgPSAzO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIG1heF9jb3VudCA9IDc7XG4gICAgICBtaW5fY291bnQgPSA0O1xuICAgIH1cbiAgfVxufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogU2VuZCBhIGxpdGVyYWwgb3IgZGlzdGFuY2UgdHJlZSBpbiBjb21wcmVzc2VkIGZvcm0sIHVzaW5nIHRoZSBjb2RlcyBpblxuICogYmxfdHJlZS5cbiAqL1xuZnVuY3Rpb24gc2VuZF90cmVlKHMsIHRyZWUsIG1heF9jb2RlKVxuLy8gICAgZGVmbGF0ZV9zdGF0ZSAqcztcbi8vICAgIGN0X2RhdGEgKnRyZWU7IC8qIHRoZSB0cmVlIHRvIGJlIHNjYW5uZWQgKi9cbi8vICAgIGludCBtYXhfY29kZTsgICAgICAgLyogYW5kIGl0cyBsYXJnZXN0IGNvZGUgb2Ygbm9uIHplcm8gZnJlcXVlbmN5ICovXG57XG4gIHZhciBuOyAgICAgICAgICAgICAgICAgICAgIC8qIGl0ZXJhdGVzIG92ZXIgYWxsIHRyZWUgZWxlbWVudHMgKi9cbiAgdmFyIHByZXZsZW4gPSAtMTsgICAgICAgICAgLyogbGFzdCBlbWl0dGVkIGxlbmd0aCAqL1xuICB2YXIgY3VybGVuOyAgICAgICAgICAgICAgICAvKiBsZW5ndGggb2YgY3VycmVudCBjb2RlICovXG5cbiAgdmFyIG5leHRsZW4gPSB0cmVlWzAgKiAyICsgMV0vKi5MZW4qLzsgLyogbGVuZ3RoIG9mIG5leHQgY29kZSAqL1xuXG4gIHZhciBjb3VudCA9IDA7ICAgICAgICAgICAgIC8qIHJlcGVhdCBjb3VudCBvZiB0aGUgY3VycmVudCBjb2RlICovXG4gIHZhciBtYXhfY291bnQgPSA3OyAgICAgICAgIC8qIG1heCByZXBlYXQgY291bnQgKi9cbiAgdmFyIG1pbl9jb3VudCA9IDQ7ICAgICAgICAgLyogbWluIHJlcGVhdCBjb3VudCAqL1xuXG4gIC8qIHRyZWVbbWF4X2NvZGUrMV0uTGVuID0gLTE7ICovICAvKiBndWFyZCBhbHJlYWR5IHNldCAqL1xuICBpZiAobmV4dGxlbiA9PT0gMCkge1xuICAgIG1heF9jb3VudCA9IDEzODtcbiAgICBtaW5fY291bnQgPSAzO1xuICB9XG5cbiAgZm9yIChuID0gMDsgbiA8PSBtYXhfY29kZTsgbisrKSB7XG4gICAgY3VybGVuID0gbmV4dGxlbjtcbiAgICBuZXh0bGVuID0gdHJlZVsobiArIDEpICogMiArIDFdLyouTGVuKi87XG5cbiAgICBpZiAoKytjb3VudCA8IG1heF9jb3VudCAmJiBjdXJsZW4gPT09IG5leHRsZW4pIHtcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgfSBlbHNlIGlmIChjb3VudCA8IG1pbl9jb3VudCkge1xuICAgICAgZG8geyBzZW5kX2NvZGUocywgY3VybGVuLCBzLmJsX3RyZWUpOyB9IHdoaWxlICgtLWNvdW50ICE9PSAwKTtcblxuICAgIH0gZWxzZSBpZiAoY3VybGVuICE9PSAwKSB7XG4gICAgICBpZiAoY3VybGVuICE9PSBwcmV2bGVuKSB7XG4gICAgICAgIHNlbmRfY29kZShzLCBjdXJsZW4sIHMuYmxfdHJlZSk7XG4gICAgICAgIGNvdW50LS07XG4gICAgICB9XG4gICAgICAvL0Fzc2VydChjb3VudCA+PSAzICYmIGNvdW50IDw9IDYsIFwiIDNfNj9cIik7XG4gICAgICBzZW5kX2NvZGUocywgUkVQXzNfNiwgcy5ibF90cmVlKTtcbiAgICAgIHNlbmRfYml0cyhzLCBjb3VudCAtIDMsIDIpO1xuXG4gICAgfSBlbHNlIGlmIChjb3VudCA8PSAxMCkge1xuICAgICAgc2VuZF9jb2RlKHMsIFJFUFpfM18xMCwgcy5ibF90cmVlKTtcbiAgICAgIHNlbmRfYml0cyhzLCBjb3VudCAtIDMsIDMpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbmRfY29kZShzLCBSRVBaXzExXzEzOCwgcy5ibF90cmVlKTtcbiAgICAgIHNlbmRfYml0cyhzLCBjb3VudCAtIDExLCA3KTtcbiAgICB9XG5cbiAgICBjb3VudCA9IDA7XG4gICAgcHJldmxlbiA9IGN1cmxlbjtcbiAgICBpZiAobmV4dGxlbiA9PT0gMCkge1xuICAgICAgbWF4X2NvdW50ID0gMTM4O1xuICAgICAgbWluX2NvdW50ID0gMztcblxuICAgIH0gZWxzZSBpZiAoY3VybGVuID09PSBuZXh0bGVuKSB7XG4gICAgICBtYXhfY291bnQgPSA2O1xuICAgICAgbWluX2NvdW50ID0gMztcblxuICAgIH0gZWxzZSB7XG4gICAgICBtYXhfY291bnQgPSA3O1xuICAgICAgbWluX2NvdW50ID0gNDtcbiAgICB9XG4gIH1cbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvbnN0cnVjdCB0aGUgSHVmZm1hbiB0cmVlIGZvciB0aGUgYml0IGxlbmd0aHMgYW5kIHJldHVybiB0aGUgaW5kZXggaW5cbiAqIGJsX29yZGVyIG9mIHRoZSBsYXN0IGJpdCBsZW5ndGggY29kZSB0byBzZW5kLlxuICovXG5mdW5jdGlvbiBidWlsZF9ibF90cmVlKHMpIHtcbiAgdmFyIG1heF9ibGluZGV4OyAgLyogaW5kZXggb2YgbGFzdCBiaXQgbGVuZ3RoIGNvZGUgb2Ygbm9uIHplcm8gZnJlcSAqL1xuXG4gIC8qIERldGVybWluZSB0aGUgYml0IGxlbmd0aCBmcmVxdWVuY2llcyBmb3IgbGl0ZXJhbCBhbmQgZGlzdGFuY2UgdHJlZXMgKi9cbiAgc2Nhbl90cmVlKHMsIHMuZHluX2x0cmVlLCBzLmxfZGVzYy5tYXhfY29kZSk7XG4gIHNjYW5fdHJlZShzLCBzLmR5bl9kdHJlZSwgcy5kX2Rlc2MubWF4X2NvZGUpO1xuXG4gIC8qIEJ1aWxkIHRoZSBiaXQgbGVuZ3RoIHRyZWU6ICovXG4gIGJ1aWxkX3RyZWUocywgcy5ibF9kZXNjKTtcbiAgLyogb3B0X2xlbiBub3cgaW5jbHVkZXMgdGhlIGxlbmd0aCBvZiB0aGUgdHJlZSByZXByZXNlbnRhdGlvbnMsIGV4Y2VwdFxuICAgKiB0aGUgbGVuZ3RocyBvZiB0aGUgYml0IGxlbmd0aHMgY29kZXMgYW5kIHRoZSA1KzUrNCBiaXRzIGZvciB0aGUgY291bnRzLlxuICAgKi9cblxuICAvKiBEZXRlcm1pbmUgdGhlIG51bWJlciBvZiBiaXQgbGVuZ3RoIGNvZGVzIHRvIHNlbmQuIFRoZSBwa3ppcCBmb3JtYXRcbiAgICogcmVxdWlyZXMgdGhhdCBhdCBsZWFzdCA0IGJpdCBsZW5ndGggY29kZXMgYmUgc2VudC4gKGFwcG5vdGUudHh0IHNheXNcbiAgICogMyBidXQgdGhlIGFjdHVhbCB2YWx1ZSB1c2VkIGlzIDQuKVxuICAgKi9cbiAgZm9yIChtYXhfYmxpbmRleCA9IEJMX0NPREVTIC0gMTsgbWF4X2JsaW5kZXggPj0gMzsgbWF4X2JsaW5kZXgtLSkge1xuICAgIGlmIChzLmJsX3RyZWVbYmxfb3JkZXJbbWF4X2JsaW5kZXhdICogMiArIDFdLyouTGVuKi8gIT09IDApIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICAvKiBVcGRhdGUgb3B0X2xlbiB0byBpbmNsdWRlIHRoZSBiaXQgbGVuZ3RoIHRyZWUgYW5kIGNvdW50cyAqL1xuICBzLm9wdF9sZW4gKz0gMyAqIChtYXhfYmxpbmRleCArIDEpICsgNSArIDUgKyA0O1xuICAvL1RyYWNldigoc3RkZXJyLCBcIlxcbmR5biB0cmVlczogZHluICVsZCwgc3RhdCAlbGRcIixcbiAgLy8gICAgICAgIHMtPm9wdF9sZW4sIHMtPnN0YXRpY19sZW4pKTtcblxuICByZXR1cm4gbWF4X2JsaW5kZXg7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBTZW5kIHRoZSBoZWFkZXIgZm9yIGEgYmxvY2sgdXNpbmcgZHluYW1pYyBIdWZmbWFuIHRyZWVzOiB0aGUgY291bnRzLCB0aGVcbiAqIGxlbmd0aHMgb2YgdGhlIGJpdCBsZW5ndGggY29kZXMsIHRoZSBsaXRlcmFsIHRyZWUgYW5kIHRoZSBkaXN0YW5jZSB0cmVlLlxuICogSU4gYXNzZXJ0aW9uOiBsY29kZXMgPj0gMjU3LCBkY29kZXMgPj0gMSwgYmxjb2RlcyA+PSA0LlxuICovXG5mdW5jdGlvbiBzZW5kX2FsbF90cmVlcyhzLCBsY29kZXMsIGRjb2RlcywgYmxjb2Rlcylcbi8vICAgIGRlZmxhdGVfc3RhdGUgKnM7XG4vLyAgICBpbnQgbGNvZGVzLCBkY29kZXMsIGJsY29kZXM7IC8qIG51bWJlciBvZiBjb2RlcyBmb3IgZWFjaCB0cmVlICovXG57XG4gIHZhciByYW5rOyAgICAgICAgICAgICAgICAgICAgLyogaW5kZXggaW4gYmxfb3JkZXIgKi9cblxuICAvL0Fzc2VydCAobGNvZGVzID49IDI1NyAmJiBkY29kZXMgPj0gMSAmJiBibGNvZGVzID49IDQsIFwibm90IGVub3VnaCBjb2Rlc1wiKTtcbiAgLy9Bc3NlcnQgKGxjb2RlcyA8PSBMX0NPREVTICYmIGRjb2RlcyA8PSBEX0NPREVTICYmIGJsY29kZXMgPD0gQkxfQ09ERVMsXG4gIC8vICAgICAgICBcInRvbyBtYW55IGNvZGVzXCIpO1xuICAvL1RyYWNldigoc3RkZXJyLCBcIlxcbmJsIGNvdW50czogXCIpKTtcbiAgc2VuZF9iaXRzKHMsIGxjb2RlcyAtIDI1NywgNSk7IC8qIG5vdCArMjU1IGFzIHN0YXRlZCBpbiBhcHBub3RlLnR4dCAqL1xuICBzZW5kX2JpdHMocywgZGNvZGVzIC0gMSwgICA1KTtcbiAgc2VuZF9iaXRzKHMsIGJsY29kZXMgLSA0LCAgNCk7IC8qIG5vdCAtMyBhcyBzdGF0ZWQgaW4gYXBwbm90ZS50eHQgKi9cbiAgZm9yIChyYW5rID0gMDsgcmFuayA8IGJsY29kZXM7IHJhbmsrKykge1xuICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiXFxuYmwgY29kZSAlMmQgXCIsIGJsX29yZGVyW3JhbmtdKSk7XG4gICAgc2VuZF9iaXRzKHMsIHMuYmxfdHJlZVtibF9vcmRlcltyYW5rXSAqIDIgKyAxXS8qLkxlbiovLCAzKTtcbiAgfVxuICAvL1RyYWNldigoc3RkZXJyLCBcIlxcbmJsIHRyZWU6IHNlbnQgJWxkXCIsIHMtPmJpdHNfc2VudCkpO1xuXG4gIHNlbmRfdHJlZShzLCBzLmR5bl9sdHJlZSwgbGNvZGVzIC0gMSk7IC8qIGxpdGVyYWwgdHJlZSAqL1xuICAvL1RyYWNldigoc3RkZXJyLCBcIlxcbmxpdCB0cmVlOiBzZW50ICVsZFwiLCBzLT5iaXRzX3NlbnQpKTtcblxuICBzZW5kX3RyZWUocywgcy5keW5fZHRyZWUsIGRjb2RlcyAtIDEpOyAvKiBkaXN0YW5jZSB0cmVlICovXG4gIC8vVHJhY2V2KChzdGRlcnIsIFwiXFxuZGlzdCB0cmVlOiBzZW50ICVsZFwiLCBzLT5iaXRzX3NlbnQpKTtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENoZWNrIGlmIHRoZSBkYXRhIHR5cGUgaXMgVEVYVCBvciBCSU5BUlksIHVzaW5nIHRoZSBmb2xsb3dpbmcgYWxnb3JpdGhtOlxuICogLSBURVhUIGlmIHRoZSB0d28gY29uZGl0aW9ucyBiZWxvdyBhcmUgc2F0aXNmaWVkOlxuICogICAgYSkgVGhlcmUgYXJlIG5vIG5vbi1wb3J0YWJsZSBjb250cm9sIGNoYXJhY3RlcnMgYmVsb25naW5nIHRvIHRoZVxuICogICAgICAgXCJibGFjayBsaXN0XCIgKDAuLjYsIDE0Li4yNSwgMjguLjMxKS5cbiAqICAgIGIpIFRoZXJlIGlzIGF0IGxlYXN0IG9uZSBwcmludGFibGUgY2hhcmFjdGVyIGJlbG9uZ2luZyB0byB0aGVcbiAqICAgICAgIFwid2hpdGUgbGlzdFwiICg5IHtUQUJ9LCAxMCB7TEZ9LCAxMyB7Q1J9LCAzMi4uMjU1KS5cbiAqIC0gQklOQVJZIG90aGVyd2lzZS5cbiAqIC0gVGhlIGZvbGxvd2luZyBwYXJ0aWFsbHktcG9ydGFibGUgY29udHJvbCBjaGFyYWN0ZXJzIGZvcm0gYVxuICogICBcImdyYXkgbGlzdFwiIHRoYXQgaXMgaWdub3JlZCBpbiB0aGlzIGRldGVjdGlvbiBhbGdvcml0aG06XG4gKiAgICg3IHtCRUx9LCA4IHtCU30sIDExIHtWVH0sIDEyIHtGRn0sIDI2IHtTVUJ9LCAyNyB7RVNDfSkuXG4gKiBJTiBhc3NlcnRpb246IHRoZSBmaWVsZHMgRnJlcSBvZiBkeW5fbHRyZWUgYXJlIHNldC5cbiAqL1xuZnVuY3Rpb24gZGV0ZWN0X2RhdGFfdHlwZShzKSB7XG4gIC8qIGJsYWNrX21hc2sgaXMgdGhlIGJpdCBtYXNrIG9mIGJsYWNrLWxpc3RlZCBieXRlc1xuICAgKiBzZXQgYml0cyAwLi42LCAxNC4uMjUsIGFuZCAyOC4uMzFcbiAgICogMHhmM2ZmYzA3ZiA9IGJpbmFyeSAxMTExMDAxMTExMTExMTExMTEwMDAwMDAwMTExMTExMVxuICAgKi9cbiAgdmFyIGJsYWNrX21hc2sgPSAweGYzZmZjMDdmO1xuICB2YXIgbjtcblxuICAvKiBDaGVjayBmb3Igbm9uLXRleHR1YWwgKFwiYmxhY2stbGlzdGVkXCIpIGJ5dGVzLiAqL1xuICBmb3IgKG4gPSAwOyBuIDw9IDMxOyBuKyssIGJsYWNrX21hc2sgPj4+PSAxKSB7XG4gICAgaWYgKChibGFja19tYXNrICYgMSkgJiYgKHMuZHluX2x0cmVlW24gKiAyXS8qLkZyZXEqLyAhPT0gMCkpIHtcbiAgICAgIHJldHVybiBaX0JJTkFSWTtcbiAgICB9XG4gIH1cblxuICAvKiBDaGVjayBmb3IgdGV4dHVhbCAoXCJ3aGl0ZS1saXN0ZWRcIikgYnl0ZXMuICovXG4gIGlmIChzLmR5bl9sdHJlZVs5ICogMl0vKi5GcmVxKi8gIT09IDAgfHwgcy5keW5fbHRyZWVbMTAgKiAyXS8qLkZyZXEqLyAhPT0gMCB8fFxuICAgICAgcy5keW5fbHRyZWVbMTMgKiAyXS8qLkZyZXEqLyAhPT0gMCkge1xuICAgIHJldHVybiBaX1RFWFQ7XG4gIH1cbiAgZm9yIChuID0gMzI7IG4gPCBMSVRFUkFMUzsgbisrKSB7XG4gICAgaWYgKHMuZHluX2x0cmVlW24gKiAyXS8qLkZyZXEqLyAhPT0gMCkge1xuICAgICAgcmV0dXJuIFpfVEVYVDtcbiAgICB9XG4gIH1cblxuICAvKiBUaGVyZSBhcmUgbm8gXCJibGFjay1saXN0ZWRcIiBvciBcIndoaXRlLWxpc3RlZFwiIGJ5dGVzOlxuICAgKiB0aGlzIHN0cmVhbSBlaXRoZXIgaXMgZW1wdHkgb3IgaGFzIHRvbGVyYXRlZCAoXCJncmF5LWxpc3RlZFwiKSBieXRlcyBvbmx5LlxuICAgKi9cbiAgcmV0dXJuIFpfQklOQVJZO1xufVxuXG5cbnZhciBzdGF0aWNfaW5pdF9kb25lID0gZmFsc2U7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogSW5pdGlhbGl6ZSB0aGUgdHJlZSBkYXRhIHN0cnVjdHVyZXMgZm9yIGEgbmV3IHpsaWIgc3RyZWFtLlxuICovXG5mdW5jdGlvbiBfdHJfaW5pdChzKVxue1xuXG4gIGlmICghc3RhdGljX2luaXRfZG9uZSkge1xuICAgIHRyX3N0YXRpY19pbml0KCk7XG4gICAgc3RhdGljX2luaXRfZG9uZSA9IHRydWU7XG4gIH1cblxuICBzLmxfZGVzYyAgPSBuZXcgVHJlZURlc2Mocy5keW5fbHRyZWUsIHN0YXRpY19sX2Rlc2MpO1xuICBzLmRfZGVzYyAgPSBuZXcgVHJlZURlc2Mocy5keW5fZHRyZWUsIHN0YXRpY19kX2Rlc2MpO1xuICBzLmJsX2Rlc2MgPSBuZXcgVHJlZURlc2Mocy5ibF90cmVlLCBzdGF0aWNfYmxfZGVzYyk7XG5cbiAgcy5iaV9idWYgPSAwO1xuICBzLmJpX3ZhbGlkID0gMDtcblxuICAvKiBJbml0aWFsaXplIHRoZSBmaXJzdCBibG9jayBvZiB0aGUgZmlyc3QgZmlsZTogKi9cbiAgaW5pdF9ibG9jayhzKTtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFNlbmQgYSBzdG9yZWQgYmxvY2tcbiAqL1xuZnVuY3Rpb24gX3RyX3N0b3JlZF9ibG9jayhzLCBidWYsIHN0b3JlZF9sZW4sIGxhc3QpXG4vL0RlZmxhdGVTdGF0ZSAqcztcbi8vY2hhcmYgKmJ1ZjsgICAgICAgLyogaW5wdXQgYmxvY2sgKi9cbi8vdWxnIHN0b3JlZF9sZW47ICAgLyogbGVuZ3RoIG9mIGlucHV0IGJsb2NrICovXG4vL2ludCBsYXN0OyAgICAgICAgIC8qIG9uZSBpZiB0aGlzIGlzIHRoZSBsYXN0IGJsb2NrIGZvciBhIGZpbGUgKi9cbntcbiAgc2VuZF9iaXRzKHMsIChTVE9SRURfQkxPQ0sgPDwgMSkgKyAobGFzdCA/IDEgOiAwKSwgMyk7ICAgIC8qIHNlbmQgYmxvY2sgdHlwZSAqL1xuICBjb3B5X2Jsb2NrKHMsIGJ1Ziwgc3RvcmVkX2xlbiwgdHJ1ZSk7IC8qIHdpdGggaGVhZGVyICovXG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBTZW5kIG9uZSBlbXB0eSBzdGF0aWMgYmxvY2sgdG8gZ2l2ZSBlbm91Z2ggbG9va2FoZWFkIGZvciBpbmZsYXRlLlxuICogVGhpcyB0YWtlcyAxMCBiaXRzLCBvZiB3aGljaCA3IG1heSByZW1haW4gaW4gdGhlIGJpdCBidWZmZXIuXG4gKi9cbmZ1bmN0aW9uIF90cl9hbGlnbihzKSB7XG4gIHNlbmRfYml0cyhzLCBTVEFUSUNfVFJFRVMgPDwgMSwgMyk7XG4gIHNlbmRfY29kZShzLCBFTkRfQkxPQ0ssIHN0YXRpY19sdHJlZSk7XG4gIGJpX2ZsdXNoKHMpO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogRGV0ZXJtaW5lIHRoZSBiZXN0IGVuY29kaW5nIGZvciB0aGUgY3VycmVudCBibG9jazogZHluYW1pYyB0cmVlcywgc3RhdGljXG4gKiB0cmVlcyBvciBzdG9yZSwgYW5kIG91dHB1dCB0aGUgZW5jb2RlZCBibG9jayB0byB0aGUgemlwIGZpbGUuXG4gKi9cbmZ1bmN0aW9uIF90cl9mbHVzaF9ibG9jayhzLCBidWYsIHN0b3JlZF9sZW4sIGxhc3QpXG4vL0RlZmxhdGVTdGF0ZSAqcztcbi8vY2hhcmYgKmJ1ZjsgICAgICAgLyogaW5wdXQgYmxvY2ssIG9yIE5VTEwgaWYgdG9vIG9sZCAqL1xuLy91bGcgc3RvcmVkX2xlbjsgICAvKiBsZW5ndGggb2YgaW5wdXQgYmxvY2sgKi9cbi8vaW50IGxhc3Q7ICAgICAgICAgLyogb25lIGlmIHRoaXMgaXMgdGhlIGxhc3QgYmxvY2sgZm9yIGEgZmlsZSAqL1xue1xuICB2YXIgb3B0X2xlbmIsIHN0YXRpY19sZW5iOyAgLyogb3B0X2xlbiBhbmQgc3RhdGljX2xlbiBpbiBieXRlcyAqL1xuICB2YXIgbWF4X2JsaW5kZXggPSAwOyAgICAgICAgLyogaW5kZXggb2YgbGFzdCBiaXQgbGVuZ3RoIGNvZGUgb2Ygbm9uIHplcm8gZnJlcSAqL1xuXG4gIC8qIEJ1aWxkIHRoZSBIdWZmbWFuIHRyZWVzIHVubGVzcyBhIHN0b3JlZCBibG9jayBpcyBmb3JjZWQgKi9cbiAgaWYgKHMubGV2ZWwgPiAwKSB7XG5cbiAgICAvKiBDaGVjayBpZiB0aGUgZmlsZSBpcyBiaW5hcnkgb3IgdGV4dCAqL1xuICAgIGlmIChzLnN0cm0uZGF0YV90eXBlID09PSBaX1VOS05PV04pIHtcbiAgICAgIHMuc3RybS5kYXRhX3R5cGUgPSBkZXRlY3RfZGF0YV90eXBlKHMpO1xuICAgIH1cblxuICAgIC8qIENvbnN0cnVjdCB0aGUgbGl0ZXJhbCBhbmQgZGlzdGFuY2UgdHJlZXMgKi9cbiAgICBidWlsZF90cmVlKHMsIHMubF9kZXNjKTtcbiAgICAvLyBUcmFjZXYoKHN0ZGVyciwgXCJcXG5saXQgZGF0YTogZHluICVsZCwgc3RhdCAlbGRcIiwgcy0+b3B0X2xlbixcbiAgICAvLyAgICAgICAgcy0+c3RhdGljX2xlbikpO1xuXG4gICAgYnVpbGRfdHJlZShzLCBzLmRfZGVzYyk7XG4gICAgLy8gVHJhY2V2KChzdGRlcnIsIFwiXFxuZGlzdCBkYXRhOiBkeW4gJWxkLCBzdGF0ICVsZFwiLCBzLT5vcHRfbGVuLFxuICAgIC8vICAgICAgICBzLT5zdGF0aWNfbGVuKSk7XG4gICAgLyogQXQgdGhpcyBwb2ludCwgb3B0X2xlbiBhbmQgc3RhdGljX2xlbiBhcmUgdGhlIHRvdGFsIGJpdCBsZW5ndGhzIG9mXG4gICAgICogdGhlIGNvbXByZXNzZWQgYmxvY2sgZGF0YSwgZXhjbHVkaW5nIHRoZSB0cmVlIHJlcHJlc2VudGF0aW9ucy5cbiAgICAgKi9cblxuICAgIC8qIEJ1aWxkIHRoZSBiaXQgbGVuZ3RoIHRyZWUgZm9yIHRoZSBhYm92ZSB0d28gdHJlZXMsIGFuZCBnZXQgdGhlIGluZGV4XG4gICAgICogaW4gYmxfb3JkZXIgb2YgdGhlIGxhc3QgYml0IGxlbmd0aCBjb2RlIHRvIHNlbmQuXG4gICAgICovXG4gICAgbWF4X2JsaW5kZXggPSBidWlsZF9ibF90cmVlKHMpO1xuXG4gICAgLyogRGV0ZXJtaW5lIHRoZSBiZXN0IGVuY29kaW5nLiBDb21wdXRlIHRoZSBibG9jayBsZW5ndGhzIGluIGJ5dGVzLiAqL1xuICAgIG9wdF9sZW5iID0gKHMub3B0X2xlbiArIDMgKyA3KSA+Pj4gMztcbiAgICBzdGF0aWNfbGVuYiA9IChzLnN0YXRpY19sZW4gKyAzICsgNykgPj4+IDM7XG5cbiAgICAvLyBUcmFjZXYoKHN0ZGVyciwgXCJcXG5vcHQgJWx1KCVsdSkgc3RhdCAlbHUoJWx1KSBzdG9yZWQgJWx1IGxpdCAldSBcIixcbiAgICAvLyAgICAgICAgb3B0X2xlbmIsIHMtPm9wdF9sZW4sIHN0YXRpY19sZW5iLCBzLT5zdGF0aWNfbGVuLCBzdG9yZWRfbGVuLFxuICAgIC8vICAgICAgICBzLT5sYXN0X2xpdCkpO1xuXG4gICAgaWYgKHN0YXRpY19sZW5iIDw9IG9wdF9sZW5iKSB7IG9wdF9sZW5iID0gc3RhdGljX2xlbmI7IH1cblxuICB9IGVsc2Uge1xuICAgIC8vIEFzc2VydChidWYgIT0gKGNoYXIqKTAsIFwibG9zdCBidWZcIik7XG4gICAgb3B0X2xlbmIgPSBzdGF0aWNfbGVuYiA9IHN0b3JlZF9sZW4gKyA1OyAvKiBmb3JjZSBhIHN0b3JlZCBibG9jayAqL1xuICB9XG5cbiAgaWYgKChzdG9yZWRfbGVuICsgNCA8PSBvcHRfbGVuYikgJiYgKGJ1ZiAhPT0gLTEpKSB7XG4gICAgLyogNDogdHdvIHdvcmRzIGZvciB0aGUgbGVuZ3RocyAqL1xuXG4gICAgLyogVGhlIHRlc3QgYnVmICE9IE5VTEwgaXMgb25seSBuZWNlc3NhcnkgaWYgTElUX0JVRlNJWkUgPiBXU0laRS5cbiAgICAgKiBPdGhlcndpc2Ugd2UgY2FuJ3QgaGF2ZSBwcm9jZXNzZWQgbW9yZSB0aGFuIFdTSVpFIGlucHV0IGJ5dGVzIHNpbmNlXG4gICAgICogdGhlIGxhc3QgYmxvY2sgZmx1c2gsIGJlY2F1c2UgY29tcHJlc3Npb24gd291bGQgaGF2ZSBiZWVuXG4gICAgICogc3VjY2Vzc2Z1bC4gSWYgTElUX0JVRlNJWkUgPD0gV1NJWkUsIGl0IGlzIG5ldmVyIHRvbyBsYXRlIHRvXG4gICAgICogdHJhbnNmb3JtIGEgYmxvY2sgaW50byBhIHN0b3JlZCBibG9jay5cbiAgICAgKi9cbiAgICBfdHJfc3RvcmVkX2Jsb2NrKHMsIGJ1Ziwgc3RvcmVkX2xlbiwgbGFzdCk7XG5cbiAgfSBlbHNlIGlmIChzLnN0cmF0ZWd5ID09PSBaX0ZJWEVEIHx8IHN0YXRpY19sZW5iID09PSBvcHRfbGVuYikge1xuXG4gICAgc2VuZF9iaXRzKHMsIChTVEFUSUNfVFJFRVMgPDwgMSkgKyAobGFzdCA/IDEgOiAwKSwgMyk7XG4gICAgY29tcHJlc3NfYmxvY2socywgc3RhdGljX2x0cmVlLCBzdGF0aWNfZHRyZWUpO1xuXG4gIH0gZWxzZSB7XG4gICAgc2VuZF9iaXRzKHMsIChEWU5fVFJFRVMgPDwgMSkgKyAobGFzdCA/IDEgOiAwKSwgMyk7XG4gICAgc2VuZF9hbGxfdHJlZXMocywgcy5sX2Rlc2MubWF4X2NvZGUgKyAxLCBzLmRfZGVzYy5tYXhfY29kZSArIDEsIG1heF9ibGluZGV4ICsgMSk7XG4gICAgY29tcHJlc3NfYmxvY2socywgcy5keW5fbHRyZWUsIHMuZHluX2R0cmVlKTtcbiAgfVxuICAvLyBBc3NlcnQgKHMtPmNvbXByZXNzZWRfbGVuID09IHMtPmJpdHNfc2VudCwgXCJiYWQgY29tcHJlc3NlZCBzaXplXCIpO1xuICAvKiBUaGUgYWJvdmUgY2hlY2sgaXMgbWFkZSBtb2QgMl4zMiwgZm9yIGZpbGVzIGxhcmdlciB0aGFuIDUxMiBNQlxuICAgKiBhbmQgdUxvbmcgaW1wbGVtZW50ZWQgb24gMzIgYml0cy5cbiAgICovXG4gIGluaXRfYmxvY2socyk7XG5cbiAgaWYgKGxhc3QpIHtcbiAgICBiaV93aW5kdXAocyk7XG4gIH1cbiAgLy8gVHJhY2V2KChzdGRlcnIsXCJcXG5jb21wcmxlbiAlbHUoJWx1KSBcIiwgcy0+Y29tcHJlc3NlZF9sZW4+PjMsXG4gIC8vICAgICAgIHMtPmNvbXByZXNzZWRfbGVuLTcqbGFzdCkpO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFNhdmUgdGhlIG1hdGNoIGluZm8gYW5kIHRhbGx5IHRoZSBmcmVxdWVuY3kgY291bnRzLiBSZXR1cm4gdHJ1ZSBpZlxuICogdGhlIGN1cnJlbnQgYmxvY2sgbXVzdCBiZSBmbHVzaGVkLlxuICovXG5mdW5jdGlvbiBfdHJfdGFsbHkocywgZGlzdCwgbGMpXG4vLyAgICBkZWZsYXRlX3N0YXRlICpzO1xuLy8gICAgdW5zaWduZWQgZGlzdDsgIC8qIGRpc3RhbmNlIG9mIG1hdGNoZWQgc3RyaW5nICovXG4vLyAgICB1bnNpZ25lZCBsYzsgICAgLyogbWF0Y2ggbGVuZ3RoLU1JTl9NQVRDSCBvciB1bm1hdGNoZWQgY2hhciAoaWYgZGlzdD09MCkgKi9cbntcbiAgLy92YXIgb3V0X2xlbmd0aCwgaW5fbGVuZ3RoLCBkY29kZTtcblxuICBzLnBlbmRpbmdfYnVmW3MuZF9idWYgKyBzLmxhc3RfbGl0ICogMl0gICAgID0gKGRpc3QgPj4+IDgpICYgMHhmZjtcbiAgcy5wZW5kaW5nX2J1ZltzLmRfYnVmICsgcy5sYXN0X2xpdCAqIDIgKyAxXSA9IGRpc3QgJiAweGZmO1xuXG4gIHMucGVuZGluZ19idWZbcy5sX2J1ZiArIHMubGFzdF9saXRdID0gbGMgJiAweGZmO1xuICBzLmxhc3RfbGl0Kys7XG5cbiAgaWYgKGRpc3QgPT09IDApIHtcbiAgICAvKiBsYyBpcyB0aGUgdW5tYXRjaGVkIGNoYXIgKi9cbiAgICBzLmR5bl9sdHJlZVtsYyAqIDJdLyouRnJlcSovKys7XG4gIH0gZWxzZSB7XG4gICAgcy5tYXRjaGVzKys7XG4gICAgLyogSGVyZSwgbGMgaXMgdGhlIG1hdGNoIGxlbmd0aCAtIE1JTl9NQVRDSCAqL1xuICAgIGRpc3QtLTsgICAgICAgICAgICAgLyogZGlzdCA9IG1hdGNoIGRpc3RhbmNlIC0gMSAqL1xuICAgIC8vQXNzZXJ0KCh1c2gpZGlzdCA8ICh1c2gpTUFYX0RJU1QocykgJiZcbiAgICAvLyAgICAgICAodXNoKWxjIDw9ICh1c2gpKE1BWF9NQVRDSC1NSU5fTUFUQ0gpICYmXG4gICAgLy8gICAgICAgKHVzaClkX2NvZGUoZGlzdCkgPCAodXNoKURfQ09ERVMsICBcIl90cl90YWxseTogYmFkIG1hdGNoXCIpO1xuXG4gICAgcy5keW5fbHRyZWVbKF9sZW5ndGhfY29kZVtsY10gKyBMSVRFUkFMUyArIDEpICogMl0vKi5GcmVxKi8rKztcbiAgICBzLmR5bl9kdHJlZVtkX2NvZGUoZGlzdCkgKiAyXS8qLkZyZXEqLysrO1xuICB9XG5cbi8vICghKSBUaGlzIGJsb2NrIGlzIGRpc2FibGVkIGluIHpsaWIgZGVmYXVsdHMsXG4vLyBkb24ndCBlbmFibGUgaXQgZm9yIGJpbmFyeSBjb21wYXRpYmlsaXR5XG5cbi8vI2lmZGVmIFRSVU5DQVRFX0JMT0NLXG4vLyAgLyogVHJ5IHRvIGd1ZXNzIGlmIGl0IGlzIHByb2ZpdGFibGUgdG8gc3RvcCB0aGUgY3VycmVudCBibG9jayBoZXJlICovXG4vLyAgaWYgKChzLmxhc3RfbGl0ICYgMHgxZmZmKSA9PT0gMCAmJiBzLmxldmVsID4gMikge1xuLy8gICAgLyogQ29tcHV0ZSBhbiB1cHBlciBib3VuZCBmb3IgdGhlIGNvbXByZXNzZWQgbGVuZ3RoICovXG4vLyAgICBvdXRfbGVuZ3RoID0gcy5sYXN0X2xpdCo4O1xuLy8gICAgaW5fbGVuZ3RoID0gcy5zdHJzdGFydCAtIHMuYmxvY2tfc3RhcnQ7XG4vL1xuLy8gICAgZm9yIChkY29kZSA9IDA7IGRjb2RlIDwgRF9DT0RFUzsgZGNvZGUrKykge1xuLy8gICAgICBvdXRfbGVuZ3RoICs9IHMuZHluX2R0cmVlW2Rjb2RlKjJdLyouRnJlcSovICogKDUgKyBleHRyYV9kYml0c1tkY29kZV0pO1xuLy8gICAgfVxuLy8gICAgb3V0X2xlbmd0aCA+Pj49IDM7XG4vLyAgICAvL1RyYWNldigoc3RkZXJyLFwiXFxubGFzdF9saXQgJXUsIGluICVsZCwgb3V0IH4lbGQoJWxkJSUpIFwiLFxuLy8gICAgLy8gICAgICAgcy0+bGFzdF9saXQsIGluX2xlbmd0aCwgb3V0X2xlbmd0aCxcbi8vICAgIC8vICAgICAgIDEwMEwgLSBvdXRfbGVuZ3RoKjEwMEwvaW5fbGVuZ3RoKSk7XG4vLyAgICBpZiAocy5tYXRjaGVzIDwgKHMubGFzdF9saXQ+PjEpLyppbnQgLzIqLyAmJiBvdXRfbGVuZ3RoIDwgKGluX2xlbmd0aD4+MSkvKmludCAvMiovKSB7XG4vLyAgICAgIHJldHVybiB0cnVlO1xuLy8gICAgfVxuLy8gIH1cbi8vI2VuZGlmXG5cbiAgcmV0dXJuIChzLmxhc3RfbGl0ID09PSBzLmxpdF9idWZzaXplIC0gMSk7XG4gIC8qIFdlIGF2b2lkIGVxdWFsaXR5IHdpdGggbGl0X2J1ZnNpemUgYmVjYXVzZSBvZiB3cmFwYXJvdW5kIGF0IDY0S1xuICAgKiBvbiAxNiBiaXQgbWFjaGluZXMgYW5kIGJlY2F1c2Ugc3RvcmVkIGJsb2NrcyBhcmUgcmVzdHJpY3RlZCB0b1xuICAgKiA2NEstMSBieXRlcy5cbiAgICovXG59XG5cbmV4cG9ydHMuX3RyX2luaXQgID0gX3RyX2luaXQ7XG5leHBvcnRzLl90cl9zdG9yZWRfYmxvY2sgPSBfdHJfc3RvcmVkX2Jsb2NrO1xuZXhwb3J0cy5fdHJfZmx1c2hfYmxvY2sgID0gX3RyX2ZsdXNoX2Jsb2NrO1xuZXhwb3J0cy5fdHJfdGFsbHkgPSBfdHJfdGFsbHk7XG5leHBvcnRzLl90cl9hbGlnbiA9IF90cl9hbGlnbjtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIE5vdGU6IGFkbGVyMzIgdGFrZXMgMTIlIGZvciBsZXZlbCAwIGFuZCAyJSBmb3IgbGV2ZWwgNi5cbi8vIEl0IGlzbid0IHdvcnRoIGl0IHRvIG1ha2UgYWRkaXRpb25hbCBvcHRpbWl6YXRpb25zIGFzIGluIG9yaWdpbmFsLlxuLy8gU21hbGwgc2l6ZSBpcyBwcmVmZXJhYmxlLlxuXG4vLyAoQykgMTk5NS0yMDEzIEplYW4tbG91cCBHYWlsbHkgYW5kIE1hcmsgQWRsZXJcbi8vIChDKSAyMDE0LTIwMTcgVml0YWx5IFB1enJpbiBhbmQgQW5kcmV5IFR1cGl0c2luXG4vL1xuLy8gVGhpcyBzb2Z0d2FyZSBpcyBwcm92aWRlZCAnYXMtaXMnLCB3aXRob3V0IGFueSBleHByZXNzIG9yIGltcGxpZWRcbi8vIHdhcnJhbnR5LiBJbiBubyBldmVudCB3aWxsIHRoZSBhdXRob3JzIGJlIGhlbGQgbGlhYmxlIGZvciBhbnkgZGFtYWdlc1xuLy8gYXJpc2luZyBmcm9tIHRoZSB1c2Ugb2YgdGhpcyBzb2Z0d2FyZS5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGdyYW50ZWQgdG8gYW55b25lIHRvIHVzZSB0aGlzIHNvZnR3YXJlIGZvciBhbnkgcHVycG9zZSxcbi8vIGluY2x1ZGluZyBjb21tZXJjaWFsIGFwcGxpY2F0aW9ucywgYW5kIHRvIGFsdGVyIGl0IGFuZCByZWRpc3RyaWJ1dGUgaXRcbi8vIGZyZWVseSwgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIHJlc3RyaWN0aW9uczpcbi8vXG4vLyAxLiBUaGUgb3JpZ2luIG9mIHRoaXMgc29mdHdhcmUgbXVzdCBub3QgYmUgbWlzcmVwcmVzZW50ZWQ7IHlvdSBtdXN0IG5vdFxuLy8gICBjbGFpbSB0aGF0IHlvdSB3cm90ZSB0aGUgb3JpZ2luYWwgc29mdHdhcmUuIElmIHlvdSB1c2UgdGhpcyBzb2Z0d2FyZVxuLy8gICBpbiBhIHByb2R1Y3QsIGFuIGFja25vd2xlZGdtZW50IGluIHRoZSBwcm9kdWN0IGRvY3VtZW50YXRpb24gd291bGQgYmVcbi8vICAgYXBwcmVjaWF0ZWQgYnV0IGlzIG5vdCByZXF1aXJlZC5cbi8vIDIuIEFsdGVyZWQgc291cmNlIHZlcnNpb25zIG11c3QgYmUgcGxhaW5seSBtYXJrZWQgYXMgc3VjaCwgYW5kIG11c3Qgbm90IGJlXG4vLyAgIG1pc3JlcHJlc2VudGVkIGFzIGJlaW5nIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS5cbi8vIDMuIFRoaXMgbm90aWNlIG1heSBub3QgYmUgcmVtb3ZlZCBvciBhbHRlcmVkIGZyb20gYW55IHNvdXJjZSBkaXN0cmlidXRpb24uXG5cbmZ1bmN0aW9uIGFkbGVyMzIoYWRsZXIsIGJ1ZiwgbGVuLCBwb3MpIHtcbiAgdmFyIHMxID0gKGFkbGVyICYgMHhmZmZmKSB8MCxcbiAgICAgIHMyID0gKChhZGxlciA+Pj4gMTYpICYgMHhmZmZmKSB8MCxcbiAgICAgIG4gPSAwO1xuXG4gIHdoaWxlIChsZW4gIT09IDApIHtcbiAgICAvLyBTZXQgbGltaXQgfiB0d2ljZSBsZXNzIHRoYW4gNTU1MiwgdG8ga2VlcFxuICAgIC8vIHMyIGluIDMxLWJpdHMsIGJlY2F1c2Ugd2UgZm9yY2Ugc2lnbmVkIGludHMuXG4gICAgLy8gaW4gb3RoZXIgY2FzZSAlPSB3aWxsIGZhaWwuXG4gICAgbiA9IGxlbiA+IDIwMDAgPyAyMDAwIDogbGVuO1xuICAgIGxlbiAtPSBuO1xuXG4gICAgZG8ge1xuICAgICAgczEgPSAoczEgKyBidWZbcG9zKytdKSB8MDtcbiAgICAgIHMyID0gKHMyICsgczEpIHwwO1xuICAgIH0gd2hpbGUgKC0tbik7XG5cbiAgICBzMSAlPSA2NTUyMTtcbiAgICBzMiAlPSA2NTUyMTtcbiAgfVxuXG4gIHJldHVybiAoczEgfCAoczIgPDwgMTYpKSB8MDtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkbGVyMzI7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vLyBOb3RlOiB3ZSBjYW4ndCBnZXQgc2lnbmlmaWNhbnQgc3BlZWQgYm9vc3QgaGVyZS5cbi8vIFNvIHdyaXRlIGNvZGUgdG8gbWluaW1pemUgc2l6ZSAtIG5vIHByZWdlbmVyYXRlZCB0YWJsZXNcbi8vIGFuZCBhcnJheSB0b29scyBkZXBlbmRlbmNpZXMuXG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxuLy8gVXNlIG9yZGluYXJ5IGFycmF5LCBzaW5jZSB1bnR5cGVkIG1ha2VzIG5vIGJvb3N0IGhlcmVcbmZ1bmN0aW9uIG1ha2VUYWJsZSgpIHtcbiAgdmFyIGMsIHRhYmxlID0gW107XG5cbiAgZm9yICh2YXIgbiA9IDA7IG4gPCAyNTY7IG4rKykge1xuICAgIGMgPSBuO1xuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgODsgaysrKSB7XG4gICAgICBjID0gKChjICYgMSkgPyAoMHhFREI4ODMyMCBeIChjID4+PiAxKSkgOiAoYyA+Pj4gMSkpO1xuICAgIH1cbiAgICB0YWJsZVtuXSA9IGM7XG4gIH1cblxuICByZXR1cm4gdGFibGU7XG59XG5cbi8vIENyZWF0ZSB0YWJsZSBvbiBsb2FkLiBKdXN0IDI1NSBzaWduZWQgbG9uZ3MuIE5vdCBhIHByb2JsZW0uXG52YXIgY3JjVGFibGUgPSBtYWtlVGFibGUoKTtcblxuXG5mdW5jdGlvbiBjcmMzMihjcmMsIGJ1ZiwgbGVuLCBwb3MpIHtcbiAgdmFyIHQgPSBjcmNUYWJsZSxcbiAgICAgIGVuZCA9IHBvcyArIGxlbjtcblxuICBjcmMgXj0gLTE7XG5cbiAgZm9yICh2YXIgaSA9IHBvczsgaSA8IGVuZDsgaSsrKSB7XG4gICAgY3JjID0gKGNyYyA+Pj4gOCkgXiB0WyhjcmMgXiBidWZbaV0pICYgMHhGRl07XG4gIH1cblxuICByZXR1cm4gKGNyYyBeICgtMSkpOyAvLyA+Pj4gMDtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyYzMyO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLy8gKEMpIDE5OTUtMjAxMyBKZWFuLWxvdXAgR2FpbGx5IGFuZCBNYXJrIEFkbGVyXG4vLyAoQykgMjAxNC0yMDE3IFZpdGFseSBQdXpyaW4gYW5kIEFuZHJleSBUdXBpdHNpblxuLy9cbi8vIFRoaXMgc29mdHdhcmUgaXMgcHJvdmlkZWQgJ2FzLWlzJywgd2l0aG91dCBhbnkgZXhwcmVzcyBvciBpbXBsaWVkXG4vLyB3YXJyYW50eS4gSW4gbm8gZXZlbnQgd2lsbCB0aGUgYXV0aG9ycyBiZSBoZWxkIGxpYWJsZSBmb3IgYW55IGRhbWFnZXNcbi8vIGFyaXNpbmcgZnJvbSB0aGUgdXNlIG9mIHRoaXMgc29mdHdhcmUuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBncmFudGVkIHRvIGFueW9uZSB0byB1c2UgdGhpcyBzb2Z0d2FyZSBmb3IgYW55IHB1cnBvc2UsXG4vLyBpbmNsdWRpbmcgY29tbWVyY2lhbCBhcHBsaWNhdGlvbnMsIGFuZCB0byBhbHRlciBpdCBhbmQgcmVkaXN0cmlidXRlIGl0XG4vLyBmcmVlbHksIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyByZXN0cmljdGlvbnM6XG4vL1xuLy8gMS4gVGhlIG9yaWdpbiBvZiB0aGlzIHNvZnR3YXJlIG11c3Qgbm90IGJlIG1pc3JlcHJlc2VudGVkOyB5b3UgbXVzdCBub3Rcbi8vICAgY2xhaW0gdGhhdCB5b3Ugd3JvdGUgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLiBJZiB5b3UgdXNlIHRoaXMgc29mdHdhcmVcbi8vICAgaW4gYSBwcm9kdWN0LCBhbiBhY2tub3dsZWRnbWVudCBpbiB0aGUgcHJvZHVjdCBkb2N1bWVudGF0aW9uIHdvdWxkIGJlXG4vLyAgIGFwcHJlY2lhdGVkIGJ1dCBpcyBub3QgcmVxdWlyZWQuXG4vLyAyLiBBbHRlcmVkIHNvdXJjZSB2ZXJzaW9ucyBtdXN0IGJlIHBsYWlubHkgbWFya2VkIGFzIHN1Y2gsIGFuZCBtdXN0IG5vdCBiZVxuLy8gICBtaXNyZXByZXNlbnRlZCBhcyBiZWluZyB0aGUgb3JpZ2luYWwgc29mdHdhcmUuXG4vLyAzLiBUaGlzIG5vdGljZSBtYXkgbm90IGJlIHJlbW92ZWQgb3IgYWx0ZXJlZCBmcm9tIGFueSBzb3VyY2UgZGlzdHJpYnV0aW9uLlxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgMjogICAgICAnbmVlZCBkaWN0aW9uYXJ5JywgICAgIC8qIFpfTkVFRF9ESUNUICAgICAgIDIgICovXG4gIDE6ICAgICAgJ3N0cmVhbSBlbmQnLCAgICAgICAgICAvKiBaX1NUUkVBTV9FTkQgICAgICAxICAqL1xuICAwOiAgICAgICcnLCAgICAgICAgICAgICAgICAgICAgLyogWl9PSyAgICAgICAgICAgICAgMCAgKi9cbiAgJy0xJzogICAnZmlsZSBlcnJvcicsICAgICAgICAgIC8qIFpfRVJSTk8gICAgICAgICAoLTEpICovXG4gICctMic6ICAgJ3N0cmVhbSBlcnJvcicsICAgICAgICAvKiBaX1NUUkVBTV9FUlJPUiAgKC0yKSAqL1xuICAnLTMnOiAgICdkYXRhIGVycm9yJywgICAgICAgICAgLyogWl9EQVRBX0VSUk9SICAgICgtMykgKi9cbiAgJy00JzogICAnaW5zdWZmaWNpZW50IG1lbW9yeScsIC8qIFpfTUVNX0VSUk9SICAgICAoLTQpICovXG4gICctNSc6ICAgJ2J1ZmZlciBlcnJvcicsICAgICAgICAvKiBaX0JVRl9FUlJPUiAgICAgKC01KSAqL1xuICAnLTYnOiAgICdpbmNvbXBhdGlibGUgdmVyc2lvbicgLyogWl9WRVJTSU9OX0VSUk9SICgtNikgKi9cbn07XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vLyAoQykgMTk5NS0yMDEzIEplYW4tbG91cCBHYWlsbHkgYW5kIE1hcmsgQWRsZXJcbi8vIChDKSAyMDE0LTIwMTcgVml0YWx5IFB1enJpbiBhbmQgQW5kcmV5IFR1cGl0c2luXG4vL1xuLy8gVGhpcyBzb2Z0d2FyZSBpcyBwcm92aWRlZCAnYXMtaXMnLCB3aXRob3V0IGFueSBleHByZXNzIG9yIGltcGxpZWRcbi8vIHdhcnJhbnR5LiBJbiBubyBldmVudCB3aWxsIHRoZSBhdXRob3JzIGJlIGhlbGQgbGlhYmxlIGZvciBhbnkgZGFtYWdlc1xuLy8gYXJpc2luZyBmcm9tIHRoZSB1c2Ugb2YgdGhpcyBzb2Z0d2FyZS5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGdyYW50ZWQgdG8gYW55b25lIHRvIHVzZSB0aGlzIHNvZnR3YXJlIGZvciBhbnkgcHVycG9zZSxcbi8vIGluY2x1ZGluZyBjb21tZXJjaWFsIGFwcGxpY2F0aW9ucywgYW5kIHRvIGFsdGVyIGl0IGFuZCByZWRpc3RyaWJ1dGUgaXRcbi8vIGZyZWVseSwgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIHJlc3RyaWN0aW9uczpcbi8vXG4vLyAxLiBUaGUgb3JpZ2luIG9mIHRoaXMgc29mdHdhcmUgbXVzdCBub3QgYmUgbWlzcmVwcmVzZW50ZWQ7IHlvdSBtdXN0IG5vdFxuLy8gICBjbGFpbSB0aGF0IHlvdSB3cm90ZSB0aGUgb3JpZ2luYWwgc29mdHdhcmUuIElmIHlvdSB1c2UgdGhpcyBzb2Z0d2FyZVxuLy8gICBpbiBhIHByb2R1Y3QsIGFuIGFja25vd2xlZGdtZW50IGluIHRoZSBwcm9kdWN0IGRvY3VtZW50YXRpb24gd291bGQgYmVcbi8vICAgYXBwcmVjaWF0ZWQgYnV0IGlzIG5vdCByZXF1aXJlZC5cbi8vIDIuIEFsdGVyZWQgc291cmNlIHZlcnNpb25zIG11c3QgYmUgcGxhaW5seSBtYXJrZWQgYXMgc3VjaCwgYW5kIG11c3Qgbm90IGJlXG4vLyAgIG1pc3JlcHJlc2VudGVkIGFzIGJlaW5nIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS5cbi8vIDMuIFRoaXMgbm90aWNlIG1heSBub3QgYmUgcmVtb3ZlZCBvciBhbHRlcmVkIGZyb20gYW55IHNvdXJjZSBkaXN0cmlidXRpb24uXG5cbnZhciB1dGlscyAgID0gcmVxdWlyZSgnLi4vdXRpbHMvY29tbW9uJyk7XG52YXIgdHJlZXMgICA9IHJlcXVpcmUoJy4vdHJlZXMnKTtcbnZhciBhZGxlcjMyID0gcmVxdWlyZSgnLi9hZGxlcjMyJyk7XG52YXIgY3JjMzIgICA9IHJlcXVpcmUoJy4vY3JjMzInKTtcbnZhciBtc2cgICAgID0gcmVxdWlyZSgnLi9tZXNzYWdlcycpO1xuXG4vKiBQdWJsaWMgY29uc3RhbnRzID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuXG4vKiBBbGxvd2VkIGZsdXNoIHZhbHVlczsgc2VlIGRlZmxhdGUoKSBhbmQgaW5mbGF0ZSgpIGJlbG93IGZvciBkZXRhaWxzICovXG52YXIgWl9OT19GTFVTSCAgICAgID0gMDtcbnZhciBaX1BBUlRJQUxfRkxVU0ggPSAxO1xuLy92YXIgWl9TWU5DX0ZMVVNIICAgID0gMjtcbnZhciBaX0ZVTExfRkxVU0ggICAgPSAzO1xudmFyIFpfRklOSVNIICAgICAgICA9IDQ7XG52YXIgWl9CTE9DSyAgICAgICAgID0gNTtcbi8vdmFyIFpfVFJFRVMgICAgICAgICA9IDY7XG5cblxuLyogUmV0dXJuIGNvZGVzIGZvciB0aGUgY29tcHJlc3Npb24vZGVjb21wcmVzc2lvbiBmdW5jdGlvbnMuIE5lZ2F0aXZlIHZhbHVlc1xuICogYXJlIGVycm9ycywgcG9zaXRpdmUgdmFsdWVzIGFyZSB1c2VkIGZvciBzcGVjaWFsIGJ1dCBub3JtYWwgZXZlbnRzLlxuICovXG52YXIgWl9PSyAgICAgICAgICAgID0gMDtcbnZhciBaX1NUUkVBTV9FTkQgICAgPSAxO1xuLy92YXIgWl9ORUVEX0RJQ1QgICAgID0gMjtcbi8vdmFyIFpfRVJSTk8gICAgICAgICA9IC0xO1xudmFyIFpfU1RSRUFNX0VSUk9SICA9IC0yO1xudmFyIFpfREFUQV9FUlJPUiAgICA9IC0zO1xuLy92YXIgWl9NRU1fRVJST1IgICAgID0gLTQ7XG52YXIgWl9CVUZfRVJST1IgICAgID0gLTU7XG4vL3ZhciBaX1ZFUlNJT05fRVJST1IgPSAtNjtcblxuXG4vKiBjb21wcmVzc2lvbiBsZXZlbHMgKi9cbi8vdmFyIFpfTk9fQ09NUFJFU1NJT04gICAgICA9IDA7XG4vL3ZhciBaX0JFU1RfU1BFRUQgICAgICAgICAgPSAxO1xuLy92YXIgWl9CRVNUX0NPTVBSRVNTSU9OICAgID0gOTtcbnZhciBaX0RFRkFVTFRfQ09NUFJFU1NJT04gPSAtMTtcblxuXG52YXIgWl9GSUxURVJFRCAgICAgICAgICAgID0gMTtcbnZhciBaX0hVRkZNQU5fT05MWSAgICAgICAgPSAyO1xudmFyIFpfUkxFICAgICAgICAgICAgICAgICA9IDM7XG52YXIgWl9GSVhFRCAgICAgICAgICAgICAgID0gNDtcbnZhciBaX0RFRkFVTFRfU1RSQVRFR1kgICAgPSAwO1xuXG4vKiBQb3NzaWJsZSB2YWx1ZXMgb2YgdGhlIGRhdGFfdHlwZSBmaWVsZCAodGhvdWdoIHNlZSBpbmZsYXRlKCkpICovXG4vL3ZhciBaX0JJTkFSWSAgICAgICAgICAgICAgPSAwO1xuLy92YXIgWl9URVhUICAgICAgICAgICAgICAgID0gMTtcbi8vdmFyIFpfQVNDSUkgICAgICAgICAgICAgICA9IDE7IC8vID0gWl9URVhUXG52YXIgWl9VTktOT1dOICAgICAgICAgICAgID0gMjtcblxuXG4vKiBUaGUgZGVmbGF0ZSBjb21wcmVzc2lvbiBtZXRob2QgKi9cbnZhciBaX0RFRkxBVEVEICA9IDg7XG5cbi8qPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cblxudmFyIE1BWF9NRU1fTEVWRUwgPSA5O1xuLyogTWF4aW11bSB2YWx1ZSBmb3IgbWVtTGV2ZWwgaW4gZGVmbGF0ZUluaXQyICovXG52YXIgTUFYX1dCSVRTID0gMTU7XG4vKiAzMksgTFo3NyB3aW5kb3cgKi9cbnZhciBERUZfTUVNX0xFVkVMID0gODtcblxuXG52YXIgTEVOR1RIX0NPREVTICA9IDI5O1xuLyogbnVtYmVyIG9mIGxlbmd0aCBjb2Rlcywgbm90IGNvdW50aW5nIHRoZSBzcGVjaWFsIEVORF9CTE9DSyBjb2RlICovXG52YXIgTElURVJBTFMgICAgICA9IDI1Njtcbi8qIG51bWJlciBvZiBsaXRlcmFsIGJ5dGVzIDAuLjI1NSAqL1xudmFyIExfQ09ERVMgICAgICAgPSBMSVRFUkFMUyArIDEgKyBMRU5HVEhfQ09ERVM7XG4vKiBudW1iZXIgb2YgTGl0ZXJhbCBvciBMZW5ndGggY29kZXMsIGluY2x1ZGluZyB0aGUgRU5EX0JMT0NLIGNvZGUgKi9cbnZhciBEX0NPREVTICAgICAgID0gMzA7XG4vKiBudW1iZXIgb2YgZGlzdGFuY2UgY29kZXMgKi9cbnZhciBCTF9DT0RFUyAgICAgID0gMTk7XG4vKiBudW1iZXIgb2YgY29kZXMgdXNlZCB0byB0cmFuc2ZlciB0aGUgYml0IGxlbmd0aHMgKi9cbnZhciBIRUFQX1NJWkUgICAgID0gMiAqIExfQ09ERVMgKyAxO1xuLyogbWF4aW11bSBoZWFwIHNpemUgKi9cbnZhciBNQVhfQklUUyAgPSAxNTtcbi8qIEFsbCBjb2RlcyBtdXN0IG5vdCBleGNlZWQgTUFYX0JJVFMgYml0cyAqL1xuXG52YXIgTUlOX01BVENIID0gMztcbnZhciBNQVhfTUFUQ0ggPSAyNTg7XG52YXIgTUlOX0xPT0tBSEVBRCA9IChNQVhfTUFUQ0ggKyBNSU5fTUFUQ0ggKyAxKTtcblxudmFyIFBSRVNFVF9ESUNUID0gMHgyMDtcblxudmFyIElOSVRfU1RBVEUgPSA0MjtcbnZhciBFWFRSQV9TVEFURSA9IDY5O1xudmFyIE5BTUVfU1RBVEUgPSA3MztcbnZhciBDT01NRU5UX1NUQVRFID0gOTE7XG52YXIgSENSQ19TVEFURSA9IDEwMztcbnZhciBCVVNZX1NUQVRFID0gMTEzO1xudmFyIEZJTklTSF9TVEFURSA9IDY2NjtcblxudmFyIEJTX05FRURfTU9SRSAgICAgID0gMTsgLyogYmxvY2sgbm90IGNvbXBsZXRlZCwgbmVlZCBtb3JlIGlucHV0IG9yIG1vcmUgb3V0cHV0ICovXG52YXIgQlNfQkxPQ0tfRE9ORSAgICAgPSAyOyAvKiBibG9jayBmbHVzaCBwZXJmb3JtZWQgKi9cbnZhciBCU19GSU5JU0hfU1RBUlRFRCA9IDM7IC8qIGZpbmlzaCBzdGFydGVkLCBuZWVkIG9ubHkgbW9yZSBvdXRwdXQgYXQgbmV4dCBkZWZsYXRlICovXG52YXIgQlNfRklOSVNIX0RPTkUgICAgPSA0OyAvKiBmaW5pc2ggZG9uZSwgYWNjZXB0IG5vIG1vcmUgaW5wdXQgb3Igb3V0cHV0ICovXG5cbnZhciBPU19DT0RFID0gMHgwMzsgLy8gVW5peCA6KSAuIERvbid0IGRldGVjdCwgdXNlIHRoaXMgZGVmYXVsdC5cblxuZnVuY3Rpb24gZXJyKHN0cm0sIGVycm9yQ29kZSkge1xuICBzdHJtLm1zZyA9IG1zZ1tlcnJvckNvZGVdO1xuICByZXR1cm4gZXJyb3JDb2RlO1xufVxuXG5mdW5jdGlvbiByYW5rKGYpIHtcbiAgcmV0dXJuICgoZikgPDwgMSkgLSAoKGYpID4gNCA/IDkgOiAwKTtcbn1cblxuZnVuY3Rpb24gemVybyhidWYpIHsgdmFyIGxlbiA9IGJ1Zi5sZW5ndGg7IHdoaWxlICgtLWxlbiA+PSAwKSB7IGJ1ZltsZW5dID0gMDsgfSB9XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogRmx1c2ggYXMgbXVjaCBwZW5kaW5nIG91dHB1dCBhcyBwb3NzaWJsZS4gQWxsIGRlZmxhdGUoKSBvdXRwdXQgZ29lc1xuICogdGhyb3VnaCB0aGlzIGZ1bmN0aW9uIHNvIHNvbWUgYXBwbGljYXRpb25zIG1heSB3aXNoIHRvIG1vZGlmeSBpdFxuICogdG8gYXZvaWQgYWxsb2NhdGluZyBhIGxhcmdlIHN0cm0tPm91dHB1dCBidWZmZXIgYW5kIGNvcHlpbmcgaW50byBpdC5cbiAqIChTZWUgYWxzbyByZWFkX2J1ZigpKS5cbiAqL1xuZnVuY3Rpb24gZmx1c2hfcGVuZGluZyhzdHJtKSB7XG4gIHZhciBzID0gc3RybS5zdGF0ZTtcblxuICAvL190cl9mbHVzaF9iaXRzKHMpO1xuICB2YXIgbGVuID0gcy5wZW5kaW5nO1xuICBpZiAobGVuID4gc3RybS5hdmFpbF9vdXQpIHtcbiAgICBsZW4gPSBzdHJtLmF2YWlsX291dDtcbiAgfVxuICBpZiAobGVuID09PSAwKSB7IHJldHVybjsgfVxuXG4gIHV0aWxzLmFycmF5U2V0KHN0cm0ub3V0cHV0LCBzLnBlbmRpbmdfYnVmLCBzLnBlbmRpbmdfb3V0LCBsZW4sIHN0cm0ubmV4dF9vdXQpO1xuICBzdHJtLm5leHRfb3V0ICs9IGxlbjtcbiAgcy5wZW5kaW5nX291dCArPSBsZW47XG4gIHN0cm0udG90YWxfb3V0ICs9IGxlbjtcbiAgc3RybS5hdmFpbF9vdXQgLT0gbGVuO1xuICBzLnBlbmRpbmcgLT0gbGVuO1xuICBpZiAocy5wZW5kaW5nID09PSAwKSB7XG4gICAgcy5wZW5kaW5nX291dCA9IDA7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBmbHVzaF9ibG9ja19vbmx5KHMsIGxhc3QpIHtcbiAgdHJlZXMuX3RyX2ZsdXNoX2Jsb2NrKHMsIChzLmJsb2NrX3N0YXJ0ID49IDAgPyBzLmJsb2NrX3N0YXJ0IDogLTEpLCBzLnN0cnN0YXJ0IC0gcy5ibG9ja19zdGFydCwgbGFzdCk7XG4gIHMuYmxvY2tfc3RhcnQgPSBzLnN0cnN0YXJ0O1xuICBmbHVzaF9wZW5kaW5nKHMuc3RybSk7XG59XG5cblxuZnVuY3Rpb24gcHV0X2J5dGUocywgYikge1xuICBzLnBlbmRpbmdfYnVmW3MucGVuZGluZysrXSA9IGI7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogUHV0IGEgc2hvcnQgaW4gdGhlIHBlbmRpbmcgYnVmZmVyLiBUaGUgMTYtYml0IHZhbHVlIGlzIHB1dCBpbiBNU0Igb3JkZXIuXG4gKiBJTiBhc3NlcnRpb246IHRoZSBzdHJlYW0gc3RhdGUgaXMgY29ycmVjdCBhbmQgdGhlcmUgaXMgZW5vdWdoIHJvb20gaW5cbiAqIHBlbmRpbmdfYnVmLlxuICovXG5mdW5jdGlvbiBwdXRTaG9ydE1TQihzLCBiKSB7XG4vLyAgcHV0X2J5dGUocywgKEJ5dGUpKGIgPj4gOCkpO1xuLy8gIHB1dF9ieXRlKHMsIChCeXRlKShiICYgMHhmZikpO1xuICBzLnBlbmRpbmdfYnVmW3MucGVuZGluZysrXSA9IChiID4+PiA4KSAmIDB4ZmY7XG4gIHMucGVuZGluZ19idWZbcy5wZW5kaW5nKytdID0gYiAmIDB4ZmY7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBSZWFkIGEgbmV3IGJ1ZmZlciBmcm9tIHRoZSBjdXJyZW50IGlucHV0IHN0cmVhbSwgdXBkYXRlIHRoZSBhZGxlcjMyXG4gKiBhbmQgdG90YWwgbnVtYmVyIG9mIGJ5dGVzIHJlYWQuICBBbGwgZGVmbGF0ZSgpIGlucHV0IGdvZXMgdGhyb3VnaFxuICogdGhpcyBmdW5jdGlvbiBzbyBzb21lIGFwcGxpY2F0aW9ucyBtYXkgd2lzaCB0byBtb2RpZnkgaXQgdG8gYXZvaWRcbiAqIGFsbG9jYXRpbmcgYSBsYXJnZSBzdHJtLT5pbnB1dCBidWZmZXIgYW5kIGNvcHlpbmcgZnJvbSBpdC5cbiAqIChTZWUgYWxzbyBmbHVzaF9wZW5kaW5nKCkpLlxuICovXG5mdW5jdGlvbiByZWFkX2J1ZihzdHJtLCBidWYsIHN0YXJ0LCBzaXplKSB7XG4gIHZhciBsZW4gPSBzdHJtLmF2YWlsX2luO1xuXG4gIGlmIChsZW4gPiBzaXplKSB7IGxlbiA9IHNpemU7IH1cbiAgaWYgKGxlbiA9PT0gMCkgeyByZXR1cm4gMDsgfVxuXG4gIHN0cm0uYXZhaWxfaW4gLT0gbGVuO1xuXG4gIC8vIHptZW1jcHkoYnVmLCBzdHJtLT5uZXh0X2luLCBsZW4pO1xuICB1dGlscy5hcnJheVNldChidWYsIHN0cm0uaW5wdXQsIHN0cm0ubmV4dF9pbiwgbGVuLCBzdGFydCk7XG4gIGlmIChzdHJtLnN0YXRlLndyYXAgPT09IDEpIHtcbiAgICBzdHJtLmFkbGVyID0gYWRsZXIzMihzdHJtLmFkbGVyLCBidWYsIGxlbiwgc3RhcnQpO1xuICB9XG5cbiAgZWxzZSBpZiAoc3RybS5zdGF0ZS53cmFwID09PSAyKSB7XG4gICAgc3RybS5hZGxlciA9IGNyYzMyKHN0cm0uYWRsZXIsIGJ1ZiwgbGVuLCBzdGFydCk7XG4gIH1cblxuICBzdHJtLm5leHRfaW4gKz0gbGVuO1xuICBzdHJtLnRvdGFsX2luICs9IGxlbjtcblxuICByZXR1cm4gbGVuO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogU2V0IG1hdGNoX3N0YXJ0IHRvIHRoZSBsb25nZXN0IG1hdGNoIHN0YXJ0aW5nIGF0IHRoZSBnaXZlbiBzdHJpbmcgYW5kXG4gKiByZXR1cm4gaXRzIGxlbmd0aC4gTWF0Y2hlcyBzaG9ydGVyIG9yIGVxdWFsIHRvIHByZXZfbGVuZ3RoIGFyZSBkaXNjYXJkZWQsXG4gKiBpbiB3aGljaCBjYXNlIHRoZSByZXN1bHQgaXMgZXF1YWwgdG8gcHJldl9sZW5ndGggYW5kIG1hdGNoX3N0YXJ0IGlzXG4gKiBnYXJiYWdlLlxuICogSU4gYXNzZXJ0aW9uczogY3VyX21hdGNoIGlzIHRoZSBoZWFkIG9mIHRoZSBoYXNoIGNoYWluIGZvciB0aGUgY3VycmVudFxuICogICBzdHJpbmcgKHN0cnN0YXJ0KSBhbmQgaXRzIGRpc3RhbmNlIGlzIDw9IE1BWF9ESVNULCBhbmQgcHJldl9sZW5ndGggPj0gMVxuICogT1VUIGFzc2VydGlvbjogdGhlIG1hdGNoIGxlbmd0aCBpcyBub3QgZ3JlYXRlciB0aGFuIHMtPmxvb2thaGVhZC5cbiAqL1xuZnVuY3Rpb24gbG9uZ2VzdF9tYXRjaChzLCBjdXJfbWF0Y2gpIHtcbiAgdmFyIGNoYWluX2xlbmd0aCA9IHMubWF4X2NoYWluX2xlbmd0aDsgICAgICAvKiBtYXggaGFzaCBjaGFpbiBsZW5ndGggKi9cbiAgdmFyIHNjYW4gPSBzLnN0cnN0YXJ0OyAvKiBjdXJyZW50IHN0cmluZyAqL1xuICB2YXIgbWF0Y2g7ICAgICAgICAgICAgICAgICAgICAgICAvKiBtYXRjaGVkIHN0cmluZyAqL1xuICB2YXIgbGVuOyAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGxlbmd0aCBvZiBjdXJyZW50IG1hdGNoICovXG4gIHZhciBiZXN0X2xlbiA9IHMucHJldl9sZW5ndGg7ICAgICAgICAgICAgICAvKiBiZXN0IG1hdGNoIGxlbmd0aCBzbyBmYXIgKi9cbiAgdmFyIG5pY2VfbWF0Y2ggPSBzLm5pY2VfbWF0Y2g7ICAgICAgICAgICAgIC8qIHN0b3AgaWYgbWF0Y2ggbG9uZyBlbm91Z2ggKi9cbiAgdmFyIGxpbWl0ID0gKHMuc3Ryc3RhcnQgPiAocy53X3NpemUgLSBNSU5fTE9PS0FIRUFEKSkgP1xuICAgICAgcy5zdHJzdGFydCAtIChzLndfc2l6ZSAtIE1JTl9MT09LQUhFQUQpIDogMC8qTklMKi87XG5cbiAgdmFyIF93aW4gPSBzLndpbmRvdzsgLy8gc2hvcnRjdXRcblxuICB2YXIgd21hc2sgPSBzLndfbWFzaztcbiAgdmFyIHByZXYgID0gcy5wcmV2O1xuXG4gIC8qIFN0b3Agd2hlbiBjdXJfbWF0Y2ggYmVjb21lcyA8PSBsaW1pdC4gVG8gc2ltcGxpZnkgdGhlIGNvZGUsXG4gICAqIHdlIHByZXZlbnQgbWF0Y2hlcyB3aXRoIHRoZSBzdHJpbmcgb2Ygd2luZG93IGluZGV4IDAuXG4gICAqL1xuXG4gIHZhciBzdHJlbmQgPSBzLnN0cnN0YXJ0ICsgTUFYX01BVENIO1xuICB2YXIgc2Nhbl9lbmQxICA9IF93aW5bc2NhbiArIGJlc3RfbGVuIC0gMV07XG4gIHZhciBzY2FuX2VuZCAgID0gX3dpbltzY2FuICsgYmVzdF9sZW5dO1xuXG4gIC8qIFRoZSBjb2RlIGlzIG9wdGltaXplZCBmb3IgSEFTSF9CSVRTID49IDggYW5kIE1BWF9NQVRDSC0yIG11bHRpcGxlIG9mIDE2LlxuICAgKiBJdCBpcyBlYXN5IHRvIGdldCByaWQgb2YgdGhpcyBvcHRpbWl6YXRpb24gaWYgbmVjZXNzYXJ5LlxuICAgKi9cbiAgLy8gQXNzZXJ0KHMtPmhhc2hfYml0cyA+PSA4ICYmIE1BWF9NQVRDSCA9PSAyNTgsIFwiQ29kZSB0b28gY2xldmVyXCIpO1xuXG4gIC8qIERvIG5vdCB3YXN0ZSB0b28gbXVjaCB0aW1lIGlmIHdlIGFscmVhZHkgaGF2ZSBhIGdvb2QgbWF0Y2g6ICovXG4gIGlmIChzLnByZXZfbGVuZ3RoID49IHMuZ29vZF9tYXRjaCkge1xuICAgIGNoYWluX2xlbmd0aCA+Pj0gMjtcbiAgfVxuICAvKiBEbyBub3QgbG9vayBmb3IgbWF0Y2hlcyBiZXlvbmQgdGhlIGVuZCBvZiB0aGUgaW5wdXQuIFRoaXMgaXMgbmVjZXNzYXJ5XG4gICAqIHRvIG1ha2UgZGVmbGF0ZSBkZXRlcm1pbmlzdGljLlxuICAgKi9cbiAgaWYgKG5pY2VfbWF0Y2ggPiBzLmxvb2thaGVhZCkgeyBuaWNlX21hdGNoID0gcy5sb29rYWhlYWQ7IH1cblxuICAvLyBBc3NlcnQoKHVsZylzLT5zdHJzdGFydCA8PSBzLT53aW5kb3dfc2l6ZS1NSU5fTE9PS0FIRUFELCBcIm5lZWQgbG9va2FoZWFkXCIpO1xuXG4gIGRvIHtcbiAgICAvLyBBc3NlcnQoY3VyX21hdGNoIDwgcy0+c3Ryc3RhcnQsIFwibm8gZnV0dXJlXCIpO1xuICAgIG1hdGNoID0gY3VyX21hdGNoO1xuXG4gICAgLyogU2tpcCB0byBuZXh0IG1hdGNoIGlmIHRoZSBtYXRjaCBsZW5ndGggY2Fubm90IGluY3JlYXNlXG4gICAgICogb3IgaWYgdGhlIG1hdGNoIGxlbmd0aCBpcyBsZXNzIHRoYW4gMi4gIE5vdGUgdGhhdCB0aGUgY2hlY2tzIGJlbG93XG4gICAgICogZm9yIGluc3VmZmljaWVudCBsb29rYWhlYWQgb25seSBvY2N1ciBvY2Nhc2lvbmFsbHkgZm9yIHBlcmZvcm1hbmNlXG4gICAgICogcmVhc29ucy4gIFRoZXJlZm9yZSB1bmluaXRpYWxpemVkIG1lbW9yeSB3aWxsIGJlIGFjY2Vzc2VkLCBhbmRcbiAgICAgKiBjb25kaXRpb25hbCBqdW1wcyB3aWxsIGJlIG1hZGUgdGhhdCBkZXBlbmQgb24gdGhvc2UgdmFsdWVzLlxuICAgICAqIEhvd2V2ZXIgdGhlIGxlbmd0aCBvZiB0aGUgbWF0Y2ggaXMgbGltaXRlZCB0byB0aGUgbG9va2FoZWFkLCBzb1xuICAgICAqIHRoZSBvdXRwdXQgb2YgZGVmbGF0ZSBpcyBub3QgYWZmZWN0ZWQgYnkgdGhlIHVuaW5pdGlhbGl6ZWQgdmFsdWVzLlxuICAgICAqL1xuXG4gICAgaWYgKF93aW5bbWF0Y2ggKyBiZXN0X2xlbl0gICAgICE9PSBzY2FuX2VuZCAgfHxcbiAgICAgICAgX3dpblttYXRjaCArIGJlc3RfbGVuIC0gMV0gIT09IHNjYW5fZW5kMSB8fFxuICAgICAgICBfd2luW21hdGNoXSAgICAgICAgICAgICAgICAhPT0gX3dpbltzY2FuXSB8fFxuICAgICAgICBfd2luWysrbWF0Y2hdICAgICAgICAgICAgICAhPT0gX3dpbltzY2FuICsgMV0pIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIC8qIFRoZSBjaGVjayBhdCBiZXN0X2xlbi0xIGNhbiBiZSByZW1vdmVkIGJlY2F1c2UgaXQgd2lsbCBiZSBtYWRlXG4gICAgICogYWdhaW4gbGF0ZXIuIChUaGlzIGhldXJpc3RpYyBpcyBub3QgYWx3YXlzIGEgd2luLilcbiAgICAgKiBJdCBpcyBub3QgbmVjZXNzYXJ5IHRvIGNvbXBhcmUgc2NhblsyXSBhbmQgbWF0Y2hbMl0gc2luY2UgdGhleVxuICAgICAqIGFyZSBhbHdheXMgZXF1YWwgd2hlbiB0aGUgb3RoZXIgYnl0ZXMgbWF0Y2gsIGdpdmVuIHRoYXRcbiAgICAgKiB0aGUgaGFzaCBrZXlzIGFyZSBlcXVhbCBhbmQgdGhhdCBIQVNIX0JJVFMgPj0gOC5cbiAgICAgKi9cbiAgICBzY2FuICs9IDI7XG4gICAgbWF0Y2grKztcbiAgICAvLyBBc3NlcnQoKnNjYW4gPT0gKm1hdGNoLCBcIm1hdGNoWzJdP1wiKTtcblxuICAgIC8qIFdlIGNoZWNrIGZvciBpbnN1ZmZpY2llbnQgbG9va2FoZWFkIG9ubHkgZXZlcnkgOHRoIGNvbXBhcmlzb247XG4gICAgICogdGhlIDI1NnRoIGNoZWNrIHdpbGwgYmUgbWFkZSBhdCBzdHJzdGFydCsyNTguXG4gICAgICovXG4gICAgZG8ge1xuICAgICAgLypqc2hpbnQgbm9lbXB0eTpmYWxzZSovXG4gICAgfSB3aGlsZSAoX3dpblsrK3NjYW5dID09PSBfd2luWysrbWF0Y2hdICYmIF93aW5bKytzY2FuXSA9PT0gX3dpblsrK21hdGNoXSAmJlxuICAgICAgICAgICAgIF93aW5bKytzY2FuXSA9PT0gX3dpblsrK21hdGNoXSAmJiBfd2luWysrc2Nhbl0gPT09IF93aW5bKyttYXRjaF0gJiZcbiAgICAgICAgICAgICBfd2luWysrc2Nhbl0gPT09IF93aW5bKyttYXRjaF0gJiYgX3dpblsrK3NjYW5dID09PSBfd2luWysrbWF0Y2hdICYmXG4gICAgICAgICAgICAgX3dpblsrK3NjYW5dID09PSBfd2luWysrbWF0Y2hdICYmIF93aW5bKytzY2FuXSA9PT0gX3dpblsrK21hdGNoXSAmJlxuICAgICAgICAgICAgIHNjYW4gPCBzdHJlbmQpO1xuXG4gICAgLy8gQXNzZXJ0KHNjYW4gPD0gcy0+d2luZG93Kyh1bnNpZ25lZCkocy0+d2luZG93X3NpemUtMSksIFwid2lsZCBzY2FuXCIpO1xuXG4gICAgbGVuID0gTUFYX01BVENIIC0gKHN0cmVuZCAtIHNjYW4pO1xuICAgIHNjYW4gPSBzdHJlbmQgLSBNQVhfTUFUQ0g7XG5cbiAgICBpZiAobGVuID4gYmVzdF9sZW4pIHtcbiAgICAgIHMubWF0Y2hfc3RhcnQgPSBjdXJfbWF0Y2g7XG4gICAgICBiZXN0X2xlbiA9IGxlbjtcbiAgICAgIGlmIChsZW4gPj0gbmljZV9tYXRjaCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHNjYW5fZW5kMSAgPSBfd2luW3NjYW4gKyBiZXN0X2xlbiAtIDFdO1xuICAgICAgc2Nhbl9lbmQgICA9IF93aW5bc2NhbiArIGJlc3RfbGVuXTtcbiAgICB9XG4gIH0gd2hpbGUgKChjdXJfbWF0Y2ggPSBwcmV2W2N1cl9tYXRjaCAmIHdtYXNrXSkgPiBsaW1pdCAmJiAtLWNoYWluX2xlbmd0aCAhPT0gMCk7XG5cbiAgaWYgKGJlc3RfbGVuIDw9IHMubG9va2FoZWFkKSB7XG4gICAgcmV0dXJuIGJlc3RfbGVuO1xuICB9XG4gIHJldHVybiBzLmxvb2thaGVhZDtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEZpbGwgdGhlIHdpbmRvdyB3aGVuIHRoZSBsb29rYWhlYWQgYmVjb21lcyBpbnN1ZmZpY2llbnQuXG4gKiBVcGRhdGVzIHN0cnN0YXJ0IGFuZCBsb29rYWhlYWQuXG4gKlxuICogSU4gYXNzZXJ0aW9uOiBsb29rYWhlYWQgPCBNSU5fTE9PS0FIRUFEXG4gKiBPVVQgYXNzZXJ0aW9uczogc3Ryc3RhcnQgPD0gd2luZG93X3NpemUtTUlOX0xPT0tBSEVBRFxuICogICAgQXQgbGVhc3Qgb25lIGJ5dGUgaGFzIGJlZW4gcmVhZCwgb3IgYXZhaWxfaW4gPT0gMDsgcmVhZHMgYXJlXG4gKiAgICBwZXJmb3JtZWQgZm9yIGF0IGxlYXN0IHR3byBieXRlcyAocmVxdWlyZWQgZm9yIHRoZSB6aXAgdHJhbnNsYXRlX2VvbFxuICogICAgb3B0aW9uIC0tIG5vdCBzdXBwb3J0ZWQgaGVyZSkuXG4gKi9cbmZ1bmN0aW9uIGZpbGxfd2luZG93KHMpIHtcbiAgdmFyIF93X3NpemUgPSBzLndfc2l6ZTtcbiAgdmFyIHAsIG4sIG0sIG1vcmUsIHN0cjtcblxuICAvL0Fzc2VydChzLT5sb29rYWhlYWQgPCBNSU5fTE9PS0FIRUFELCBcImFscmVhZHkgZW5vdWdoIGxvb2thaGVhZFwiKTtcblxuICBkbyB7XG4gICAgbW9yZSA9IHMud2luZG93X3NpemUgLSBzLmxvb2thaGVhZCAtIHMuc3Ryc3RhcnQ7XG5cbiAgICAvLyBKUyBpbnRzIGhhdmUgMzIgYml0LCBibG9jayBiZWxvdyBub3QgbmVlZGVkXG4gICAgLyogRGVhbCB3aXRoICFAIyQlIDY0SyBsaW1pdDogKi9cbiAgICAvL2lmIChzaXplb2YoaW50KSA8PSAyKSB7XG4gICAgLy8gICAgaWYgKG1vcmUgPT0gMCAmJiBzLT5zdHJzdGFydCA9PSAwICYmIHMtPmxvb2thaGVhZCA9PSAwKSB7XG4gICAgLy8gICAgICAgIG1vcmUgPSB3c2l6ZTtcbiAgICAvL1xuICAgIC8vICB9IGVsc2UgaWYgKG1vcmUgPT0gKHVuc2lnbmVkKSgtMSkpIHtcbiAgICAvLyAgICAgICAgLyogVmVyeSB1bmxpa2VseSwgYnV0IHBvc3NpYmxlIG9uIDE2IGJpdCBtYWNoaW5lIGlmXG4gICAgLy8gICAgICAgICAqIHN0cnN0YXJ0ID09IDAgJiYgbG9va2FoZWFkID09IDEgKGlucHV0IGRvbmUgYSBieXRlIGF0IHRpbWUpXG4gICAgLy8gICAgICAgICAqL1xuICAgIC8vICAgICAgICBtb3JlLS07XG4gICAgLy8gICAgfVxuICAgIC8vfVxuXG5cbiAgICAvKiBJZiB0aGUgd2luZG93IGlzIGFsbW9zdCBmdWxsIGFuZCB0aGVyZSBpcyBpbnN1ZmZpY2llbnQgbG9va2FoZWFkLFxuICAgICAqIG1vdmUgdGhlIHVwcGVyIGhhbGYgdG8gdGhlIGxvd2VyIG9uZSB0byBtYWtlIHJvb20gaW4gdGhlIHVwcGVyIGhhbGYuXG4gICAgICovXG4gICAgaWYgKHMuc3Ryc3RhcnQgPj0gX3dfc2l6ZSArIChfd19zaXplIC0gTUlOX0xPT0tBSEVBRCkpIHtcblxuICAgICAgdXRpbHMuYXJyYXlTZXQocy53aW5kb3csIHMud2luZG93LCBfd19zaXplLCBfd19zaXplLCAwKTtcbiAgICAgIHMubWF0Y2hfc3RhcnQgLT0gX3dfc2l6ZTtcbiAgICAgIHMuc3Ryc3RhcnQgLT0gX3dfc2l6ZTtcbiAgICAgIC8qIHdlIG5vdyBoYXZlIHN0cnN0YXJ0ID49IE1BWF9ESVNUICovXG4gICAgICBzLmJsb2NrX3N0YXJ0IC09IF93X3NpemU7XG5cbiAgICAgIC8qIFNsaWRlIHRoZSBoYXNoIHRhYmxlIChjb3VsZCBiZSBhdm9pZGVkIHdpdGggMzIgYml0IHZhbHVlc1xuICAgICAgIGF0IHRoZSBleHBlbnNlIG9mIG1lbW9yeSB1c2FnZSkuIFdlIHNsaWRlIGV2ZW4gd2hlbiBsZXZlbCA9PSAwXG4gICAgICAgdG8ga2VlcCB0aGUgaGFzaCB0YWJsZSBjb25zaXN0ZW50IGlmIHdlIHN3aXRjaCBiYWNrIHRvIGxldmVsID4gMFxuICAgICAgIGxhdGVyLiAoVXNpbmcgbGV2ZWwgMCBwZXJtYW5lbnRseSBpcyBub3QgYW4gb3B0aW1hbCB1c2FnZSBvZlxuICAgICAgIHpsaWIsIHNvIHdlIGRvbid0IGNhcmUgYWJvdXQgdGhpcyBwYXRob2xvZ2ljYWwgY2FzZS4pXG4gICAgICAgKi9cblxuICAgICAgbiA9IHMuaGFzaF9zaXplO1xuICAgICAgcCA9IG47XG4gICAgICBkbyB7XG4gICAgICAgIG0gPSBzLmhlYWRbLS1wXTtcbiAgICAgICAgcy5oZWFkW3BdID0gKG0gPj0gX3dfc2l6ZSA/IG0gLSBfd19zaXplIDogMCk7XG4gICAgICB9IHdoaWxlICgtLW4pO1xuXG4gICAgICBuID0gX3dfc2l6ZTtcbiAgICAgIHAgPSBuO1xuICAgICAgZG8ge1xuICAgICAgICBtID0gcy5wcmV2Wy0tcF07XG4gICAgICAgIHMucHJldltwXSA9IChtID49IF93X3NpemUgPyBtIC0gX3dfc2l6ZSA6IDApO1xuICAgICAgICAvKiBJZiBuIGlzIG5vdCBvbiBhbnkgaGFzaCBjaGFpbiwgcHJldltuXSBpcyBnYXJiYWdlIGJ1dFxuICAgICAgICAgKiBpdHMgdmFsdWUgd2lsbCBuZXZlciBiZSB1c2VkLlxuICAgICAgICAgKi9cbiAgICAgIH0gd2hpbGUgKC0tbik7XG5cbiAgICAgIG1vcmUgKz0gX3dfc2l6ZTtcbiAgICB9XG4gICAgaWYgKHMuc3RybS5hdmFpbF9pbiA9PT0gMCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLyogSWYgdGhlcmUgd2FzIG5vIHNsaWRpbmc6XG4gICAgICogICAgc3Ryc3RhcnQgPD0gV1NJWkUrTUFYX0RJU1QtMSAmJiBsb29rYWhlYWQgPD0gTUlOX0xPT0tBSEVBRCAtIDEgJiZcbiAgICAgKiAgICBtb3JlID09IHdpbmRvd19zaXplIC0gbG9va2FoZWFkIC0gc3Ryc3RhcnRcbiAgICAgKiA9PiBtb3JlID49IHdpbmRvd19zaXplIC0gKE1JTl9MT09LQUhFQUQtMSArIFdTSVpFICsgTUFYX0RJU1QtMSlcbiAgICAgKiA9PiBtb3JlID49IHdpbmRvd19zaXplIC0gMipXU0laRSArIDJcbiAgICAgKiBJbiB0aGUgQklHX01FTSBvciBNTUFQIGNhc2UgKG5vdCB5ZXQgc3VwcG9ydGVkKSxcbiAgICAgKiAgIHdpbmRvd19zaXplID09IGlucHV0X3NpemUgKyBNSU5fTE9PS0FIRUFEICAmJlxuICAgICAqICAgc3Ryc3RhcnQgKyBzLT5sb29rYWhlYWQgPD0gaW5wdXRfc2l6ZSA9PiBtb3JlID49IE1JTl9MT09LQUhFQUQuXG4gICAgICogT3RoZXJ3aXNlLCB3aW5kb3dfc2l6ZSA9PSAyKldTSVpFIHNvIG1vcmUgPj0gMi5cbiAgICAgKiBJZiB0aGVyZSB3YXMgc2xpZGluZywgbW9yZSA+PSBXU0laRS4gU28gaW4gYWxsIGNhc2VzLCBtb3JlID49IDIuXG4gICAgICovXG4gICAgLy9Bc3NlcnQobW9yZSA+PSAyLCBcIm1vcmUgPCAyXCIpO1xuICAgIG4gPSByZWFkX2J1ZihzLnN0cm0sIHMud2luZG93LCBzLnN0cnN0YXJ0ICsgcy5sb29rYWhlYWQsIG1vcmUpO1xuICAgIHMubG9va2FoZWFkICs9IG47XG5cbiAgICAvKiBJbml0aWFsaXplIHRoZSBoYXNoIHZhbHVlIG5vdyB0aGF0IHdlIGhhdmUgc29tZSBpbnB1dDogKi9cbiAgICBpZiAocy5sb29rYWhlYWQgKyBzLmluc2VydCA+PSBNSU5fTUFUQ0gpIHtcbiAgICAgIHN0ciA9IHMuc3Ryc3RhcnQgLSBzLmluc2VydDtcbiAgICAgIHMuaW5zX2ggPSBzLndpbmRvd1tzdHJdO1xuXG4gICAgICAvKiBVUERBVEVfSEFTSChzLCBzLT5pbnNfaCwgcy0+d2luZG93W3N0ciArIDFdKTsgKi9cbiAgICAgIHMuaW5zX2ggPSAoKHMuaW5zX2ggPDwgcy5oYXNoX3NoaWZ0KSBeIHMud2luZG93W3N0ciArIDFdKSAmIHMuaGFzaF9tYXNrO1xuLy8jaWYgTUlOX01BVENIICE9IDNcbi8vICAgICAgICBDYWxsIHVwZGF0ZV9oYXNoKCkgTUlOX01BVENILTMgbW9yZSB0aW1lc1xuLy8jZW5kaWZcbiAgICAgIHdoaWxlIChzLmluc2VydCkge1xuICAgICAgICAvKiBVUERBVEVfSEFTSChzLCBzLT5pbnNfaCwgcy0+d2luZG93W3N0ciArIE1JTl9NQVRDSC0xXSk7ICovXG4gICAgICAgIHMuaW5zX2ggPSAoKHMuaW5zX2ggPDwgcy5oYXNoX3NoaWZ0KSBeIHMud2luZG93W3N0ciArIE1JTl9NQVRDSCAtIDFdKSAmIHMuaGFzaF9tYXNrO1xuXG4gICAgICAgIHMucHJldltzdHIgJiBzLndfbWFza10gPSBzLmhlYWRbcy5pbnNfaF07XG4gICAgICAgIHMuaGVhZFtzLmluc19oXSA9IHN0cjtcbiAgICAgICAgc3RyKys7XG4gICAgICAgIHMuaW5zZXJ0LS07XG4gICAgICAgIGlmIChzLmxvb2thaGVhZCArIHMuaW5zZXJ0IDwgTUlOX01BVENIKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLyogSWYgdGhlIHdob2xlIGlucHV0IGhhcyBsZXNzIHRoYW4gTUlOX01BVENIIGJ5dGVzLCBpbnNfaCBpcyBnYXJiYWdlLFxuICAgICAqIGJ1dCB0aGlzIGlzIG5vdCBpbXBvcnRhbnQgc2luY2Ugb25seSBsaXRlcmFsIGJ5dGVzIHdpbGwgYmUgZW1pdHRlZC5cbiAgICAgKi9cblxuICB9IHdoaWxlIChzLmxvb2thaGVhZCA8IE1JTl9MT09LQUhFQUQgJiYgcy5zdHJtLmF2YWlsX2luICE9PSAwKTtcblxuICAvKiBJZiB0aGUgV0lOX0lOSVQgYnl0ZXMgYWZ0ZXIgdGhlIGVuZCBvZiB0aGUgY3VycmVudCBkYXRhIGhhdmUgbmV2ZXIgYmVlblxuICAgKiB3cml0dGVuLCB0aGVuIHplcm8gdGhvc2UgYnl0ZXMgaW4gb3JkZXIgdG8gYXZvaWQgbWVtb3J5IGNoZWNrIHJlcG9ydHMgb2ZcbiAgICogdGhlIHVzZSBvZiB1bmluaXRpYWxpemVkIChvciB1bmluaXRpYWxpc2VkIGFzIEp1bGlhbiB3cml0ZXMpIGJ5dGVzIGJ5XG4gICAqIHRoZSBsb25nZXN0IG1hdGNoIHJvdXRpbmVzLiAgVXBkYXRlIHRoZSBoaWdoIHdhdGVyIG1hcmsgZm9yIHRoZSBuZXh0XG4gICAqIHRpbWUgdGhyb3VnaCBoZXJlLiAgV0lOX0lOSVQgaXMgc2V0IHRvIE1BWF9NQVRDSCBzaW5jZSB0aGUgbG9uZ2VzdCBtYXRjaFxuICAgKiByb3V0aW5lcyBhbGxvdyBzY2FubmluZyB0byBzdHJzdGFydCArIE1BWF9NQVRDSCwgaWdub3JpbmcgbG9va2FoZWFkLlxuICAgKi9cbi8vICBpZiAocy5oaWdoX3dhdGVyIDwgcy53aW5kb3dfc2l6ZSkge1xuLy8gICAgdmFyIGN1cnIgPSBzLnN0cnN0YXJ0ICsgcy5sb29rYWhlYWQ7XG4vLyAgICB2YXIgaW5pdCA9IDA7XG4vL1xuLy8gICAgaWYgKHMuaGlnaF93YXRlciA8IGN1cnIpIHtcbi8vICAgICAgLyogUHJldmlvdXMgaGlnaCB3YXRlciBtYXJrIGJlbG93IGN1cnJlbnQgZGF0YSAtLSB6ZXJvIFdJTl9JTklUXG4vLyAgICAgICAqIGJ5dGVzIG9yIHVwIHRvIGVuZCBvZiB3aW5kb3csIHdoaWNoZXZlciBpcyBsZXNzLlxuLy8gICAgICAgKi9cbi8vICAgICAgaW5pdCA9IHMud2luZG93X3NpemUgLSBjdXJyO1xuLy8gICAgICBpZiAoaW5pdCA+IFdJTl9JTklUKVxuLy8gICAgICAgIGluaXQgPSBXSU5fSU5JVDtcbi8vICAgICAgem1lbXplcm8ocy0+d2luZG93ICsgY3VyciwgKHVuc2lnbmVkKWluaXQpO1xuLy8gICAgICBzLT5oaWdoX3dhdGVyID0gY3VyciArIGluaXQ7XG4vLyAgICB9XG4vLyAgICBlbHNlIGlmIChzLT5oaWdoX3dhdGVyIDwgKHVsZyljdXJyICsgV0lOX0lOSVQpIHtcbi8vICAgICAgLyogSGlnaCB3YXRlciBtYXJrIGF0IG9yIGFib3ZlIGN1cnJlbnQgZGF0YSwgYnV0IGJlbG93IGN1cnJlbnQgZGF0YVxuLy8gICAgICAgKiBwbHVzIFdJTl9JTklUIC0tIHplcm8gb3V0IHRvIGN1cnJlbnQgZGF0YSBwbHVzIFdJTl9JTklULCBvciB1cFxuLy8gICAgICAgKiB0byBlbmQgb2Ygd2luZG93LCB3aGljaGV2ZXIgaXMgbGVzcy5cbi8vICAgICAgICovXG4vLyAgICAgIGluaXQgPSAodWxnKWN1cnIgKyBXSU5fSU5JVCAtIHMtPmhpZ2hfd2F0ZXI7XG4vLyAgICAgIGlmIChpbml0ID4gcy0+d2luZG93X3NpemUgLSBzLT5oaWdoX3dhdGVyKVxuLy8gICAgICAgIGluaXQgPSBzLT53aW5kb3dfc2l6ZSAtIHMtPmhpZ2hfd2F0ZXI7XG4vLyAgICAgIHptZW16ZXJvKHMtPndpbmRvdyArIHMtPmhpZ2hfd2F0ZXIsICh1bnNpZ25lZClpbml0KTtcbi8vICAgICAgcy0+aGlnaF93YXRlciArPSBpbml0O1xuLy8gICAgfVxuLy8gIH1cbi8vXG4vLyAgQXNzZXJ0KCh1bGcpcy0+c3Ryc3RhcnQgPD0gcy0+d2luZG93X3NpemUgLSBNSU5fTE9PS0FIRUFELFxuLy8gICAgXCJub3QgZW5vdWdoIHJvb20gZm9yIHNlYXJjaFwiKTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5IHdpdGhvdXQgY29tcHJlc3Npb24gYXMgbXVjaCBhcyBwb3NzaWJsZSBmcm9tIHRoZSBpbnB1dCBzdHJlYW0sIHJldHVyblxuICogdGhlIGN1cnJlbnQgYmxvY2sgc3RhdGUuXG4gKiBUaGlzIGZ1bmN0aW9uIGRvZXMgbm90IGluc2VydCBuZXcgc3RyaW5ncyBpbiB0aGUgZGljdGlvbmFyeSBzaW5jZVxuICogdW5jb21wcmVzc2libGUgZGF0YSBpcyBwcm9iYWJseSBub3QgdXNlZnVsLiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWRcbiAqIG9ubHkgZm9yIHRoZSBsZXZlbD0wIGNvbXByZXNzaW9uIG9wdGlvbi5cbiAqIE5PVEU6IHRoaXMgZnVuY3Rpb24gc2hvdWxkIGJlIG9wdGltaXplZCB0byBhdm9pZCBleHRyYSBjb3B5aW5nIGZyb21cbiAqIHdpbmRvdyB0byBwZW5kaW5nX2J1Zi5cbiAqL1xuZnVuY3Rpb24gZGVmbGF0ZV9zdG9yZWQocywgZmx1c2gpIHtcbiAgLyogU3RvcmVkIGJsb2NrcyBhcmUgbGltaXRlZCB0byAweGZmZmYgYnl0ZXMsIHBlbmRpbmdfYnVmIGlzIGxpbWl0ZWRcbiAgICogdG8gcGVuZGluZ19idWZfc2l6ZSwgYW5kIGVhY2ggc3RvcmVkIGJsb2NrIGhhcyBhIDUgYnl0ZSBoZWFkZXI6XG4gICAqL1xuICB2YXIgbWF4X2Jsb2NrX3NpemUgPSAweGZmZmY7XG5cbiAgaWYgKG1heF9ibG9ja19zaXplID4gcy5wZW5kaW5nX2J1Zl9zaXplIC0gNSkge1xuICAgIG1heF9ibG9ja19zaXplID0gcy5wZW5kaW5nX2J1Zl9zaXplIC0gNTtcbiAgfVxuXG4gIC8qIENvcHkgYXMgbXVjaCBhcyBwb3NzaWJsZSBmcm9tIGlucHV0IHRvIG91dHB1dDogKi9cbiAgZm9yICg7Oykge1xuICAgIC8qIEZpbGwgdGhlIHdpbmRvdyBhcyBtdWNoIGFzIHBvc3NpYmxlOiAqL1xuICAgIGlmIChzLmxvb2thaGVhZCA8PSAxKSB7XG5cbiAgICAgIC8vQXNzZXJ0KHMtPnN0cnN0YXJ0IDwgcy0+d19zaXplK01BWF9ESVNUKHMpIHx8XG4gICAgICAvLyAgcy0+YmxvY2tfc3RhcnQgPj0gKGxvbmcpcy0+d19zaXplLCBcInNsaWRlIHRvbyBsYXRlXCIpO1xuLy8gICAgICBpZiAoIShzLnN0cnN0YXJ0IDwgcy53X3NpemUgKyAocy53X3NpemUgLSBNSU5fTE9PS0FIRUFEKSB8fFxuLy8gICAgICAgIHMuYmxvY2tfc3RhcnQgPj0gcy53X3NpemUpKSB7XG4vLyAgICAgICAgdGhyb3cgIG5ldyBFcnJvcihcInNsaWRlIHRvbyBsYXRlXCIpO1xuLy8gICAgICB9XG5cbiAgICAgIGZpbGxfd2luZG93KHMpO1xuICAgICAgaWYgKHMubG9va2FoZWFkID09PSAwICYmIGZsdXNoID09PSBaX05PX0ZMVVNIKSB7XG4gICAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgICB9XG5cbiAgICAgIGlmIChzLmxvb2thaGVhZCA9PT0gMCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIC8qIGZsdXNoIHRoZSBjdXJyZW50IGJsb2NrICovXG4gICAgfVxuICAgIC8vQXNzZXJ0KHMtPmJsb2NrX3N0YXJ0ID49IDBMLCBcImJsb2NrIGdvbmVcIik7XG4vLyAgICBpZiAocy5ibG9ja19zdGFydCA8IDApIHRocm93IG5ldyBFcnJvcihcImJsb2NrIGdvbmVcIik7XG5cbiAgICBzLnN0cnN0YXJ0ICs9IHMubG9va2FoZWFkO1xuICAgIHMubG9va2FoZWFkID0gMDtcblxuICAgIC8qIEVtaXQgYSBzdG9yZWQgYmxvY2sgaWYgcGVuZGluZ19idWYgd2lsbCBiZSBmdWxsOiAqL1xuICAgIHZhciBtYXhfc3RhcnQgPSBzLmJsb2NrX3N0YXJ0ICsgbWF4X2Jsb2NrX3NpemU7XG5cbiAgICBpZiAocy5zdHJzdGFydCA9PT0gMCB8fCBzLnN0cnN0YXJ0ID49IG1heF9zdGFydCkge1xuICAgICAgLyogc3Ryc3RhcnQgPT0gMCBpcyBwb3NzaWJsZSB3aGVuIHdyYXBhcm91bmQgb24gMTYtYml0IG1hY2hpbmUgKi9cbiAgICAgIHMubG9va2FoZWFkID0gcy5zdHJzdGFydCAtIG1heF9zdGFydDtcbiAgICAgIHMuc3Ryc3RhcnQgPSBtYXhfc3RhcnQ7XG4gICAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDApOyAqKiovXG4gICAgICBmbHVzaF9ibG9ja19vbmx5KHMsIGZhbHNlKTtcbiAgICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgICB9XG4gICAgICAvKioqL1xuXG5cbiAgICB9XG4gICAgLyogRmx1c2ggaWYgd2UgbWF5IGhhdmUgdG8gc2xpZGUsIG90aGVyd2lzZSBibG9ja19zdGFydCBtYXkgYmVjb21lXG4gICAgICogbmVnYXRpdmUgYW5kIHRoZSBkYXRhIHdpbGwgYmUgZ29uZTpcbiAgICAgKi9cbiAgICBpZiAocy5zdHJzdGFydCAtIHMuYmxvY2tfc3RhcnQgPj0gKHMud19zaXplIC0gTUlOX0xPT0tBSEVBRCkpIHtcbiAgICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIC8qKiovXG4gICAgfVxuICB9XG5cbiAgcy5pbnNlcnQgPSAwO1xuXG4gIGlmIChmbHVzaCA9PT0gWl9GSU5JU0gpIHtcbiAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDEpOyAqKiovXG4gICAgZmx1c2hfYmxvY2tfb25seShzLCB0cnVlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX0ZJTklTSF9TVEFSVEVEO1xuICAgIH1cbiAgICAvKioqL1xuICAgIHJldHVybiBCU19GSU5JU0hfRE9ORTtcbiAgfVxuXG4gIGlmIChzLnN0cnN0YXJ0ID4gcy5ibG9ja19zdGFydCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIGZhbHNlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICB9XG4gICAgLyoqKi9cbiAgfVxuXG4gIHJldHVybiBCU19ORUVEX01PUkU7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ29tcHJlc3MgYXMgbXVjaCBhcyBwb3NzaWJsZSBmcm9tIHRoZSBpbnB1dCBzdHJlYW0sIHJldHVybiB0aGUgY3VycmVudFxuICogYmxvY2sgc3RhdGUuXG4gKiBUaGlzIGZ1bmN0aW9uIGRvZXMgbm90IHBlcmZvcm0gbGF6eSBldmFsdWF0aW9uIG9mIG1hdGNoZXMgYW5kIGluc2VydHNcbiAqIG5ldyBzdHJpbmdzIGluIHRoZSBkaWN0aW9uYXJ5IG9ubHkgZm9yIHVubWF0Y2hlZCBzdHJpbmdzIG9yIGZvciBzaG9ydFxuICogbWF0Y2hlcy4gSXQgaXMgdXNlZCBvbmx5IGZvciB0aGUgZmFzdCBjb21wcmVzc2lvbiBvcHRpb25zLlxuICovXG5mdW5jdGlvbiBkZWZsYXRlX2Zhc3QocywgZmx1c2gpIHtcbiAgdmFyIGhhc2hfaGVhZDsgICAgICAgIC8qIGhlYWQgb2YgdGhlIGhhc2ggY2hhaW4gKi9cbiAgdmFyIGJmbHVzaDsgICAgICAgICAgIC8qIHNldCBpZiBjdXJyZW50IGJsb2NrIG11c3QgYmUgZmx1c2hlZCAqL1xuXG4gIGZvciAoOzspIHtcbiAgICAvKiBNYWtlIHN1cmUgdGhhdCB3ZSBhbHdheXMgaGF2ZSBlbm91Z2ggbG9va2FoZWFkLCBleGNlcHRcbiAgICAgKiBhdCB0aGUgZW5kIG9mIHRoZSBpbnB1dCBmaWxlLiBXZSBuZWVkIE1BWF9NQVRDSCBieXRlc1xuICAgICAqIGZvciB0aGUgbmV4dCBtYXRjaCwgcGx1cyBNSU5fTUFUQ0ggYnl0ZXMgdG8gaW5zZXJ0IHRoZVxuICAgICAqIHN0cmluZyBmb2xsb3dpbmcgdGhlIG5leHQgbWF0Y2guXG4gICAgICovXG4gICAgaWYgKHMubG9va2FoZWFkIDwgTUlOX0xPT0tBSEVBRCkge1xuICAgICAgZmlsbF93aW5kb3cocyk7XG4gICAgICBpZiAocy5sb29rYWhlYWQgPCBNSU5fTE9PS0FIRUFEICYmIGZsdXNoID09PSBaX05PX0ZMVVNIKSB7XG4gICAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgICB9XG4gICAgICBpZiAocy5sb29rYWhlYWQgPT09IDApIHtcbiAgICAgICAgYnJlYWs7IC8qIGZsdXNoIHRoZSBjdXJyZW50IGJsb2NrICovXG4gICAgICB9XG4gICAgfVxuXG4gICAgLyogSW5zZXJ0IHRoZSBzdHJpbmcgd2luZG93W3N0cnN0YXJ0IC4uIHN0cnN0YXJ0KzJdIGluIHRoZVxuICAgICAqIGRpY3Rpb25hcnksIGFuZCBzZXQgaGFzaF9oZWFkIHRvIHRoZSBoZWFkIG9mIHRoZSBoYXNoIGNoYWluOlxuICAgICAqL1xuICAgIGhhc2hfaGVhZCA9IDAvKk5JTCovO1xuICAgIGlmIChzLmxvb2thaGVhZCA+PSBNSU5fTUFUQ0gpIHtcbiAgICAgIC8qKiogSU5TRVJUX1NUUklORyhzLCBzLnN0cnN0YXJ0LCBoYXNoX2hlYWQpOyAqKiovXG4gICAgICBzLmluc19oID0gKChzLmluc19oIDw8IHMuaGFzaF9zaGlmdCkgXiBzLndpbmRvd1tzLnN0cnN0YXJ0ICsgTUlOX01BVENIIC0gMV0pICYgcy5oYXNoX21hc2s7XG4gICAgICBoYXNoX2hlYWQgPSBzLnByZXZbcy5zdHJzdGFydCAmIHMud19tYXNrXSA9IHMuaGVhZFtzLmluc19oXTtcbiAgICAgIHMuaGVhZFtzLmluc19oXSA9IHMuc3Ryc3RhcnQ7XG4gICAgICAvKioqL1xuICAgIH1cblxuICAgIC8qIEZpbmQgdGhlIGxvbmdlc3QgbWF0Y2gsIGRpc2NhcmRpbmcgdGhvc2UgPD0gcHJldl9sZW5ndGguXG4gICAgICogQXQgdGhpcyBwb2ludCB3ZSBoYXZlIGFsd2F5cyBtYXRjaF9sZW5ndGggPCBNSU5fTUFUQ0hcbiAgICAgKi9cbiAgICBpZiAoaGFzaF9oZWFkICE9PSAwLypOSUwqLyAmJiAoKHMuc3Ryc3RhcnQgLSBoYXNoX2hlYWQpIDw9IChzLndfc2l6ZSAtIE1JTl9MT09LQUhFQUQpKSkge1xuICAgICAgLyogVG8gc2ltcGxpZnkgdGhlIGNvZGUsIHdlIHByZXZlbnQgbWF0Y2hlcyB3aXRoIHRoZSBzdHJpbmdcbiAgICAgICAqIG9mIHdpbmRvdyBpbmRleCAwIChpbiBwYXJ0aWN1bGFyIHdlIGhhdmUgdG8gYXZvaWQgYSBtYXRjaFxuICAgICAgICogb2YgdGhlIHN0cmluZyB3aXRoIGl0c2VsZiBhdCB0aGUgc3RhcnQgb2YgdGhlIGlucHV0IGZpbGUpLlxuICAgICAgICovXG4gICAgICBzLm1hdGNoX2xlbmd0aCA9IGxvbmdlc3RfbWF0Y2gocywgaGFzaF9oZWFkKTtcbiAgICAgIC8qIGxvbmdlc3RfbWF0Y2goKSBzZXRzIG1hdGNoX3N0YXJ0ICovXG4gICAgfVxuICAgIGlmIChzLm1hdGNoX2xlbmd0aCA+PSBNSU5fTUFUQ0gpIHtcbiAgICAgIC8vIGNoZWNrX21hdGNoKHMsIHMuc3Ryc3RhcnQsIHMubWF0Y2hfc3RhcnQsIHMubWF0Y2hfbGVuZ3RoKTsgLy8gZm9yIGRlYnVnIG9ubHlcblxuICAgICAgLyoqKiBfdHJfdGFsbHlfZGlzdChzLCBzLnN0cnN0YXJ0IC0gcy5tYXRjaF9zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgIHMubWF0Y2hfbGVuZ3RoIC0gTUlOX01BVENILCBiZmx1c2gpOyAqKiovXG4gICAgICBiZmx1c2ggPSB0cmVlcy5fdHJfdGFsbHkocywgcy5zdHJzdGFydCAtIHMubWF0Y2hfc3RhcnQsIHMubWF0Y2hfbGVuZ3RoIC0gTUlOX01BVENIKTtcblxuICAgICAgcy5sb29rYWhlYWQgLT0gcy5tYXRjaF9sZW5ndGg7XG5cbiAgICAgIC8qIEluc2VydCBuZXcgc3RyaW5ncyBpbiB0aGUgaGFzaCB0YWJsZSBvbmx5IGlmIHRoZSBtYXRjaCBsZW5ndGhcbiAgICAgICAqIGlzIG5vdCB0b28gbGFyZ2UuIFRoaXMgc2F2ZXMgdGltZSBidXQgZGVncmFkZXMgY29tcHJlc3Npb24uXG4gICAgICAgKi9cbiAgICAgIGlmIChzLm1hdGNoX2xlbmd0aCA8PSBzLm1heF9sYXp5X21hdGNoLyptYXhfaW5zZXJ0X2xlbmd0aCovICYmIHMubG9va2FoZWFkID49IE1JTl9NQVRDSCkge1xuICAgICAgICBzLm1hdGNoX2xlbmd0aC0tOyAvKiBzdHJpbmcgYXQgc3Ryc3RhcnQgYWxyZWFkeSBpbiB0YWJsZSAqL1xuICAgICAgICBkbyB7XG4gICAgICAgICAgcy5zdHJzdGFydCsrO1xuICAgICAgICAgIC8qKiogSU5TRVJUX1NUUklORyhzLCBzLnN0cnN0YXJ0LCBoYXNoX2hlYWQpOyAqKiovXG4gICAgICAgICAgcy5pbnNfaCA9ICgocy5pbnNfaCA8PCBzLmhhc2hfc2hpZnQpIF4gcy53aW5kb3dbcy5zdHJzdGFydCArIE1JTl9NQVRDSCAtIDFdKSAmIHMuaGFzaF9tYXNrO1xuICAgICAgICAgIGhhc2hfaGVhZCA9IHMucHJldltzLnN0cnN0YXJ0ICYgcy53X21hc2tdID0gcy5oZWFkW3MuaW5zX2hdO1xuICAgICAgICAgIHMuaGVhZFtzLmluc19oXSA9IHMuc3Ryc3RhcnQ7XG4gICAgICAgICAgLyoqKi9cbiAgICAgICAgICAvKiBzdHJzdGFydCBuZXZlciBleGNlZWRzIFdTSVpFLU1BWF9NQVRDSCwgc28gdGhlcmUgYXJlXG4gICAgICAgICAgICogYWx3YXlzIE1JTl9NQVRDSCBieXRlcyBhaGVhZC5cbiAgICAgICAgICAgKi9cbiAgICAgICAgfSB3aGlsZSAoLS1zLm1hdGNoX2xlbmd0aCAhPT0gMCk7XG4gICAgICAgIHMuc3Ryc3RhcnQrKztcbiAgICAgIH0gZWxzZVxuICAgICAge1xuICAgICAgICBzLnN0cnN0YXJ0ICs9IHMubWF0Y2hfbGVuZ3RoO1xuICAgICAgICBzLm1hdGNoX2xlbmd0aCA9IDA7XG4gICAgICAgIHMuaW5zX2ggPSBzLndpbmRvd1tzLnN0cnN0YXJ0XTtcbiAgICAgICAgLyogVVBEQVRFX0hBU0gocywgcy5pbnNfaCwgcy53aW5kb3dbcy5zdHJzdGFydCsxXSk7ICovXG4gICAgICAgIHMuaW5zX2ggPSAoKHMuaW5zX2ggPDwgcy5oYXNoX3NoaWZ0KSBeIHMud2luZG93W3Muc3Ryc3RhcnQgKyAxXSkgJiBzLmhhc2hfbWFzaztcblxuLy8jaWYgTUlOX01BVENIICE9IDNcbi8vICAgICAgICAgICAgICAgIENhbGwgVVBEQVRFX0hBU0goKSBNSU5fTUFUQ0gtMyBtb3JlIHRpbWVzXG4vLyNlbmRpZlxuICAgICAgICAvKiBJZiBsb29rYWhlYWQgPCBNSU5fTUFUQ0gsIGluc19oIGlzIGdhcmJhZ2UsIGJ1dCBpdCBkb2VzIG5vdFxuICAgICAgICAgKiBtYXR0ZXIgc2luY2UgaXQgd2lsbCBiZSByZWNvbXB1dGVkIGF0IG5leHQgZGVmbGF0ZSBjYWxsLlxuICAgICAgICAgKi9cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLyogTm8gbWF0Y2gsIG91dHB1dCBhIGxpdGVyYWwgYnl0ZSAqL1xuICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsXCIlY1wiLCBzLndpbmRvd1tzLnN0cnN0YXJ0XSkpO1xuICAgICAgLyoqKiBfdHJfdGFsbHlfbGl0KHMsIHMud2luZG93W3Muc3Ryc3RhcnRdLCBiZmx1c2gpOyAqKiovXG4gICAgICBiZmx1c2ggPSB0cmVlcy5fdHJfdGFsbHkocywgMCwgcy53aW5kb3dbcy5zdHJzdGFydF0pO1xuXG4gICAgICBzLmxvb2thaGVhZC0tO1xuICAgICAgcy5zdHJzdGFydCsrO1xuICAgIH1cbiAgICBpZiAoYmZsdXNoKSB7XG4gICAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDApOyAqKiovXG4gICAgICBmbHVzaF9ibG9ja19vbmx5KHMsIGZhbHNlKTtcbiAgICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgICB9XG4gICAgICAvKioqL1xuICAgIH1cbiAgfVxuICBzLmluc2VydCA9ICgocy5zdHJzdGFydCA8IChNSU5fTUFUQ0ggLSAxKSkgPyBzLnN0cnN0YXJ0IDogTUlOX01BVENIIC0gMSk7XG4gIGlmIChmbHVzaCA9PT0gWl9GSU5JU0gpIHtcbiAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDEpOyAqKiovXG4gICAgZmx1c2hfYmxvY2tfb25seShzLCB0cnVlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX0ZJTklTSF9TVEFSVEVEO1xuICAgIH1cbiAgICAvKioqL1xuICAgIHJldHVybiBCU19GSU5JU0hfRE9ORTtcbiAgfVxuICBpZiAocy5sYXN0X2xpdCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIGZhbHNlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICB9XG4gICAgLyoqKi9cbiAgfVxuICByZXR1cm4gQlNfQkxPQ0tfRE9ORTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBTYW1lIGFzIGFib3ZlLCBidXQgYWNoaWV2ZXMgYmV0dGVyIGNvbXByZXNzaW9uLiBXZSB1c2UgYSBsYXp5XG4gKiBldmFsdWF0aW9uIGZvciBtYXRjaGVzOiBhIG1hdGNoIGlzIGZpbmFsbHkgYWRvcHRlZCBvbmx5IGlmIHRoZXJlIGlzXG4gKiBubyBiZXR0ZXIgbWF0Y2ggYXQgdGhlIG5leHQgd2luZG93IHBvc2l0aW9uLlxuICovXG5mdW5jdGlvbiBkZWZsYXRlX3Nsb3cocywgZmx1c2gpIHtcbiAgdmFyIGhhc2hfaGVhZDsgICAgICAgICAgLyogaGVhZCBvZiBoYXNoIGNoYWluICovXG4gIHZhciBiZmx1c2g7ICAgICAgICAgICAgICAvKiBzZXQgaWYgY3VycmVudCBibG9jayBtdXN0IGJlIGZsdXNoZWQgKi9cblxuICB2YXIgbWF4X2luc2VydDtcblxuICAvKiBQcm9jZXNzIHRoZSBpbnB1dCBibG9jay4gKi9cbiAgZm9yICg7Oykge1xuICAgIC8qIE1ha2Ugc3VyZSB0aGF0IHdlIGFsd2F5cyBoYXZlIGVub3VnaCBsb29rYWhlYWQsIGV4Y2VwdFxuICAgICAqIGF0IHRoZSBlbmQgb2YgdGhlIGlucHV0IGZpbGUuIFdlIG5lZWQgTUFYX01BVENIIGJ5dGVzXG4gICAgICogZm9yIHRoZSBuZXh0IG1hdGNoLCBwbHVzIE1JTl9NQVRDSCBieXRlcyB0byBpbnNlcnQgdGhlXG4gICAgICogc3RyaW5nIGZvbGxvd2luZyB0aGUgbmV4dCBtYXRjaC5cbiAgICAgKi9cbiAgICBpZiAocy5sb29rYWhlYWQgPCBNSU5fTE9PS0FIRUFEKSB7XG4gICAgICBmaWxsX3dpbmRvdyhzKTtcbiAgICAgIGlmIChzLmxvb2thaGVhZCA8IE1JTl9MT09LQUhFQUQgJiYgZmx1c2ggPT09IFpfTk9fRkxVU0gpIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIGlmIChzLmxvb2thaGVhZCA9PT0gMCkgeyBicmVhazsgfSAvKiBmbHVzaCB0aGUgY3VycmVudCBibG9jayAqL1xuICAgIH1cblxuICAgIC8qIEluc2VydCB0aGUgc3RyaW5nIHdpbmRvd1tzdHJzdGFydCAuLiBzdHJzdGFydCsyXSBpbiB0aGVcbiAgICAgKiBkaWN0aW9uYXJ5LCBhbmQgc2V0IGhhc2hfaGVhZCB0byB0aGUgaGVhZCBvZiB0aGUgaGFzaCBjaGFpbjpcbiAgICAgKi9cbiAgICBoYXNoX2hlYWQgPSAwLypOSUwqLztcbiAgICBpZiAocy5sb29rYWhlYWQgPj0gTUlOX01BVENIKSB7XG4gICAgICAvKioqIElOU0VSVF9TVFJJTkcocywgcy5zdHJzdGFydCwgaGFzaF9oZWFkKTsgKioqL1xuICAgICAgcy5pbnNfaCA9ICgocy5pbnNfaCA8PCBzLmhhc2hfc2hpZnQpIF4gcy53aW5kb3dbcy5zdHJzdGFydCArIE1JTl9NQVRDSCAtIDFdKSAmIHMuaGFzaF9tYXNrO1xuICAgICAgaGFzaF9oZWFkID0gcy5wcmV2W3Muc3Ryc3RhcnQgJiBzLndfbWFza10gPSBzLmhlYWRbcy5pbnNfaF07XG4gICAgICBzLmhlYWRbcy5pbnNfaF0gPSBzLnN0cnN0YXJ0O1xuICAgICAgLyoqKi9cbiAgICB9XG5cbiAgICAvKiBGaW5kIHRoZSBsb25nZXN0IG1hdGNoLCBkaXNjYXJkaW5nIHRob3NlIDw9IHByZXZfbGVuZ3RoLlxuICAgICAqL1xuICAgIHMucHJldl9sZW5ndGggPSBzLm1hdGNoX2xlbmd0aDtcbiAgICBzLnByZXZfbWF0Y2ggPSBzLm1hdGNoX3N0YXJ0O1xuICAgIHMubWF0Y2hfbGVuZ3RoID0gTUlOX01BVENIIC0gMTtcblxuICAgIGlmIChoYXNoX2hlYWQgIT09IDAvKk5JTCovICYmIHMucHJldl9sZW5ndGggPCBzLm1heF9sYXp5X21hdGNoICYmXG4gICAgICAgIHMuc3Ryc3RhcnQgLSBoYXNoX2hlYWQgPD0gKHMud19zaXplIC0gTUlOX0xPT0tBSEVBRCkvKk1BWF9ESVNUKHMpKi8pIHtcbiAgICAgIC8qIFRvIHNpbXBsaWZ5IHRoZSBjb2RlLCB3ZSBwcmV2ZW50IG1hdGNoZXMgd2l0aCB0aGUgc3RyaW5nXG4gICAgICAgKiBvZiB3aW5kb3cgaW5kZXggMCAoaW4gcGFydGljdWxhciB3ZSBoYXZlIHRvIGF2b2lkIGEgbWF0Y2hcbiAgICAgICAqIG9mIHRoZSBzdHJpbmcgd2l0aCBpdHNlbGYgYXQgdGhlIHN0YXJ0IG9mIHRoZSBpbnB1dCBmaWxlKS5cbiAgICAgICAqL1xuICAgICAgcy5tYXRjaF9sZW5ndGggPSBsb25nZXN0X21hdGNoKHMsIGhhc2hfaGVhZCk7XG4gICAgICAvKiBsb25nZXN0X21hdGNoKCkgc2V0cyBtYXRjaF9zdGFydCAqL1xuXG4gICAgICBpZiAocy5tYXRjaF9sZW5ndGggPD0gNSAmJlxuICAgICAgICAgKHMuc3RyYXRlZ3kgPT09IFpfRklMVEVSRUQgfHwgKHMubWF0Y2hfbGVuZ3RoID09PSBNSU5fTUFUQ0ggJiYgcy5zdHJzdGFydCAtIHMubWF0Y2hfc3RhcnQgPiA0MDk2LypUT09fRkFSKi8pKSkge1xuXG4gICAgICAgIC8qIElmIHByZXZfbWF0Y2ggaXMgYWxzbyBNSU5fTUFUQ0gsIG1hdGNoX3N0YXJ0IGlzIGdhcmJhZ2VcbiAgICAgICAgICogYnV0IHdlIHdpbGwgaWdub3JlIHRoZSBjdXJyZW50IG1hdGNoIGFueXdheS5cbiAgICAgICAgICovXG4gICAgICAgIHMubWF0Y2hfbGVuZ3RoID0gTUlOX01BVENIIC0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgLyogSWYgdGhlcmUgd2FzIGEgbWF0Y2ggYXQgdGhlIHByZXZpb3VzIHN0ZXAgYW5kIHRoZSBjdXJyZW50XG4gICAgICogbWF0Y2ggaXMgbm90IGJldHRlciwgb3V0cHV0IHRoZSBwcmV2aW91cyBtYXRjaDpcbiAgICAgKi9cbiAgICBpZiAocy5wcmV2X2xlbmd0aCA+PSBNSU5fTUFUQ0ggJiYgcy5tYXRjaF9sZW5ndGggPD0gcy5wcmV2X2xlbmd0aCkge1xuICAgICAgbWF4X2luc2VydCA9IHMuc3Ryc3RhcnQgKyBzLmxvb2thaGVhZCAtIE1JTl9NQVRDSDtcbiAgICAgIC8qIERvIG5vdCBpbnNlcnQgc3RyaW5ncyBpbiBoYXNoIHRhYmxlIGJleW9uZCB0aGlzLiAqL1xuXG4gICAgICAvL2NoZWNrX21hdGNoKHMsIHMuc3Ryc3RhcnQtMSwgcy5wcmV2X21hdGNoLCBzLnByZXZfbGVuZ3RoKTtcblxuICAgICAgLyoqKl90cl90YWxseV9kaXN0KHMsIHMuc3Ryc3RhcnQgLSAxIC0gcy5wcmV2X21hdGNoLFxuICAgICAgICAgICAgICAgICAgICAgcy5wcmV2X2xlbmd0aCAtIE1JTl9NQVRDSCwgYmZsdXNoKTsqKiovXG4gICAgICBiZmx1c2ggPSB0cmVlcy5fdHJfdGFsbHkocywgcy5zdHJzdGFydCAtIDEgLSBzLnByZXZfbWF0Y2gsIHMucHJldl9sZW5ndGggLSBNSU5fTUFUQ0gpO1xuICAgICAgLyogSW5zZXJ0IGluIGhhc2ggdGFibGUgYWxsIHN0cmluZ3MgdXAgdG8gdGhlIGVuZCBvZiB0aGUgbWF0Y2guXG4gICAgICAgKiBzdHJzdGFydC0xIGFuZCBzdHJzdGFydCBhcmUgYWxyZWFkeSBpbnNlcnRlZC4gSWYgdGhlcmUgaXMgbm90XG4gICAgICAgKiBlbm91Z2ggbG9va2FoZWFkLCB0aGUgbGFzdCB0d28gc3RyaW5ncyBhcmUgbm90IGluc2VydGVkIGluXG4gICAgICAgKiB0aGUgaGFzaCB0YWJsZS5cbiAgICAgICAqL1xuICAgICAgcy5sb29rYWhlYWQgLT0gcy5wcmV2X2xlbmd0aCAtIDE7XG4gICAgICBzLnByZXZfbGVuZ3RoIC09IDI7XG4gICAgICBkbyB7XG4gICAgICAgIGlmICgrK3Muc3Ryc3RhcnQgPD0gbWF4X2luc2VydCkge1xuICAgICAgICAgIC8qKiogSU5TRVJUX1NUUklORyhzLCBzLnN0cnN0YXJ0LCBoYXNoX2hlYWQpOyAqKiovXG4gICAgICAgICAgcy5pbnNfaCA9ICgocy5pbnNfaCA8PCBzLmhhc2hfc2hpZnQpIF4gcy53aW5kb3dbcy5zdHJzdGFydCArIE1JTl9NQVRDSCAtIDFdKSAmIHMuaGFzaF9tYXNrO1xuICAgICAgICAgIGhhc2hfaGVhZCA9IHMucHJldltzLnN0cnN0YXJ0ICYgcy53X21hc2tdID0gcy5oZWFkW3MuaW5zX2hdO1xuICAgICAgICAgIHMuaGVhZFtzLmluc19oXSA9IHMuc3Ryc3RhcnQ7XG4gICAgICAgICAgLyoqKi9cbiAgICAgICAgfVxuICAgICAgfSB3aGlsZSAoLS1zLnByZXZfbGVuZ3RoICE9PSAwKTtcbiAgICAgIHMubWF0Y2hfYXZhaWxhYmxlID0gMDtcbiAgICAgIHMubWF0Y2hfbGVuZ3RoID0gTUlOX01BVENIIC0gMTtcbiAgICAgIHMuc3Ryc3RhcnQrKztcblxuICAgICAgaWYgKGJmbHVzaCkge1xuICAgICAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDApOyAqKiovXG4gICAgICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgICAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgICAgIH1cbiAgICAgICAgLyoqKi9cbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAocy5tYXRjaF9hdmFpbGFibGUpIHtcbiAgICAgIC8qIElmIHRoZXJlIHdhcyBubyBtYXRjaCBhdCB0aGUgcHJldmlvdXMgcG9zaXRpb24sIG91dHB1dCBhXG4gICAgICAgKiBzaW5nbGUgbGl0ZXJhbC4gSWYgdGhlcmUgd2FzIGEgbWF0Y2ggYnV0IHRoZSBjdXJyZW50IG1hdGNoXG4gICAgICAgKiBpcyBsb25nZXIsIHRydW5jYXRlIHRoZSBwcmV2aW91cyBtYXRjaCB0byBhIHNpbmdsZSBsaXRlcmFsLlxuICAgICAgICovXG4gICAgICAvL1RyYWNldnYoKHN0ZGVycixcIiVjXCIsIHMtPndpbmRvd1tzLT5zdHJzdGFydC0xXSkpO1xuICAgICAgLyoqKiBfdHJfdGFsbHlfbGl0KHMsIHMud2luZG93W3Muc3Ryc3RhcnQtMV0sIGJmbHVzaCk7ICoqKi9cbiAgICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCAwLCBzLndpbmRvd1tzLnN0cnN0YXJ0IC0gMV0pO1xuXG4gICAgICBpZiAoYmZsdXNoKSB7XG4gICAgICAgIC8qKiogRkxVU0hfQkxPQ0tfT05MWShzLCAwKSAqKiovXG4gICAgICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgICAgICAvKioqL1xuICAgICAgfVxuICAgICAgcy5zdHJzdGFydCsrO1xuICAgICAgcy5sb29rYWhlYWQtLTtcbiAgICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8qIFRoZXJlIGlzIG5vIHByZXZpb3VzIG1hdGNoIHRvIGNvbXBhcmUgd2l0aCwgd2FpdCBmb3JcbiAgICAgICAqIHRoZSBuZXh0IHN0ZXAgdG8gZGVjaWRlLlxuICAgICAgICovXG4gICAgICBzLm1hdGNoX2F2YWlsYWJsZSA9IDE7XG4gICAgICBzLnN0cnN0YXJ0Kys7XG4gICAgICBzLmxvb2thaGVhZC0tO1xuICAgIH1cbiAgfVxuICAvL0Fzc2VydCAoZmx1c2ggIT0gWl9OT19GTFVTSCwgXCJubyBmbHVzaD9cIik7XG4gIGlmIChzLm1hdGNoX2F2YWlsYWJsZSkge1xuICAgIC8vVHJhY2V2digoc3RkZXJyLFwiJWNcIiwgcy0+d2luZG93W3MtPnN0cnN0YXJ0LTFdKSk7XG4gICAgLyoqKiBfdHJfdGFsbHlfbGl0KHMsIHMud2luZG93W3Muc3Ryc3RhcnQtMV0sIGJmbHVzaCk7ICoqKi9cbiAgICBiZmx1c2ggPSB0cmVlcy5fdHJfdGFsbHkocywgMCwgcy53aW5kb3dbcy5zdHJzdGFydCAtIDFdKTtcblxuICAgIHMubWF0Y2hfYXZhaWxhYmxlID0gMDtcbiAgfVxuICBzLmluc2VydCA9IHMuc3Ryc3RhcnQgPCBNSU5fTUFUQ0ggLSAxID8gcy5zdHJzdGFydCA6IE1JTl9NQVRDSCAtIDE7XG4gIGlmIChmbHVzaCA9PT0gWl9GSU5JU0gpIHtcbiAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDEpOyAqKiovXG4gICAgZmx1c2hfYmxvY2tfb25seShzLCB0cnVlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX0ZJTklTSF9TVEFSVEVEO1xuICAgIH1cbiAgICAvKioqL1xuICAgIHJldHVybiBCU19GSU5JU0hfRE9ORTtcbiAgfVxuICBpZiAocy5sYXN0X2xpdCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIGZhbHNlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICB9XG4gICAgLyoqKi9cbiAgfVxuXG4gIHJldHVybiBCU19CTE9DS19ET05FO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogRm9yIFpfUkxFLCBzaW1wbHkgbG9vayBmb3IgcnVucyBvZiBieXRlcywgZ2VuZXJhdGUgbWF0Y2hlcyBvbmx5IG9mIGRpc3RhbmNlXG4gKiBvbmUuICBEbyBub3QgbWFpbnRhaW4gYSBoYXNoIHRhYmxlLiAgKEl0IHdpbGwgYmUgcmVnZW5lcmF0ZWQgaWYgdGhpcyBydW4gb2ZcbiAqIGRlZmxhdGUgc3dpdGNoZXMgYXdheSBmcm9tIFpfUkxFLilcbiAqL1xuZnVuY3Rpb24gZGVmbGF0ZV9ybGUocywgZmx1c2gpIHtcbiAgdmFyIGJmbHVzaDsgICAgICAgICAgICAvKiBzZXQgaWYgY3VycmVudCBibG9jayBtdXN0IGJlIGZsdXNoZWQgKi9cbiAgdmFyIHByZXY7ICAgICAgICAgICAgICAvKiBieXRlIGF0IGRpc3RhbmNlIG9uZSB0byBtYXRjaCAqL1xuICB2YXIgc2Nhbiwgc3RyZW5kOyAgICAgIC8qIHNjYW4gZ29lcyB1cCB0byBzdHJlbmQgZm9yIGxlbmd0aCBvZiBydW4gKi9cblxuICB2YXIgX3dpbiA9IHMud2luZG93O1xuXG4gIGZvciAoOzspIHtcbiAgICAvKiBNYWtlIHN1cmUgdGhhdCB3ZSBhbHdheXMgaGF2ZSBlbm91Z2ggbG9va2FoZWFkLCBleGNlcHRcbiAgICAgKiBhdCB0aGUgZW5kIG9mIHRoZSBpbnB1dCBmaWxlLiBXZSBuZWVkIE1BWF9NQVRDSCBieXRlc1xuICAgICAqIGZvciB0aGUgbG9uZ2VzdCBydW4sIHBsdXMgb25lIGZvciB0aGUgdW5yb2xsZWQgbG9vcC5cbiAgICAgKi9cbiAgICBpZiAocy5sb29rYWhlYWQgPD0gTUFYX01BVENIKSB7XG4gICAgICBmaWxsX3dpbmRvdyhzKTtcbiAgICAgIGlmIChzLmxvb2thaGVhZCA8PSBNQVhfTUFUQ0ggJiYgZmx1c2ggPT09IFpfTk9fRkxVU0gpIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIGlmIChzLmxvb2thaGVhZCA9PT0gMCkgeyBicmVhazsgfSAvKiBmbHVzaCB0aGUgY3VycmVudCBibG9jayAqL1xuICAgIH1cblxuICAgIC8qIFNlZSBob3cgbWFueSB0aW1lcyB0aGUgcHJldmlvdXMgYnl0ZSByZXBlYXRzICovXG4gICAgcy5tYXRjaF9sZW5ndGggPSAwO1xuICAgIGlmIChzLmxvb2thaGVhZCA+PSBNSU5fTUFUQ0ggJiYgcy5zdHJzdGFydCA+IDApIHtcbiAgICAgIHNjYW4gPSBzLnN0cnN0YXJ0IC0gMTtcbiAgICAgIHByZXYgPSBfd2luW3NjYW5dO1xuICAgICAgaWYgKHByZXYgPT09IF93aW5bKytzY2FuXSAmJiBwcmV2ID09PSBfd2luWysrc2Nhbl0gJiYgcHJldiA9PT0gX3dpblsrK3NjYW5dKSB7XG4gICAgICAgIHN0cmVuZCA9IHMuc3Ryc3RhcnQgKyBNQVhfTUFUQ0g7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAvKmpzaGludCBub2VtcHR5OmZhbHNlKi9cbiAgICAgICAgfSB3aGlsZSAocHJldiA9PT0gX3dpblsrK3NjYW5dICYmIHByZXYgPT09IF93aW5bKytzY2FuXSAmJlxuICAgICAgICAgICAgICAgICBwcmV2ID09PSBfd2luWysrc2Nhbl0gJiYgcHJldiA9PT0gX3dpblsrK3NjYW5dICYmXG4gICAgICAgICAgICAgICAgIHByZXYgPT09IF93aW5bKytzY2FuXSAmJiBwcmV2ID09PSBfd2luWysrc2Nhbl0gJiZcbiAgICAgICAgICAgICAgICAgcHJldiA9PT0gX3dpblsrK3NjYW5dICYmIHByZXYgPT09IF93aW5bKytzY2FuXSAmJlxuICAgICAgICAgICAgICAgICBzY2FuIDwgc3RyZW5kKTtcbiAgICAgICAgcy5tYXRjaF9sZW5ndGggPSBNQVhfTUFUQ0ggLSAoc3RyZW5kIC0gc2Nhbik7XG4gICAgICAgIGlmIChzLm1hdGNoX2xlbmd0aCA+IHMubG9va2FoZWFkKSB7XG4gICAgICAgICAgcy5tYXRjaF9sZW5ndGggPSBzLmxvb2thaGVhZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy9Bc3NlcnQoc2NhbiA8PSBzLT53aW5kb3crKHVJbnQpKHMtPndpbmRvd19zaXplLTEpLCBcIndpbGQgc2NhblwiKTtcbiAgICB9XG5cbiAgICAvKiBFbWl0IG1hdGNoIGlmIGhhdmUgcnVuIG9mIE1JTl9NQVRDSCBvciBsb25nZXIsIGVsc2UgZW1pdCBsaXRlcmFsICovXG4gICAgaWYgKHMubWF0Y2hfbGVuZ3RoID49IE1JTl9NQVRDSCkge1xuICAgICAgLy9jaGVja19tYXRjaChzLCBzLnN0cnN0YXJ0LCBzLnN0cnN0YXJ0IC0gMSwgcy5tYXRjaF9sZW5ndGgpO1xuXG4gICAgICAvKioqIF90cl90YWxseV9kaXN0KHMsIDEsIHMubWF0Y2hfbGVuZ3RoIC0gTUlOX01BVENILCBiZmx1c2gpOyAqKiovXG4gICAgICBiZmx1c2ggPSB0cmVlcy5fdHJfdGFsbHkocywgMSwgcy5tYXRjaF9sZW5ndGggLSBNSU5fTUFUQ0gpO1xuXG4gICAgICBzLmxvb2thaGVhZCAtPSBzLm1hdGNoX2xlbmd0aDtcbiAgICAgIHMuc3Ryc3RhcnQgKz0gcy5tYXRjaF9sZW5ndGg7XG4gICAgICBzLm1hdGNoX2xlbmd0aCA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8qIE5vIG1hdGNoLCBvdXRwdXQgYSBsaXRlcmFsIGJ5dGUgKi9cbiAgICAgIC8vVHJhY2V2digoc3RkZXJyLFwiJWNcIiwgcy0+d2luZG93W3MtPnN0cnN0YXJ0XSkpO1xuICAgICAgLyoqKiBfdHJfdGFsbHlfbGl0KHMsIHMud2luZG93W3Muc3Ryc3RhcnRdLCBiZmx1c2gpOyAqKiovXG4gICAgICBiZmx1c2ggPSB0cmVlcy5fdHJfdGFsbHkocywgMCwgcy53aW5kb3dbcy5zdHJzdGFydF0pO1xuXG4gICAgICBzLmxvb2thaGVhZC0tO1xuICAgICAgcy5zdHJzdGFydCsrO1xuICAgIH1cbiAgICBpZiAoYmZsdXNoKSB7XG4gICAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDApOyAqKiovXG4gICAgICBmbHVzaF9ibG9ja19vbmx5KHMsIGZhbHNlKTtcbiAgICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgICB9XG4gICAgICAvKioqL1xuICAgIH1cbiAgfVxuICBzLmluc2VydCA9IDA7XG4gIGlmIChmbHVzaCA9PT0gWl9GSU5JU0gpIHtcbiAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDEpOyAqKiovXG4gICAgZmx1c2hfYmxvY2tfb25seShzLCB0cnVlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX0ZJTklTSF9TVEFSVEVEO1xuICAgIH1cbiAgICAvKioqL1xuICAgIHJldHVybiBCU19GSU5JU0hfRE9ORTtcbiAgfVxuICBpZiAocy5sYXN0X2xpdCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIGZhbHNlKTtcbiAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICB9XG4gICAgLyoqKi9cbiAgfVxuICByZXR1cm4gQlNfQkxPQ0tfRE9ORTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBGb3IgWl9IVUZGTUFOX09OTFksIGRvIG5vdCBsb29rIGZvciBtYXRjaGVzLiAgRG8gbm90IG1haW50YWluIGEgaGFzaCB0YWJsZS5cbiAqIChJdCB3aWxsIGJlIHJlZ2VuZXJhdGVkIGlmIHRoaXMgcnVuIG9mIGRlZmxhdGUgc3dpdGNoZXMgYXdheSBmcm9tIEh1ZmZtYW4uKVxuICovXG5mdW5jdGlvbiBkZWZsYXRlX2h1ZmYocywgZmx1c2gpIHtcbiAgdmFyIGJmbHVzaDsgICAgICAgICAgICAgLyogc2V0IGlmIGN1cnJlbnQgYmxvY2sgbXVzdCBiZSBmbHVzaGVkICovXG5cbiAgZm9yICg7Oykge1xuICAgIC8qIE1ha2Ugc3VyZSB0aGF0IHdlIGhhdmUgYSBsaXRlcmFsIHRvIHdyaXRlLiAqL1xuICAgIGlmIChzLmxvb2thaGVhZCA9PT0gMCkge1xuICAgICAgZmlsbF93aW5kb3cocyk7XG4gICAgICBpZiAocy5sb29rYWhlYWQgPT09IDApIHtcbiAgICAgICAgaWYgKGZsdXNoID09PSBaX05PX0ZMVVNIKSB7XG4gICAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgICAgfVxuICAgICAgICBicmVhazsgICAgICAvKiBmbHVzaCB0aGUgY3VycmVudCBibG9jayAqL1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qIE91dHB1dCBhIGxpdGVyYWwgYnl0ZSAqL1xuICAgIHMubWF0Y2hfbGVuZ3RoID0gMDtcbiAgICAvL1RyYWNldnYoKHN0ZGVycixcIiVjXCIsIHMtPndpbmRvd1tzLT5zdHJzdGFydF0pKTtcbiAgICAvKioqIF90cl90YWxseV9saXQocywgcy53aW5kb3dbcy5zdHJzdGFydF0sIGJmbHVzaCk7ICoqKi9cbiAgICBiZmx1c2ggPSB0cmVlcy5fdHJfdGFsbHkocywgMCwgcy53aW5kb3dbcy5zdHJzdGFydF0pO1xuICAgIHMubG9va2FoZWFkLS07XG4gICAgcy5zdHJzdGFydCsrO1xuICAgIGlmIChiZmx1c2gpIHtcbiAgICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIC8qKiovXG4gICAgfVxuICB9XG4gIHMuaW5zZXJ0ID0gMDtcbiAgaWYgKGZsdXNoID09PSBaX0ZJTklTSCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMSk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIHRydWUpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfRklOSVNIX1NUQVJURUQ7XG4gICAgfVxuICAgIC8qKiovXG4gICAgcmV0dXJuIEJTX0ZJTklTSF9ET05FO1xuICB9XG4gIGlmIChzLmxhc3RfbGl0KSB7XG4gICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAwKTsgKioqL1xuICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgIH1cbiAgICAvKioqL1xuICB9XG4gIHJldHVybiBCU19CTE9DS19ET05FO1xufVxuXG4vKiBWYWx1ZXMgZm9yIG1heF9sYXp5X21hdGNoLCBnb29kX21hdGNoIGFuZCBtYXhfY2hhaW5fbGVuZ3RoLCBkZXBlbmRpbmcgb25cbiAqIHRoZSBkZXNpcmVkIHBhY2sgbGV2ZWwgKDAuLjkpLiBUaGUgdmFsdWVzIGdpdmVuIGJlbG93IGhhdmUgYmVlbiB0dW5lZCB0b1xuICogZXhjbHVkZSB3b3JzdCBjYXNlIHBlcmZvcm1hbmNlIGZvciBwYXRob2xvZ2ljYWwgZmlsZXMuIEJldHRlciB2YWx1ZXMgbWF5IGJlXG4gKiBmb3VuZCBmb3Igc3BlY2lmaWMgZmlsZXMuXG4gKi9cbmZ1bmN0aW9uIENvbmZpZyhnb29kX2xlbmd0aCwgbWF4X2xhenksIG5pY2VfbGVuZ3RoLCBtYXhfY2hhaW4sIGZ1bmMpIHtcbiAgdGhpcy5nb29kX2xlbmd0aCA9IGdvb2RfbGVuZ3RoO1xuICB0aGlzLm1heF9sYXp5ID0gbWF4X2xhenk7XG4gIHRoaXMubmljZV9sZW5ndGggPSBuaWNlX2xlbmd0aDtcbiAgdGhpcy5tYXhfY2hhaW4gPSBtYXhfY2hhaW47XG4gIHRoaXMuZnVuYyA9IGZ1bmM7XG59XG5cbnZhciBjb25maWd1cmF0aW9uX3RhYmxlO1xuXG5jb25maWd1cmF0aW9uX3RhYmxlID0gW1xuICAvKiAgICAgIGdvb2QgbGF6eSBuaWNlIGNoYWluICovXG4gIG5ldyBDb25maWcoMCwgMCwgMCwgMCwgZGVmbGF0ZV9zdG9yZWQpLCAgICAgICAgICAvKiAwIHN0b3JlIG9ubHkgKi9cbiAgbmV3IENvbmZpZyg0LCA0LCA4LCA0LCBkZWZsYXRlX2Zhc3QpLCAgICAgICAgICAgIC8qIDEgbWF4IHNwZWVkLCBubyBsYXp5IG1hdGNoZXMgKi9cbiAgbmV3IENvbmZpZyg0LCA1LCAxNiwgOCwgZGVmbGF0ZV9mYXN0KSwgICAgICAgICAgIC8qIDIgKi9cbiAgbmV3IENvbmZpZyg0LCA2LCAzMiwgMzIsIGRlZmxhdGVfZmFzdCksICAgICAgICAgIC8qIDMgKi9cblxuICBuZXcgQ29uZmlnKDQsIDQsIDE2LCAxNiwgZGVmbGF0ZV9zbG93KSwgICAgICAgICAgLyogNCBsYXp5IG1hdGNoZXMgKi9cbiAgbmV3IENvbmZpZyg4LCAxNiwgMzIsIDMyLCBkZWZsYXRlX3Nsb3cpLCAgICAgICAgIC8qIDUgKi9cbiAgbmV3IENvbmZpZyg4LCAxNiwgMTI4LCAxMjgsIGRlZmxhdGVfc2xvdyksICAgICAgIC8qIDYgKi9cbiAgbmV3IENvbmZpZyg4LCAzMiwgMTI4LCAyNTYsIGRlZmxhdGVfc2xvdyksICAgICAgIC8qIDcgKi9cbiAgbmV3IENvbmZpZygzMiwgMTI4LCAyNTgsIDEwMjQsIGRlZmxhdGVfc2xvdyksICAgIC8qIDggKi9cbiAgbmV3IENvbmZpZygzMiwgMjU4LCAyNTgsIDQwOTYsIGRlZmxhdGVfc2xvdykgICAgIC8qIDkgbWF4IGNvbXByZXNzaW9uICovXG5dO1xuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogSW5pdGlhbGl6ZSB0aGUgXCJsb25nZXN0IG1hdGNoXCIgcm91dGluZXMgZm9yIGEgbmV3IHpsaWIgc3RyZWFtXG4gKi9cbmZ1bmN0aW9uIGxtX2luaXQocykge1xuICBzLndpbmRvd19zaXplID0gMiAqIHMud19zaXplO1xuXG4gIC8qKiogQ0xFQVJfSEFTSChzKTsgKioqL1xuICB6ZXJvKHMuaGVhZCk7IC8vIEZpbGwgd2l0aCBOSUwgKD0gMCk7XG5cbiAgLyogU2V0IHRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVyczpcbiAgICovXG4gIHMubWF4X2xhenlfbWF0Y2ggPSBjb25maWd1cmF0aW9uX3RhYmxlW3MubGV2ZWxdLm1heF9sYXp5O1xuICBzLmdvb2RfbWF0Y2ggPSBjb25maWd1cmF0aW9uX3RhYmxlW3MubGV2ZWxdLmdvb2RfbGVuZ3RoO1xuICBzLm5pY2VfbWF0Y2ggPSBjb25maWd1cmF0aW9uX3RhYmxlW3MubGV2ZWxdLm5pY2VfbGVuZ3RoO1xuICBzLm1heF9jaGFpbl9sZW5ndGggPSBjb25maWd1cmF0aW9uX3RhYmxlW3MubGV2ZWxdLm1heF9jaGFpbjtcblxuICBzLnN0cnN0YXJ0ID0gMDtcbiAgcy5ibG9ja19zdGFydCA9IDA7XG4gIHMubG9va2FoZWFkID0gMDtcbiAgcy5pbnNlcnQgPSAwO1xuICBzLm1hdGNoX2xlbmd0aCA9IHMucHJldl9sZW5ndGggPSBNSU5fTUFUQ0ggLSAxO1xuICBzLm1hdGNoX2F2YWlsYWJsZSA9IDA7XG4gIHMuaW5zX2ggPSAwO1xufVxuXG5cbmZ1bmN0aW9uIERlZmxhdGVTdGF0ZSgpIHtcbiAgdGhpcy5zdHJtID0gbnVsbDsgICAgICAgICAgICAvKiBwb2ludGVyIGJhY2sgdG8gdGhpcyB6bGliIHN0cmVhbSAqL1xuICB0aGlzLnN0YXR1cyA9IDA7ICAgICAgICAgICAgLyogYXMgdGhlIG5hbWUgaW1wbGllcyAqL1xuICB0aGlzLnBlbmRpbmdfYnVmID0gbnVsbDsgICAgICAvKiBvdXRwdXQgc3RpbGwgcGVuZGluZyAqL1xuICB0aGlzLnBlbmRpbmdfYnVmX3NpemUgPSAwOyAgLyogc2l6ZSBvZiBwZW5kaW5nX2J1ZiAqL1xuICB0aGlzLnBlbmRpbmdfb3V0ID0gMDsgICAgICAgLyogbmV4dCBwZW5kaW5nIGJ5dGUgdG8gb3V0cHV0IHRvIHRoZSBzdHJlYW0gKi9cbiAgdGhpcy5wZW5kaW5nID0gMDsgICAgICAgICAgIC8qIG5iIG9mIGJ5dGVzIGluIHRoZSBwZW5kaW5nIGJ1ZmZlciAqL1xuICB0aGlzLndyYXAgPSAwOyAgICAgICAgICAgICAgLyogYml0IDAgdHJ1ZSBmb3IgemxpYiwgYml0IDEgdHJ1ZSBmb3IgZ3ppcCAqL1xuICB0aGlzLmd6aGVhZCA9IG51bGw7ICAgICAgICAgLyogZ3ppcCBoZWFkZXIgaW5mb3JtYXRpb24gdG8gd3JpdGUgKi9cbiAgdGhpcy5nemluZGV4ID0gMDsgICAgICAgICAgIC8qIHdoZXJlIGluIGV4dHJhLCBuYW1lLCBvciBjb21tZW50ICovXG4gIHRoaXMubWV0aG9kID0gWl9ERUZMQVRFRDsgLyogY2FuIG9ubHkgYmUgREVGTEFURUQgKi9cbiAgdGhpcy5sYXN0X2ZsdXNoID0gLTE7ICAgLyogdmFsdWUgb2YgZmx1c2ggcGFyYW0gZm9yIHByZXZpb3VzIGRlZmxhdGUgY2FsbCAqL1xuXG4gIHRoaXMud19zaXplID0gMDsgIC8qIExaNzcgd2luZG93IHNpemUgKDMySyBieSBkZWZhdWx0KSAqL1xuICB0aGlzLndfYml0cyA9IDA7ICAvKiBsb2cyKHdfc2l6ZSkgICg4Li4xNikgKi9cbiAgdGhpcy53X21hc2sgPSAwOyAgLyogd19zaXplIC0gMSAqL1xuXG4gIHRoaXMud2luZG93ID0gbnVsbDtcbiAgLyogU2xpZGluZyB3aW5kb3cuIElucHV0IGJ5dGVzIGFyZSByZWFkIGludG8gdGhlIHNlY29uZCBoYWxmIG9mIHRoZSB3aW5kb3csXG4gICAqIGFuZCBtb3ZlIHRvIHRoZSBmaXJzdCBoYWxmIGxhdGVyIHRvIGtlZXAgYSBkaWN0aW9uYXJ5IG9mIGF0IGxlYXN0IHdTaXplXG4gICAqIGJ5dGVzLiBXaXRoIHRoaXMgb3JnYW5pemF0aW9uLCBtYXRjaGVzIGFyZSBsaW1pdGVkIHRvIGEgZGlzdGFuY2Ugb2ZcbiAgICogd1NpemUtTUFYX01BVENIIGJ5dGVzLCBidXQgdGhpcyBlbnN1cmVzIHRoYXQgSU8gaXMgYWx3YXlzXG4gICAqIHBlcmZvcm1lZCB3aXRoIGEgbGVuZ3RoIG11bHRpcGxlIG9mIHRoZSBibG9jayBzaXplLlxuICAgKi9cblxuICB0aGlzLndpbmRvd19zaXplID0gMDtcbiAgLyogQWN0dWFsIHNpemUgb2Ygd2luZG93OiAyKndTaXplLCBleGNlcHQgd2hlbiB0aGUgdXNlciBpbnB1dCBidWZmZXJcbiAgICogaXMgZGlyZWN0bHkgdXNlZCBhcyBzbGlkaW5nIHdpbmRvdy5cbiAgICovXG5cbiAgdGhpcy5wcmV2ID0gbnVsbDtcbiAgLyogTGluayB0byBvbGRlciBzdHJpbmcgd2l0aCBzYW1lIGhhc2ggaW5kZXguIFRvIGxpbWl0IHRoZSBzaXplIG9mIHRoaXNcbiAgICogYXJyYXkgdG8gNjRLLCB0aGlzIGxpbmsgaXMgbWFpbnRhaW5lZCBvbmx5IGZvciB0aGUgbGFzdCAzMksgc3RyaW5ncy5cbiAgICogQW4gaW5kZXggaW4gdGhpcyBhcnJheSBpcyB0aHVzIGEgd2luZG93IGluZGV4IG1vZHVsbyAzMksuXG4gICAqL1xuXG4gIHRoaXMuaGVhZCA9IG51bGw7ICAgLyogSGVhZHMgb2YgdGhlIGhhc2ggY2hhaW5zIG9yIE5JTC4gKi9cblxuICB0aGlzLmluc19oID0gMDsgICAgICAgLyogaGFzaCBpbmRleCBvZiBzdHJpbmcgdG8gYmUgaW5zZXJ0ZWQgKi9cbiAgdGhpcy5oYXNoX3NpemUgPSAwOyAgIC8qIG51bWJlciBvZiBlbGVtZW50cyBpbiBoYXNoIHRhYmxlICovXG4gIHRoaXMuaGFzaF9iaXRzID0gMDsgICAvKiBsb2cyKGhhc2hfc2l6ZSkgKi9cbiAgdGhpcy5oYXNoX21hc2sgPSAwOyAgIC8qIGhhc2hfc2l6ZS0xICovXG5cbiAgdGhpcy5oYXNoX3NoaWZ0ID0gMDtcbiAgLyogTnVtYmVyIG9mIGJpdHMgYnkgd2hpY2ggaW5zX2ggbXVzdCBiZSBzaGlmdGVkIGF0IGVhY2ggaW5wdXRcbiAgICogc3RlcC4gSXQgbXVzdCBiZSBzdWNoIHRoYXQgYWZ0ZXIgTUlOX01BVENIIHN0ZXBzLCB0aGUgb2xkZXN0XG4gICAqIGJ5dGUgbm8gbG9uZ2VyIHRha2VzIHBhcnQgaW4gdGhlIGhhc2gga2V5LCB0aGF0IGlzOlxuICAgKiAgIGhhc2hfc2hpZnQgKiBNSU5fTUFUQ0ggPj0gaGFzaF9iaXRzXG4gICAqL1xuXG4gIHRoaXMuYmxvY2tfc3RhcnQgPSAwO1xuICAvKiBXaW5kb3cgcG9zaXRpb24gYXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgY3VycmVudCBvdXRwdXQgYmxvY2suIEdldHNcbiAgICogbmVnYXRpdmUgd2hlbiB0aGUgd2luZG93IGlzIG1vdmVkIGJhY2t3YXJkcy5cbiAgICovXG5cbiAgdGhpcy5tYXRjaF9sZW5ndGggPSAwOyAgICAgIC8qIGxlbmd0aCBvZiBiZXN0IG1hdGNoICovXG4gIHRoaXMucHJldl9tYXRjaCA9IDA7ICAgICAgICAvKiBwcmV2aW91cyBtYXRjaCAqL1xuICB0aGlzLm1hdGNoX2F2YWlsYWJsZSA9IDA7ICAgLyogc2V0IGlmIHByZXZpb3VzIG1hdGNoIGV4aXN0cyAqL1xuICB0aGlzLnN0cnN0YXJ0ID0gMDsgICAgICAgICAgLyogc3RhcnQgb2Ygc3RyaW5nIHRvIGluc2VydCAqL1xuICB0aGlzLm1hdGNoX3N0YXJ0ID0gMDsgICAgICAgLyogc3RhcnQgb2YgbWF0Y2hpbmcgc3RyaW5nICovXG4gIHRoaXMubG9va2FoZWFkID0gMDsgICAgICAgICAvKiBudW1iZXIgb2YgdmFsaWQgYnl0ZXMgYWhlYWQgaW4gd2luZG93ICovXG5cbiAgdGhpcy5wcmV2X2xlbmd0aCA9IDA7XG4gIC8qIExlbmd0aCBvZiB0aGUgYmVzdCBtYXRjaCBhdCBwcmV2aW91cyBzdGVwLiBNYXRjaGVzIG5vdCBncmVhdGVyIHRoYW4gdGhpc1xuICAgKiBhcmUgZGlzY2FyZGVkLiBUaGlzIGlzIHVzZWQgaW4gdGhlIGxhenkgbWF0Y2ggZXZhbHVhdGlvbi5cbiAgICovXG5cbiAgdGhpcy5tYXhfY2hhaW5fbGVuZ3RoID0gMDtcbiAgLyogVG8gc3BlZWQgdXAgZGVmbGF0aW9uLCBoYXNoIGNoYWlucyBhcmUgbmV2ZXIgc2VhcmNoZWQgYmV5b25kIHRoaXNcbiAgICogbGVuZ3RoLiAgQSBoaWdoZXIgbGltaXQgaW1wcm92ZXMgY29tcHJlc3Npb24gcmF0aW8gYnV0IGRlZ3JhZGVzIHRoZVxuICAgKiBzcGVlZC5cbiAgICovXG5cbiAgdGhpcy5tYXhfbGF6eV9tYXRjaCA9IDA7XG4gIC8qIEF0dGVtcHQgdG8gZmluZCBhIGJldHRlciBtYXRjaCBvbmx5IHdoZW4gdGhlIGN1cnJlbnQgbWF0Y2ggaXMgc3RyaWN0bHlcbiAgICogc21hbGxlciB0aGFuIHRoaXMgdmFsdWUuIFRoaXMgbWVjaGFuaXNtIGlzIHVzZWQgb25seSBmb3IgY29tcHJlc3Npb25cbiAgICogbGV2ZWxzID49IDQuXG4gICAqL1xuICAvLyBUaGF0J3MgYWxpYXMgdG8gbWF4X2xhenlfbWF0Y2gsIGRvbid0IHVzZSBkaXJlY3RseVxuICAvL3RoaXMubWF4X2luc2VydF9sZW5ndGggPSAwO1xuICAvKiBJbnNlcnQgbmV3IHN0cmluZ3MgaW4gdGhlIGhhc2ggdGFibGUgb25seSBpZiB0aGUgbWF0Y2ggbGVuZ3RoIGlzIG5vdFxuICAgKiBncmVhdGVyIHRoYW4gdGhpcyBsZW5ndGguIFRoaXMgc2F2ZXMgdGltZSBidXQgZGVncmFkZXMgY29tcHJlc3Npb24uXG4gICAqIG1heF9pbnNlcnRfbGVuZ3RoIGlzIHVzZWQgb25seSBmb3IgY29tcHJlc3Npb24gbGV2ZWxzIDw9IDMuXG4gICAqL1xuXG4gIHRoaXMubGV2ZWwgPSAwOyAgICAgLyogY29tcHJlc3Npb24gbGV2ZWwgKDEuLjkpICovXG4gIHRoaXMuc3RyYXRlZ3kgPSAwOyAgLyogZmF2b3Igb3IgZm9yY2UgSHVmZm1hbiBjb2RpbmcqL1xuXG4gIHRoaXMuZ29vZF9tYXRjaCA9IDA7XG4gIC8qIFVzZSBhIGZhc3RlciBzZWFyY2ggd2hlbiB0aGUgcHJldmlvdXMgbWF0Y2ggaXMgbG9uZ2VyIHRoYW4gdGhpcyAqL1xuXG4gIHRoaXMubmljZV9tYXRjaCA9IDA7IC8qIFN0b3Agc2VhcmNoaW5nIHdoZW4gY3VycmVudCBtYXRjaCBleGNlZWRzIHRoaXMgKi9cblxuICAgICAgICAgICAgICAvKiB1c2VkIGJ5IHRyZWVzLmM6ICovXG5cbiAgLyogRGlkbid0IHVzZSBjdF9kYXRhIHR5cGVkZWYgYmVsb3cgdG8gc3VwcHJlc3MgY29tcGlsZXIgd2FybmluZyAqL1xuXG4gIC8vIHN0cnVjdCBjdF9kYXRhX3MgZHluX2x0cmVlW0hFQVBfU0laRV07ICAgLyogbGl0ZXJhbCBhbmQgbGVuZ3RoIHRyZWUgKi9cbiAgLy8gc3RydWN0IGN0X2RhdGFfcyBkeW5fZHRyZWVbMipEX0NPREVTKzFdOyAvKiBkaXN0YW5jZSB0cmVlICovXG4gIC8vIHN0cnVjdCBjdF9kYXRhX3MgYmxfdHJlZVsyKkJMX0NPREVTKzFdOyAgLyogSHVmZm1hbiB0cmVlIGZvciBiaXQgbGVuZ3RocyAqL1xuXG4gIC8vIFVzZSBmbGF0IGFycmF5IG9mIERPVUJMRSBzaXplLCB3aXRoIGludGVybGVhdmVkIGZhdGEsXG4gIC8vIGJlY2F1c2UgSlMgZG9lcyBub3Qgc3VwcG9ydCBlZmZlY3RpdmVcbiAgdGhpcy5keW5fbHRyZWUgID0gbmV3IHV0aWxzLkJ1ZjE2KEhFQVBfU0laRSAqIDIpO1xuICB0aGlzLmR5bl9kdHJlZSAgPSBuZXcgdXRpbHMuQnVmMTYoKDIgKiBEX0NPREVTICsgMSkgKiAyKTtcbiAgdGhpcy5ibF90cmVlICAgID0gbmV3IHV0aWxzLkJ1ZjE2KCgyICogQkxfQ09ERVMgKyAxKSAqIDIpO1xuICB6ZXJvKHRoaXMuZHluX2x0cmVlKTtcbiAgemVybyh0aGlzLmR5bl9kdHJlZSk7XG4gIHplcm8odGhpcy5ibF90cmVlKTtcblxuICB0aGlzLmxfZGVzYyAgID0gbnVsbDsgICAgICAgICAvKiBkZXNjLiBmb3IgbGl0ZXJhbCB0cmVlICovXG4gIHRoaXMuZF9kZXNjICAgPSBudWxsOyAgICAgICAgIC8qIGRlc2MuIGZvciBkaXN0YW5jZSB0cmVlICovXG4gIHRoaXMuYmxfZGVzYyAgPSBudWxsOyAgICAgICAgIC8qIGRlc2MuIGZvciBiaXQgbGVuZ3RoIHRyZWUgKi9cblxuICAvL3VzaCBibF9jb3VudFtNQVhfQklUUysxXTtcbiAgdGhpcy5ibF9jb3VudCA9IG5ldyB1dGlscy5CdWYxNihNQVhfQklUUyArIDEpO1xuICAvKiBudW1iZXIgb2YgY29kZXMgYXQgZWFjaCBiaXQgbGVuZ3RoIGZvciBhbiBvcHRpbWFsIHRyZWUgKi9cblxuICAvL2ludCBoZWFwWzIqTF9DT0RFUysxXTsgICAgICAvKiBoZWFwIHVzZWQgdG8gYnVpbGQgdGhlIEh1ZmZtYW4gdHJlZXMgKi9cbiAgdGhpcy5oZWFwID0gbmV3IHV0aWxzLkJ1ZjE2KDIgKiBMX0NPREVTICsgMSk7ICAvKiBoZWFwIHVzZWQgdG8gYnVpbGQgdGhlIEh1ZmZtYW4gdHJlZXMgKi9cbiAgemVybyh0aGlzLmhlYXApO1xuXG4gIHRoaXMuaGVhcF9sZW4gPSAwOyAgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBlbGVtZW50cyBpbiB0aGUgaGVhcCAqL1xuICB0aGlzLmhlYXBfbWF4ID0gMDsgICAgICAgICAgICAgICAvKiBlbGVtZW50IG9mIGxhcmdlc3QgZnJlcXVlbmN5ICovXG4gIC8qIFRoZSBzb25zIG9mIGhlYXBbbl0gYXJlIGhlYXBbMipuXSBhbmQgaGVhcFsyKm4rMV0uIGhlYXBbMF0gaXMgbm90IHVzZWQuXG4gICAqIFRoZSBzYW1lIGhlYXAgYXJyYXkgaXMgdXNlZCB0byBidWlsZCBhbGwgdHJlZXMuXG4gICAqL1xuXG4gIHRoaXMuZGVwdGggPSBuZXcgdXRpbHMuQnVmMTYoMiAqIExfQ09ERVMgKyAxKTsgLy91Y2ggZGVwdGhbMipMX0NPREVTKzFdO1xuICB6ZXJvKHRoaXMuZGVwdGgpO1xuICAvKiBEZXB0aCBvZiBlYWNoIHN1YnRyZWUgdXNlZCBhcyB0aWUgYnJlYWtlciBmb3IgdHJlZXMgb2YgZXF1YWwgZnJlcXVlbmN5XG4gICAqL1xuXG4gIHRoaXMubF9idWYgPSAwOyAgICAgICAgICAvKiBidWZmZXIgaW5kZXggZm9yIGxpdGVyYWxzIG9yIGxlbmd0aHMgKi9cblxuICB0aGlzLmxpdF9idWZzaXplID0gMDtcbiAgLyogU2l6ZSBvZiBtYXRjaCBidWZmZXIgZm9yIGxpdGVyYWxzL2xlbmd0aHMuICBUaGVyZSBhcmUgNCByZWFzb25zIGZvclxuICAgKiBsaW1pdGluZyBsaXRfYnVmc2l6ZSB0byA2NEs6XG4gICAqICAgLSBmcmVxdWVuY2llcyBjYW4gYmUga2VwdCBpbiAxNiBiaXQgY291bnRlcnNcbiAgICogICAtIGlmIGNvbXByZXNzaW9uIGlzIG5vdCBzdWNjZXNzZnVsIGZvciB0aGUgZmlyc3QgYmxvY2ssIGFsbCBpbnB1dFxuICAgKiAgICAgZGF0YSBpcyBzdGlsbCBpbiB0aGUgd2luZG93IHNvIHdlIGNhbiBzdGlsbCBlbWl0IGEgc3RvcmVkIGJsb2NrIGV2ZW5cbiAgICogICAgIHdoZW4gaW5wdXQgY29tZXMgZnJvbSBzdGFuZGFyZCBpbnB1dC4gIChUaGlzIGNhbiBhbHNvIGJlIGRvbmUgZm9yXG4gICAqICAgICBhbGwgYmxvY2tzIGlmIGxpdF9idWZzaXplIGlzIG5vdCBncmVhdGVyIHRoYW4gMzJLLilcbiAgICogICAtIGlmIGNvbXByZXNzaW9uIGlzIG5vdCBzdWNjZXNzZnVsIGZvciBhIGZpbGUgc21hbGxlciB0aGFuIDY0Sywgd2UgY2FuXG4gICAqICAgICBldmVuIGVtaXQgYSBzdG9yZWQgZmlsZSBpbnN0ZWFkIG9mIGEgc3RvcmVkIGJsb2NrIChzYXZpbmcgNSBieXRlcykuXG4gICAqICAgICBUaGlzIGlzIGFwcGxpY2FibGUgb25seSBmb3IgemlwIChub3QgZ3ppcCBvciB6bGliKS5cbiAgICogICAtIGNyZWF0aW5nIG5ldyBIdWZmbWFuIHRyZWVzIGxlc3MgZnJlcXVlbnRseSBtYXkgbm90IHByb3ZpZGUgZmFzdFxuICAgKiAgICAgYWRhcHRhdGlvbiB0byBjaGFuZ2VzIGluIHRoZSBpbnB1dCBkYXRhIHN0YXRpc3RpY3MuIChUYWtlIGZvclxuICAgKiAgICAgZXhhbXBsZSBhIGJpbmFyeSBmaWxlIHdpdGggcG9vcmx5IGNvbXByZXNzaWJsZSBjb2RlIGZvbGxvd2VkIGJ5XG4gICAqICAgICBhIGhpZ2hseSBjb21wcmVzc2libGUgc3RyaW5nIHRhYmxlLikgU21hbGxlciBidWZmZXIgc2l6ZXMgZ2l2ZVxuICAgKiAgICAgZmFzdCBhZGFwdGF0aW9uIGJ1dCBoYXZlIG9mIGNvdXJzZSB0aGUgb3ZlcmhlYWQgb2YgdHJhbnNtaXR0aW5nXG4gICAqICAgICB0cmVlcyBtb3JlIGZyZXF1ZW50bHkuXG4gICAqICAgLSBJIGNhbid0IGNvdW50IGFib3ZlIDRcbiAgICovXG5cbiAgdGhpcy5sYXN0X2xpdCA9IDA7ICAgICAgLyogcnVubmluZyBpbmRleCBpbiBsX2J1ZiAqL1xuXG4gIHRoaXMuZF9idWYgPSAwO1xuICAvKiBCdWZmZXIgaW5kZXggZm9yIGRpc3RhbmNlcy4gVG8gc2ltcGxpZnkgdGhlIGNvZGUsIGRfYnVmIGFuZCBsX2J1ZiBoYXZlXG4gICAqIHRoZSBzYW1lIG51bWJlciBvZiBlbGVtZW50cy4gVG8gdXNlIGRpZmZlcmVudCBsZW5ndGhzLCBhbiBleHRyYSBmbGFnXG4gICAqIGFycmF5IHdvdWxkIGJlIG5lY2Vzc2FyeS5cbiAgICovXG5cbiAgdGhpcy5vcHRfbGVuID0gMDsgICAgICAgLyogYml0IGxlbmd0aCBvZiBjdXJyZW50IGJsb2NrIHdpdGggb3B0aW1hbCB0cmVlcyAqL1xuICB0aGlzLnN0YXRpY19sZW4gPSAwOyAgICAvKiBiaXQgbGVuZ3RoIG9mIGN1cnJlbnQgYmxvY2sgd2l0aCBzdGF0aWMgdHJlZXMgKi9cbiAgdGhpcy5tYXRjaGVzID0gMDsgICAgICAgLyogbnVtYmVyIG9mIHN0cmluZyBtYXRjaGVzIGluIGN1cnJlbnQgYmxvY2sgKi9cbiAgdGhpcy5pbnNlcnQgPSAwOyAgICAgICAgLyogYnl0ZXMgYXQgZW5kIG9mIHdpbmRvdyBsZWZ0IHRvIGluc2VydCAqL1xuXG5cbiAgdGhpcy5iaV9idWYgPSAwO1xuICAvKiBPdXRwdXQgYnVmZmVyLiBiaXRzIGFyZSBpbnNlcnRlZCBzdGFydGluZyBhdCB0aGUgYm90dG9tIChsZWFzdFxuICAgKiBzaWduaWZpY2FudCBiaXRzKS5cbiAgICovXG4gIHRoaXMuYmlfdmFsaWQgPSAwO1xuICAvKiBOdW1iZXIgb2YgdmFsaWQgYml0cyBpbiBiaV9idWYuICBBbGwgYml0cyBhYm92ZSB0aGUgbGFzdCB2YWxpZCBiaXRcbiAgICogYXJlIGFsd2F5cyB6ZXJvLlxuICAgKi9cblxuICAvLyBVc2VkIGZvciB3aW5kb3cgbWVtb3J5IGluaXQuIFdlIHNhZmVseSBpZ25vcmUgaXQgZm9yIEpTLiBUaGF0IG1ha2VzXG4gIC8vIHNlbnNlIG9ubHkgZm9yIHBvaW50ZXJzIGFuZCBtZW1vcnkgY2hlY2sgdG9vbHMuXG4gIC8vdGhpcy5oaWdoX3dhdGVyID0gMDtcbiAgLyogSGlnaCB3YXRlciBtYXJrIG9mZnNldCBpbiB3aW5kb3cgZm9yIGluaXRpYWxpemVkIGJ5dGVzIC0tIGJ5dGVzIGFib3ZlXG4gICAqIHRoaXMgYXJlIHNldCB0byB6ZXJvIGluIG9yZGVyIHRvIGF2b2lkIG1lbW9yeSBjaGVjayB3YXJuaW5ncyB3aGVuXG4gICAqIGxvbmdlc3QgbWF0Y2ggcm91dGluZXMgYWNjZXNzIGJ5dGVzIHBhc3QgdGhlIGlucHV0LiAgVGhpcyBpcyB0aGVuXG4gICAqIHVwZGF0ZWQgdG8gdGhlIG5ldyBoaWdoIHdhdGVyIG1hcmsuXG4gICAqL1xufVxuXG5cbmZ1bmN0aW9uIGRlZmxhdGVSZXNldEtlZXAoc3RybSkge1xuICB2YXIgcztcblxuICBpZiAoIXN0cm0gfHwgIXN0cm0uc3RhdGUpIHtcbiAgICByZXR1cm4gZXJyKHN0cm0sIFpfU1RSRUFNX0VSUk9SKTtcbiAgfVxuXG4gIHN0cm0udG90YWxfaW4gPSBzdHJtLnRvdGFsX291dCA9IDA7XG4gIHN0cm0uZGF0YV90eXBlID0gWl9VTktOT1dOO1xuXG4gIHMgPSBzdHJtLnN0YXRlO1xuICBzLnBlbmRpbmcgPSAwO1xuICBzLnBlbmRpbmdfb3V0ID0gMDtcblxuICBpZiAocy53cmFwIDwgMCkge1xuICAgIHMud3JhcCA9IC1zLndyYXA7XG4gICAgLyogd2FzIG1hZGUgbmVnYXRpdmUgYnkgZGVmbGF0ZSguLi4sIFpfRklOSVNIKTsgKi9cbiAgfVxuICBzLnN0YXR1cyA9IChzLndyYXAgPyBJTklUX1NUQVRFIDogQlVTWV9TVEFURSk7XG4gIHN0cm0uYWRsZXIgPSAocy53cmFwID09PSAyKSA/XG4gICAgMCAgLy8gY3JjMzIoMCwgWl9OVUxMLCAwKVxuICA6XG4gICAgMTsgLy8gYWRsZXIzMigwLCBaX05VTEwsIDApXG4gIHMubGFzdF9mbHVzaCA9IFpfTk9fRkxVU0g7XG4gIHRyZWVzLl90cl9pbml0KHMpO1xuICByZXR1cm4gWl9PSztcbn1cblxuXG5mdW5jdGlvbiBkZWZsYXRlUmVzZXQoc3RybSkge1xuICB2YXIgcmV0ID0gZGVmbGF0ZVJlc2V0S2VlcChzdHJtKTtcbiAgaWYgKHJldCA9PT0gWl9PSykge1xuICAgIGxtX2luaXQoc3RybS5zdGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuXG5mdW5jdGlvbiBkZWZsYXRlU2V0SGVhZGVyKHN0cm0sIGhlYWQpIHtcbiAgaWYgKCFzdHJtIHx8ICFzdHJtLnN0YXRlKSB7IHJldHVybiBaX1NUUkVBTV9FUlJPUjsgfVxuICBpZiAoc3RybS5zdGF0ZS53cmFwICE9PSAyKSB7IHJldHVybiBaX1NUUkVBTV9FUlJPUjsgfVxuICBzdHJtLnN0YXRlLmd6aGVhZCA9IGhlYWQ7XG4gIHJldHVybiBaX09LO1xufVxuXG5cbmZ1bmN0aW9uIGRlZmxhdGVJbml0MihzdHJtLCBsZXZlbCwgbWV0aG9kLCB3aW5kb3dCaXRzLCBtZW1MZXZlbCwgc3RyYXRlZ3kpIHtcbiAgaWYgKCFzdHJtKSB7IC8vID09PSBaX05VTExcbiAgICByZXR1cm4gWl9TVFJFQU1fRVJST1I7XG4gIH1cbiAgdmFyIHdyYXAgPSAxO1xuXG4gIGlmIChsZXZlbCA9PT0gWl9ERUZBVUxUX0NPTVBSRVNTSU9OKSB7XG4gICAgbGV2ZWwgPSA2O1xuICB9XG5cbiAgaWYgKHdpbmRvd0JpdHMgPCAwKSB7IC8qIHN1cHByZXNzIHpsaWIgd3JhcHBlciAqL1xuICAgIHdyYXAgPSAwO1xuICAgIHdpbmRvd0JpdHMgPSAtd2luZG93Qml0cztcbiAgfVxuXG4gIGVsc2UgaWYgKHdpbmRvd0JpdHMgPiAxNSkge1xuICAgIHdyYXAgPSAyOyAgICAgICAgICAgLyogd3JpdGUgZ3ppcCB3cmFwcGVyIGluc3RlYWQgKi9cbiAgICB3aW5kb3dCaXRzIC09IDE2O1xuICB9XG5cblxuICBpZiAobWVtTGV2ZWwgPCAxIHx8IG1lbUxldmVsID4gTUFYX01FTV9MRVZFTCB8fCBtZXRob2QgIT09IFpfREVGTEFURUQgfHxcbiAgICB3aW5kb3dCaXRzIDwgOCB8fCB3aW5kb3dCaXRzID4gMTUgfHwgbGV2ZWwgPCAwIHx8IGxldmVsID4gOSB8fFxuICAgIHN0cmF0ZWd5IDwgMCB8fCBzdHJhdGVneSA+IFpfRklYRUQpIHtcbiAgICByZXR1cm4gZXJyKHN0cm0sIFpfU1RSRUFNX0VSUk9SKTtcbiAgfVxuXG5cbiAgaWYgKHdpbmRvd0JpdHMgPT09IDgpIHtcbiAgICB3aW5kb3dCaXRzID0gOTtcbiAgfVxuICAvKiB1bnRpbCAyNTYtYnl0ZSB3aW5kb3cgYnVnIGZpeGVkICovXG5cbiAgdmFyIHMgPSBuZXcgRGVmbGF0ZVN0YXRlKCk7XG5cbiAgc3RybS5zdGF0ZSA9IHM7XG4gIHMuc3RybSA9IHN0cm07XG5cbiAgcy53cmFwID0gd3JhcDtcbiAgcy5nemhlYWQgPSBudWxsO1xuICBzLndfYml0cyA9IHdpbmRvd0JpdHM7XG4gIHMud19zaXplID0gMSA8PCBzLndfYml0cztcbiAgcy53X21hc2sgPSBzLndfc2l6ZSAtIDE7XG5cbiAgcy5oYXNoX2JpdHMgPSBtZW1MZXZlbCArIDc7XG4gIHMuaGFzaF9zaXplID0gMSA8PCBzLmhhc2hfYml0cztcbiAgcy5oYXNoX21hc2sgPSBzLmhhc2hfc2l6ZSAtIDE7XG4gIHMuaGFzaF9zaGlmdCA9IH5+KChzLmhhc2hfYml0cyArIE1JTl9NQVRDSCAtIDEpIC8gTUlOX01BVENIKTtcblxuICBzLndpbmRvdyA9IG5ldyB1dGlscy5CdWY4KHMud19zaXplICogMik7XG4gIHMuaGVhZCA9IG5ldyB1dGlscy5CdWYxNihzLmhhc2hfc2l6ZSk7XG4gIHMucHJldiA9IG5ldyB1dGlscy5CdWYxNihzLndfc2l6ZSk7XG5cbiAgLy8gRG9uJ3QgbmVlZCBtZW0gaW5pdCBtYWdpYyBmb3IgSlMuXG4gIC8vcy5oaWdoX3dhdGVyID0gMDsgIC8qIG5vdGhpbmcgd3JpdHRlbiB0byBzLT53aW5kb3cgeWV0ICovXG5cbiAgcy5saXRfYnVmc2l6ZSA9IDEgPDwgKG1lbUxldmVsICsgNik7IC8qIDE2SyBlbGVtZW50cyBieSBkZWZhdWx0ICovXG5cbiAgcy5wZW5kaW5nX2J1Zl9zaXplID0gcy5saXRfYnVmc2l6ZSAqIDQ7XG5cbiAgLy9vdmVybGF5ID0gKHVzaGYgKikgWkFMTE9DKHN0cm0sIHMtPmxpdF9idWZzaXplLCBzaXplb2YodXNoKSsyKTtcbiAgLy9zLT5wZW5kaW5nX2J1ZiA9ICh1Y2hmICopIG92ZXJsYXk7XG4gIHMucGVuZGluZ19idWYgPSBuZXcgdXRpbHMuQnVmOChzLnBlbmRpbmdfYnVmX3NpemUpO1xuXG4gIC8vIEl0IGlzIG9mZnNldCBmcm9tIGBzLnBlbmRpbmdfYnVmYCAoc2l6ZSBpcyBgcy5saXRfYnVmc2l6ZSAqIDJgKVxuICAvL3MtPmRfYnVmID0gb3ZlcmxheSArIHMtPmxpdF9idWZzaXplL3NpemVvZih1c2gpO1xuICBzLmRfYnVmID0gMSAqIHMubGl0X2J1ZnNpemU7XG5cbiAgLy9zLT5sX2J1ZiA9IHMtPnBlbmRpbmdfYnVmICsgKDErc2l6ZW9mKHVzaCkpKnMtPmxpdF9idWZzaXplO1xuICBzLmxfYnVmID0gKDEgKyAyKSAqIHMubGl0X2J1ZnNpemU7XG5cbiAgcy5sZXZlbCA9IGxldmVsO1xuICBzLnN0cmF0ZWd5ID0gc3RyYXRlZ3k7XG4gIHMubWV0aG9kID0gbWV0aG9kO1xuXG4gIHJldHVybiBkZWZsYXRlUmVzZXQoc3RybSk7XG59XG5cbmZ1bmN0aW9uIGRlZmxhdGVJbml0KHN0cm0sIGxldmVsKSB7XG4gIHJldHVybiBkZWZsYXRlSW5pdDIoc3RybSwgbGV2ZWwsIFpfREVGTEFURUQsIE1BWF9XQklUUywgREVGX01FTV9MRVZFTCwgWl9ERUZBVUxUX1NUUkFURUdZKTtcbn1cblxuXG5mdW5jdGlvbiBkZWZsYXRlKHN0cm0sIGZsdXNoKSB7XG4gIHZhciBvbGRfZmx1c2gsIHM7XG4gIHZhciBiZWcsIHZhbDsgLy8gZm9yIGd6aXAgaGVhZGVyIHdyaXRlIG9ubHlcblxuICBpZiAoIXN0cm0gfHwgIXN0cm0uc3RhdGUgfHxcbiAgICBmbHVzaCA+IFpfQkxPQ0sgfHwgZmx1c2ggPCAwKSB7XG4gICAgcmV0dXJuIHN0cm0gPyBlcnIoc3RybSwgWl9TVFJFQU1fRVJST1IpIDogWl9TVFJFQU1fRVJST1I7XG4gIH1cblxuICBzID0gc3RybS5zdGF0ZTtcblxuICBpZiAoIXN0cm0ub3V0cHV0IHx8XG4gICAgICAoIXN0cm0uaW5wdXQgJiYgc3RybS5hdmFpbF9pbiAhPT0gMCkgfHxcbiAgICAgIChzLnN0YXR1cyA9PT0gRklOSVNIX1NUQVRFICYmIGZsdXNoICE9PSBaX0ZJTklTSCkpIHtcbiAgICByZXR1cm4gZXJyKHN0cm0sIChzdHJtLmF2YWlsX291dCA9PT0gMCkgPyBaX0JVRl9FUlJPUiA6IFpfU1RSRUFNX0VSUk9SKTtcbiAgfVxuXG4gIHMuc3RybSA9IHN0cm07IC8qIGp1c3QgaW4gY2FzZSAqL1xuICBvbGRfZmx1c2ggPSBzLmxhc3RfZmx1c2g7XG4gIHMubGFzdF9mbHVzaCA9IGZsdXNoO1xuXG4gIC8qIFdyaXRlIHRoZSBoZWFkZXIgKi9cbiAgaWYgKHMuc3RhdHVzID09PSBJTklUX1NUQVRFKSB7XG5cbiAgICBpZiAocy53cmFwID09PSAyKSB7IC8vIEdaSVAgaGVhZGVyXG4gICAgICBzdHJtLmFkbGVyID0gMDsgIC8vY3JjMzIoMEwsIFpfTlVMTCwgMCk7XG4gICAgICBwdXRfYnl0ZShzLCAzMSk7XG4gICAgICBwdXRfYnl0ZShzLCAxMzkpO1xuICAgICAgcHV0X2J5dGUocywgOCk7XG4gICAgICBpZiAoIXMuZ3poZWFkKSB7IC8vIHMtPmd6aGVhZCA9PSBaX05VTExcbiAgICAgICAgcHV0X2J5dGUocywgMCk7XG4gICAgICAgIHB1dF9ieXRlKHMsIDApO1xuICAgICAgICBwdXRfYnl0ZShzLCAwKTtcbiAgICAgICAgcHV0X2J5dGUocywgMCk7XG4gICAgICAgIHB1dF9ieXRlKHMsIDApO1xuICAgICAgICBwdXRfYnl0ZShzLCBzLmxldmVsID09PSA5ID8gMiA6XG4gICAgICAgICAgICAgICAgICAgIChzLnN0cmF0ZWd5ID49IFpfSFVGRk1BTl9PTkxZIHx8IHMubGV2ZWwgPCAyID9cbiAgICAgICAgICAgICAgICAgICAgIDQgOiAwKSk7XG4gICAgICAgIHB1dF9ieXRlKHMsIE9TX0NPREUpO1xuICAgICAgICBzLnN0YXR1cyA9IEJVU1lfU1RBVEU7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgcHV0X2J5dGUocywgKHMuZ3poZWFkLnRleHQgPyAxIDogMCkgK1xuICAgICAgICAgICAgICAgICAgICAocy5nemhlYWQuaGNyYyA/IDIgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgICghcy5nemhlYWQuZXh0cmEgPyAwIDogNCkgK1xuICAgICAgICAgICAgICAgICAgICAoIXMuZ3poZWFkLm5hbWUgPyAwIDogOCkgK1xuICAgICAgICAgICAgICAgICAgICAoIXMuZ3poZWFkLmNvbW1lbnQgPyAwIDogMTYpXG4gICAgICAgICk7XG4gICAgICAgIHB1dF9ieXRlKHMsIHMuZ3poZWFkLnRpbWUgJiAweGZmKTtcbiAgICAgICAgcHV0X2J5dGUocywgKHMuZ3poZWFkLnRpbWUgPj4gOCkgJiAweGZmKTtcbiAgICAgICAgcHV0X2J5dGUocywgKHMuZ3poZWFkLnRpbWUgPj4gMTYpICYgMHhmZik7XG4gICAgICAgIHB1dF9ieXRlKHMsIChzLmd6aGVhZC50aW1lID4+IDI0KSAmIDB4ZmYpO1xuICAgICAgICBwdXRfYnl0ZShzLCBzLmxldmVsID09PSA5ID8gMiA6XG4gICAgICAgICAgICAgICAgICAgIChzLnN0cmF0ZWd5ID49IFpfSFVGRk1BTl9PTkxZIHx8IHMubGV2ZWwgPCAyID9cbiAgICAgICAgICAgICAgICAgICAgIDQgOiAwKSk7XG4gICAgICAgIHB1dF9ieXRlKHMsIHMuZ3poZWFkLm9zICYgMHhmZik7XG4gICAgICAgIGlmIChzLmd6aGVhZC5leHRyYSAmJiBzLmd6aGVhZC5leHRyYS5sZW5ndGgpIHtcbiAgICAgICAgICBwdXRfYnl0ZShzLCBzLmd6aGVhZC5leHRyYS5sZW5ndGggJiAweGZmKTtcbiAgICAgICAgICBwdXRfYnl0ZShzLCAocy5nemhlYWQuZXh0cmEubGVuZ3RoID4+IDgpICYgMHhmZik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMuZ3poZWFkLmhjcmMpIHtcbiAgICAgICAgICBzdHJtLmFkbGVyID0gY3JjMzIoc3RybS5hZGxlciwgcy5wZW5kaW5nX2J1Ziwgcy5wZW5kaW5nLCAwKTtcbiAgICAgICAgfVxuICAgICAgICBzLmd6aW5kZXggPSAwO1xuICAgICAgICBzLnN0YXR1cyA9IEVYVFJBX1NUQVRFO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIC8vIERFRkxBVEUgaGVhZGVyXG4gICAge1xuICAgICAgdmFyIGhlYWRlciA9IChaX0RFRkxBVEVEICsgKChzLndfYml0cyAtIDgpIDw8IDQpKSA8PCA4O1xuICAgICAgdmFyIGxldmVsX2ZsYWdzID0gLTE7XG5cbiAgICAgIGlmIChzLnN0cmF0ZWd5ID49IFpfSFVGRk1BTl9PTkxZIHx8IHMubGV2ZWwgPCAyKSB7XG4gICAgICAgIGxldmVsX2ZsYWdzID0gMDtcbiAgICAgIH0gZWxzZSBpZiAocy5sZXZlbCA8IDYpIHtcbiAgICAgICAgbGV2ZWxfZmxhZ3MgPSAxO1xuICAgICAgfSBlbHNlIGlmIChzLmxldmVsID09PSA2KSB7XG4gICAgICAgIGxldmVsX2ZsYWdzID0gMjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldmVsX2ZsYWdzID0gMztcbiAgICAgIH1cbiAgICAgIGhlYWRlciB8PSAobGV2ZWxfZmxhZ3MgPDwgNik7XG4gICAgICBpZiAocy5zdHJzdGFydCAhPT0gMCkgeyBoZWFkZXIgfD0gUFJFU0VUX0RJQ1Q7IH1cbiAgICAgIGhlYWRlciArPSAzMSAtIChoZWFkZXIgJSAzMSk7XG5cbiAgICAgIHMuc3RhdHVzID0gQlVTWV9TVEFURTtcbiAgICAgIHB1dFNob3J0TVNCKHMsIGhlYWRlcik7XG5cbiAgICAgIC8qIFNhdmUgdGhlIGFkbGVyMzIgb2YgdGhlIHByZXNldCBkaWN0aW9uYXJ5OiAqL1xuICAgICAgaWYgKHMuc3Ryc3RhcnQgIT09IDApIHtcbiAgICAgICAgcHV0U2hvcnRNU0Iocywgc3RybS5hZGxlciA+Pj4gMTYpO1xuICAgICAgICBwdXRTaG9ydE1TQihzLCBzdHJtLmFkbGVyICYgMHhmZmZmKTtcbiAgICAgIH1cbiAgICAgIHN0cm0uYWRsZXIgPSAxOyAvLyBhZGxlcjMyKDBMLCBaX05VTEwsIDApO1xuICAgIH1cbiAgfVxuXG4vLyNpZmRlZiBHWklQXG4gIGlmIChzLnN0YXR1cyA9PT0gRVhUUkFfU1RBVEUpIHtcbiAgICBpZiAocy5nemhlYWQuZXh0cmEvKiAhPSBaX05VTEwqLykge1xuICAgICAgYmVnID0gcy5wZW5kaW5nOyAgLyogc3RhcnQgb2YgYnl0ZXMgdG8gdXBkYXRlIGNyYyAqL1xuXG4gICAgICB3aGlsZSAocy5nemluZGV4IDwgKHMuZ3poZWFkLmV4dHJhLmxlbmd0aCAmIDB4ZmZmZikpIHtcbiAgICAgICAgaWYgKHMucGVuZGluZyA9PT0gcy5wZW5kaW5nX2J1Zl9zaXplKSB7XG4gICAgICAgICAgaWYgKHMuZ3poZWFkLmhjcmMgJiYgcy5wZW5kaW5nID4gYmVnKSB7XG4gICAgICAgICAgICBzdHJtLmFkbGVyID0gY3JjMzIoc3RybS5hZGxlciwgcy5wZW5kaW5nX2J1Ziwgcy5wZW5kaW5nIC0gYmVnLCBiZWcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmbHVzaF9wZW5kaW5nKHN0cm0pO1xuICAgICAgICAgIGJlZyA9IHMucGVuZGluZztcbiAgICAgICAgICBpZiAocy5wZW5kaW5nID09PSBzLnBlbmRpbmdfYnVmX3NpemUpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwdXRfYnl0ZShzLCBzLmd6aGVhZC5leHRyYVtzLmd6aW5kZXhdICYgMHhmZik7XG4gICAgICAgIHMuZ3ppbmRleCsrO1xuICAgICAgfVxuICAgICAgaWYgKHMuZ3poZWFkLmhjcmMgJiYgcy5wZW5kaW5nID4gYmVnKSB7XG4gICAgICAgIHN0cm0uYWRsZXIgPSBjcmMzMihzdHJtLmFkbGVyLCBzLnBlbmRpbmdfYnVmLCBzLnBlbmRpbmcgLSBiZWcsIGJlZyk7XG4gICAgICB9XG4gICAgICBpZiAocy5nemluZGV4ID09PSBzLmd6aGVhZC5leHRyYS5sZW5ndGgpIHtcbiAgICAgICAgcy5nemluZGV4ID0gMDtcbiAgICAgICAgcy5zdGF0dXMgPSBOQU1FX1NUQVRFO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHMuc3RhdHVzID0gTkFNRV9TVEFURTtcbiAgICB9XG4gIH1cbiAgaWYgKHMuc3RhdHVzID09PSBOQU1FX1NUQVRFKSB7XG4gICAgaWYgKHMuZ3poZWFkLm5hbWUvKiAhPSBaX05VTEwqLykge1xuICAgICAgYmVnID0gcy5wZW5kaW5nOyAgLyogc3RhcnQgb2YgYnl0ZXMgdG8gdXBkYXRlIGNyYyAqL1xuICAgICAgLy9pbnQgdmFsO1xuXG4gICAgICBkbyB7XG4gICAgICAgIGlmIChzLnBlbmRpbmcgPT09IHMucGVuZGluZ19idWZfc2l6ZSkge1xuICAgICAgICAgIGlmIChzLmd6aGVhZC5oY3JjICYmIHMucGVuZGluZyA+IGJlZykge1xuICAgICAgICAgICAgc3RybS5hZGxlciA9IGNyYzMyKHN0cm0uYWRsZXIsIHMucGVuZGluZ19idWYsIHMucGVuZGluZyAtIGJlZywgYmVnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmx1c2hfcGVuZGluZyhzdHJtKTtcbiAgICAgICAgICBiZWcgPSBzLnBlbmRpbmc7XG4gICAgICAgICAgaWYgKHMucGVuZGluZyA9PT0gcy5wZW5kaW5nX2J1Zl9zaXplKSB7XG4gICAgICAgICAgICB2YWwgPSAxO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIEpTIHNwZWNpZmljOiBsaXR0bGUgbWFnaWMgdG8gYWRkIHplcm8gdGVybWluYXRvciB0byBlbmQgb2Ygc3RyaW5nXG4gICAgICAgIGlmIChzLmd6aW5kZXggPCBzLmd6aGVhZC5uYW1lLmxlbmd0aCkge1xuICAgICAgICAgIHZhbCA9IHMuZ3poZWFkLm5hbWUuY2hhckNvZGVBdChzLmd6aW5kZXgrKykgJiAweGZmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcHV0X2J5dGUocywgdmFsKTtcbiAgICAgIH0gd2hpbGUgKHZhbCAhPT0gMCk7XG5cbiAgICAgIGlmIChzLmd6aGVhZC5oY3JjICYmIHMucGVuZGluZyA+IGJlZykge1xuICAgICAgICBzdHJtLmFkbGVyID0gY3JjMzIoc3RybS5hZGxlciwgcy5wZW5kaW5nX2J1Ziwgcy5wZW5kaW5nIC0gYmVnLCBiZWcpO1xuICAgICAgfVxuICAgICAgaWYgKHZhbCA9PT0gMCkge1xuICAgICAgICBzLmd6aW5kZXggPSAwO1xuICAgICAgICBzLnN0YXR1cyA9IENPTU1FTlRfU1RBVEU7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcy5zdGF0dXMgPSBDT01NRU5UX1NUQVRFO1xuICAgIH1cbiAgfVxuICBpZiAocy5zdGF0dXMgPT09IENPTU1FTlRfU1RBVEUpIHtcbiAgICBpZiAocy5nemhlYWQuY29tbWVudC8qICE9IFpfTlVMTCovKSB7XG4gICAgICBiZWcgPSBzLnBlbmRpbmc7ICAvKiBzdGFydCBvZiBieXRlcyB0byB1cGRhdGUgY3JjICovXG4gICAgICAvL2ludCB2YWw7XG5cbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKHMucGVuZGluZyA9PT0gcy5wZW5kaW5nX2J1Zl9zaXplKSB7XG4gICAgICAgICAgaWYgKHMuZ3poZWFkLmhjcmMgJiYgcy5wZW5kaW5nID4gYmVnKSB7XG4gICAgICAgICAgICBzdHJtLmFkbGVyID0gY3JjMzIoc3RybS5hZGxlciwgcy5wZW5kaW5nX2J1Ziwgcy5wZW5kaW5nIC0gYmVnLCBiZWcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmbHVzaF9wZW5kaW5nKHN0cm0pO1xuICAgICAgICAgIGJlZyA9IHMucGVuZGluZztcbiAgICAgICAgICBpZiAocy5wZW5kaW5nID09PSBzLnBlbmRpbmdfYnVmX3NpemUpIHtcbiAgICAgICAgICAgIHZhbCA9IDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gSlMgc3BlY2lmaWM6IGxpdHRsZSBtYWdpYyB0byBhZGQgemVybyB0ZXJtaW5hdG9yIHRvIGVuZCBvZiBzdHJpbmdcbiAgICAgICAgaWYgKHMuZ3ppbmRleCA8IHMuZ3poZWFkLmNvbW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgdmFsID0gcy5nemhlYWQuY29tbWVudC5jaGFyQ29kZUF0KHMuZ3ppbmRleCsrKSAmIDB4ZmY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsID0gMDtcbiAgICAgICAgfVxuICAgICAgICBwdXRfYnl0ZShzLCB2YWwpO1xuICAgICAgfSB3aGlsZSAodmFsICE9PSAwKTtcblxuICAgICAgaWYgKHMuZ3poZWFkLmhjcmMgJiYgcy5wZW5kaW5nID4gYmVnKSB7XG4gICAgICAgIHN0cm0uYWRsZXIgPSBjcmMzMihzdHJtLmFkbGVyLCBzLnBlbmRpbmdfYnVmLCBzLnBlbmRpbmcgLSBiZWcsIGJlZyk7XG4gICAgICB9XG4gICAgICBpZiAodmFsID09PSAwKSB7XG4gICAgICAgIHMuc3RhdHVzID0gSENSQ19TVEFURTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzLnN0YXR1cyA9IEhDUkNfU1RBVEU7XG4gICAgfVxuICB9XG4gIGlmIChzLnN0YXR1cyA9PT0gSENSQ19TVEFURSkge1xuICAgIGlmIChzLmd6aGVhZC5oY3JjKSB7XG4gICAgICBpZiAocy5wZW5kaW5nICsgMiA+IHMucGVuZGluZ19idWZfc2l6ZSkge1xuICAgICAgICBmbHVzaF9wZW5kaW5nKHN0cm0pO1xuICAgICAgfVxuICAgICAgaWYgKHMucGVuZGluZyArIDIgPD0gcy5wZW5kaW5nX2J1Zl9zaXplKSB7XG4gICAgICAgIHB1dF9ieXRlKHMsIHN0cm0uYWRsZXIgJiAweGZmKTtcbiAgICAgICAgcHV0X2J5dGUocywgKHN0cm0uYWRsZXIgPj4gOCkgJiAweGZmKTtcbiAgICAgICAgc3RybS5hZGxlciA9IDA7IC8vY3JjMzIoMEwsIFpfTlVMTCwgMCk7XG4gICAgICAgIHMuc3RhdHVzID0gQlVTWV9TVEFURTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzLnN0YXR1cyA9IEJVU1lfU1RBVEU7XG4gICAgfVxuICB9XG4vLyNlbmRpZlxuXG4gIC8qIEZsdXNoIGFzIG11Y2ggcGVuZGluZyBvdXRwdXQgYXMgcG9zc2libGUgKi9cbiAgaWYgKHMucGVuZGluZyAhPT0gMCkge1xuICAgIGZsdXNoX3BlbmRpbmcoc3RybSk7XG4gICAgaWYgKHN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAvKiBTaW5jZSBhdmFpbF9vdXQgaXMgMCwgZGVmbGF0ZSB3aWxsIGJlIGNhbGxlZCBhZ2FpbiB3aXRoXG4gICAgICAgKiBtb3JlIG91dHB1dCBzcGFjZSwgYnV0IHBvc3NpYmx5IHdpdGggYm90aCBwZW5kaW5nIGFuZFxuICAgICAgICogYXZhaWxfaW4gZXF1YWwgdG8gemVyby4gVGhlcmUgd29uJ3QgYmUgYW55dGhpbmcgdG8gZG8sXG4gICAgICAgKiBidXQgdGhpcyBpcyBub3QgYW4gZXJyb3Igc2l0dWF0aW9uIHNvIG1ha2Ugc3VyZSB3ZVxuICAgICAgICogcmV0dXJuIE9LIGluc3RlYWQgb2YgQlVGX0VSUk9SIGF0IG5leHQgY2FsbCBvZiBkZWZsYXRlOlxuICAgICAgICovXG4gICAgICBzLmxhc3RfZmx1c2ggPSAtMTtcbiAgICAgIHJldHVybiBaX09LO1xuICAgIH1cblxuICAgIC8qIE1ha2Ugc3VyZSB0aGVyZSBpcyBzb21ldGhpbmcgdG8gZG8gYW5kIGF2b2lkIGR1cGxpY2F0ZSBjb25zZWN1dGl2ZVxuICAgICAqIGZsdXNoZXMuIEZvciByZXBlYXRlZCBhbmQgdXNlbGVzcyBjYWxscyB3aXRoIFpfRklOSVNILCB3ZSBrZWVwXG4gICAgICogcmV0dXJuaW5nIFpfU1RSRUFNX0VORCBpbnN0ZWFkIG9mIFpfQlVGX0VSUk9SLlxuICAgICAqL1xuICB9IGVsc2UgaWYgKHN0cm0uYXZhaWxfaW4gPT09IDAgJiYgcmFuayhmbHVzaCkgPD0gcmFuayhvbGRfZmx1c2gpICYmXG4gICAgZmx1c2ggIT09IFpfRklOSVNIKSB7XG4gICAgcmV0dXJuIGVycihzdHJtLCBaX0JVRl9FUlJPUik7XG4gIH1cblxuICAvKiBVc2VyIG11c3Qgbm90IHByb3ZpZGUgbW9yZSBpbnB1dCBhZnRlciB0aGUgZmlyc3QgRklOSVNIOiAqL1xuICBpZiAocy5zdGF0dXMgPT09IEZJTklTSF9TVEFURSAmJiBzdHJtLmF2YWlsX2luICE9PSAwKSB7XG4gICAgcmV0dXJuIGVycihzdHJtLCBaX0JVRl9FUlJPUik7XG4gIH1cblxuICAvKiBTdGFydCBhIG5ldyBibG9jayBvciBjb250aW51ZSB0aGUgY3VycmVudCBvbmUuXG4gICAqL1xuICBpZiAoc3RybS5hdmFpbF9pbiAhPT0gMCB8fCBzLmxvb2thaGVhZCAhPT0gMCB8fFxuICAgIChmbHVzaCAhPT0gWl9OT19GTFVTSCAmJiBzLnN0YXR1cyAhPT0gRklOSVNIX1NUQVRFKSkge1xuICAgIHZhciBic3RhdGUgPSAocy5zdHJhdGVneSA9PT0gWl9IVUZGTUFOX09OTFkpID8gZGVmbGF0ZV9odWZmKHMsIGZsdXNoKSA6XG4gICAgICAocy5zdHJhdGVneSA9PT0gWl9STEUgPyBkZWZsYXRlX3JsZShzLCBmbHVzaCkgOlxuICAgICAgICBjb25maWd1cmF0aW9uX3RhYmxlW3MubGV2ZWxdLmZ1bmMocywgZmx1c2gpKTtcblxuICAgIGlmIChic3RhdGUgPT09IEJTX0ZJTklTSF9TVEFSVEVEIHx8IGJzdGF0ZSA9PT0gQlNfRklOSVNIX0RPTkUpIHtcbiAgICAgIHMuc3RhdHVzID0gRklOSVNIX1NUQVRFO1xuICAgIH1cbiAgICBpZiAoYnN0YXRlID09PSBCU19ORUVEX01PUkUgfHwgYnN0YXRlID09PSBCU19GSU5JU0hfU1RBUlRFRCkge1xuICAgICAgaWYgKHN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAgIHMubGFzdF9mbHVzaCA9IC0xO1xuICAgICAgICAvKiBhdm9pZCBCVUZfRVJST1IgbmV4dCBjYWxsLCBzZWUgYWJvdmUgKi9cbiAgICAgIH1cbiAgICAgIHJldHVybiBaX09LO1xuICAgICAgLyogSWYgZmx1c2ggIT0gWl9OT19GTFVTSCAmJiBhdmFpbF9vdXQgPT0gMCwgdGhlIG5leHQgY2FsbFxuICAgICAgICogb2YgZGVmbGF0ZSBzaG91bGQgdXNlIHRoZSBzYW1lIGZsdXNoIHBhcmFtZXRlciB0byBtYWtlIHN1cmVcbiAgICAgICAqIHRoYXQgdGhlIGZsdXNoIGlzIGNvbXBsZXRlLiBTbyB3ZSBkb24ndCBoYXZlIHRvIG91dHB1dCBhblxuICAgICAgICogZW1wdHkgYmxvY2sgaGVyZSwgdGhpcyB3aWxsIGJlIGRvbmUgYXQgbmV4dCBjYWxsLiBUaGlzIGFsc29cbiAgICAgICAqIGVuc3VyZXMgdGhhdCBmb3IgYSB2ZXJ5IHNtYWxsIG91dHB1dCBidWZmZXIsIHdlIGVtaXQgYXQgbW9zdFxuICAgICAgICogb25lIGVtcHR5IGJsb2NrLlxuICAgICAgICovXG4gICAgfVxuICAgIGlmIChic3RhdGUgPT09IEJTX0JMT0NLX0RPTkUpIHtcbiAgICAgIGlmIChmbHVzaCA9PT0gWl9QQVJUSUFMX0ZMVVNIKSB7XG4gICAgICAgIHRyZWVzLl90cl9hbGlnbihzKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKGZsdXNoICE9PSBaX0JMT0NLKSB7IC8qIEZVTExfRkxVU0ggb3IgU1lOQ19GTFVTSCAqL1xuXG4gICAgICAgIHRyZWVzLl90cl9zdG9yZWRfYmxvY2socywgMCwgMCwgZmFsc2UpO1xuICAgICAgICAvKiBGb3IgYSBmdWxsIGZsdXNoLCB0aGlzIGVtcHR5IGJsb2NrIHdpbGwgYmUgcmVjb2duaXplZFxuICAgICAgICAgKiBhcyBhIHNwZWNpYWwgbWFya2VyIGJ5IGluZmxhdGVfc3luYygpLlxuICAgICAgICAgKi9cbiAgICAgICAgaWYgKGZsdXNoID09PSBaX0ZVTExfRkxVU0gpIHtcbiAgICAgICAgICAvKioqIENMRUFSX0hBU0gocyk7ICoqKi8gICAgICAgICAgICAgLyogZm9yZ2V0IGhpc3RvcnkgKi9cbiAgICAgICAgICB6ZXJvKHMuaGVhZCk7IC8vIEZpbGwgd2l0aCBOSUwgKD0gMCk7XG5cbiAgICAgICAgICBpZiAocy5sb29rYWhlYWQgPT09IDApIHtcbiAgICAgICAgICAgIHMuc3Ryc3RhcnQgPSAwO1xuICAgICAgICAgICAgcy5ibG9ja19zdGFydCA9IDA7XG4gICAgICAgICAgICBzLmluc2VydCA9IDA7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmbHVzaF9wZW5kaW5nKHN0cm0pO1xuICAgICAgaWYgKHN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAgIHMubGFzdF9mbHVzaCA9IC0xOyAvKiBhdm9pZCBCVUZfRVJST1IgYXQgbmV4dCBjYWxsLCBzZWUgYWJvdmUgKi9cbiAgICAgICAgcmV0dXJuIFpfT0s7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vQXNzZXJ0KHN0cm0tPmF2YWlsX291dCA+IDAsIFwiYnVnMlwiKTtcbiAgLy9pZiAoc3RybS5hdmFpbF9vdXQgPD0gMCkgeyB0aHJvdyBuZXcgRXJyb3IoXCJidWcyXCIpO31cblxuICBpZiAoZmx1c2ggIT09IFpfRklOSVNIKSB7IHJldHVybiBaX09LOyB9XG4gIGlmIChzLndyYXAgPD0gMCkgeyByZXR1cm4gWl9TVFJFQU1fRU5EOyB9XG5cbiAgLyogV3JpdGUgdGhlIHRyYWlsZXIgKi9cbiAgaWYgKHMud3JhcCA9PT0gMikge1xuICAgIHB1dF9ieXRlKHMsIHN0cm0uYWRsZXIgJiAweGZmKTtcbiAgICBwdXRfYnl0ZShzLCAoc3RybS5hZGxlciA+PiA4KSAmIDB4ZmYpO1xuICAgIHB1dF9ieXRlKHMsIChzdHJtLmFkbGVyID4+IDE2KSAmIDB4ZmYpO1xuICAgIHB1dF9ieXRlKHMsIChzdHJtLmFkbGVyID4+IDI0KSAmIDB4ZmYpO1xuICAgIHB1dF9ieXRlKHMsIHN0cm0udG90YWxfaW4gJiAweGZmKTtcbiAgICBwdXRfYnl0ZShzLCAoc3RybS50b3RhbF9pbiA+PiA4KSAmIDB4ZmYpO1xuICAgIHB1dF9ieXRlKHMsIChzdHJtLnRvdGFsX2luID4+IDE2KSAmIDB4ZmYpO1xuICAgIHB1dF9ieXRlKHMsIChzdHJtLnRvdGFsX2luID4+IDI0KSAmIDB4ZmYpO1xuICB9XG4gIGVsc2VcbiAge1xuICAgIHB1dFNob3J0TVNCKHMsIHN0cm0uYWRsZXIgPj4+IDE2KTtcbiAgICBwdXRTaG9ydE1TQihzLCBzdHJtLmFkbGVyICYgMHhmZmZmKTtcbiAgfVxuXG4gIGZsdXNoX3BlbmRpbmcoc3RybSk7XG4gIC8qIElmIGF2YWlsX291dCBpcyB6ZXJvLCB0aGUgYXBwbGljYXRpb24gd2lsbCBjYWxsIGRlZmxhdGUgYWdhaW5cbiAgICogdG8gZmx1c2ggdGhlIHJlc3QuXG4gICAqL1xuICBpZiAocy53cmFwID4gMCkgeyBzLndyYXAgPSAtcy53cmFwOyB9XG4gIC8qIHdyaXRlIHRoZSB0cmFpbGVyIG9ubHkgb25jZSEgKi9cbiAgcmV0dXJuIHMucGVuZGluZyAhPT0gMCA/IFpfT0sgOiBaX1NUUkVBTV9FTkQ7XG59XG5cbmZ1bmN0aW9uIGRlZmxhdGVFbmQoc3RybSkge1xuICB2YXIgc3RhdHVzO1xuXG4gIGlmICghc3RybS8qPT0gWl9OVUxMKi8gfHwgIXN0cm0uc3RhdGUvKj09IFpfTlVMTCovKSB7XG4gICAgcmV0dXJuIFpfU1RSRUFNX0VSUk9SO1xuICB9XG5cbiAgc3RhdHVzID0gc3RybS5zdGF0ZS5zdGF0dXM7XG4gIGlmIChzdGF0dXMgIT09IElOSVRfU1RBVEUgJiZcbiAgICBzdGF0dXMgIT09IEVYVFJBX1NUQVRFICYmXG4gICAgc3RhdHVzICE9PSBOQU1FX1NUQVRFICYmXG4gICAgc3RhdHVzICE9PSBDT01NRU5UX1NUQVRFICYmXG4gICAgc3RhdHVzICE9PSBIQ1JDX1NUQVRFICYmXG4gICAgc3RhdHVzICE9PSBCVVNZX1NUQVRFICYmXG4gICAgc3RhdHVzICE9PSBGSU5JU0hfU1RBVEVcbiAgKSB7XG4gICAgcmV0dXJuIGVycihzdHJtLCBaX1NUUkVBTV9FUlJPUik7XG4gIH1cblxuICBzdHJtLnN0YXRlID0gbnVsbDtcblxuICByZXR1cm4gc3RhdHVzID09PSBCVVNZX1NUQVRFID8gZXJyKHN0cm0sIFpfREFUQV9FUlJPUikgOiBaX09LO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEluaXRpYWxpemVzIHRoZSBjb21wcmVzc2lvbiBkaWN0aW9uYXJ5IGZyb20gdGhlIGdpdmVuIGJ5dGVcbiAqIHNlcXVlbmNlIHdpdGhvdXQgcHJvZHVjaW5nIGFueSBjb21wcmVzc2VkIG91dHB1dC5cbiAqL1xuZnVuY3Rpb24gZGVmbGF0ZVNldERpY3Rpb25hcnkoc3RybSwgZGljdGlvbmFyeSkge1xuICB2YXIgZGljdExlbmd0aCA9IGRpY3Rpb25hcnkubGVuZ3RoO1xuXG4gIHZhciBzO1xuICB2YXIgc3RyLCBuO1xuICB2YXIgd3JhcDtcbiAgdmFyIGF2YWlsO1xuICB2YXIgbmV4dDtcbiAgdmFyIGlucHV0O1xuICB2YXIgdG1wRGljdDtcblxuICBpZiAoIXN0cm0vKj09IFpfTlVMTCovIHx8ICFzdHJtLnN0YXRlLyo9PSBaX05VTEwqLykge1xuICAgIHJldHVybiBaX1NUUkVBTV9FUlJPUjtcbiAgfVxuXG4gIHMgPSBzdHJtLnN0YXRlO1xuICB3cmFwID0gcy53cmFwO1xuXG4gIGlmICh3cmFwID09PSAyIHx8ICh3cmFwID09PSAxICYmIHMuc3RhdHVzICE9PSBJTklUX1NUQVRFKSB8fCBzLmxvb2thaGVhZCkge1xuICAgIHJldHVybiBaX1NUUkVBTV9FUlJPUjtcbiAgfVxuXG4gIC8qIHdoZW4gdXNpbmcgemxpYiB3cmFwcGVycywgY29tcHV0ZSBBZGxlci0zMiBmb3IgcHJvdmlkZWQgZGljdGlvbmFyeSAqL1xuICBpZiAod3JhcCA9PT0gMSkge1xuICAgIC8qIGFkbGVyMzIoc3RybS0+YWRsZXIsIGRpY3Rpb25hcnksIGRpY3RMZW5ndGgpOyAqL1xuICAgIHN0cm0uYWRsZXIgPSBhZGxlcjMyKHN0cm0uYWRsZXIsIGRpY3Rpb25hcnksIGRpY3RMZW5ndGgsIDApO1xuICB9XG5cbiAgcy53cmFwID0gMDsgICAvKiBhdm9pZCBjb21wdXRpbmcgQWRsZXItMzIgaW4gcmVhZF9idWYgKi9cblxuICAvKiBpZiBkaWN0aW9uYXJ5IHdvdWxkIGZpbGwgd2luZG93LCBqdXN0IHJlcGxhY2UgdGhlIGhpc3RvcnkgKi9cbiAgaWYgKGRpY3RMZW5ndGggPj0gcy53X3NpemUpIHtcbiAgICBpZiAod3JhcCA9PT0gMCkgeyAgICAgICAgICAgIC8qIGFscmVhZHkgZW1wdHkgb3RoZXJ3aXNlICovXG4gICAgICAvKioqIENMRUFSX0hBU0gocyk7ICoqKi9cbiAgICAgIHplcm8ocy5oZWFkKTsgLy8gRmlsbCB3aXRoIE5JTCAoPSAwKTtcbiAgICAgIHMuc3Ryc3RhcnQgPSAwO1xuICAgICAgcy5ibG9ja19zdGFydCA9IDA7XG4gICAgICBzLmluc2VydCA9IDA7XG4gICAgfVxuICAgIC8qIHVzZSB0aGUgdGFpbCAqL1xuICAgIC8vIGRpY3Rpb25hcnkgPSBkaWN0aW9uYXJ5LnNsaWNlKGRpY3RMZW5ndGggLSBzLndfc2l6ZSk7XG4gICAgdG1wRGljdCA9IG5ldyB1dGlscy5CdWY4KHMud19zaXplKTtcbiAgICB1dGlscy5hcnJheVNldCh0bXBEaWN0LCBkaWN0aW9uYXJ5LCBkaWN0TGVuZ3RoIC0gcy53X3NpemUsIHMud19zaXplLCAwKTtcbiAgICBkaWN0aW9uYXJ5ID0gdG1wRGljdDtcbiAgICBkaWN0TGVuZ3RoID0gcy53X3NpemU7XG4gIH1cbiAgLyogaW5zZXJ0IGRpY3Rpb25hcnkgaW50byB3aW5kb3cgYW5kIGhhc2ggKi9cbiAgYXZhaWwgPSBzdHJtLmF2YWlsX2luO1xuICBuZXh0ID0gc3RybS5uZXh0X2luO1xuICBpbnB1dCA9IHN0cm0uaW5wdXQ7XG4gIHN0cm0uYXZhaWxfaW4gPSBkaWN0TGVuZ3RoO1xuICBzdHJtLm5leHRfaW4gPSAwO1xuICBzdHJtLmlucHV0ID0gZGljdGlvbmFyeTtcbiAgZmlsbF93aW5kb3cocyk7XG4gIHdoaWxlIChzLmxvb2thaGVhZCA+PSBNSU5fTUFUQ0gpIHtcbiAgICBzdHIgPSBzLnN0cnN0YXJ0O1xuICAgIG4gPSBzLmxvb2thaGVhZCAtIChNSU5fTUFUQ0ggLSAxKTtcbiAgICBkbyB7XG4gICAgICAvKiBVUERBVEVfSEFTSChzLCBzLT5pbnNfaCwgcy0+d2luZG93W3N0ciArIE1JTl9NQVRDSC0xXSk7ICovXG4gICAgICBzLmluc19oID0gKChzLmluc19oIDw8IHMuaGFzaF9zaGlmdCkgXiBzLndpbmRvd1tzdHIgKyBNSU5fTUFUQ0ggLSAxXSkgJiBzLmhhc2hfbWFzaztcblxuICAgICAgcy5wcmV2W3N0ciAmIHMud19tYXNrXSA9IHMuaGVhZFtzLmluc19oXTtcblxuICAgICAgcy5oZWFkW3MuaW5zX2hdID0gc3RyO1xuICAgICAgc3RyKys7XG4gICAgfSB3aGlsZSAoLS1uKTtcbiAgICBzLnN0cnN0YXJ0ID0gc3RyO1xuICAgIHMubG9va2FoZWFkID0gTUlOX01BVENIIC0gMTtcbiAgICBmaWxsX3dpbmRvdyhzKTtcbiAgfVxuICBzLnN0cnN0YXJ0ICs9IHMubG9va2FoZWFkO1xuICBzLmJsb2NrX3N0YXJ0ID0gcy5zdHJzdGFydDtcbiAgcy5pbnNlcnQgPSBzLmxvb2thaGVhZDtcbiAgcy5sb29rYWhlYWQgPSAwO1xuICBzLm1hdGNoX2xlbmd0aCA9IHMucHJldl9sZW5ndGggPSBNSU5fTUFUQ0ggLSAxO1xuICBzLm1hdGNoX2F2YWlsYWJsZSA9IDA7XG4gIHN0cm0ubmV4dF9pbiA9IG5leHQ7XG4gIHN0cm0uaW5wdXQgPSBpbnB1dDtcbiAgc3RybS5hdmFpbF9pbiA9IGF2YWlsO1xuICBzLndyYXAgPSB3cmFwO1xuICByZXR1cm4gWl9PSztcbn1cblxuXG5leHBvcnRzLmRlZmxhdGVJbml0ID0gZGVmbGF0ZUluaXQ7XG5leHBvcnRzLmRlZmxhdGVJbml0MiA9IGRlZmxhdGVJbml0MjtcbmV4cG9ydHMuZGVmbGF0ZVJlc2V0ID0gZGVmbGF0ZVJlc2V0O1xuZXhwb3J0cy5kZWZsYXRlUmVzZXRLZWVwID0gZGVmbGF0ZVJlc2V0S2VlcDtcbmV4cG9ydHMuZGVmbGF0ZVNldEhlYWRlciA9IGRlZmxhdGVTZXRIZWFkZXI7XG5leHBvcnRzLmRlZmxhdGUgPSBkZWZsYXRlO1xuZXhwb3J0cy5kZWZsYXRlRW5kID0gZGVmbGF0ZUVuZDtcbmV4cG9ydHMuZGVmbGF0ZVNldERpY3Rpb25hcnkgPSBkZWZsYXRlU2V0RGljdGlvbmFyeTtcbmV4cG9ydHMuZGVmbGF0ZUluZm8gPSAncGFrbyBkZWZsYXRlIChmcm9tIE5vZGVjYSBwcm9qZWN0KSc7XG5cbi8qIE5vdCBpbXBsZW1lbnRlZFxuZXhwb3J0cy5kZWZsYXRlQm91bmQgPSBkZWZsYXRlQm91bmQ7XG5leHBvcnRzLmRlZmxhdGVDb3B5ID0gZGVmbGF0ZUNvcHk7XG5leHBvcnRzLmRlZmxhdGVQYXJhbXMgPSBkZWZsYXRlUGFyYW1zO1xuZXhwb3J0cy5kZWZsYXRlUGVuZGluZyA9IGRlZmxhdGVQZW5kaW5nO1xuZXhwb3J0cy5kZWZsYXRlUHJpbWUgPSBkZWZsYXRlUHJpbWU7XG5leHBvcnRzLmRlZmxhdGVUdW5lID0gZGVmbGF0ZVR1bmU7XG4qL1xuIiwgIi8vIFN0cmluZyBlbmNvZGUvZGVjb2RlIGhlbHBlcnNcbid1c2Ugc3RyaWN0JztcblxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL2NvbW1vbicpO1xuXG5cbi8vIFF1aWNrIGNoZWNrIGlmIHdlIGNhbiB1c2UgZmFzdCBhcnJheSB0byBiaW4gc3RyaW5nIGNvbnZlcnNpb25cbi8vXG4vLyAtIGFwcGx5KEFycmF5KSBjYW4gZmFpbCBvbiBBbmRyb2lkIDIuMlxuLy8gLSBhcHBseShVaW50OEFycmF5KSBjYW4gZmFpbCBvbiBpT1MgNS4xIFNhZmFyaVxuLy9cbnZhciBTVFJfQVBQTFlfT0sgPSB0cnVlO1xudmFyIFNUUl9BUFBMWV9VSUFfT0sgPSB0cnVlO1xuXG50cnkgeyBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIFsgMCBdKTsgfSBjYXRjaCAoX18pIHsgU1RSX0FQUExZX09LID0gZmFsc2U7IH1cbnRyeSB7IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgbmV3IFVpbnQ4QXJyYXkoMSkpOyB9IGNhdGNoIChfXykgeyBTVFJfQVBQTFlfVUlBX09LID0gZmFsc2U7IH1cblxuXG4vLyBUYWJsZSB3aXRoIHV0ZjggbGVuZ3RocyAoY2FsY3VsYXRlZCBieSBmaXJzdCBieXRlIG9mIHNlcXVlbmNlKVxuLy8gTm90ZSwgdGhhdCA1ICYgNi1ieXRlIHZhbHVlcyBhbmQgc29tZSA0LWJ5dGUgdmFsdWVzIGNhbiBub3QgYmUgcmVwcmVzZW50ZWQgaW4gSlMsXG4vLyBiZWNhdXNlIG1heCBwb3NzaWJsZSBjb2RlcG9pbnQgaXMgMHgxMGZmZmZcbnZhciBfdXRmOGxlbiA9IG5ldyB1dGlscy5CdWY4KDI1Nik7XG5mb3IgKHZhciBxID0gMDsgcSA8IDI1NjsgcSsrKSB7XG4gIF91dGY4bGVuW3FdID0gKHEgPj0gMjUyID8gNiA6IHEgPj0gMjQ4ID8gNSA6IHEgPj0gMjQwID8gNCA6IHEgPj0gMjI0ID8gMyA6IHEgPj0gMTkyID8gMiA6IDEpO1xufVxuX3V0ZjhsZW5bMjU0XSA9IF91dGY4bGVuWzI1NF0gPSAxOyAvLyBJbnZhbGlkIHNlcXVlbmNlIHN0YXJ0XG5cblxuLy8gY29udmVydCBzdHJpbmcgdG8gYXJyYXkgKHR5cGVkLCB3aGVuIHBvc3NpYmxlKVxuZXhwb3J0cy5zdHJpbmcyYnVmID0gZnVuY3Rpb24gKHN0cikge1xuICB2YXIgYnVmLCBjLCBjMiwgbV9wb3MsIGksIHN0cl9sZW4gPSBzdHIubGVuZ3RoLCBidWZfbGVuID0gMDtcblxuICAvLyBjb3VudCBiaW5hcnkgc2l6ZVxuICBmb3IgKG1fcG9zID0gMDsgbV9wb3MgPCBzdHJfbGVuOyBtX3BvcysrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KG1fcG9zKTtcbiAgICBpZiAoKGMgJiAweGZjMDApID09PSAweGQ4MDAgJiYgKG1fcG9zICsgMSA8IHN0cl9sZW4pKSB7XG4gICAgICBjMiA9IHN0ci5jaGFyQ29kZUF0KG1fcG9zICsgMSk7XG4gICAgICBpZiAoKGMyICYgMHhmYzAwKSA9PT0gMHhkYzAwKSB7XG4gICAgICAgIGMgPSAweDEwMDAwICsgKChjIC0gMHhkODAwKSA8PCAxMCkgKyAoYzIgLSAweGRjMDApO1xuICAgICAgICBtX3BvcysrO1xuICAgICAgfVxuICAgIH1cbiAgICBidWZfbGVuICs9IGMgPCAweDgwID8gMSA6IGMgPCAweDgwMCA/IDIgOiBjIDwgMHgxMDAwMCA/IDMgOiA0O1xuICB9XG5cbiAgLy8gYWxsb2NhdGUgYnVmZmVyXG4gIGJ1ZiA9IG5ldyB1dGlscy5CdWY4KGJ1Zl9sZW4pO1xuXG4gIC8vIGNvbnZlcnRcbiAgZm9yIChpID0gMCwgbV9wb3MgPSAwOyBpIDwgYnVmX2xlbjsgbV9wb3MrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChtX3Bvcyk7XG4gICAgaWYgKChjICYgMHhmYzAwKSA9PT0gMHhkODAwICYmIChtX3BvcyArIDEgPCBzdHJfbGVuKSkge1xuICAgICAgYzIgPSBzdHIuY2hhckNvZGVBdChtX3BvcyArIDEpO1xuICAgICAgaWYgKChjMiAmIDB4ZmMwMCkgPT09IDB4ZGMwMCkge1xuICAgICAgICBjID0gMHgxMDAwMCArICgoYyAtIDB4ZDgwMCkgPDwgMTApICsgKGMyIC0gMHhkYzAwKTtcbiAgICAgICAgbV9wb3MrKztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGMgPCAweDgwKSB7XG4gICAgICAvKiBvbmUgYnl0ZSAqL1xuICAgICAgYnVmW2krK10gPSBjO1xuICAgIH0gZWxzZSBpZiAoYyA8IDB4ODAwKSB7XG4gICAgICAvKiB0d28gYnl0ZXMgKi9cbiAgICAgIGJ1ZltpKytdID0gMHhDMCB8IChjID4+PiA2KTtcbiAgICAgIGJ1ZltpKytdID0gMHg4MCB8IChjICYgMHgzZik7XG4gICAgfSBlbHNlIGlmIChjIDwgMHgxMDAwMCkge1xuICAgICAgLyogdGhyZWUgYnl0ZXMgKi9cbiAgICAgIGJ1ZltpKytdID0gMHhFMCB8IChjID4+PiAxMik7XG4gICAgICBidWZbaSsrXSA9IDB4ODAgfCAoYyA+Pj4gNiAmIDB4M2YpO1xuICAgICAgYnVmW2krK10gPSAweDgwIHwgKGMgJiAweDNmKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLyogZm91ciBieXRlcyAqL1xuICAgICAgYnVmW2krK10gPSAweGYwIHwgKGMgPj4+IDE4KTtcbiAgICAgIGJ1ZltpKytdID0gMHg4MCB8IChjID4+PiAxMiAmIDB4M2YpO1xuICAgICAgYnVmW2krK10gPSAweDgwIHwgKGMgPj4+IDYgJiAweDNmKTtcbiAgICAgIGJ1ZltpKytdID0gMHg4MCB8IChjICYgMHgzZik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1Zjtcbn07XG5cbi8vIEhlbHBlciAodXNlZCBpbiAyIHBsYWNlcylcbmZ1bmN0aW9uIGJ1ZjJiaW5zdHJpbmcoYnVmLCBsZW4pIHtcbiAgLy8gT24gQ2hyb21lLCB0aGUgYXJndW1lbnRzIGluIGEgZnVuY3Rpb24gY2FsbCB0aGF0IGFyZSBhbGxvd2VkIGlzIGA2NTUzNGAuXG4gIC8vIElmIHRoZSBsZW5ndGggb2YgdGhlIGJ1ZmZlciBpcyBzbWFsbGVyIHRoYW4gdGhhdCwgd2UgY2FuIHVzZSB0aGlzIG9wdGltaXphdGlvbixcbiAgLy8gb3RoZXJ3aXNlIHdlIHdpbGwgdGFrZSBhIHNsb3dlciBwYXRoLlxuICBpZiAobGVuIDwgNjU1MzQpIHtcbiAgICBpZiAoKGJ1Zi5zdWJhcnJheSAmJiBTVFJfQVBQTFlfVUlBX09LKSB8fCAoIWJ1Zi5zdWJhcnJheSAmJiBTVFJfQVBQTFlfT0spKSB7XG4gICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCB1dGlscy5zaHJpbmtCdWYoYnVmLCBsZW4pKTtcbiAgICB9XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gJyc7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICByZXN1bHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cblxuLy8gQ29udmVydCBieXRlIGFycmF5IHRvIGJpbmFyeSBzdHJpbmdcbmV4cG9ydHMuYnVmMmJpbnN0cmluZyA9IGZ1bmN0aW9uIChidWYpIHtcbiAgcmV0dXJuIGJ1ZjJiaW5zdHJpbmcoYnVmLCBidWYubGVuZ3RoKTtcbn07XG5cblxuLy8gQ29udmVydCBiaW5hcnkgc3RyaW5nICh0eXBlZCwgd2hlbiBwb3NzaWJsZSlcbmV4cG9ydHMuYmluc3RyaW5nMmJ1ZiA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgdmFyIGJ1ZiA9IG5ldyB1dGlscy5CdWY4KHN0ci5sZW5ndGgpO1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgYnVmW2ldID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gIH1cbiAgcmV0dXJuIGJ1Zjtcbn07XG5cblxuLy8gY29udmVydCBhcnJheSB0byBzdHJpbmdcbmV4cG9ydHMuYnVmMnN0cmluZyA9IGZ1bmN0aW9uIChidWYsIG1heCkge1xuICB2YXIgaSwgb3V0LCBjLCBjX2xlbjtcbiAgdmFyIGxlbiA9IG1heCB8fCBidWYubGVuZ3RoO1xuXG4gIC8vIFJlc2VydmUgbWF4IHBvc3NpYmxlIGxlbmd0aCAoMiB3b3JkcyBwZXIgY2hhcilcbiAgLy8gTkI6IGJ5IHVua25vd24gcmVhc29ucywgQXJyYXkgaXMgc2lnbmlmaWNhbnRseSBmYXN0ZXIgZm9yXG4gIC8vICAgICBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5IHRoYW4gVWludDE2QXJyYXkuXG4gIHZhciB1dGYxNmJ1ZiA9IG5ldyBBcnJheShsZW4gKiAyKTtcblxuICBmb3IgKG91dCA9IDAsIGkgPSAwOyBpIDwgbGVuOykge1xuICAgIGMgPSBidWZbaSsrXTtcbiAgICAvLyBxdWljayBwcm9jZXNzIGFzY2lpXG4gICAgaWYgKGMgPCAweDgwKSB7IHV0ZjE2YnVmW291dCsrXSA9IGM7IGNvbnRpbnVlOyB9XG5cbiAgICBjX2xlbiA9IF91dGY4bGVuW2NdO1xuICAgIC8vIHNraXAgNSAmIDYgYnl0ZSBjb2Rlc1xuICAgIGlmIChjX2xlbiA+IDQpIHsgdXRmMTZidWZbb3V0KytdID0gMHhmZmZkOyBpICs9IGNfbGVuIC0gMTsgY29udGludWU7IH1cblxuICAgIC8vIGFwcGx5IG1hc2sgb24gZmlyc3QgYnl0ZVxuICAgIGMgJj0gY19sZW4gPT09IDIgPyAweDFmIDogY19sZW4gPT09IDMgPyAweDBmIDogMHgwNztcbiAgICAvLyBqb2luIHRoZSByZXN0XG4gICAgd2hpbGUgKGNfbGVuID4gMSAmJiBpIDwgbGVuKSB7XG4gICAgICBjID0gKGMgPDwgNikgfCAoYnVmW2krK10gJiAweDNmKTtcbiAgICAgIGNfbGVuLS07XG4gICAgfVxuXG4gICAgLy8gdGVybWluYXRlZCBieSBlbmQgb2Ygc3RyaW5nP1xuICAgIGlmIChjX2xlbiA+IDEpIHsgdXRmMTZidWZbb3V0KytdID0gMHhmZmZkOyBjb250aW51ZTsgfVxuXG4gICAgaWYgKGMgPCAweDEwMDAwKSB7XG4gICAgICB1dGYxNmJ1ZltvdXQrK10gPSBjO1xuICAgIH0gZWxzZSB7XG4gICAgICBjIC09IDB4MTAwMDA7XG4gICAgICB1dGYxNmJ1ZltvdXQrK10gPSAweGQ4MDAgfCAoKGMgPj4gMTApICYgMHgzZmYpO1xuICAgICAgdXRmMTZidWZbb3V0KytdID0gMHhkYzAwIHwgKGMgJiAweDNmZik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZjJiaW5zdHJpbmcodXRmMTZidWYsIG91dCk7XG59O1xuXG5cbi8vIENhbGN1bGF0ZSBtYXggcG9zc2libGUgcG9zaXRpb24gaW4gdXRmOCBidWZmZXIsXG4vLyB0aGF0IHdpbGwgbm90IGJyZWFrIHNlcXVlbmNlLiBJZiB0aGF0J3Mgbm90IHBvc3NpYmxlXG4vLyAtICh2ZXJ5IHNtYWxsIGxpbWl0cykgcmV0dXJuIG1heCBzaXplIGFzIGlzLlxuLy9cbi8vIGJ1ZltdIC0gdXRmOCBieXRlcyBhcnJheVxuLy8gbWF4ICAgLSBsZW5ndGggbGltaXQgKG1hbmRhdG9yeSk7XG5leHBvcnRzLnV0Zjhib3JkZXIgPSBmdW5jdGlvbiAoYnVmLCBtYXgpIHtcbiAgdmFyIHBvcztcblxuICBtYXggPSBtYXggfHwgYnVmLmxlbmd0aDtcbiAgaWYgKG1heCA+IGJ1Zi5sZW5ndGgpIHsgbWF4ID0gYnVmLmxlbmd0aDsgfVxuXG4gIC8vIGdvIGJhY2sgZnJvbSBsYXN0IHBvc2l0aW9uLCB1bnRpbCBzdGFydCBvZiBzZXF1ZW5jZSBmb3VuZFxuICBwb3MgPSBtYXggLSAxO1xuICB3aGlsZSAocG9zID49IDAgJiYgKGJ1Zltwb3NdICYgMHhDMCkgPT09IDB4ODApIHsgcG9zLS07IH1cblxuICAvLyBWZXJ5IHNtYWxsIGFuZCBicm9rZW4gc2VxdWVuY2UsXG4gIC8vIHJldHVybiBtYXgsIGJlY2F1c2Ugd2Ugc2hvdWxkIHJldHVybiBzb21ldGhpbmcgYW55d2F5LlxuICBpZiAocG9zIDwgMCkgeyByZXR1cm4gbWF4OyB9XG5cbiAgLy8gSWYgd2UgY2FtZSB0byBzdGFydCBvZiBidWZmZXIgLSB0aGF0IG1lYW5zIGJ1ZmZlciBpcyB0b28gc21hbGwsXG4gIC8vIHJldHVybiBtYXggdG9vLlxuICBpZiAocG9zID09PSAwKSB7IHJldHVybiBtYXg7IH1cblxuICByZXR1cm4gKHBvcyArIF91dGY4bGVuW2J1Zltwb3NdXSA+IG1heCkgPyBwb3MgOiBtYXg7XG59O1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLy8gKEMpIDE5OTUtMjAxMyBKZWFuLWxvdXAgR2FpbGx5IGFuZCBNYXJrIEFkbGVyXG4vLyAoQykgMjAxNC0yMDE3IFZpdGFseSBQdXpyaW4gYW5kIEFuZHJleSBUdXBpdHNpblxuLy9cbi8vIFRoaXMgc29mdHdhcmUgaXMgcHJvdmlkZWQgJ2FzLWlzJywgd2l0aG91dCBhbnkgZXhwcmVzcyBvciBpbXBsaWVkXG4vLyB3YXJyYW50eS4gSW4gbm8gZXZlbnQgd2lsbCB0aGUgYXV0aG9ycyBiZSBoZWxkIGxpYWJsZSBmb3IgYW55IGRhbWFnZXNcbi8vIGFyaXNpbmcgZnJvbSB0aGUgdXNlIG9mIHRoaXMgc29mdHdhcmUuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBncmFudGVkIHRvIGFueW9uZSB0byB1c2UgdGhpcyBzb2Z0d2FyZSBmb3IgYW55IHB1cnBvc2UsXG4vLyBpbmNsdWRpbmcgY29tbWVyY2lhbCBhcHBsaWNhdGlvbnMsIGFuZCB0byBhbHRlciBpdCBhbmQgcmVkaXN0cmlidXRlIGl0XG4vLyBmcmVlbHksIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyByZXN0cmljdGlvbnM6XG4vL1xuLy8gMS4gVGhlIG9yaWdpbiBvZiB0aGlzIHNvZnR3YXJlIG11c3Qgbm90IGJlIG1pc3JlcHJlc2VudGVkOyB5b3UgbXVzdCBub3Rcbi8vICAgY2xhaW0gdGhhdCB5b3Ugd3JvdGUgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLiBJZiB5b3UgdXNlIHRoaXMgc29mdHdhcmVcbi8vICAgaW4gYSBwcm9kdWN0LCBhbiBhY2tub3dsZWRnbWVudCBpbiB0aGUgcHJvZHVjdCBkb2N1bWVudGF0aW9uIHdvdWxkIGJlXG4vLyAgIGFwcHJlY2lhdGVkIGJ1dCBpcyBub3QgcmVxdWlyZWQuXG4vLyAyLiBBbHRlcmVkIHNvdXJjZSB2ZXJzaW9ucyBtdXN0IGJlIHBsYWlubHkgbWFya2VkIGFzIHN1Y2gsIGFuZCBtdXN0IG5vdCBiZVxuLy8gICBtaXNyZXByZXNlbnRlZCBhcyBiZWluZyB0aGUgb3JpZ2luYWwgc29mdHdhcmUuXG4vLyAzLiBUaGlzIG5vdGljZSBtYXkgbm90IGJlIHJlbW92ZWQgb3IgYWx0ZXJlZCBmcm9tIGFueSBzb3VyY2UgZGlzdHJpYnV0aW9uLlxuXG5mdW5jdGlvbiBaU3RyZWFtKCkge1xuICAvKiBuZXh0IGlucHV0IGJ5dGUgKi9cbiAgdGhpcy5pbnB1dCA9IG51bGw7IC8vIEpTIHNwZWNpZmljLCBiZWNhdXNlIHdlIGhhdmUgbm8gcG9pbnRlcnNcbiAgdGhpcy5uZXh0X2luID0gMDtcbiAgLyogbnVtYmVyIG9mIGJ5dGVzIGF2YWlsYWJsZSBhdCBpbnB1dCAqL1xuICB0aGlzLmF2YWlsX2luID0gMDtcbiAgLyogdG90YWwgbnVtYmVyIG9mIGlucHV0IGJ5dGVzIHJlYWQgc28gZmFyICovXG4gIHRoaXMudG90YWxfaW4gPSAwO1xuICAvKiBuZXh0IG91dHB1dCBieXRlIHNob3VsZCBiZSBwdXQgdGhlcmUgKi9cbiAgdGhpcy5vdXRwdXQgPSBudWxsOyAvLyBKUyBzcGVjaWZpYywgYmVjYXVzZSB3ZSBoYXZlIG5vIHBvaW50ZXJzXG4gIHRoaXMubmV4dF9vdXQgPSAwO1xuICAvKiByZW1haW5pbmcgZnJlZSBzcGFjZSBhdCBvdXRwdXQgKi9cbiAgdGhpcy5hdmFpbF9vdXQgPSAwO1xuICAvKiB0b3RhbCBudW1iZXIgb2YgYnl0ZXMgb3V0cHV0IHNvIGZhciAqL1xuICB0aGlzLnRvdGFsX291dCA9IDA7XG4gIC8qIGxhc3QgZXJyb3IgbWVzc2FnZSwgTlVMTCBpZiBubyBlcnJvciAqL1xuICB0aGlzLm1zZyA9ICcnLypaX05VTEwqLztcbiAgLyogbm90IHZpc2libGUgYnkgYXBwbGljYXRpb25zICovXG4gIHRoaXMuc3RhdGUgPSBudWxsO1xuICAvKiBiZXN0IGd1ZXNzIGFib3V0IHRoZSBkYXRhIHR5cGU6IGJpbmFyeSBvciB0ZXh0ICovXG4gIHRoaXMuZGF0YV90eXBlID0gMi8qWl9VTktOT1dOKi87XG4gIC8qIGFkbGVyMzIgdmFsdWUgb2YgdGhlIHVuY29tcHJlc3NlZCBkYXRhICovXG4gIHRoaXMuYWRsZXIgPSAwO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFpTdHJlYW07XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciB6bGliX2RlZmxhdGUgPSByZXF1aXJlKCcuL3psaWIvZGVmbGF0ZScpO1xudmFyIHV0aWxzICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMvY29tbW9uJyk7XG52YXIgc3RyaW5ncyAgICAgID0gcmVxdWlyZSgnLi91dGlscy9zdHJpbmdzJyk7XG52YXIgbXNnICAgICAgICAgID0gcmVxdWlyZSgnLi96bGliL21lc3NhZ2VzJyk7XG52YXIgWlN0cmVhbSAgICAgID0gcmVxdWlyZSgnLi96bGliL3pzdHJlYW0nKTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyogUHVibGljIGNvbnN0YW50cyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cbnZhciBaX05PX0ZMVVNIICAgICAgPSAwO1xudmFyIFpfRklOSVNIICAgICAgICA9IDQ7XG5cbnZhciBaX09LICAgICAgICAgICAgPSAwO1xudmFyIFpfU1RSRUFNX0VORCAgICA9IDE7XG52YXIgWl9TWU5DX0ZMVVNIICAgID0gMjtcblxudmFyIFpfREVGQVVMVF9DT01QUkVTU0lPTiA9IC0xO1xuXG52YXIgWl9ERUZBVUxUX1NUUkFURUdZICAgID0gMDtcblxudmFyIFpfREVGTEFURUQgID0gODtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuXG4vKipcbiAqIGNsYXNzIERlZmxhdGVcbiAqXG4gKiBHZW5lcmljIEpTLXN0eWxlIHdyYXBwZXIgZm9yIHpsaWIgY2FsbHMuIElmIHlvdSBkb24ndCBuZWVkXG4gKiBzdHJlYW1pbmcgYmVoYXZpb3VyIC0gdXNlIG1vcmUgc2ltcGxlIGZ1bmN0aW9uczogW1tkZWZsYXRlXV0sXG4gKiBbW2RlZmxhdGVSYXddXSBhbmQgW1tnemlwXV0uXG4gKiovXG5cbi8qIGludGVybmFsXG4gKiBEZWZsYXRlLmNodW5rcyAtPiBBcnJheVxuICpcbiAqIENodW5rcyBvZiBvdXRwdXQgZGF0YSwgaWYgW1tEZWZsYXRlI29uRGF0YV1dIG5vdCBvdmVycmlkZGVuLlxuICoqL1xuXG4vKipcbiAqIERlZmxhdGUucmVzdWx0IC0+IFVpbnQ4QXJyYXl8QXJyYXlcbiAqXG4gKiBDb21wcmVzc2VkIHJlc3VsdCwgZ2VuZXJhdGVkIGJ5IGRlZmF1bHQgW1tEZWZsYXRlI29uRGF0YV1dXG4gKiBhbmQgW1tEZWZsYXRlI29uRW5kXV0gaGFuZGxlcnMuIEZpbGxlZCBhZnRlciB5b3UgcHVzaCBsYXN0IGNodW5rXG4gKiAoY2FsbCBbW0RlZmxhdGUjcHVzaF1dIHdpdGggYFpfRklOSVNIYCAvIGB0cnVlYCBwYXJhbSkgIG9yIGlmIHlvdVxuICogcHVzaCBhIGNodW5rIHdpdGggZXhwbGljaXQgZmx1c2ggKGNhbGwgW1tEZWZsYXRlI3B1c2hdXSB3aXRoXG4gKiBgWl9TWU5DX0ZMVVNIYCBwYXJhbSkuXG4gKiovXG5cbi8qKlxuICogRGVmbGF0ZS5lcnIgLT4gTnVtYmVyXG4gKlxuICogRXJyb3IgY29kZSBhZnRlciBkZWZsYXRlIGZpbmlzaGVkLiAwIChaX09LKSBvbiBzdWNjZXNzLlxuICogWW91IHdpbGwgbm90IG5lZWQgaXQgaW4gcmVhbCBsaWZlLCBiZWNhdXNlIGRlZmxhdGUgZXJyb3JzXG4gKiBhcmUgcG9zc2libGUgb25seSBvbiB3cm9uZyBvcHRpb25zIG9yIGJhZCBgb25EYXRhYCAvIGBvbkVuZGBcbiAqIGN1c3RvbSBoYW5kbGVycy5cbiAqKi9cblxuLyoqXG4gKiBEZWZsYXRlLm1zZyAtPiBTdHJpbmdcbiAqXG4gKiBFcnJvciBtZXNzYWdlLCBpZiBbW0RlZmxhdGUuZXJyXV0gIT0gMFxuICoqL1xuXG5cbi8qKlxuICogbmV3IERlZmxhdGUob3B0aW9ucylcbiAqIC0gb3B0aW9ucyAoT2JqZWN0KTogemxpYiBkZWZsYXRlIG9wdGlvbnMuXG4gKlxuICogQ3JlYXRlcyBuZXcgZGVmbGF0b3IgaW5zdGFuY2Ugd2l0aCBzcGVjaWZpZWQgcGFyYW1zLiBUaHJvd3MgZXhjZXB0aW9uXG4gKiBvbiBiYWQgcGFyYW1zLiBTdXBwb3J0ZWQgb3B0aW9uczpcbiAqXG4gKiAtIGBsZXZlbGBcbiAqIC0gYHdpbmRvd0JpdHNgXG4gKiAtIGBtZW1MZXZlbGBcbiAqIC0gYHN0cmF0ZWd5YFxuICogLSBgZGljdGlvbmFyeWBcbiAqXG4gKiBbaHR0cDovL3psaWIubmV0L21hbnVhbC5odG1sI0FkdmFuY2VkXShodHRwOi8vemxpYi5uZXQvbWFudWFsLmh0bWwjQWR2YW5jZWQpXG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGVzZS5cbiAqXG4gKiBBZGRpdGlvbmFsIG9wdGlvbnMsIGZvciBpbnRlcm5hbCBuZWVkczpcbiAqXG4gKiAtIGBjaHVua1NpemVgIC0gc2l6ZSBvZiBnZW5lcmF0ZWQgZGF0YSBjaHVua3MgKDE2SyBieSBkZWZhdWx0KVxuICogLSBgcmF3YCAoQm9vbGVhbikgLSBkbyByYXcgZGVmbGF0ZVxuICogLSBgZ3ppcGAgKEJvb2xlYW4pIC0gY3JlYXRlIGd6aXAgd3JhcHBlclxuICogLSBgdG9gIChTdHJpbmcpIC0gaWYgZXF1YWwgdG8gJ3N0cmluZycsIHRoZW4gcmVzdWx0IHdpbGwgYmUgXCJiaW5hcnkgc3RyaW5nXCJcbiAqICAgIChlYWNoIGNoYXIgY29kZSBbMC4uMjU1XSlcbiAqIC0gYGhlYWRlcmAgKE9iamVjdCkgLSBjdXN0b20gaGVhZGVyIGZvciBnemlwXG4gKiAgIC0gYHRleHRgIChCb29sZWFuKSAtIHRydWUgaWYgY29tcHJlc3NlZCBkYXRhIGJlbGlldmVkIHRvIGJlIHRleHRcbiAqICAgLSBgdGltZWAgKE51bWJlcikgLSBtb2RpZmljYXRpb24gdGltZSwgdW5peCB0aW1lc3RhbXBcbiAqICAgLSBgb3NgIChOdW1iZXIpIC0gb3BlcmF0aW9uIHN5c3RlbSBjb2RlXG4gKiAgIC0gYGV4dHJhYCAoQXJyYXkpIC0gYXJyYXkgb2YgYnl0ZXMgd2l0aCBleHRyYSBkYXRhIChtYXggNjU1MzYpXG4gKiAgIC0gYG5hbWVgIChTdHJpbmcpIC0gZmlsZSBuYW1lIChiaW5hcnkgc3RyaW5nKVxuICogICAtIGBjb21tZW50YCAoU3RyaW5nKSAtIGNvbW1lbnQgKGJpbmFyeSBzdHJpbmcpXG4gKiAgIC0gYGhjcmNgIChCb29sZWFuKSAtIHRydWUgaWYgaGVhZGVyIGNyYyBzaG91bGQgYmUgYWRkZWRcbiAqXG4gKiAjIyMjIyBFeGFtcGxlOlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHZhciBwYWtvID0gcmVxdWlyZSgncGFrbycpXG4gKiAgICwgY2h1bmsxID0gVWludDhBcnJheShbMSwyLDMsNCw1LDYsNyw4LDldKVxuICogICAsIGNodW5rMiA9IFVpbnQ4QXJyYXkoWzEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5XSk7XG4gKlxuICogdmFyIGRlZmxhdGUgPSBuZXcgcGFrby5EZWZsYXRlKHsgbGV2ZWw6IDN9KTtcbiAqXG4gKiBkZWZsYXRlLnB1c2goY2h1bmsxLCBmYWxzZSk7XG4gKiBkZWZsYXRlLnB1c2goY2h1bmsyLCB0cnVlKTsgIC8vIHRydWUgLT4gbGFzdCBjaHVua1xuICpcbiAqIGlmIChkZWZsYXRlLmVycikgeyB0aHJvdyBuZXcgRXJyb3IoZGVmbGF0ZS5lcnIpOyB9XG4gKlxuICogY29uc29sZS5sb2coZGVmbGF0ZS5yZXN1bHQpO1xuICogYGBgXG4gKiovXG5mdW5jdGlvbiBEZWZsYXRlKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIERlZmxhdGUpKSByZXR1cm4gbmV3IERlZmxhdGUob3B0aW9ucyk7XG5cbiAgdGhpcy5vcHRpb25zID0gdXRpbHMuYXNzaWduKHtcbiAgICBsZXZlbDogWl9ERUZBVUxUX0NPTVBSRVNTSU9OLFxuICAgIG1ldGhvZDogWl9ERUZMQVRFRCxcbiAgICBjaHVua1NpemU6IDE2Mzg0LFxuICAgIHdpbmRvd0JpdHM6IDE1LFxuICAgIG1lbUxldmVsOiA4LFxuICAgIHN0cmF0ZWd5OiBaX0RFRkFVTFRfU1RSQVRFR1ksXG4gICAgdG86ICcnXG4gIH0sIG9wdGlvbnMgfHwge30pO1xuXG4gIHZhciBvcHQgPSB0aGlzLm9wdGlvbnM7XG5cbiAgaWYgKG9wdC5yYXcgJiYgKG9wdC53aW5kb3dCaXRzID4gMCkpIHtcbiAgICBvcHQud2luZG93Qml0cyA9IC1vcHQud2luZG93Qml0cztcbiAgfVxuXG4gIGVsc2UgaWYgKG9wdC5nemlwICYmIChvcHQud2luZG93Qml0cyA+IDApICYmIChvcHQud2luZG93Qml0cyA8IDE2KSkge1xuICAgIG9wdC53aW5kb3dCaXRzICs9IDE2O1xuICB9XG5cbiAgdGhpcy5lcnIgICAgPSAwOyAgICAgIC8vIGVycm9yIGNvZGUsIGlmIGhhcHBlbnMgKDAgPSBaX09LKVxuICB0aGlzLm1zZyAgICA9ICcnOyAgICAgLy8gZXJyb3IgbWVzc2FnZVxuICB0aGlzLmVuZGVkICA9IGZhbHNlOyAgLy8gdXNlZCB0byBhdm9pZCBtdWx0aXBsZSBvbkVuZCgpIGNhbGxzXG4gIHRoaXMuY2h1bmtzID0gW107ICAgICAvLyBjaHVua3Mgb2YgY29tcHJlc3NlZCBkYXRhXG5cbiAgdGhpcy5zdHJtID0gbmV3IFpTdHJlYW0oKTtcbiAgdGhpcy5zdHJtLmF2YWlsX291dCA9IDA7XG5cbiAgdmFyIHN0YXR1cyA9IHpsaWJfZGVmbGF0ZS5kZWZsYXRlSW5pdDIoXG4gICAgdGhpcy5zdHJtLFxuICAgIG9wdC5sZXZlbCxcbiAgICBvcHQubWV0aG9kLFxuICAgIG9wdC53aW5kb3dCaXRzLFxuICAgIG9wdC5tZW1MZXZlbCxcbiAgICBvcHQuc3RyYXRlZ3lcbiAgKTtcblxuICBpZiAoc3RhdHVzICE9PSBaX09LKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZ1tzdGF0dXNdKTtcbiAgfVxuXG4gIGlmIChvcHQuaGVhZGVyKSB7XG4gICAgemxpYl9kZWZsYXRlLmRlZmxhdGVTZXRIZWFkZXIodGhpcy5zdHJtLCBvcHQuaGVhZGVyKTtcbiAgfVxuXG4gIGlmIChvcHQuZGljdGlvbmFyeSkge1xuICAgIHZhciBkaWN0O1xuICAgIC8vIENvbnZlcnQgZGF0YSBpZiBuZWVkZWRcbiAgICBpZiAodHlwZW9mIG9wdC5kaWN0aW9uYXJ5ID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gSWYgd2UgbmVlZCB0byBjb21wcmVzcyB0ZXh0LCBjaGFuZ2UgZW5jb2RpbmcgdG8gdXRmOC5cbiAgICAgIGRpY3QgPSBzdHJpbmdzLnN0cmluZzJidWYob3B0LmRpY3Rpb25hcnkpO1xuICAgIH0gZWxzZSBpZiAodG9TdHJpbmcuY2FsbChvcHQuZGljdGlvbmFyeSkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXScpIHtcbiAgICAgIGRpY3QgPSBuZXcgVWludDhBcnJheShvcHQuZGljdGlvbmFyeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRpY3QgPSBvcHQuZGljdGlvbmFyeTtcbiAgICB9XG5cbiAgICBzdGF0dXMgPSB6bGliX2RlZmxhdGUuZGVmbGF0ZVNldERpY3Rpb25hcnkodGhpcy5zdHJtLCBkaWN0KTtcblxuICAgIGlmIChzdGF0dXMgIT09IFpfT0spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihtc2dbc3RhdHVzXSk7XG4gICAgfVxuXG4gICAgdGhpcy5fZGljdF9zZXQgPSB0cnVlO1xuICB9XG59XG5cbi8qKlxuICogRGVmbGF0ZSNwdXNoKGRhdGFbLCBtb2RlXSkgLT4gQm9vbGVhblxuICogLSBkYXRhIChVaW50OEFycmF5fEFycmF5fEFycmF5QnVmZmVyfFN0cmluZyk6IGlucHV0IGRhdGEuIFN0cmluZ3Mgd2lsbCBiZVxuICogICBjb252ZXJ0ZWQgdG8gdXRmOCBieXRlIHNlcXVlbmNlLlxuICogLSBtb2RlIChOdW1iZXJ8Qm9vbGVhbik6IDAuLjYgZm9yIGNvcnJlc3BvbmRpbmcgWl9OT19GTFVTSC4uWl9UUkVFIG1vZGVzLlxuICogICBTZWUgY29uc3RhbnRzLiBTa2lwcGVkIG9yIGBmYWxzZWAgbWVhbnMgWl9OT19GTFVTSCwgYHRydWVgIG1lYW5zIFpfRklOSVNILlxuICpcbiAqIFNlbmRzIGlucHV0IGRhdGEgdG8gZGVmbGF0ZSBwaXBlLCBnZW5lcmF0aW5nIFtbRGVmbGF0ZSNvbkRhdGFdXSBjYWxscyB3aXRoXG4gKiBuZXcgY29tcHJlc3NlZCBjaHVua3MuIFJldHVybnMgYHRydWVgIG9uIHN1Y2Nlc3MuIFRoZSBsYXN0IGRhdGEgYmxvY2sgbXVzdCBoYXZlXG4gKiBtb2RlIFpfRklOSVNIIChvciBgdHJ1ZWApLiBUaGF0IHdpbGwgZmx1c2ggaW50ZXJuYWwgcGVuZGluZyBidWZmZXJzIGFuZCBjYWxsXG4gKiBbW0RlZmxhdGUjb25FbmRdXS4gRm9yIGludGVyaW0gZXhwbGljaXQgZmx1c2hlcyAod2l0aG91dCBlbmRpbmcgdGhlIHN0cmVhbSkgeW91XG4gKiBjYW4gdXNlIG1vZGUgWl9TWU5DX0ZMVVNILCBrZWVwaW5nIHRoZSBjb21wcmVzc2lvbiBjb250ZXh0LlxuICpcbiAqIE9uIGZhaWwgY2FsbCBbW0RlZmxhdGUjb25FbmRdXSB3aXRoIGVycm9yIGNvZGUgYW5kIHJldHVybiBmYWxzZS5cbiAqXG4gKiBXZSBzdHJvbmdseSByZWNvbW1lbmQgdG8gdXNlIGBVaW50OEFycmF5YCBvbiBpbnB1dCBmb3IgYmVzdCBzcGVlZCAob3V0cHV0XG4gKiBhcnJheSBmb3JtYXQgaXMgZGV0ZWN0ZWQgYXV0b21hdGljYWxseSkuIEFsc28sIGRvbid0IHNraXAgbGFzdCBwYXJhbSBhbmQgYWx3YXlzXG4gKiB1c2UgdGhlIHNhbWUgdHlwZSBpbiB5b3VyIGNvZGUgKGJvb2xlYW4gb3IgbnVtYmVyKS4gVGhhdCB3aWxsIGltcHJvdmUgSlMgc3BlZWQuXG4gKlxuICogRm9yIHJlZ3VsYXIgYEFycmF5YC1zIG1ha2Ugc3VyZSBhbGwgZWxlbWVudHMgYXJlIFswLi4yNTVdLlxuICpcbiAqICMjIyMjIEV4YW1wbGVcbiAqXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiBwdXNoKGNodW5rLCBmYWxzZSk7IC8vIHB1c2ggb25lIG9mIGRhdGEgY2h1bmtzXG4gKiAuLi5cbiAqIHB1c2goY2h1bmssIHRydWUpOyAgLy8gcHVzaCBsYXN0IGNodW5rXG4gKiBgYGBcbiAqKi9cbkRlZmxhdGUucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoZGF0YSwgbW9kZSkge1xuICB2YXIgc3RybSA9IHRoaXMuc3RybTtcbiAgdmFyIGNodW5rU2l6ZSA9IHRoaXMub3B0aW9ucy5jaHVua1NpemU7XG4gIHZhciBzdGF0dXMsIF9tb2RlO1xuXG4gIGlmICh0aGlzLmVuZGVkKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gIF9tb2RlID0gKG1vZGUgPT09IH5+bW9kZSkgPyBtb2RlIDogKChtb2RlID09PSB0cnVlKSA/IFpfRklOSVNIIDogWl9OT19GTFVTSCk7XG5cbiAgLy8gQ29udmVydCBkYXRhIGlmIG5lZWRlZFxuICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgLy8gSWYgd2UgbmVlZCB0byBjb21wcmVzcyB0ZXh0LCBjaGFuZ2UgZW5jb2RpbmcgdG8gdXRmOC5cbiAgICBzdHJtLmlucHV0ID0gc3RyaW5ncy5zdHJpbmcyYnVmKGRhdGEpO1xuICB9IGVsc2UgaWYgKHRvU3RyaW5nLmNhbGwoZGF0YSkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXScpIHtcbiAgICBzdHJtLmlucHV0ID0gbmV3IFVpbnQ4QXJyYXkoZGF0YSk7XG4gIH0gZWxzZSB7XG4gICAgc3RybS5pbnB1dCA9IGRhdGE7XG4gIH1cblxuICBzdHJtLm5leHRfaW4gPSAwO1xuICBzdHJtLmF2YWlsX2luID0gc3RybS5pbnB1dC5sZW5ndGg7XG5cbiAgZG8ge1xuICAgIGlmIChzdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgc3RybS5vdXRwdXQgPSBuZXcgdXRpbHMuQnVmOChjaHVua1NpemUpO1xuICAgICAgc3RybS5uZXh0X291dCA9IDA7XG4gICAgICBzdHJtLmF2YWlsX291dCA9IGNodW5rU2l6ZTtcbiAgICB9XG4gICAgc3RhdHVzID0gemxpYl9kZWZsYXRlLmRlZmxhdGUoc3RybSwgX21vZGUpOyAgICAvKiBubyBiYWQgcmV0dXJuIHZhbHVlICovXG5cbiAgICBpZiAoc3RhdHVzICE9PSBaX1NUUkVBTV9FTkQgJiYgc3RhdHVzICE9PSBaX09LKSB7XG4gICAgICB0aGlzLm9uRW5kKHN0YXR1cyk7XG4gICAgICB0aGlzLmVuZGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKHN0cm0uYXZhaWxfb3V0ID09PSAwIHx8IChzdHJtLmF2YWlsX2luID09PSAwICYmIChfbW9kZSA9PT0gWl9GSU5JU0ggfHwgX21vZGUgPT09IFpfU1lOQ19GTFVTSCkpKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLnRvID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aGlzLm9uRGF0YShzdHJpbmdzLmJ1ZjJiaW5zdHJpbmcodXRpbHMuc2hyaW5rQnVmKHN0cm0ub3V0cHV0LCBzdHJtLm5leHRfb3V0KSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5vbkRhdGEodXRpbHMuc2hyaW5rQnVmKHN0cm0ub3V0cHV0LCBzdHJtLm5leHRfb3V0KSk7XG4gICAgICB9XG4gICAgfVxuICB9IHdoaWxlICgoc3RybS5hdmFpbF9pbiA+IDAgfHwgc3RybS5hdmFpbF9vdXQgPT09IDApICYmIHN0YXR1cyAhPT0gWl9TVFJFQU1fRU5EKTtcblxuICAvLyBGaW5hbGl6ZSBvbiB0aGUgbGFzdCBjaHVuay5cbiAgaWYgKF9tb2RlID09PSBaX0ZJTklTSCkge1xuICAgIHN0YXR1cyA9IHpsaWJfZGVmbGF0ZS5kZWZsYXRlRW5kKHRoaXMuc3RybSk7XG4gICAgdGhpcy5vbkVuZChzdGF0dXMpO1xuICAgIHRoaXMuZW5kZWQgPSB0cnVlO1xuICAgIHJldHVybiBzdGF0dXMgPT09IFpfT0s7XG4gIH1cblxuICAvLyBjYWxsYmFjayBpbnRlcmltIHJlc3VsdHMgaWYgWl9TWU5DX0ZMVVNILlxuICBpZiAoX21vZGUgPT09IFpfU1lOQ19GTFVTSCkge1xuICAgIHRoaXMub25FbmQoWl9PSyk7XG4gICAgc3RybS5hdmFpbF9vdXQgPSAwO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogRGVmbGF0ZSNvbkRhdGEoY2h1bmspIC0+IFZvaWRcbiAqIC0gY2h1bmsgKFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nKTogb3V0cHV0IGRhdGEuIFR5cGUgb2YgYXJyYXkgZGVwZW5kc1xuICogICBvbiBqcyBlbmdpbmUgc3VwcG9ydC4gV2hlbiBzdHJpbmcgb3V0cHV0IHJlcXVlc3RlZCwgZWFjaCBjaHVua1xuICogICB3aWxsIGJlIHN0cmluZy5cbiAqXG4gKiBCeSBkZWZhdWx0LCBzdG9yZXMgZGF0YSBibG9ja3MgaW4gYGNodW5rc1tdYCBwcm9wZXJ0eSBhbmQgZ2x1ZVxuICogdGhvc2UgaW4gYG9uRW5kYC4gT3ZlcnJpZGUgdGhpcyBoYW5kbGVyLCBpZiB5b3UgbmVlZCBhbm90aGVyIGJlaGF2aW91ci5cbiAqKi9cbkRlZmxhdGUucHJvdG90eXBlLm9uRGF0YSA9IGZ1bmN0aW9uIChjaHVuaykge1xuICB0aGlzLmNodW5rcy5wdXNoKGNodW5rKTtcbn07XG5cblxuLyoqXG4gKiBEZWZsYXRlI29uRW5kKHN0YXR1cykgLT4gVm9pZFxuICogLSBzdGF0dXMgKE51bWJlcik6IGRlZmxhdGUgc3RhdHVzLiAwIChaX09LKSBvbiBzdWNjZXNzLFxuICogICBvdGhlciBpZiBub3QuXG4gKlxuICogQ2FsbGVkIG9uY2UgYWZ0ZXIgeW91IHRlbGwgZGVmbGF0ZSB0aGF0IHRoZSBpbnB1dCBzdHJlYW0gaXNcbiAqIGNvbXBsZXRlIChaX0ZJTklTSCkgb3Igc2hvdWxkIGJlIGZsdXNoZWQgKFpfU1lOQ19GTFVTSClcbiAqIG9yIGlmIGFuIGVycm9yIGhhcHBlbmVkLiBCeSBkZWZhdWx0IC0gam9pbiBjb2xsZWN0ZWQgY2h1bmtzLFxuICogZnJlZSBtZW1vcnkgYW5kIGZpbGwgYHJlc3VsdHNgIC8gYGVycmAgcHJvcGVydGllcy5cbiAqKi9cbkRlZmxhdGUucHJvdG90eXBlLm9uRW5kID0gZnVuY3Rpb24gKHN0YXR1cykge1xuICAvLyBPbiBzdWNjZXNzIC0gam9pblxuICBpZiAoc3RhdHVzID09PSBaX09LKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy50byA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5jaHVua3Muam9pbignJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVzdWx0ID0gdXRpbHMuZmxhdHRlbkNodW5rcyh0aGlzLmNodW5rcyk7XG4gICAgfVxuICB9XG4gIHRoaXMuY2h1bmtzID0gW107XG4gIHRoaXMuZXJyID0gc3RhdHVzO1xuICB0aGlzLm1zZyA9IHRoaXMuc3RybS5tc2c7XG59O1xuXG5cbi8qKlxuICogZGVmbGF0ZShkYXRhWywgb3B0aW9uc10pIC0+IFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nXG4gKiAtIGRhdGEgKFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nKTogaW5wdXQgZGF0YSB0byBjb21wcmVzcy5cbiAqIC0gb3B0aW9ucyAoT2JqZWN0KTogemxpYiBkZWZsYXRlIG9wdGlvbnMuXG4gKlxuICogQ29tcHJlc3MgYGRhdGFgIHdpdGggZGVmbGF0ZSBhbGdvcml0aG0gYW5kIGBvcHRpb25zYC5cbiAqXG4gKiBTdXBwb3J0ZWQgb3B0aW9ucyBhcmU6XG4gKlxuICogLSBsZXZlbFxuICogLSB3aW5kb3dCaXRzXG4gKiAtIG1lbUxldmVsXG4gKiAtIHN0cmF0ZWd5XG4gKiAtIGRpY3Rpb25hcnlcbiAqXG4gKiBbaHR0cDovL3psaWIubmV0L21hbnVhbC5odG1sI0FkdmFuY2VkXShodHRwOi8vemxpYi5uZXQvbWFudWFsLmh0bWwjQWR2YW5jZWQpXG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGVzZS5cbiAqXG4gKiBTdWdhciAob3B0aW9ucyk6XG4gKlxuICogLSBgcmF3YCAoQm9vbGVhbikgLSBzYXkgdGhhdCB3ZSB3b3JrIHdpdGggcmF3IHN0cmVhbSwgaWYgeW91IGRvbid0IHdpc2ggdG8gc3BlY2lmeVxuICogICBuZWdhdGl2ZSB3aW5kb3dCaXRzIGltcGxpY2l0bHkuXG4gKiAtIGB0b2AgKFN0cmluZykgLSBpZiBlcXVhbCB0byAnc3RyaW5nJywgdGhlbiByZXN1bHQgd2lsbCBiZSBcImJpbmFyeSBzdHJpbmdcIlxuICogICAgKGVhY2ggY2hhciBjb2RlIFswLi4yNTVdKVxuICpcbiAqICMjIyMjIEV4YW1wbGU6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIHBha28gPSByZXF1aXJlKCdwYWtvJylcbiAqICAgLCBkYXRhID0gVWludDhBcnJheShbMSwyLDMsNCw1LDYsNyw4LDldKTtcbiAqXG4gKiBjb25zb2xlLmxvZyhwYWtvLmRlZmxhdGUoZGF0YSkpO1xuICogYGBgXG4gKiovXG5mdW5jdGlvbiBkZWZsYXRlKGlucHV0LCBvcHRpb25zKSB7XG4gIHZhciBkZWZsYXRvciA9IG5ldyBEZWZsYXRlKG9wdGlvbnMpO1xuXG4gIGRlZmxhdG9yLnB1c2goaW5wdXQsIHRydWUpO1xuXG4gIC8vIFRoYXQgd2lsbCBuZXZlciBoYXBwZW5zLCBpZiB5b3UgZG9uJ3QgY2hlYXQgd2l0aCBvcHRpb25zIDopXG4gIGlmIChkZWZsYXRvci5lcnIpIHsgdGhyb3cgZGVmbGF0b3IubXNnIHx8IG1zZ1tkZWZsYXRvci5lcnJdOyB9XG5cbiAgcmV0dXJuIGRlZmxhdG9yLnJlc3VsdDtcbn1cblxuXG4vKipcbiAqIGRlZmxhdGVSYXcoZGF0YVssIG9wdGlvbnNdKSAtPiBVaW50OEFycmF5fEFycmF5fFN0cmluZ1xuICogLSBkYXRhIChVaW50OEFycmF5fEFycmF5fFN0cmluZyk6IGlucHV0IGRhdGEgdG8gY29tcHJlc3MuXG4gKiAtIG9wdGlvbnMgKE9iamVjdCk6IHpsaWIgZGVmbGF0ZSBvcHRpb25zLlxuICpcbiAqIFRoZSBzYW1lIGFzIFtbZGVmbGF0ZV1dLCBidXQgY3JlYXRlcyByYXcgZGF0YSwgd2l0aG91dCB3cmFwcGVyXG4gKiAoaGVhZGVyIGFuZCBhZGxlcjMyIGNyYykuXG4gKiovXG5mdW5jdGlvbiBkZWZsYXRlUmF3KGlucHV0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLnJhdyA9IHRydWU7XG4gIHJldHVybiBkZWZsYXRlKGlucHV0LCBvcHRpb25zKTtcbn1cblxuXG4vKipcbiAqIGd6aXAoZGF0YVssIG9wdGlvbnNdKSAtPiBVaW50OEFycmF5fEFycmF5fFN0cmluZ1xuICogLSBkYXRhIChVaW50OEFycmF5fEFycmF5fFN0cmluZyk6IGlucHV0IGRhdGEgdG8gY29tcHJlc3MuXG4gKiAtIG9wdGlvbnMgKE9iamVjdCk6IHpsaWIgZGVmbGF0ZSBvcHRpb25zLlxuICpcbiAqIFRoZSBzYW1lIGFzIFtbZGVmbGF0ZV1dLCBidXQgY3JlYXRlIGd6aXAgd3JhcHBlciBpbnN0ZWFkIG9mXG4gKiBkZWZsYXRlIG9uZS5cbiAqKi9cbmZ1bmN0aW9uIGd6aXAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMuZ3ppcCA9IHRydWU7XG4gIHJldHVybiBkZWZsYXRlKGlucHV0LCBvcHRpb25zKTtcbn1cblxuXG5leHBvcnRzLkRlZmxhdGUgPSBEZWZsYXRlO1xuZXhwb3J0cy5kZWZsYXRlID0gZGVmbGF0ZTtcbmV4cG9ydHMuZGVmbGF0ZVJhdyA9IGRlZmxhdGVSYXc7XG5leHBvcnRzLmd6aXAgPSBnemlwO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLy8gKEMpIDE5OTUtMjAxMyBKZWFuLWxvdXAgR2FpbGx5IGFuZCBNYXJrIEFkbGVyXG4vLyAoQykgMjAxNC0yMDE3IFZpdGFseSBQdXpyaW4gYW5kIEFuZHJleSBUdXBpdHNpblxuLy9cbi8vIFRoaXMgc29mdHdhcmUgaXMgcHJvdmlkZWQgJ2FzLWlzJywgd2l0aG91dCBhbnkgZXhwcmVzcyBvciBpbXBsaWVkXG4vLyB3YXJyYW50eS4gSW4gbm8gZXZlbnQgd2lsbCB0aGUgYXV0aG9ycyBiZSBoZWxkIGxpYWJsZSBmb3IgYW55IGRhbWFnZXNcbi8vIGFyaXNpbmcgZnJvbSB0aGUgdXNlIG9mIHRoaXMgc29mdHdhcmUuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBncmFudGVkIHRvIGFueW9uZSB0byB1c2UgdGhpcyBzb2Z0d2FyZSBmb3IgYW55IHB1cnBvc2UsXG4vLyBpbmNsdWRpbmcgY29tbWVyY2lhbCBhcHBsaWNhdGlvbnMsIGFuZCB0byBhbHRlciBpdCBhbmQgcmVkaXN0cmlidXRlIGl0XG4vLyBmcmVlbHksIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyByZXN0cmljdGlvbnM6XG4vL1xuLy8gMS4gVGhlIG9yaWdpbiBvZiB0aGlzIHNvZnR3YXJlIG11c3Qgbm90IGJlIG1pc3JlcHJlc2VudGVkOyB5b3UgbXVzdCBub3Rcbi8vICAgY2xhaW0gdGhhdCB5b3Ugd3JvdGUgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLiBJZiB5b3UgdXNlIHRoaXMgc29mdHdhcmVcbi8vICAgaW4gYSBwcm9kdWN0LCBhbiBhY2tub3dsZWRnbWVudCBpbiB0aGUgcHJvZHVjdCBkb2N1bWVudGF0aW9uIHdvdWxkIGJlXG4vLyAgIGFwcHJlY2lhdGVkIGJ1dCBpcyBub3QgcmVxdWlyZWQuXG4vLyAyLiBBbHRlcmVkIHNvdXJjZSB2ZXJzaW9ucyBtdXN0IGJlIHBsYWlubHkgbWFya2VkIGFzIHN1Y2gsIGFuZCBtdXN0IG5vdCBiZVxuLy8gICBtaXNyZXByZXNlbnRlZCBhcyBiZWluZyB0aGUgb3JpZ2luYWwgc29mdHdhcmUuXG4vLyAzLiBUaGlzIG5vdGljZSBtYXkgbm90IGJlIHJlbW92ZWQgb3IgYWx0ZXJlZCBmcm9tIGFueSBzb3VyY2UgZGlzdHJpYnV0aW9uLlxuXG4vLyBTZWUgc3RhdGUgZGVmcyBmcm9tIGluZmxhdGUuanNcbnZhciBCQUQgPSAzMDsgICAgICAgLyogZ290IGEgZGF0YSBlcnJvciAtLSByZW1haW4gaGVyZSB1bnRpbCByZXNldCAqL1xudmFyIFRZUEUgPSAxMjsgICAgICAvKiBpOiB3YWl0aW5nIGZvciB0eXBlIGJpdHMsIGluY2x1ZGluZyBsYXN0LWZsYWcgYml0ICovXG5cbi8qXG4gICBEZWNvZGUgbGl0ZXJhbCwgbGVuZ3RoLCBhbmQgZGlzdGFuY2UgY29kZXMgYW5kIHdyaXRlIG91dCB0aGUgcmVzdWx0aW5nXG4gICBsaXRlcmFsIGFuZCBtYXRjaCBieXRlcyB1bnRpbCBlaXRoZXIgbm90IGVub3VnaCBpbnB1dCBvciBvdXRwdXQgaXNcbiAgIGF2YWlsYWJsZSwgYW4gZW5kLW9mLWJsb2NrIGlzIGVuY291bnRlcmVkLCBvciBhIGRhdGEgZXJyb3IgaXMgZW5jb3VudGVyZWQuXG4gICBXaGVuIGxhcmdlIGVub3VnaCBpbnB1dCBhbmQgb3V0cHV0IGJ1ZmZlcnMgYXJlIHN1cHBsaWVkIHRvIGluZmxhdGUoKSwgZm9yXG4gICBleGFtcGxlLCBhIDE2SyBpbnB1dCBidWZmZXIgYW5kIGEgNjRLIG91dHB1dCBidWZmZXIsIG1vcmUgdGhhbiA5NSUgb2YgdGhlXG4gICBpbmZsYXRlIGV4ZWN1dGlvbiB0aW1lIGlzIHNwZW50IGluIHRoaXMgcm91dGluZS5cblxuICAgRW50cnkgYXNzdW1wdGlvbnM6XG5cbiAgICAgICAgc3RhdGUubW9kZSA9PT0gTEVOXG4gICAgICAgIHN0cm0uYXZhaWxfaW4gPj0gNlxuICAgICAgICBzdHJtLmF2YWlsX291dCA+PSAyNThcbiAgICAgICAgc3RhcnQgPj0gc3RybS5hdmFpbF9vdXRcbiAgICAgICAgc3RhdGUuYml0cyA8IDhcblxuICAgT24gcmV0dXJuLCBzdGF0ZS5tb2RlIGlzIG9uZSBvZjpcblxuICAgICAgICBMRU4gLS0gcmFuIG91dCBvZiBlbm91Z2ggb3V0cHV0IHNwYWNlIG9yIGVub3VnaCBhdmFpbGFibGUgaW5wdXRcbiAgICAgICAgVFlQRSAtLSByZWFjaGVkIGVuZCBvZiBibG9jayBjb2RlLCBpbmZsYXRlKCkgdG8gaW50ZXJwcmV0IG5leHQgYmxvY2tcbiAgICAgICAgQkFEIC0tIGVycm9yIGluIGJsb2NrIGRhdGFcblxuICAgTm90ZXM6XG5cbiAgICAtIFRoZSBtYXhpbXVtIGlucHV0IGJpdHMgdXNlZCBieSBhIGxlbmd0aC9kaXN0YW5jZSBwYWlyIGlzIDE1IGJpdHMgZm9yIHRoZVxuICAgICAgbGVuZ3RoIGNvZGUsIDUgYml0cyBmb3IgdGhlIGxlbmd0aCBleHRyYSwgMTUgYml0cyBmb3IgdGhlIGRpc3RhbmNlIGNvZGUsXG4gICAgICBhbmQgMTMgYml0cyBmb3IgdGhlIGRpc3RhbmNlIGV4dHJhLiAgVGhpcyB0b3RhbHMgNDggYml0cywgb3Igc2l4IGJ5dGVzLlxuICAgICAgVGhlcmVmb3JlIGlmIHN0cm0uYXZhaWxfaW4gPj0gNiwgdGhlbiB0aGVyZSBpcyBlbm91Z2ggaW5wdXQgdG8gYXZvaWRcbiAgICAgIGNoZWNraW5nIGZvciBhdmFpbGFibGUgaW5wdXQgd2hpbGUgZGVjb2RpbmcuXG5cbiAgICAtIFRoZSBtYXhpbXVtIGJ5dGVzIHRoYXQgYSBzaW5nbGUgbGVuZ3RoL2Rpc3RhbmNlIHBhaXIgY2FuIG91dHB1dCBpcyAyNThcbiAgICAgIGJ5dGVzLCB3aGljaCBpcyB0aGUgbWF4aW11bSBsZW5ndGggdGhhdCBjYW4gYmUgY29kZWQuICBpbmZsYXRlX2Zhc3QoKVxuICAgICAgcmVxdWlyZXMgc3RybS5hdmFpbF9vdXQgPj0gMjU4IGZvciBlYWNoIGxvb3AgdG8gYXZvaWQgY2hlY2tpbmcgZm9yXG4gICAgICBvdXRwdXQgc3BhY2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5mbGF0ZV9mYXN0KHN0cm0sIHN0YXJ0KSB7XG4gIHZhciBzdGF0ZTtcbiAgdmFyIF9pbjsgICAgICAgICAgICAgICAgICAgIC8qIGxvY2FsIHN0cm0uaW5wdXQgKi9cbiAgdmFyIGxhc3Q7ICAgICAgICAgICAgICAgICAgIC8qIGhhdmUgZW5vdWdoIGlucHV0IHdoaWxlIGluIDwgbGFzdCAqL1xuICB2YXIgX291dDsgICAgICAgICAgICAgICAgICAgLyogbG9jYWwgc3RybS5vdXRwdXQgKi9cbiAgdmFyIGJlZzsgICAgICAgICAgICAgICAgICAgIC8qIGluZmxhdGUoKSdzIGluaXRpYWwgc3RybS5vdXRwdXQgKi9cbiAgdmFyIGVuZDsgICAgICAgICAgICAgICAgICAgIC8qIHdoaWxlIG91dCA8IGVuZCwgZW5vdWdoIHNwYWNlIGF2YWlsYWJsZSAqL1xuLy8jaWZkZWYgSU5GTEFURV9TVFJJQ1RcbiAgdmFyIGRtYXg7ICAgICAgICAgICAgICAgICAgIC8qIG1heGltdW0gZGlzdGFuY2UgZnJvbSB6bGliIGhlYWRlciAqL1xuLy8jZW5kaWZcbiAgdmFyIHdzaXplOyAgICAgICAgICAgICAgICAgIC8qIHdpbmRvdyBzaXplIG9yIHplcm8gaWYgbm90IHVzaW5nIHdpbmRvdyAqL1xuICB2YXIgd2hhdmU7ICAgICAgICAgICAgICAgICAgLyogdmFsaWQgYnl0ZXMgaW4gdGhlIHdpbmRvdyAqL1xuICB2YXIgd25leHQ7ICAgICAgICAgICAgICAgICAgLyogd2luZG93IHdyaXRlIGluZGV4ICovXG4gIC8vIFVzZSBgc193aW5kb3dgIGluc3RlYWQgYHdpbmRvd2AsIGF2b2lkIGNvbmZsaWN0IHdpdGggaW5zdHJ1bWVudGF0aW9uIHRvb2xzXG4gIHZhciBzX3dpbmRvdzsgICAgICAgICAgICAgICAvKiBhbGxvY2F0ZWQgc2xpZGluZyB3aW5kb3csIGlmIHdzaXplICE9IDAgKi9cbiAgdmFyIGhvbGQ7ICAgICAgICAgICAgICAgICAgIC8qIGxvY2FsIHN0cm0uaG9sZCAqL1xuICB2YXIgYml0czsgICAgICAgICAgICAgICAgICAgLyogbG9jYWwgc3RybS5iaXRzICovXG4gIHZhciBsY29kZTsgICAgICAgICAgICAgICAgICAvKiBsb2NhbCBzdHJtLmxlbmNvZGUgKi9cbiAgdmFyIGRjb2RlOyAgICAgICAgICAgICAgICAgIC8qIGxvY2FsIHN0cm0uZGlzdGNvZGUgKi9cbiAgdmFyIGxtYXNrOyAgICAgICAgICAgICAgICAgIC8qIG1hc2sgZm9yIGZpcnN0IGxldmVsIG9mIGxlbmd0aCBjb2RlcyAqL1xuICB2YXIgZG1hc2s7ICAgICAgICAgICAgICAgICAgLyogbWFzayBmb3IgZmlyc3QgbGV2ZWwgb2YgZGlzdGFuY2UgY29kZXMgKi9cbiAgdmFyIGhlcmU7ICAgICAgICAgICAgICAgICAgIC8qIHJldHJpZXZlZCB0YWJsZSBlbnRyeSAqL1xuICB2YXIgb3A7ICAgICAgICAgICAgICAgICAgICAgLyogY29kZSBiaXRzLCBvcGVyYXRpb24sIGV4dHJhIGJpdHMsIG9yICovXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiAgd2luZG93IHBvc2l0aW9uLCB3aW5kb3cgYnl0ZXMgdG8gY29weSAqL1xuICB2YXIgbGVuOyAgICAgICAgICAgICAgICAgICAgLyogbWF0Y2ggbGVuZ3RoLCB1bnVzZWQgYnl0ZXMgKi9cbiAgdmFyIGRpc3Q7ICAgICAgICAgICAgICAgICAgIC8qIG1hdGNoIGRpc3RhbmNlICovXG4gIHZhciBmcm9tOyAgICAgICAgICAgICAgICAgICAvKiB3aGVyZSB0byBjb3B5IG1hdGNoIGZyb20gKi9cbiAgdmFyIGZyb21fc291cmNlO1xuXG5cbiAgdmFyIGlucHV0LCBvdXRwdXQ7IC8vIEpTIHNwZWNpZmljLCBiZWNhdXNlIHdlIGhhdmUgbm8gcG9pbnRlcnNcblxuICAvKiBjb3B5IHN0YXRlIHRvIGxvY2FsIHZhcmlhYmxlcyAqL1xuICBzdGF0ZSA9IHN0cm0uc3RhdGU7XG4gIC8vaGVyZSA9IHN0YXRlLmhlcmU7XG4gIF9pbiA9IHN0cm0ubmV4dF9pbjtcbiAgaW5wdXQgPSBzdHJtLmlucHV0O1xuICBsYXN0ID0gX2luICsgKHN0cm0uYXZhaWxfaW4gLSA1KTtcbiAgX291dCA9IHN0cm0ubmV4dF9vdXQ7XG4gIG91dHB1dCA9IHN0cm0ub3V0cHV0O1xuICBiZWcgPSBfb3V0IC0gKHN0YXJ0IC0gc3RybS5hdmFpbF9vdXQpO1xuICBlbmQgPSBfb3V0ICsgKHN0cm0uYXZhaWxfb3V0IC0gMjU3KTtcbi8vI2lmZGVmIElORkxBVEVfU1RSSUNUXG4gIGRtYXggPSBzdGF0ZS5kbWF4O1xuLy8jZW5kaWZcbiAgd3NpemUgPSBzdGF0ZS53c2l6ZTtcbiAgd2hhdmUgPSBzdGF0ZS53aGF2ZTtcbiAgd25leHQgPSBzdGF0ZS53bmV4dDtcbiAgc193aW5kb3cgPSBzdGF0ZS53aW5kb3c7XG4gIGhvbGQgPSBzdGF0ZS5ob2xkO1xuICBiaXRzID0gc3RhdGUuYml0cztcbiAgbGNvZGUgPSBzdGF0ZS5sZW5jb2RlO1xuICBkY29kZSA9IHN0YXRlLmRpc3Rjb2RlO1xuICBsbWFzayA9ICgxIDw8IHN0YXRlLmxlbmJpdHMpIC0gMTtcbiAgZG1hc2sgPSAoMSA8PCBzdGF0ZS5kaXN0Yml0cykgLSAxO1xuXG5cbiAgLyogZGVjb2RlIGxpdGVyYWxzIGFuZCBsZW5ndGgvZGlzdGFuY2VzIHVudGlsIGVuZC1vZi1ibG9jayBvciBub3QgZW5vdWdoXG4gICAgIGlucHV0IGRhdGEgb3Igb3V0cHV0IHNwYWNlICovXG5cbiAgdG9wOlxuICBkbyB7XG4gICAgaWYgKGJpdHMgPCAxNSkge1xuICAgICAgaG9sZCArPSBpbnB1dFtfaW4rK10gPDwgYml0cztcbiAgICAgIGJpdHMgKz0gODtcbiAgICAgIGhvbGQgKz0gaW5wdXRbX2luKytdIDw8IGJpdHM7XG4gICAgICBiaXRzICs9IDg7XG4gICAgfVxuXG4gICAgaGVyZSA9IGxjb2RlW2hvbGQgJiBsbWFza107XG5cbiAgICBkb2xlbjpcbiAgICBmb3IgKDs7KSB7IC8vIEdvdG8gZW11bGF0aW9uXG4gICAgICBvcCA9IGhlcmUgPj4+IDI0LypoZXJlLmJpdHMqLztcbiAgICAgIGhvbGQgPj4+PSBvcDtcbiAgICAgIGJpdHMgLT0gb3A7XG4gICAgICBvcCA9IChoZXJlID4+PiAxNikgJiAweGZmLypoZXJlLm9wKi87XG4gICAgICBpZiAob3AgPT09IDApIHsgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGxpdGVyYWwgKi9cbiAgICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsIGhlcmUudmFsID49IDB4MjAgJiYgaGVyZS52YWwgPCAweDdmID9cbiAgICAgICAgLy8gICAgICAgIFwiaW5mbGF0ZTogICAgICAgICBsaXRlcmFsICclYydcXG5cIiA6XG4gICAgICAgIC8vICAgICAgICBcImluZmxhdGU6ICAgICAgICAgbGl0ZXJhbCAweCUwMnhcXG5cIiwgaGVyZS52YWwpKTtcbiAgICAgICAgb3V0cHV0W19vdXQrK10gPSBoZXJlICYgMHhmZmZmLypoZXJlLnZhbCovO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAob3AgJiAxNikgeyAgICAgICAgICAgICAgICAgICAgIC8qIGxlbmd0aCBiYXNlICovXG4gICAgICAgIGxlbiA9IGhlcmUgJiAweGZmZmYvKmhlcmUudmFsKi87XG4gICAgICAgIG9wICY9IDE1OyAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBleHRyYSBiaXRzICovXG4gICAgICAgIGlmIChvcCkge1xuICAgICAgICAgIGlmIChiaXRzIDwgb3ApIHtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbX2luKytdIDw8IGJpdHM7XG4gICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgfVxuICAgICAgICAgIGxlbiArPSBob2xkICYgKCgxIDw8IG9wKSAtIDEpO1xuICAgICAgICAgIGhvbGQgPj4+PSBvcDtcbiAgICAgICAgICBiaXRzIC09IG9wO1xuICAgICAgICB9XG4gICAgICAgIC8vVHJhY2V2digoc3RkZXJyLCBcImluZmxhdGU6ICAgICAgICAgbGVuZ3RoICV1XFxuXCIsIGxlbikpO1xuICAgICAgICBpZiAoYml0cyA8IDE1KSB7XG4gICAgICAgICAgaG9sZCArPSBpbnB1dFtfaW4rK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgaG9sZCArPSBpbnB1dFtfaW4rK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgaGVyZSA9IGRjb2RlW2hvbGQgJiBkbWFza107XG5cbiAgICAgICAgZG9kaXN0OlxuICAgICAgICBmb3IgKDs7KSB7IC8vIGdvdG8gZW11bGF0aW9uXG4gICAgICAgICAgb3AgPSBoZXJlID4+PiAyNC8qaGVyZS5iaXRzKi87XG4gICAgICAgICAgaG9sZCA+Pj49IG9wO1xuICAgICAgICAgIGJpdHMgLT0gb3A7XG4gICAgICAgICAgb3AgPSAoaGVyZSA+Pj4gMTYpICYgMHhmZi8qaGVyZS5vcCovO1xuXG4gICAgICAgICAgaWYgKG9wICYgMTYpIHsgICAgICAgICAgICAgICAgICAgICAgLyogZGlzdGFuY2UgYmFzZSAqL1xuICAgICAgICAgICAgZGlzdCA9IGhlcmUgJiAweGZmZmYvKmhlcmUudmFsKi87XG4gICAgICAgICAgICBvcCAmPSAxNTsgICAgICAgICAgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBleHRyYSBiaXRzICovXG4gICAgICAgICAgICBpZiAoYml0cyA8IG9wKSB7XG4gICAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbX2luKytdIDw8IGJpdHM7XG4gICAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICAgICAgaWYgKGJpdHMgPCBvcCkge1xuICAgICAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbX2luKytdIDw8IGJpdHM7XG4gICAgICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXN0ICs9IGhvbGQgJiAoKDEgPDwgb3ApIC0gMSk7XG4vLyNpZmRlZiBJTkZMQVRFX1NUUklDVFxuICAgICAgICAgICAgaWYgKGRpc3QgPiBkbWF4KSB7XG4gICAgICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgZGlzdGFuY2UgdG9vIGZhciBiYWNrJztcbiAgICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICAgICAgYnJlYWsgdG9wO1xuICAgICAgICAgICAgfVxuLy8jZW5kaWZcbiAgICAgICAgICAgIGhvbGQgPj4+PSBvcDtcbiAgICAgICAgICAgIGJpdHMgLT0gb3A7XG4gICAgICAgICAgICAvL1RyYWNldnYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgICAgIGRpc3RhbmNlICV1XFxuXCIsIGRpc3QpKTtcbiAgICAgICAgICAgIG9wID0gX291dCAtIGJlZzsgICAgICAgICAgICAgICAgLyogbWF4IGRpc3RhbmNlIGluIG91dHB1dCAqL1xuICAgICAgICAgICAgaWYgKGRpc3QgPiBvcCkgeyAgICAgICAgICAgICAgICAvKiBzZWUgaWYgY29weSBmcm9tIHdpbmRvdyAqL1xuICAgICAgICAgICAgICBvcCA9IGRpc3QgLSBvcDsgICAgICAgICAgICAgICAvKiBkaXN0YW5jZSBiYWNrIGluIHdpbmRvdyAqL1xuICAgICAgICAgICAgICBpZiAob3AgPiB3aGF2ZSkge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5zYW5lKSB7XG4gICAgICAgICAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGRpc3RhbmNlIHRvbyBmYXIgYmFjayc7XG4gICAgICAgICAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgICAgICAgICAgYnJlYWsgdG9wO1xuICAgICAgICAgICAgICAgIH1cblxuLy8gKCEpIFRoaXMgYmxvY2sgaXMgZGlzYWJsZWQgaW4gemxpYiBkZWZhdWx0cyxcbi8vIGRvbid0IGVuYWJsZSBpdCBmb3IgYmluYXJ5IGNvbXBhdGliaWxpdHlcbi8vI2lmZGVmIElORkxBVEVfQUxMT1dfSU5WQUxJRF9ESVNUQU5DRV9UT09GQVJfQVJSUlxuLy8gICAgICAgICAgICAgICAgaWYgKGxlbiA8PSBvcCAtIHdoYXZlKSB7XG4vLyAgICAgICAgICAgICAgICAgIGRvIHtcbi8vICAgICAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IDA7XG4vLyAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKC0tbGVuKTtcbi8vICAgICAgICAgICAgICAgICAgY29udGludWUgdG9wO1xuLy8gICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgbGVuIC09IG9wIC0gd2hhdmU7XG4vLyAgICAgICAgICAgICAgICBkbyB7XG4vLyAgICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gMDtcbi8vICAgICAgICAgICAgICAgIH0gd2hpbGUgKC0tb3AgPiB3aGF2ZSk7XG4vLyAgICAgICAgICAgICAgICBpZiAob3AgPT09IDApIHtcbi8vICAgICAgICAgICAgICAgICAgZnJvbSA9IF9vdXQgLSBkaXN0O1xuLy8gICAgICAgICAgICAgICAgICBkbyB7XG4vLyAgICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBvdXRwdXRbZnJvbSsrXTtcbi8vICAgICAgICAgICAgICAgICAgfSB3aGlsZSAoLS1sZW4pO1xuLy8gICAgICAgICAgICAgICAgICBjb250aW51ZSB0b3A7XG4vLyAgICAgICAgICAgICAgICB9XG4vLyNlbmRpZlxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZyb20gPSAwOyAvLyB3aW5kb3cgaW5kZXhcbiAgICAgICAgICAgICAgZnJvbV9zb3VyY2UgPSBzX3dpbmRvdztcbiAgICAgICAgICAgICAgaWYgKHduZXh0ID09PSAwKSB7ICAgICAgICAgICAvKiB2ZXJ5IGNvbW1vbiBjYXNlICovXG4gICAgICAgICAgICAgICAgZnJvbSArPSB3c2l6ZSAtIG9wO1xuICAgICAgICAgICAgICAgIGlmIChvcCA8IGxlbikgeyAgICAgICAgIC8qIHNvbWUgZnJvbSB3aW5kb3cgKi9cbiAgICAgICAgICAgICAgICAgIGxlbiAtPSBvcDtcbiAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBzX3dpbmRvd1tmcm9tKytdO1xuICAgICAgICAgICAgICAgICAgfSB3aGlsZSAoLS1vcCk7XG4gICAgICAgICAgICAgICAgICBmcm9tID0gX291dCAtIGRpc3Q7ICAvKiByZXN0IGZyb20gb3V0cHV0ICovXG4gICAgICAgICAgICAgICAgICBmcm9tX3NvdXJjZSA9IG91dHB1dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSBpZiAod25leHQgPCBvcCkgeyAgICAgIC8qIHdyYXAgYXJvdW5kIHdpbmRvdyAqL1xuICAgICAgICAgICAgICAgIGZyb20gKz0gd3NpemUgKyB3bmV4dCAtIG9wO1xuICAgICAgICAgICAgICAgIG9wIC09IHduZXh0O1xuICAgICAgICAgICAgICAgIGlmIChvcCA8IGxlbikgeyAgICAgICAgIC8qIHNvbWUgZnJvbSBlbmQgb2Ygd2luZG93ICovXG4gICAgICAgICAgICAgICAgICBsZW4gLT0gb3A7XG4gICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gc193aW5kb3dbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKC0tb3ApO1xuICAgICAgICAgICAgICAgICAgZnJvbSA9IDA7XG4gICAgICAgICAgICAgICAgICBpZiAod25leHQgPCBsZW4pIHsgIC8qIHNvbWUgZnJvbSBzdGFydCBvZiB3aW5kb3cgKi9cbiAgICAgICAgICAgICAgICAgICAgb3AgPSB3bmV4dDtcbiAgICAgICAgICAgICAgICAgICAgbGVuIC09IG9wO1xuICAgICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBzX3dpbmRvd1tmcm9tKytdO1xuICAgICAgICAgICAgICAgICAgICB9IHdoaWxlICgtLW9wKTtcbiAgICAgICAgICAgICAgICAgICAgZnJvbSA9IF9vdXQgLSBkaXN0OyAgICAgIC8qIHJlc3QgZnJvbSBvdXRwdXQgKi9cbiAgICAgICAgICAgICAgICAgICAgZnJvbV9zb3VyY2UgPSBvdXRwdXQ7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2UgeyAgICAgICAgICAgICAgICAgICAgICAvKiBjb250aWd1b3VzIGluIHdpbmRvdyAqL1xuICAgICAgICAgICAgICAgIGZyb20gKz0gd25leHQgLSBvcDtcbiAgICAgICAgICAgICAgICBpZiAob3AgPCBsZW4pIHsgICAgICAgICAvKiBzb21lIGZyb20gd2luZG93ICovXG4gICAgICAgICAgICAgICAgICBsZW4gLT0gb3A7XG4gICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gc193aW5kb3dbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKC0tb3ApO1xuICAgICAgICAgICAgICAgICAgZnJvbSA9IF9vdXQgLSBkaXN0OyAgLyogcmVzdCBmcm9tIG91dHB1dCAqL1xuICAgICAgICAgICAgICAgICAgZnJvbV9zb3VyY2UgPSBvdXRwdXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHdoaWxlIChsZW4gPiAyKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBmcm9tX3NvdXJjZVtmcm9tKytdO1xuICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gZnJvbV9zb3VyY2VbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IGZyb21fc291cmNlW2Zyb20rK107XG4gICAgICAgICAgICAgICAgbGVuIC09IDM7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGxlbikge1xuICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gZnJvbV9zb3VyY2VbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICBpZiAobGVuID4gMSkge1xuICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBmcm9tX3NvdXJjZVtmcm9tKytdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGZyb20gPSBfb3V0IC0gZGlzdDsgICAgICAgICAgLyogY29weSBkaXJlY3QgZnJvbSBvdXRwdXQgKi9cbiAgICAgICAgICAgICAgZG8geyAgICAgICAgICAgICAgICAgICAgICAgIC8qIG1pbmltdW0gbGVuZ3RoIGlzIHRocmVlICovXG4gICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBvdXRwdXRbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IG91dHB1dFtmcm9tKytdO1xuICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gb3V0cHV0W2Zyb20rK107XG4gICAgICAgICAgICAgICAgbGVuIC09IDM7XG4gICAgICAgICAgICAgIH0gd2hpbGUgKGxlbiA+IDIpO1xuICAgICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBvdXRwdXRbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICBpZiAobGVuID4gMSkge1xuICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBvdXRwdXRbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoKG9wICYgNjQpID09PSAwKSB7ICAgICAgICAgIC8qIDJuZCBsZXZlbCBkaXN0YW5jZSBjb2RlICovXG4gICAgICAgICAgICBoZXJlID0gZGNvZGVbKGhlcmUgJiAweGZmZmYpLypoZXJlLnZhbCovICsgKGhvbGQgJiAoKDEgPDwgb3ApIC0gMSkpXTtcbiAgICAgICAgICAgIGNvbnRpbnVlIGRvZGlzdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGRpc3RhbmNlIGNvZGUnO1xuICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICAgIGJyZWFrIHRvcDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBicmVhazsgLy8gbmVlZCB0byBlbXVsYXRlIGdvdG8gdmlhIFwiY29udGludWVcIlxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBlbHNlIGlmICgob3AgJiA2NCkgPT09IDApIHsgICAgICAgICAgICAgIC8qIDJuZCBsZXZlbCBsZW5ndGggY29kZSAqL1xuICAgICAgICBoZXJlID0gbGNvZGVbKGhlcmUgJiAweGZmZmYpLypoZXJlLnZhbCovICsgKGhvbGQgJiAoKDEgPDwgb3ApIC0gMSkpXTtcbiAgICAgICAgY29udGludWUgZG9sZW47XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChvcCAmIDMyKSB7ICAgICAgICAgICAgICAgICAgICAgLyogZW5kLW9mLWJsb2NrICovXG4gICAgICAgIC8vVHJhY2V2digoc3RkZXJyLCBcImluZmxhdGU6ICAgICAgICAgZW5kIG9mIGJsb2NrXFxuXCIpKTtcbiAgICAgICAgc3RhdGUubW9kZSA9IFRZUEU7XG4gICAgICAgIGJyZWFrIHRvcDtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGxpdGVyYWwvbGVuZ3RoIGNvZGUnO1xuICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICBicmVhayB0b3A7XG4gICAgICB9XG5cbiAgICAgIGJyZWFrOyAvLyBuZWVkIHRvIGVtdWxhdGUgZ290byB2aWEgXCJjb250aW51ZVwiXG4gICAgfVxuICB9IHdoaWxlIChfaW4gPCBsYXN0ICYmIF9vdXQgPCBlbmQpO1xuXG4gIC8qIHJldHVybiB1bnVzZWQgYnl0ZXMgKG9uIGVudHJ5LCBiaXRzIDwgOCwgc28gaW4gd29uJ3QgZ28gdG9vIGZhciBiYWNrKSAqL1xuICBsZW4gPSBiaXRzID4+IDM7XG4gIF9pbiAtPSBsZW47XG4gIGJpdHMgLT0gbGVuIDw8IDM7XG4gIGhvbGQgJj0gKDEgPDwgYml0cykgLSAxO1xuXG4gIC8qIHVwZGF0ZSBzdGF0ZSBhbmQgcmV0dXJuICovXG4gIHN0cm0ubmV4dF9pbiA9IF9pbjtcbiAgc3RybS5uZXh0X291dCA9IF9vdXQ7XG4gIHN0cm0uYXZhaWxfaW4gPSAoX2luIDwgbGFzdCA/IDUgKyAobGFzdCAtIF9pbikgOiA1IC0gKF9pbiAtIGxhc3QpKTtcbiAgc3RybS5hdmFpbF9vdXQgPSAoX291dCA8IGVuZCA/IDI1NyArIChlbmQgLSBfb3V0KSA6IDI1NyAtIChfb3V0IC0gZW5kKSk7XG4gIHN0YXRlLmhvbGQgPSBob2xkO1xuICBzdGF0ZS5iaXRzID0gYml0cztcbiAgcmV0dXJuO1xufTtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvY29tbW9uJyk7XG5cbnZhciBNQVhCSVRTID0gMTU7XG52YXIgRU5PVUdIX0xFTlMgPSA4NTI7XG52YXIgRU5PVUdIX0RJU1RTID0gNTkyO1xuLy92YXIgRU5PVUdIID0gKEVOT1VHSF9MRU5TK0VOT1VHSF9ESVNUUyk7XG5cbnZhciBDT0RFUyA9IDA7XG52YXIgTEVOUyA9IDE7XG52YXIgRElTVFMgPSAyO1xuXG52YXIgbGJhc2UgPSBbIC8qIExlbmd0aCBjb2RlcyAyNTcuLjI4NSBiYXNlICovXG4gIDMsIDQsIDUsIDYsIDcsIDgsIDksIDEwLCAxMSwgMTMsIDE1LCAxNywgMTksIDIzLCAyNywgMzEsXG4gIDM1LCA0MywgNTEsIDU5LCA2NywgODMsIDk5LCAxMTUsIDEzMSwgMTYzLCAxOTUsIDIyNywgMjU4LCAwLCAwXG5dO1xuXG52YXIgbGV4dCA9IFsgLyogTGVuZ3RoIGNvZGVzIDI1Ny4uMjg1IGV4dHJhICovXG4gIDE2LCAxNiwgMTYsIDE2LCAxNiwgMTYsIDE2LCAxNiwgMTcsIDE3LCAxNywgMTcsIDE4LCAxOCwgMTgsIDE4LFxuICAxOSwgMTksIDE5LCAxOSwgMjAsIDIwLCAyMCwgMjAsIDIxLCAyMSwgMjEsIDIxLCAxNiwgNzIsIDc4XG5dO1xuXG52YXIgZGJhc2UgPSBbIC8qIERpc3RhbmNlIGNvZGVzIDAuLjI5IGJhc2UgKi9cbiAgMSwgMiwgMywgNCwgNSwgNywgOSwgMTMsIDE3LCAyNSwgMzMsIDQ5LCA2NSwgOTcsIDEyOSwgMTkzLFxuICAyNTcsIDM4NSwgNTEzLCA3NjksIDEwMjUsIDE1MzcsIDIwNDksIDMwNzMsIDQwOTcsIDYxNDUsXG4gIDgxOTMsIDEyMjg5LCAxNjM4NSwgMjQ1NzcsIDAsIDBcbl07XG5cbnZhciBkZXh0ID0gWyAvKiBEaXN0YW5jZSBjb2RlcyAwLi4yOSBleHRyYSAqL1xuICAxNiwgMTYsIDE2LCAxNiwgMTcsIDE3LCAxOCwgMTgsIDE5LCAxOSwgMjAsIDIwLCAyMSwgMjEsIDIyLCAyMixcbiAgMjMsIDIzLCAyNCwgMjQsIDI1LCAyNSwgMjYsIDI2LCAyNywgMjcsXG4gIDI4LCAyOCwgMjksIDI5LCA2NCwgNjRcbl07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5mbGF0ZV90YWJsZSh0eXBlLCBsZW5zLCBsZW5zX2luZGV4LCBjb2RlcywgdGFibGUsIHRhYmxlX2luZGV4LCB3b3JrLCBvcHRzKVxue1xuICB2YXIgYml0cyA9IG9wdHMuYml0cztcbiAgICAgIC8vaGVyZSA9IG9wdHMuaGVyZTsgLyogdGFibGUgZW50cnkgZm9yIGR1cGxpY2F0aW9uICovXG5cbiAgdmFyIGxlbiA9IDA7ICAgICAgICAgICAgICAgLyogYSBjb2RlJ3MgbGVuZ3RoIGluIGJpdHMgKi9cbiAgdmFyIHN5bSA9IDA7ICAgICAgICAgICAgICAgLyogaW5kZXggb2YgY29kZSBzeW1ib2xzICovXG4gIHZhciBtaW4gPSAwLCBtYXggPSAwOyAgICAgICAgICAvKiBtaW5pbXVtIGFuZCBtYXhpbXVtIGNvZGUgbGVuZ3RocyAqL1xuICB2YXIgcm9vdCA9IDA7ICAgICAgICAgICAgICAvKiBudW1iZXIgb2YgaW5kZXggYml0cyBmb3Igcm9vdCB0YWJsZSAqL1xuICB2YXIgY3VyciA9IDA7ICAgICAgICAgICAgICAvKiBudW1iZXIgb2YgaW5kZXggYml0cyBmb3IgY3VycmVudCB0YWJsZSAqL1xuICB2YXIgZHJvcCA9IDA7ICAgICAgICAgICAgICAvKiBjb2RlIGJpdHMgdG8gZHJvcCBmb3Igc3ViLXRhYmxlICovXG4gIHZhciBsZWZ0ID0gMDsgICAgICAgICAgICAgICAgICAgLyogbnVtYmVyIG9mIHByZWZpeCBjb2RlcyBhdmFpbGFibGUgKi9cbiAgdmFyIHVzZWQgPSAwOyAgICAgICAgICAgICAgLyogY29kZSBlbnRyaWVzIGluIHRhYmxlIHVzZWQgKi9cbiAgdmFyIGh1ZmYgPSAwOyAgICAgICAgICAgICAgLyogSHVmZm1hbiBjb2RlICovXG4gIHZhciBpbmNyOyAgICAgICAgICAgICAgLyogZm9yIGluY3JlbWVudGluZyBjb2RlLCBpbmRleCAqL1xuICB2YXIgZmlsbDsgICAgICAgICAgICAgIC8qIGluZGV4IGZvciByZXBsaWNhdGluZyBlbnRyaWVzICovXG4gIHZhciBsb3c7ICAgICAgICAgICAgICAgLyogbG93IGJpdHMgZm9yIGN1cnJlbnQgcm9vdCBlbnRyeSAqL1xuICB2YXIgbWFzazsgICAgICAgICAgICAgIC8qIG1hc2sgZm9yIGxvdyByb290IGJpdHMgKi9cbiAgdmFyIG5leHQ7ICAgICAgICAgICAgIC8qIG5leHQgYXZhaWxhYmxlIHNwYWNlIGluIHRhYmxlICovXG4gIHZhciBiYXNlID0gbnVsbDsgICAgIC8qIGJhc2UgdmFsdWUgdGFibGUgdG8gdXNlICovXG4gIHZhciBiYXNlX2luZGV4ID0gMDtcbi8vICB2YXIgc2hvZXh0cmE7ICAgIC8qIGV4dHJhIGJpdHMgdGFibGUgdG8gdXNlICovXG4gIHZhciBlbmQ7ICAgICAgICAgICAgICAgICAgICAvKiB1c2UgYmFzZSBhbmQgZXh0cmEgZm9yIHN5bWJvbCA+IGVuZCAqL1xuICB2YXIgY291bnQgPSBuZXcgdXRpbHMuQnVmMTYoTUFYQklUUyArIDEpOyAvL1tNQVhCSVRTKzFdOyAgICAvKiBudW1iZXIgb2YgY29kZXMgb2YgZWFjaCBsZW5ndGggKi9cbiAgdmFyIG9mZnMgPSBuZXcgdXRpbHMuQnVmMTYoTUFYQklUUyArIDEpOyAvL1tNQVhCSVRTKzFdOyAgICAgLyogb2Zmc2V0cyBpbiB0YWJsZSBmb3IgZWFjaCBsZW5ndGggKi9cbiAgdmFyIGV4dHJhID0gbnVsbDtcbiAgdmFyIGV4dHJhX2luZGV4ID0gMDtcblxuICB2YXIgaGVyZV9iaXRzLCBoZXJlX29wLCBoZXJlX3ZhbDtcblxuICAvKlxuICAgUHJvY2VzcyBhIHNldCBvZiBjb2RlIGxlbmd0aHMgdG8gY3JlYXRlIGEgY2Fub25pY2FsIEh1ZmZtYW4gY29kZS4gIFRoZVxuICAgY29kZSBsZW5ndGhzIGFyZSBsZW5zWzAuLmNvZGVzLTFdLiAgRWFjaCBsZW5ndGggY29ycmVzcG9uZHMgdG8gdGhlXG4gICBzeW1ib2xzIDAuLmNvZGVzLTEuICBUaGUgSHVmZm1hbiBjb2RlIGlzIGdlbmVyYXRlZCBieSBmaXJzdCBzb3J0aW5nIHRoZVxuICAgc3ltYm9scyBieSBsZW5ndGggZnJvbSBzaG9ydCB0byBsb25nLCBhbmQgcmV0YWluaW5nIHRoZSBzeW1ib2wgb3JkZXJcbiAgIGZvciBjb2RlcyB3aXRoIGVxdWFsIGxlbmd0aHMuICBUaGVuIHRoZSBjb2RlIHN0YXJ0cyB3aXRoIGFsbCB6ZXJvIGJpdHNcbiAgIGZvciB0aGUgZmlyc3QgY29kZSBvZiB0aGUgc2hvcnRlc3QgbGVuZ3RoLCBhbmQgdGhlIGNvZGVzIGFyZSBpbnRlZ2VyXG4gICBpbmNyZW1lbnRzIGZvciB0aGUgc2FtZSBsZW5ndGgsIGFuZCB6ZXJvcyBhcmUgYXBwZW5kZWQgYXMgdGhlIGxlbmd0aFxuICAgaW5jcmVhc2VzLiAgRm9yIHRoZSBkZWZsYXRlIGZvcm1hdCwgdGhlc2UgYml0cyBhcmUgc3RvcmVkIGJhY2t3YXJkc1xuICAgZnJvbSB0aGVpciBtb3JlIG5hdHVyYWwgaW50ZWdlciBpbmNyZW1lbnQgb3JkZXJpbmcsIGFuZCBzbyB3aGVuIHRoZVxuICAgZGVjb2RpbmcgdGFibGVzIGFyZSBidWlsdCBpbiB0aGUgbGFyZ2UgbG9vcCBiZWxvdywgdGhlIGludGVnZXIgY29kZXNcbiAgIGFyZSBpbmNyZW1lbnRlZCBiYWNrd2FyZHMuXG5cbiAgIFRoaXMgcm91dGluZSBhc3N1bWVzLCBidXQgZG9lcyBub3QgY2hlY2ssIHRoYXQgYWxsIG9mIHRoZSBlbnRyaWVzIGluXG4gICBsZW5zW10gYXJlIGluIHRoZSByYW5nZSAwLi5NQVhCSVRTLiAgVGhlIGNhbGxlciBtdXN0IGFzc3VyZSB0aGlzLlxuICAgMS4uTUFYQklUUyBpcyBpbnRlcnByZXRlZCBhcyB0aGF0IGNvZGUgbGVuZ3RoLiAgemVybyBtZWFucyB0aGF0IHRoYXRcbiAgIHN5bWJvbCBkb2VzIG5vdCBvY2N1ciBpbiB0aGlzIGNvZGUuXG5cbiAgIFRoZSBjb2RlcyBhcmUgc29ydGVkIGJ5IGNvbXB1dGluZyBhIGNvdW50IG9mIGNvZGVzIGZvciBlYWNoIGxlbmd0aCxcbiAgIGNyZWF0aW5nIGZyb20gdGhhdCBhIHRhYmxlIG9mIHN0YXJ0aW5nIGluZGljZXMgZm9yIGVhY2ggbGVuZ3RoIGluIHRoZVxuICAgc29ydGVkIHRhYmxlLCBhbmQgdGhlbiBlbnRlcmluZyB0aGUgc3ltYm9scyBpbiBvcmRlciBpbiB0aGUgc29ydGVkXG4gICB0YWJsZS4gIFRoZSBzb3J0ZWQgdGFibGUgaXMgd29ya1tdLCB3aXRoIHRoYXQgc3BhY2UgYmVpbmcgcHJvdmlkZWQgYnlcbiAgIHRoZSBjYWxsZXIuXG5cbiAgIFRoZSBsZW5ndGggY291bnRzIGFyZSB1c2VkIGZvciBvdGhlciBwdXJwb3NlcyBhcyB3ZWxsLCBpLmUuIGZpbmRpbmdcbiAgIHRoZSBtaW5pbXVtIGFuZCBtYXhpbXVtIGxlbmd0aCBjb2RlcywgZGV0ZXJtaW5pbmcgaWYgdGhlcmUgYXJlIGFueVxuICAgY29kZXMgYXQgYWxsLCBjaGVja2luZyBmb3IgYSB2YWxpZCBzZXQgb2YgbGVuZ3RocywgYW5kIGxvb2tpbmcgYWhlYWRcbiAgIGF0IGxlbmd0aCBjb3VudHMgdG8gZGV0ZXJtaW5lIHN1Yi10YWJsZSBzaXplcyB3aGVuIGJ1aWxkaW5nIHRoZVxuICAgZGVjb2RpbmcgdGFibGVzLlxuICAgKi9cblxuICAvKiBhY2N1bXVsYXRlIGxlbmd0aHMgZm9yIGNvZGVzIChhc3N1bWVzIGxlbnNbXSBhbGwgaW4gMC4uTUFYQklUUykgKi9cbiAgZm9yIChsZW4gPSAwOyBsZW4gPD0gTUFYQklUUzsgbGVuKyspIHtcbiAgICBjb3VudFtsZW5dID0gMDtcbiAgfVxuICBmb3IgKHN5bSA9IDA7IHN5bSA8IGNvZGVzOyBzeW0rKykge1xuICAgIGNvdW50W2xlbnNbbGVuc19pbmRleCArIHN5bV1dKys7XG4gIH1cblxuICAvKiBib3VuZCBjb2RlIGxlbmd0aHMsIGZvcmNlIHJvb3QgdG8gYmUgd2l0aGluIGNvZGUgbGVuZ3RocyAqL1xuICByb290ID0gYml0cztcbiAgZm9yIChtYXggPSBNQVhCSVRTOyBtYXggPj0gMTsgbWF4LS0pIHtcbiAgICBpZiAoY291bnRbbWF4XSAhPT0gMCkgeyBicmVhazsgfVxuICB9XG4gIGlmIChyb290ID4gbWF4KSB7XG4gICAgcm9vdCA9IG1heDtcbiAgfVxuICBpZiAobWF4ID09PSAwKSB7ICAgICAgICAgICAgICAgICAgICAgLyogbm8gc3ltYm9scyB0byBjb2RlIGF0IGFsbCAqL1xuICAgIC8vdGFibGUub3Bbb3B0cy50YWJsZV9pbmRleF0gPSA2NDsgIC8vaGVyZS5vcCA9ICh2YXIgY2hhcik2NDsgICAgLyogaW52YWxpZCBjb2RlIG1hcmtlciAqL1xuICAgIC8vdGFibGUuYml0c1tvcHRzLnRhYmxlX2luZGV4XSA9IDE7ICAgLy9oZXJlLmJpdHMgPSAodmFyIGNoYXIpMTtcbiAgICAvL3RhYmxlLnZhbFtvcHRzLnRhYmxlX2luZGV4KytdID0gMDsgICAvL2hlcmUudmFsID0gKHZhciBzaG9ydCkwO1xuICAgIHRhYmxlW3RhYmxlX2luZGV4KytdID0gKDEgPDwgMjQpIHwgKDY0IDw8IDE2KSB8IDA7XG5cblxuICAgIC8vdGFibGUub3Bbb3B0cy50YWJsZV9pbmRleF0gPSA2NDtcbiAgICAvL3RhYmxlLmJpdHNbb3B0cy50YWJsZV9pbmRleF0gPSAxO1xuICAgIC8vdGFibGUudmFsW29wdHMudGFibGVfaW5kZXgrK10gPSAwO1xuICAgIHRhYmxlW3RhYmxlX2luZGV4KytdID0gKDEgPDwgMjQpIHwgKDY0IDw8IDE2KSB8IDA7XG5cbiAgICBvcHRzLmJpdHMgPSAxO1xuICAgIHJldHVybiAwOyAgICAgLyogbm8gc3ltYm9scywgYnV0IHdhaXQgZm9yIGRlY29kaW5nIHRvIHJlcG9ydCBlcnJvciAqL1xuICB9XG4gIGZvciAobWluID0gMTsgbWluIDwgbWF4OyBtaW4rKykge1xuICAgIGlmIChjb3VudFttaW5dICE9PSAwKSB7IGJyZWFrOyB9XG4gIH1cbiAgaWYgKHJvb3QgPCBtaW4pIHtcbiAgICByb290ID0gbWluO1xuICB9XG5cbiAgLyogY2hlY2sgZm9yIGFuIG92ZXItc3Vic2NyaWJlZCBvciBpbmNvbXBsZXRlIHNldCBvZiBsZW5ndGhzICovXG4gIGxlZnQgPSAxO1xuICBmb3IgKGxlbiA9IDE7IGxlbiA8PSBNQVhCSVRTOyBsZW4rKykge1xuICAgIGxlZnQgPDw9IDE7XG4gICAgbGVmdCAtPSBjb3VudFtsZW5dO1xuICAgIGlmIChsZWZ0IDwgMCkge1xuICAgICAgcmV0dXJuIC0xO1xuICAgIH0gICAgICAgIC8qIG92ZXItc3Vic2NyaWJlZCAqL1xuICB9XG4gIGlmIChsZWZ0ID4gMCAmJiAodHlwZSA9PT0gQ09ERVMgfHwgbWF4ICE9PSAxKSkge1xuICAgIHJldHVybiAtMTsgICAgICAgICAgICAgICAgICAgICAgLyogaW5jb21wbGV0ZSBzZXQgKi9cbiAgfVxuXG4gIC8qIGdlbmVyYXRlIG9mZnNldHMgaW50byBzeW1ib2wgdGFibGUgZm9yIGVhY2ggbGVuZ3RoIGZvciBzb3J0aW5nICovXG4gIG9mZnNbMV0gPSAwO1xuICBmb3IgKGxlbiA9IDE7IGxlbiA8IE1BWEJJVFM7IGxlbisrKSB7XG4gICAgb2Zmc1tsZW4gKyAxXSA9IG9mZnNbbGVuXSArIGNvdW50W2xlbl07XG4gIH1cblxuICAvKiBzb3J0IHN5bWJvbHMgYnkgbGVuZ3RoLCBieSBzeW1ib2wgb3JkZXIgd2l0aGluIGVhY2ggbGVuZ3RoICovXG4gIGZvciAoc3ltID0gMDsgc3ltIDwgY29kZXM7IHN5bSsrKSB7XG4gICAgaWYgKGxlbnNbbGVuc19pbmRleCArIHN5bV0gIT09IDApIHtcbiAgICAgIHdvcmtbb2Zmc1tsZW5zW2xlbnNfaW5kZXggKyBzeW1dXSsrXSA9IHN5bTtcbiAgICB9XG4gIH1cblxuICAvKlxuICAgQ3JlYXRlIGFuZCBmaWxsIGluIGRlY29kaW5nIHRhYmxlcy4gIEluIHRoaXMgbG9vcCwgdGhlIHRhYmxlIGJlaW5nXG4gICBmaWxsZWQgaXMgYXQgbmV4dCBhbmQgaGFzIGN1cnIgaW5kZXggYml0cy4gIFRoZSBjb2RlIGJlaW5nIHVzZWQgaXMgaHVmZlxuICAgd2l0aCBsZW5ndGggbGVuLiAgVGhhdCBjb2RlIGlzIGNvbnZlcnRlZCB0byBhbiBpbmRleCBieSBkcm9wcGluZyBkcm9wXG4gICBiaXRzIG9mZiBvZiB0aGUgYm90dG9tLiAgRm9yIGNvZGVzIHdoZXJlIGxlbiBpcyBsZXNzIHRoYW4gZHJvcCArIGN1cnIsXG4gICB0aG9zZSB0b3AgZHJvcCArIGN1cnIgLSBsZW4gYml0cyBhcmUgaW5jcmVtZW50ZWQgdGhyb3VnaCBhbGwgdmFsdWVzIHRvXG4gICBmaWxsIHRoZSB0YWJsZSB3aXRoIHJlcGxpY2F0ZWQgZW50cmllcy5cblxuICAgcm9vdCBpcyB0aGUgbnVtYmVyIG9mIGluZGV4IGJpdHMgZm9yIHRoZSByb290IHRhYmxlLiAgV2hlbiBsZW4gZXhjZWVkc1xuICAgcm9vdCwgc3ViLXRhYmxlcyBhcmUgY3JlYXRlZCBwb2ludGVkIHRvIGJ5IHRoZSByb290IGVudHJ5IHdpdGggYW4gaW5kZXhcbiAgIG9mIHRoZSBsb3cgcm9vdCBiaXRzIG9mIGh1ZmYuICBUaGlzIGlzIHNhdmVkIGluIGxvdyB0byBjaGVjayBmb3Igd2hlbiBhXG4gICBuZXcgc3ViLXRhYmxlIHNob3VsZCBiZSBzdGFydGVkLiAgZHJvcCBpcyB6ZXJvIHdoZW4gdGhlIHJvb3QgdGFibGUgaXNcbiAgIGJlaW5nIGZpbGxlZCwgYW5kIGRyb3AgaXMgcm9vdCB3aGVuIHN1Yi10YWJsZXMgYXJlIGJlaW5nIGZpbGxlZC5cblxuICAgV2hlbiBhIG5ldyBzdWItdGFibGUgaXMgbmVlZGVkLCBpdCBpcyBuZWNlc3NhcnkgdG8gbG9vayBhaGVhZCBpbiB0aGVcbiAgIGNvZGUgbGVuZ3RocyB0byBkZXRlcm1pbmUgd2hhdCBzaXplIHN1Yi10YWJsZSBpcyBuZWVkZWQuICBUaGUgbGVuZ3RoXG4gICBjb3VudHMgYXJlIHVzZWQgZm9yIHRoaXMsIGFuZCBzbyBjb3VudFtdIGlzIGRlY3JlbWVudGVkIGFzIGNvZGVzIGFyZVxuICAgZW50ZXJlZCBpbiB0aGUgdGFibGVzLlxuXG4gICB1c2VkIGtlZXBzIHRyYWNrIG9mIGhvdyBtYW55IHRhYmxlIGVudHJpZXMgaGF2ZSBiZWVuIGFsbG9jYXRlZCBmcm9tIHRoZVxuICAgcHJvdmlkZWQgKnRhYmxlIHNwYWNlLiAgSXQgaXMgY2hlY2tlZCBmb3IgTEVOUyBhbmQgRElTVCB0YWJsZXMgYWdhaW5zdFxuICAgdGhlIGNvbnN0YW50cyBFTk9VR0hfTEVOUyBhbmQgRU5PVUdIX0RJU1RTIHRvIGd1YXJkIGFnYWluc3QgY2hhbmdlcyBpblxuICAgdGhlIGluaXRpYWwgcm9vdCB0YWJsZSBzaXplIGNvbnN0YW50cy4gIFNlZSB0aGUgY29tbWVudHMgaW4gaW5mdHJlZXMuaFxuICAgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG5cbiAgIHN5bSBpbmNyZW1lbnRzIHRocm91Z2ggYWxsIHN5bWJvbHMsIGFuZCB0aGUgbG9vcCB0ZXJtaW5hdGVzIHdoZW5cbiAgIGFsbCBjb2RlcyBvZiBsZW5ndGggbWF4LCBpLmUuIGFsbCBjb2RlcywgaGF2ZSBiZWVuIHByb2Nlc3NlZC4gIFRoaXNcbiAgIHJvdXRpbmUgcGVybWl0cyBpbmNvbXBsZXRlIGNvZGVzLCBzbyBhbm90aGVyIGxvb3AgYWZ0ZXIgdGhpcyBvbmUgZmlsbHNcbiAgIGluIHRoZSByZXN0IG9mIHRoZSBkZWNvZGluZyB0YWJsZXMgd2l0aCBpbnZhbGlkIGNvZGUgbWFya2Vycy5cbiAgICovXG5cbiAgLyogc2V0IHVwIGZvciBjb2RlIHR5cGUgKi9cbiAgLy8gcG9vciBtYW4gb3B0aW1pemF0aW9uIC0gdXNlIGlmLWVsc2UgaW5zdGVhZCBvZiBzd2l0Y2gsXG4gIC8vIHRvIGF2b2lkIGRlb3B0cyBpbiBvbGQgdjhcbiAgaWYgKHR5cGUgPT09IENPREVTKSB7XG4gICAgYmFzZSA9IGV4dHJhID0gd29yazsgICAgLyogZHVtbXkgdmFsdWUtLW5vdCB1c2VkICovXG4gICAgZW5kID0gMTk7XG5cbiAgfSBlbHNlIGlmICh0eXBlID09PSBMRU5TKSB7XG4gICAgYmFzZSA9IGxiYXNlO1xuICAgIGJhc2VfaW5kZXggLT0gMjU3O1xuICAgIGV4dHJhID0gbGV4dDtcbiAgICBleHRyYV9pbmRleCAtPSAyNTc7XG4gICAgZW5kID0gMjU2O1xuXG4gIH0gZWxzZSB7ICAgICAgICAgICAgICAgICAgICAvKiBESVNUUyAqL1xuICAgIGJhc2UgPSBkYmFzZTtcbiAgICBleHRyYSA9IGRleHQ7XG4gICAgZW5kID0gLTE7XG4gIH1cblxuICAvKiBpbml0aWFsaXplIG9wdHMgZm9yIGxvb3AgKi9cbiAgaHVmZiA9IDA7ICAgICAgICAgICAgICAgICAgIC8qIHN0YXJ0aW5nIGNvZGUgKi9cbiAgc3ltID0gMDsgICAgICAgICAgICAgICAgICAgIC8qIHN0YXJ0aW5nIGNvZGUgc3ltYm9sICovXG4gIGxlbiA9IG1pbjsgICAgICAgICAgICAgICAgICAvKiBzdGFydGluZyBjb2RlIGxlbmd0aCAqL1xuICBuZXh0ID0gdGFibGVfaW5kZXg7ICAgICAgICAgICAgICAvKiBjdXJyZW50IHRhYmxlIHRvIGZpbGwgaW4gKi9cbiAgY3VyciA9IHJvb3Q7ICAgICAgICAgICAgICAgIC8qIGN1cnJlbnQgdGFibGUgaW5kZXggYml0cyAqL1xuICBkcm9wID0gMDsgICAgICAgICAgICAgICAgICAgLyogY3VycmVudCBiaXRzIHRvIGRyb3AgZnJvbSBjb2RlIGZvciBpbmRleCAqL1xuICBsb3cgPSAtMTsgICAgICAgICAgICAgICAgICAgLyogdHJpZ2dlciBuZXcgc3ViLXRhYmxlIHdoZW4gbGVuID4gcm9vdCAqL1xuICB1c2VkID0gMSA8PCByb290OyAgICAgICAgICAvKiB1c2Ugcm9vdCB0YWJsZSBlbnRyaWVzICovXG4gIG1hc2sgPSB1c2VkIC0gMTsgICAgICAgICAgICAvKiBtYXNrIGZvciBjb21wYXJpbmcgbG93ICovXG5cbiAgLyogY2hlY2sgYXZhaWxhYmxlIHRhYmxlIHNwYWNlICovXG4gIGlmICgodHlwZSA9PT0gTEVOUyAmJiB1c2VkID4gRU5PVUdIX0xFTlMpIHx8XG4gICAgKHR5cGUgPT09IERJU1RTICYmIHVzZWQgPiBFTk9VR0hfRElTVFMpKSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICAvKiBwcm9jZXNzIGFsbCBjb2RlcyBhbmQgbWFrZSB0YWJsZSBlbnRyaWVzICovXG4gIGZvciAoOzspIHtcbiAgICAvKiBjcmVhdGUgdGFibGUgZW50cnkgKi9cbiAgICBoZXJlX2JpdHMgPSBsZW4gLSBkcm9wO1xuICAgIGlmICh3b3JrW3N5bV0gPCBlbmQpIHtcbiAgICAgIGhlcmVfb3AgPSAwO1xuICAgICAgaGVyZV92YWwgPSB3b3JrW3N5bV07XG4gICAgfVxuICAgIGVsc2UgaWYgKHdvcmtbc3ltXSA+IGVuZCkge1xuICAgICAgaGVyZV9vcCA9IGV4dHJhW2V4dHJhX2luZGV4ICsgd29ya1tzeW1dXTtcbiAgICAgIGhlcmVfdmFsID0gYmFzZVtiYXNlX2luZGV4ICsgd29ya1tzeW1dXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBoZXJlX29wID0gMzIgKyA2NDsgICAgICAgICAvKiBlbmQgb2YgYmxvY2sgKi9cbiAgICAgIGhlcmVfdmFsID0gMDtcbiAgICB9XG5cbiAgICAvKiByZXBsaWNhdGUgZm9yIHRob3NlIGluZGljZXMgd2l0aCBsb3cgbGVuIGJpdHMgZXF1YWwgdG8gaHVmZiAqL1xuICAgIGluY3IgPSAxIDw8IChsZW4gLSBkcm9wKTtcbiAgICBmaWxsID0gMSA8PCBjdXJyO1xuICAgIG1pbiA9IGZpbGw7ICAgICAgICAgICAgICAgICAvKiBzYXZlIG9mZnNldCB0byBuZXh0IHRhYmxlICovXG4gICAgZG8ge1xuICAgICAgZmlsbCAtPSBpbmNyO1xuICAgICAgdGFibGVbbmV4dCArIChodWZmID4+IGRyb3ApICsgZmlsbF0gPSAoaGVyZV9iaXRzIDw8IDI0KSB8IChoZXJlX29wIDw8IDE2KSB8IGhlcmVfdmFsIHwwO1xuICAgIH0gd2hpbGUgKGZpbGwgIT09IDApO1xuXG4gICAgLyogYmFja3dhcmRzIGluY3JlbWVudCB0aGUgbGVuLWJpdCBjb2RlIGh1ZmYgKi9cbiAgICBpbmNyID0gMSA8PCAobGVuIC0gMSk7XG4gICAgd2hpbGUgKGh1ZmYgJiBpbmNyKSB7XG4gICAgICBpbmNyID4+PSAxO1xuICAgIH1cbiAgICBpZiAoaW5jciAhPT0gMCkge1xuICAgICAgaHVmZiAmPSBpbmNyIC0gMTtcbiAgICAgIGh1ZmYgKz0gaW5jcjtcbiAgICB9IGVsc2Uge1xuICAgICAgaHVmZiA9IDA7XG4gICAgfVxuXG4gICAgLyogZ28gdG8gbmV4dCBzeW1ib2wsIHVwZGF0ZSBjb3VudCwgbGVuICovXG4gICAgc3ltKys7XG4gICAgaWYgKC0tY291bnRbbGVuXSA9PT0gMCkge1xuICAgICAgaWYgKGxlbiA9PT0gbWF4KSB7IGJyZWFrOyB9XG4gICAgICBsZW4gPSBsZW5zW2xlbnNfaW5kZXggKyB3b3JrW3N5bV1dO1xuICAgIH1cblxuICAgIC8qIGNyZWF0ZSBuZXcgc3ViLXRhYmxlIGlmIG5lZWRlZCAqL1xuICAgIGlmIChsZW4gPiByb290ICYmIChodWZmICYgbWFzaykgIT09IGxvdykge1xuICAgICAgLyogaWYgZmlyc3QgdGltZSwgdHJhbnNpdGlvbiB0byBzdWItdGFibGVzICovXG4gICAgICBpZiAoZHJvcCA9PT0gMCkge1xuICAgICAgICBkcm9wID0gcm9vdDtcbiAgICAgIH1cblxuICAgICAgLyogaW5jcmVtZW50IHBhc3QgbGFzdCB0YWJsZSAqL1xuICAgICAgbmV4dCArPSBtaW47ICAgICAgICAgICAgLyogaGVyZSBtaW4gaXMgMSA8PCBjdXJyICovXG5cbiAgICAgIC8qIGRldGVybWluZSBsZW5ndGggb2YgbmV4dCB0YWJsZSAqL1xuICAgICAgY3VyciA9IGxlbiAtIGRyb3A7XG4gICAgICBsZWZ0ID0gMSA8PCBjdXJyO1xuICAgICAgd2hpbGUgKGN1cnIgKyBkcm9wIDwgbWF4KSB7XG4gICAgICAgIGxlZnQgLT0gY291bnRbY3VyciArIGRyb3BdO1xuICAgICAgICBpZiAobGVmdCA8PSAwKSB7IGJyZWFrOyB9XG4gICAgICAgIGN1cnIrKztcbiAgICAgICAgbGVmdCA8PD0gMTtcbiAgICAgIH1cblxuICAgICAgLyogY2hlY2sgZm9yIGVub3VnaCBzcGFjZSAqL1xuICAgICAgdXNlZCArPSAxIDw8IGN1cnI7XG4gICAgICBpZiAoKHR5cGUgPT09IExFTlMgJiYgdXNlZCA+IEVOT1VHSF9MRU5TKSB8fFxuICAgICAgICAodHlwZSA9PT0gRElTVFMgJiYgdXNlZCA+IEVOT1VHSF9ESVNUUykpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG5cbiAgICAgIC8qIHBvaW50IGVudHJ5IGluIHJvb3QgdGFibGUgdG8gc3ViLXRhYmxlICovXG4gICAgICBsb3cgPSBodWZmICYgbWFzaztcbiAgICAgIC8qdGFibGUub3BbbG93XSA9IGN1cnI7XG4gICAgICB0YWJsZS5iaXRzW2xvd10gPSByb290O1xuICAgICAgdGFibGUudmFsW2xvd10gPSBuZXh0IC0gb3B0cy50YWJsZV9pbmRleDsqL1xuICAgICAgdGFibGVbbG93XSA9IChyb290IDw8IDI0KSB8IChjdXJyIDw8IDE2KSB8IChuZXh0IC0gdGFibGVfaW5kZXgpIHwwO1xuICAgIH1cbiAgfVxuXG4gIC8qIGZpbGwgaW4gcmVtYWluaW5nIHRhYmxlIGVudHJ5IGlmIGNvZGUgaXMgaW5jb21wbGV0ZSAoZ3VhcmFudGVlZCB0byBoYXZlXG4gICBhdCBtb3N0IG9uZSByZW1haW5pbmcgZW50cnksIHNpbmNlIGlmIHRoZSBjb2RlIGlzIGluY29tcGxldGUsIHRoZVxuICAgbWF4aW11bSBjb2RlIGxlbmd0aCB0aGF0IHdhcyBhbGxvd2VkIHRvIGdldCB0aGlzIGZhciBpcyBvbmUgYml0KSAqL1xuICBpZiAoaHVmZiAhPT0gMCkge1xuICAgIC8vdGFibGUub3BbbmV4dCArIGh1ZmZdID0gNjQ7ICAgICAgICAgICAgLyogaW52YWxpZCBjb2RlIG1hcmtlciAqL1xuICAgIC8vdGFibGUuYml0c1tuZXh0ICsgaHVmZl0gPSBsZW4gLSBkcm9wO1xuICAgIC8vdGFibGUudmFsW25leHQgKyBodWZmXSA9IDA7XG4gICAgdGFibGVbbmV4dCArIGh1ZmZdID0gKChsZW4gLSBkcm9wKSA8PCAyNCkgfCAoNjQgPDwgMTYpIHwwO1xuICB9XG5cbiAgLyogc2V0IHJldHVybiBwYXJhbWV0ZXJzICovXG4gIC8vb3B0cy50YWJsZV9pbmRleCArPSB1c2VkO1xuICBvcHRzLmJpdHMgPSByb290O1xuICByZXR1cm4gMDtcbn07XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vLyAoQykgMTk5NS0yMDEzIEplYW4tbG91cCBHYWlsbHkgYW5kIE1hcmsgQWRsZXJcbi8vIChDKSAyMDE0LTIwMTcgVml0YWx5IFB1enJpbiBhbmQgQW5kcmV5IFR1cGl0c2luXG4vL1xuLy8gVGhpcyBzb2Z0d2FyZSBpcyBwcm92aWRlZCAnYXMtaXMnLCB3aXRob3V0IGFueSBleHByZXNzIG9yIGltcGxpZWRcbi8vIHdhcnJhbnR5LiBJbiBubyBldmVudCB3aWxsIHRoZSBhdXRob3JzIGJlIGhlbGQgbGlhYmxlIGZvciBhbnkgZGFtYWdlc1xuLy8gYXJpc2luZyBmcm9tIHRoZSB1c2Ugb2YgdGhpcyBzb2Z0d2FyZS5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGdyYW50ZWQgdG8gYW55b25lIHRvIHVzZSB0aGlzIHNvZnR3YXJlIGZvciBhbnkgcHVycG9zZSxcbi8vIGluY2x1ZGluZyBjb21tZXJjaWFsIGFwcGxpY2F0aW9ucywgYW5kIHRvIGFsdGVyIGl0IGFuZCByZWRpc3RyaWJ1dGUgaXRcbi8vIGZyZWVseSwgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIHJlc3RyaWN0aW9uczpcbi8vXG4vLyAxLiBUaGUgb3JpZ2luIG9mIHRoaXMgc29mdHdhcmUgbXVzdCBub3QgYmUgbWlzcmVwcmVzZW50ZWQ7IHlvdSBtdXN0IG5vdFxuLy8gICBjbGFpbSB0aGF0IHlvdSB3cm90ZSB0aGUgb3JpZ2luYWwgc29mdHdhcmUuIElmIHlvdSB1c2UgdGhpcyBzb2Z0d2FyZVxuLy8gICBpbiBhIHByb2R1Y3QsIGFuIGFja25vd2xlZGdtZW50IGluIHRoZSBwcm9kdWN0IGRvY3VtZW50YXRpb24gd291bGQgYmVcbi8vICAgYXBwcmVjaWF0ZWQgYnV0IGlzIG5vdCByZXF1aXJlZC5cbi8vIDIuIEFsdGVyZWQgc291cmNlIHZlcnNpb25zIG11c3QgYmUgcGxhaW5seSBtYXJrZWQgYXMgc3VjaCwgYW5kIG11c3Qgbm90IGJlXG4vLyAgIG1pc3JlcHJlc2VudGVkIGFzIGJlaW5nIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS5cbi8vIDMuIFRoaXMgbm90aWNlIG1heSBub3QgYmUgcmVtb3ZlZCBvciBhbHRlcmVkIGZyb20gYW55IHNvdXJjZSBkaXN0cmlidXRpb24uXG5cbnZhciB1dGlscyAgICAgICAgID0gcmVxdWlyZSgnLi4vdXRpbHMvY29tbW9uJyk7XG52YXIgYWRsZXIzMiAgICAgICA9IHJlcXVpcmUoJy4vYWRsZXIzMicpO1xudmFyIGNyYzMyICAgICAgICAgPSByZXF1aXJlKCcuL2NyYzMyJyk7XG52YXIgaW5mbGF0ZV9mYXN0ICA9IHJlcXVpcmUoJy4vaW5mZmFzdCcpO1xudmFyIGluZmxhdGVfdGFibGUgPSByZXF1aXJlKCcuL2luZnRyZWVzJyk7XG5cbnZhciBDT0RFUyA9IDA7XG52YXIgTEVOUyA9IDE7XG52YXIgRElTVFMgPSAyO1xuXG4vKiBQdWJsaWMgY29uc3RhbnRzID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuXG4vKiBBbGxvd2VkIGZsdXNoIHZhbHVlczsgc2VlIGRlZmxhdGUoKSBhbmQgaW5mbGF0ZSgpIGJlbG93IGZvciBkZXRhaWxzICovXG4vL3ZhciBaX05PX0ZMVVNIICAgICAgPSAwO1xuLy92YXIgWl9QQVJUSUFMX0ZMVVNIID0gMTtcbi8vdmFyIFpfU1lOQ19GTFVTSCAgICA9IDI7XG4vL3ZhciBaX0ZVTExfRkxVU0ggICAgPSAzO1xudmFyIFpfRklOSVNIICAgICAgICA9IDQ7XG52YXIgWl9CTE9DSyAgICAgICAgID0gNTtcbnZhciBaX1RSRUVTICAgICAgICAgPSA2O1xuXG5cbi8qIFJldHVybiBjb2RlcyBmb3IgdGhlIGNvbXByZXNzaW9uL2RlY29tcHJlc3Npb24gZnVuY3Rpb25zLiBOZWdhdGl2ZSB2YWx1ZXNcbiAqIGFyZSBlcnJvcnMsIHBvc2l0aXZlIHZhbHVlcyBhcmUgdXNlZCBmb3Igc3BlY2lhbCBidXQgbm9ybWFsIGV2ZW50cy5cbiAqL1xudmFyIFpfT0sgICAgICAgICAgICA9IDA7XG52YXIgWl9TVFJFQU1fRU5EICAgID0gMTtcbnZhciBaX05FRURfRElDVCAgICAgPSAyO1xuLy92YXIgWl9FUlJOTyAgICAgICAgID0gLTE7XG52YXIgWl9TVFJFQU1fRVJST1IgID0gLTI7XG52YXIgWl9EQVRBX0VSUk9SICAgID0gLTM7XG52YXIgWl9NRU1fRVJST1IgICAgID0gLTQ7XG52YXIgWl9CVUZfRVJST1IgICAgID0gLTU7XG4vL3ZhciBaX1ZFUlNJT05fRVJST1IgPSAtNjtcblxuLyogVGhlIGRlZmxhdGUgY29tcHJlc3Npb24gbWV0aG9kICovXG52YXIgWl9ERUZMQVRFRCAgPSA4O1xuXG5cbi8qIFNUQVRFUyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG5cbnZhciAgICBIRUFEID0gMTsgICAgICAgLyogaTogd2FpdGluZyBmb3IgbWFnaWMgaGVhZGVyICovXG52YXIgICAgRkxBR1MgPSAyOyAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIG1ldGhvZCBhbmQgZmxhZ3MgKGd6aXApICovXG52YXIgICAgVElNRSA9IDM7ICAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIG1vZGlmaWNhdGlvbiB0aW1lIChnemlwKSAqL1xudmFyICAgIE9TID0gNDsgICAgICAgICAvKiBpOiB3YWl0aW5nIGZvciBleHRyYSBmbGFncyBhbmQgb3BlcmF0aW5nIHN5c3RlbSAoZ3ppcCkgKi9cbnZhciAgICBFWExFTiA9IDU7ICAgICAgLyogaTogd2FpdGluZyBmb3IgZXh0cmEgbGVuZ3RoIChnemlwKSAqL1xudmFyICAgIEVYVFJBID0gNjsgICAgICAvKiBpOiB3YWl0aW5nIGZvciBleHRyYSBieXRlcyAoZ3ppcCkgKi9cbnZhciAgICBOQU1FID0gNzsgICAgICAgLyogaTogd2FpdGluZyBmb3IgZW5kIG9mIGZpbGUgbmFtZSAoZ3ppcCkgKi9cbnZhciAgICBDT01NRU5UID0gODsgICAgLyogaTogd2FpdGluZyBmb3IgZW5kIG9mIGNvbW1lbnQgKGd6aXApICovXG52YXIgICAgSENSQyA9IDk7ICAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIGhlYWRlciBjcmMgKGd6aXApICovXG52YXIgICAgRElDVElEID0gMTA7ICAgIC8qIGk6IHdhaXRpbmcgZm9yIGRpY3Rpb25hcnkgY2hlY2sgdmFsdWUgKi9cbnZhciAgICBESUNUID0gMTE7ICAgICAgLyogd2FpdGluZyBmb3IgaW5mbGF0ZVNldERpY3Rpb25hcnkoKSBjYWxsICovXG52YXIgICAgICAgIFRZUEUgPSAxMjsgICAgICAvKiBpOiB3YWl0aW5nIGZvciB0eXBlIGJpdHMsIGluY2x1ZGluZyBsYXN0LWZsYWcgYml0ICovXG52YXIgICAgICAgIFRZUEVETyA9IDEzOyAgICAvKiBpOiBzYW1lLCBidXQgc2tpcCBjaGVjayB0byBleGl0IGluZmxhdGUgb24gbmV3IGJsb2NrICovXG52YXIgICAgICAgIFNUT1JFRCA9IDE0OyAgICAvKiBpOiB3YWl0aW5nIGZvciBzdG9yZWQgc2l6ZSAobGVuZ3RoIGFuZCBjb21wbGVtZW50KSAqL1xudmFyICAgICAgICBDT1BZXyA9IDE1OyAgICAgLyogaS9vOiBzYW1lIGFzIENPUFkgYmVsb3csIGJ1dCBvbmx5IGZpcnN0IHRpbWUgaW4gKi9cbnZhciAgICAgICAgQ09QWSA9IDE2OyAgICAgIC8qIGkvbzogd2FpdGluZyBmb3IgaW5wdXQgb3Igb3V0cHV0IHRvIGNvcHkgc3RvcmVkIGJsb2NrICovXG52YXIgICAgICAgIFRBQkxFID0gMTc7ICAgICAvKiBpOiB3YWl0aW5nIGZvciBkeW5hbWljIGJsb2NrIHRhYmxlIGxlbmd0aHMgKi9cbnZhciAgICAgICAgTEVOTEVOUyA9IDE4OyAgIC8qIGk6IHdhaXRpbmcgZm9yIGNvZGUgbGVuZ3RoIGNvZGUgbGVuZ3RocyAqL1xudmFyICAgICAgICBDT0RFTEVOUyA9IDE5OyAgLyogaTogd2FpdGluZyBmb3IgbGVuZ3RoL2xpdCBhbmQgZGlzdGFuY2UgY29kZSBsZW5ndGhzICovXG52YXIgICAgICAgICAgICBMRU5fID0gMjA7ICAgICAgLyogaTogc2FtZSBhcyBMRU4gYmVsb3csIGJ1dCBvbmx5IGZpcnN0IHRpbWUgaW4gKi9cbnZhciAgICAgICAgICAgIExFTiA9IDIxOyAgICAgICAvKiBpOiB3YWl0aW5nIGZvciBsZW5ndGgvbGl0L2VvYiBjb2RlICovXG52YXIgICAgICAgICAgICBMRU5FWFQgPSAyMjsgICAgLyogaTogd2FpdGluZyBmb3IgbGVuZ3RoIGV4dHJhIGJpdHMgKi9cbnZhciAgICAgICAgICAgIERJU1QgPSAyMzsgICAgICAvKiBpOiB3YWl0aW5nIGZvciBkaXN0YW5jZSBjb2RlICovXG52YXIgICAgICAgICAgICBESVNURVhUID0gMjQ7ICAgLyogaTogd2FpdGluZyBmb3IgZGlzdGFuY2UgZXh0cmEgYml0cyAqL1xudmFyICAgICAgICAgICAgTUFUQ0ggPSAyNTsgICAgIC8qIG86IHdhaXRpbmcgZm9yIG91dHB1dCBzcGFjZSB0byBjb3B5IHN0cmluZyAqL1xudmFyICAgICAgICAgICAgTElUID0gMjY7ICAgICAgIC8qIG86IHdhaXRpbmcgZm9yIG91dHB1dCBzcGFjZSB0byB3cml0ZSBsaXRlcmFsICovXG52YXIgICAgQ0hFQ0sgPSAyNzsgICAgIC8qIGk6IHdhaXRpbmcgZm9yIDMyLWJpdCBjaGVjayB2YWx1ZSAqL1xudmFyICAgIExFTkdUSCA9IDI4OyAgICAvKiBpOiB3YWl0aW5nIGZvciAzMi1iaXQgbGVuZ3RoIChnemlwKSAqL1xudmFyICAgIERPTkUgPSAyOTsgICAgICAvKiBmaW5pc2hlZCBjaGVjaywgZG9uZSAtLSByZW1haW4gaGVyZSB1bnRpbCByZXNldCAqL1xudmFyICAgIEJBRCA9IDMwOyAgICAgICAvKiBnb3QgYSBkYXRhIGVycm9yIC0tIHJlbWFpbiBoZXJlIHVudGlsIHJlc2V0ICovXG52YXIgICAgTUVNID0gMzE7ICAgICAgIC8qIGdvdCBhbiBpbmZsYXRlKCkgbWVtb3J5IGVycm9yIC0tIHJlbWFpbiBoZXJlIHVudGlsIHJlc2V0ICovXG52YXIgICAgU1lOQyA9IDMyOyAgICAgIC8qIGxvb2tpbmcgZm9yIHN5bmNocm9uaXphdGlvbiBieXRlcyB0byByZXN0YXJ0IGluZmxhdGUoKSAqL1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG5cblxudmFyIEVOT1VHSF9MRU5TID0gODUyO1xudmFyIEVOT1VHSF9ESVNUUyA9IDU5Mjtcbi8vdmFyIEVOT1VHSCA9ICAoRU5PVUdIX0xFTlMrRU5PVUdIX0RJU1RTKTtcblxudmFyIE1BWF9XQklUUyA9IDE1O1xuLyogMzJLIExaNzcgd2luZG93ICovXG52YXIgREVGX1dCSVRTID0gTUFYX1dCSVRTO1xuXG5cbmZ1bmN0aW9uIHpzd2FwMzIocSkge1xuICByZXR1cm4gICgoKHEgPj4+IDI0KSAmIDB4ZmYpICtcbiAgICAgICAgICAoKHEgPj4+IDgpICYgMHhmZjAwKSArXG4gICAgICAgICAgKChxICYgMHhmZjAwKSA8PCA4KSArXG4gICAgICAgICAgKChxICYgMHhmZikgPDwgMjQpKTtcbn1cblxuXG5mdW5jdGlvbiBJbmZsYXRlU3RhdGUoKSB7XG4gIHRoaXMubW9kZSA9IDA7ICAgICAgICAgICAgIC8qIGN1cnJlbnQgaW5mbGF0ZSBtb2RlICovXG4gIHRoaXMubGFzdCA9IGZhbHNlOyAgICAgICAgICAvKiB0cnVlIGlmIHByb2Nlc3NpbmcgbGFzdCBibG9jayAqL1xuICB0aGlzLndyYXAgPSAwOyAgICAgICAgICAgICAgLyogYml0IDAgdHJ1ZSBmb3IgemxpYiwgYml0IDEgdHJ1ZSBmb3IgZ3ppcCAqL1xuICB0aGlzLmhhdmVkaWN0ID0gZmFsc2U7ICAgICAgLyogdHJ1ZSBpZiBkaWN0aW9uYXJ5IHByb3ZpZGVkICovXG4gIHRoaXMuZmxhZ3MgPSAwOyAgICAgICAgICAgICAvKiBnemlwIGhlYWRlciBtZXRob2QgYW5kIGZsYWdzICgwIGlmIHpsaWIpICovXG4gIHRoaXMuZG1heCA9IDA7ICAgICAgICAgICAgICAvKiB6bGliIGhlYWRlciBtYXggZGlzdGFuY2UgKElORkxBVEVfU1RSSUNUKSAqL1xuICB0aGlzLmNoZWNrID0gMDsgICAgICAgICAgICAgLyogcHJvdGVjdGVkIGNvcHkgb2YgY2hlY2sgdmFsdWUgKi9cbiAgdGhpcy50b3RhbCA9IDA7ICAgICAgICAgICAgIC8qIHByb3RlY3RlZCBjb3B5IG9mIG91dHB1dCBjb3VudCAqL1xuICAvLyBUT0RPOiBtYXkgYmUge31cbiAgdGhpcy5oZWFkID0gbnVsbDsgICAgICAgICAgIC8qIHdoZXJlIHRvIHNhdmUgZ3ppcCBoZWFkZXIgaW5mb3JtYXRpb24gKi9cblxuICAvKiBzbGlkaW5nIHdpbmRvdyAqL1xuICB0aGlzLndiaXRzID0gMDsgICAgICAgICAgICAgLyogbG9nIGJhc2UgMiBvZiByZXF1ZXN0ZWQgd2luZG93IHNpemUgKi9cbiAgdGhpcy53c2l6ZSA9IDA7ICAgICAgICAgICAgIC8qIHdpbmRvdyBzaXplIG9yIHplcm8gaWYgbm90IHVzaW5nIHdpbmRvdyAqL1xuICB0aGlzLndoYXZlID0gMDsgICAgICAgICAgICAgLyogdmFsaWQgYnl0ZXMgaW4gdGhlIHdpbmRvdyAqL1xuICB0aGlzLnduZXh0ID0gMDsgICAgICAgICAgICAgLyogd2luZG93IHdyaXRlIGluZGV4ICovXG4gIHRoaXMud2luZG93ID0gbnVsbDsgICAgICAgICAvKiBhbGxvY2F0ZWQgc2xpZGluZyB3aW5kb3csIGlmIG5lZWRlZCAqL1xuXG4gIC8qIGJpdCBhY2N1bXVsYXRvciAqL1xuICB0aGlzLmhvbGQgPSAwOyAgICAgICAgICAgICAgLyogaW5wdXQgYml0IGFjY3VtdWxhdG9yICovXG4gIHRoaXMuYml0cyA9IDA7ICAgICAgICAgICAgICAvKiBudW1iZXIgb2YgYml0cyBpbiBcImluXCIgKi9cblxuICAvKiBmb3Igc3RyaW5nIGFuZCBzdG9yZWQgYmxvY2sgY29weWluZyAqL1xuICB0aGlzLmxlbmd0aCA9IDA7ICAgICAgICAgICAgLyogbGl0ZXJhbCBvciBsZW5ndGggb2YgZGF0YSB0byBjb3B5ICovXG4gIHRoaXMub2Zmc2V0ID0gMDsgICAgICAgICAgICAvKiBkaXN0YW5jZSBiYWNrIHRvIGNvcHkgc3RyaW5nIGZyb20gKi9cblxuICAvKiBmb3IgdGFibGUgYW5kIGNvZGUgZGVjb2RpbmcgKi9cbiAgdGhpcy5leHRyYSA9IDA7ICAgICAgICAgICAgIC8qIGV4dHJhIGJpdHMgbmVlZGVkICovXG5cbiAgLyogZml4ZWQgYW5kIGR5bmFtaWMgY29kZSB0YWJsZXMgKi9cbiAgdGhpcy5sZW5jb2RlID0gbnVsbDsgICAgICAgICAgLyogc3RhcnRpbmcgdGFibGUgZm9yIGxlbmd0aC9saXRlcmFsIGNvZGVzICovXG4gIHRoaXMuZGlzdGNvZGUgPSBudWxsOyAgICAgICAgIC8qIHN0YXJ0aW5nIHRhYmxlIGZvciBkaXN0YW5jZSBjb2RlcyAqL1xuICB0aGlzLmxlbmJpdHMgPSAwOyAgICAgICAgICAgLyogaW5kZXggYml0cyBmb3IgbGVuY29kZSAqL1xuICB0aGlzLmRpc3RiaXRzID0gMDsgICAgICAgICAgLyogaW5kZXggYml0cyBmb3IgZGlzdGNvZGUgKi9cblxuICAvKiBkeW5hbWljIHRhYmxlIGJ1aWxkaW5nICovXG4gIHRoaXMubmNvZGUgPSAwOyAgICAgICAgICAgICAvKiBudW1iZXIgb2YgY29kZSBsZW5ndGggY29kZSBsZW5ndGhzICovXG4gIHRoaXMubmxlbiA9IDA7ICAgICAgICAgICAgICAvKiBudW1iZXIgb2YgbGVuZ3RoIGNvZGUgbGVuZ3RocyAqL1xuICB0aGlzLm5kaXN0ID0gMDsgICAgICAgICAgICAgLyogbnVtYmVyIG9mIGRpc3RhbmNlIGNvZGUgbGVuZ3RocyAqL1xuICB0aGlzLmhhdmUgPSAwOyAgICAgICAgICAgICAgLyogbnVtYmVyIG9mIGNvZGUgbGVuZ3RocyBpbiBsZW5zW10gKi9cbiAgdGhpcy5uZXh0ID0gbnVsbDsgICAgICAgICAgICAgIC8qIG5leHQgYXZhaWxhYmxlIHNwYWNlIGluIGNvZGVzW10gKi9cblxuICB0aGlzLmxlbnMgPSBuZXcgdXRpbHMuQnVmMTYoMzIwKTsgLyogdGVtcG9yYXJ5IHN0b3JhZ2UgZm9yIGNvZGUgbGVuZ3RocyAqL1xuICB0aGlzLndvcmsgPSBuZXcgdXRpbHMuQnVmMTYoMjg4KTsgLyogd29yayBhcmVhIGZvciBjb2RlIHRhYmxlIGJ1aWxkaW5nICovXG5cbiAgLypcbiAgIGJlY2F1c2Ugd2UgZG9uJ3QgaGF2ZSBwb2ludGVycyBpbiBqcywgd2UgdXNlIGxlbmNvZGUgYW5kIGRpc3Rjb2RlIGRpcmVjdGx5XG4gICBhcyBidWZmZXJzIHNvIHdlIGRvbid0IG5lZWQgY29kZXNcbiAgKi9cbiAgLy90aGlzLmNvZGVzID0gbmV3IHV0aWxzLkJ1ZjMyKEVOT1VHSCk7ICAgICAgIC8qIHNwYWNlIGZvciBjb2RlIHRhYmxlcyAqL1xuICB0aGlzLmxlbmR5biA9IG51bGw7ICAgICAgICAgICAgICAvKiBkeW5hbWljIHRhYmxlIGZvciBsZW5ndGgvbGl0ZXJhbCBjb2RlcyAoSlMgc3BlY2lmaWMpICovXG4gIHRoaXMuZGlzdGR5biA9IG51bGw7ICAgICAgICAgICAgIC8qIGR5bmFtaWMgdGFibGUgZm9yIGRpc3RhbmNlIGNvZGVzIChKUyBzcGVjaWZpYykgKi9cbiAgdGhpcy5zYW5lID0gMDsgICAgICAgICAgICAgICAgICAgLyogaWYgZmFsc2UsIGFsbG93IGludmFsaWQgZGlzdGFuY2UgdG9vIGZhciAqL1xuICB0aGlzLmJhY2sgPSAwOyAgICAgICAgICAgICAgICAgICAvKiBiaXRzIGJhY2sgb2YgbGFzdCB1bnByb2Nlc3NlZCBsZW5ndGgvbGl0ICovXG4gIHRoaXMud2FzID0gMDsgICAgICAgICAgICAgICAgICAgIC8qIGluaXRpYWwgbGVuZ3RoIG9mIG1hdGNoICovXG59XG5cbmZ1bmN0aW9uIGluZmxhdGVSZXNldEtlZXAoc3RybSkge1xuICB2YXIgc3RhdGU7XG5cbiAgaWYgKCFzdHJtIHx8ICFzdHJtLnN0YXRlKSB7IHJldHVybiBaX1NUUkVBTV9FUlJPUjsgfVxuICBzdGF0ZSA9IHN0cm0uc3RhdGU7XG4gIHN0cm0udG90YWxfaW4gPSBzdHJtLnRvdGFsX291dCA9IHN0YXRlLnRvdGFsID0gMDtcbiAgc3RybS5tc2cgPSAnJzsgLypaX05VTEwqL1xuICBpZiAoc3RhdGUud3JhcCkgeyAgICAgICAvKiB0byBzdXBwb3J0IGlsbC1jb25jZWl2ZWQgSmF2YSB0ZXN0IHN1aXRlICovXG4gICAgc3RybS5hZGxlciA9IHN0YXRlLndyYXAgJiAxO1xuICB9XG4gIHN0YXRlLm1vZGUgPSBIRUFEO1xuICBzdGF0ZS5sYXN0ID0gMDtcbiAgc3RhdGUuaGF2ZWRpY3QgPSAwO1xuICBzdGF0ZS5kbWF4ID0gMzI3Njg7XG4gIHN0YXRlLmhlYWQgPSBudWxsLypaX05VTEwqLztcbiAgc3RhdGUuaG9sZCA9IDA7XG4gIHN0YXRlLmJpdHMgPSAwO1xuICAvL3N0YXRlLmxlbmNvZGUgPSBzdGF0ZS5kaXN0Y29kZSA9IHN0YXRlLm5leHQgPSBzdGF0ZS5jb2RlcztcbiAgc3RhdGUubGVuY29kZSA9IHN0YXRlLmxlbmR5biA9IG5ldyB1dGlscy5CdWYzMihFTk9VR0hfTEVOUyk7XG4gIHN0YXRlLmRpc3Rjb2RlID0gc3RhdGUuZGlzdGR5biA9IG5ldyB1dGlscy5CdWYzMihFTk9VR0hfRElTVFMpO1xuXG4gIHN0YXRlLnNhbmUgPSAxO1xuICBzdGF0ZS5iYWNrID0gLTE7XG4gIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogcmVzZXRcXG5cIikpO1xuICByZXR1cm4gWl9PSztcbn1cblxuZnVuY3Rpb24gaW5mbGF0ZVJlc2V0KHN0cm0pIHtcbiAgdmFyIHN0YXRlO1xuXG4gIGlmICghc3RybSB8fCAhc3RybS5zdGF0ZSkgeyByZXR1cm4gWl9TVFJFQU1fRVJST1I7IH1cbiAgc3RhdGUgPSBzdHJtLnN0YXRlO1xuICBzdGF0ZS53c2l6ZSA9IDA7XG4gIHN0YXRlLndoYXZlID0gMDtcbiAgc3RhdGUud25leHQgPSAwO1xuICByZXR1cm4gaW5mbGF0ZVJlc2V0S2VlcChzdHJtKTtcblxufVxuXG5mdW5jdGlvbiBpbmZsYXRlUmVzZXQyKHN0cm0sIHdpbmRvd0JpdHMpIHtcbiAgdmFyIHdyYXA7XG4gIHZhciBzdGF0ZTtcblxuICAvKiBnZXQgdGhlIHN0YXRlICovXG4gIGlmICghc3RybSB8fCAhc3RybS5zdGF0ZSkgeyByZXR1cm4gWl9TVFJFQU1fRVJST1I7IH1cbiAgc3RhdGUgPSBzdHJtLnN0YXRlO1xuXG4gIC8qIGV4dHJhY3Qgd3JhcCByZXF1ZXN0IGZyb20gd2luZG93Qml0cyBwYXJhbWV0ZXIgKi9cbiAgaWYgKHdpbmRvd0JpdHMgPCAwKSB7XG4gICAgd3JhcCA9IDA7XG4gICAgd2luZG93Qml0cyA9IC13aW5kb3dCaXRzO1xuICB9XG4gIGVsc2Uge1xuICAgIHdyYXAgPSAod2luZG93Qml0cyA+PiA0KSArIDE7XG4gICAgaWYgKHdpbmRvd0JpdHMgPCA0OCkge1xuICAgICAgd2luZG93Qml0cyAmPSAxNTtcbiAgICB9XG4gIH1cblxuICAvKiBzZXQgbnVtYmVyIG9mIHdpbmRvdyBiaXRzLCBmcmVlIHdpbmRvdyBpZiBkaWZmZXJlbnQgKi9cbiAgaWYgKHdpbmRvd0JpdHMgJiYgKHdpbmRvd0JpdHMgPCA4IHx8IHdpbmRvd0JpdHMgPiAxNSkpIHtcbiAgICByZXR1cm4gWl9TVFJFQU1fRVJST1I7XG4gIH1cbiAgaWYgKHN0YXRlLndpbmRvdyAhPT0gbnVsbCAmJiBzdGF0ZS53Yml0cyAhPT0gd2luZG93Qml0cykge1xuICAgIHN0YXRlLndpbmRvdyA9IG51bGw7XG4gIH1cblxuICAvKiB1cGRhdGUgc3RhdGUgYW5kIHJlc2V0IHRoZSByZXN0IG9mIGl0ICovXG4gIHN0YXRlLndyYXAgPSB3cmFwO1xuICBzdGF0ZS53Yml0cyA9IHdpbmRvd0JpdHM7XG4gIHJldHVybiBpbmZsYXRlUmVzZXQoc3RybSk7XG59XG5cbmZ1bmN0aW9uIGluZmxhdGVJbml0MihzdHJtLCB3aW5kb3dCaXRzKSB7XG4gIHZhciByZXQ7XG4gIHZhciBzdGF0ZTtcblxuICBpZiAoIXN0cm0pIHsgcmV0dXJuIFpfU1RSRUFNX0VSUk9SOyB9XG4gIC8vc3RybS5tc2cgPSBaX05VTEw7ICAgICAgICAgICAgICAgICAvKiBpbiBjYXNlIHdlIHJldHVybiBhbiBlcnJvciAqL1xuXG4gIHN0YXRlID0gbmV3IEluZmxhdGVTdGF0ZSgpO1xuXG4gIC8vaWYgKHN0YXRlID09PSBaX05VTEwpIHJldHVybiBaX01FTV9FUlJPUjtcbiAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiBhbGxvY2F0ZWRcXG5cIikpO1xuICBzdHJtLnN0YXRlID0gc3RhdGU7XG4gIHN0YXRlLndpbmRvdyA9IG51bGwvKlpfTlVMTCovO1xuICByZXQgPSBpbmZsYXRlUmVzZXQyKHN0cm0sIHdpbmRvd0JpdHMpO1xuICBpZiAocmV0ICE9PSBaX09LKSB7XG4gICAgc3RybS5zdGF0ZSA9IG51bGwvKlpfTlVMTCovO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGluZmxhdGVJbml0KHN0cm0pIHtcbiAgcmV0dXJuIGluZmxhdGVJbml0MihzdHJtLCBERUZfV0JJVFMpO1xufVxuXG5cbi8qXG4gUmV0dXJuIHN0YXRlIHdpdGggbGVuZ3RoIGFuZCBkaXN0YW5jZSBkZWNvZGluZyB0YWJsZXMgYW5kIGluZGV4IHNpemVzIHNldCB0b1xuIGZpeGVkIGNvZGUgZGVjb2RpbmcuICBOb3JtYWxseSB0aGlzIHJldHVybnMgZml4ZWQgdGFibGVzIGZyb20gaW5mZml4ZWQuaC5cbiBJZiBCVUlMREZJWEVEIGlzIGRlZmluZWQsIHRoZW4gaW5zdGVhZCB0aGlzIHJvdXRpbmUgYnVpbGRzIHRoZSB0YWJsZXMgdGhlXG4gZmlyc3QgdGltZSBpdCdzIGNhbGxlZCwgYW5kIHJldHVybnMgdGhvc2UgdGFibGVzIHRoZSBmaXJzdCB0aW1lIGFuZFxuIHRoZXJlYWZ0ZXIuICBUaGlzIHJlZHVjZXMgdGhlIHNpemUgb2YgdGhlIGNvZGUgYnkgYWJvdXQgMksgYnl0ZXMsIGluXG4gZXhjaGFuZ2UgZm9yIGEgbGl0dGxlIGV4ZWN1dGlvbiB0aW1lLiAgSG93ZXZlciwgQlVJTERGSVhFRCBzaG91bGQgbm90IGJlXG4gdXNlZCBmb3IgdGhyZWFkZWQgYXBwbGljYXRpb25zLCBzaW5jZSB0aGUgcmV3cml0aW5nIG9mIHRoZSB0YWJsZXMgYW5kIHZpcmdpblxuIG1heSBub3QgYmUgdGhyZWFkLXNhZmUuXG4gKi9cbnZhciB2aXJnaW4gPSB0cnVlO1xuXG52YXIgbGVuZml4LCBkaXN0Zml4OyAvLyBXZSBoYXZlIG5vIHBvaW50ZXJzIGluIEpTLCBzbyBrZWVwIHRhYmxlcyBzZXBhcmF0ZVxuXG5mdW5jdGlvbiBmaXhlZHRhYmxlcyhzdGF0ZSkge1xuICAvKiBidWlsZCBmaXhlZCBodWZmbWFuIHRhYmxlcyBpZiBmaXJzdCBjYWxsIChtYXkgbm90IGJlIHRocmVhZCBzYWZlKSAqL1xuICBpZiAodmlyZ2luKSB7XG4gICAgdmFyIHN5bTtcblxuICAgIGxlbmZpeCA9IG5ldyB1dGlscy5CdWYzMig1MTIpO1xuICAgIGRpc3RmaXggPSBuZXcgdXRpbHMuQnVmMzIoMzIpO1xuXG4gICAgLyogbGl0ZXJhbC9sZW5ndGggdGFibGUgKi9cbiAgICBzeW0gPSAwO1xuICAgIHdoaWxlIChzeW0gPCAxNDQpIHsgc3RhdGUubGVuc1tzeW0rK10gPSA4OyB9XG4gICAgd2hpbGUgKHN5bSA8IDI1NikgeyBzdGF0ZS5sZW5zW3N5bSsrXSA9IDk7IH1cbiAgICB3aGlsZSAoc3ltIDwgMjgwKSB7IHN0YXRlLmxlbnNbc3ltKytdID0gNzsgfVxuICAgIHdoaWxlIChzeW0gPCAyODgpIHsgc3RhdGUubGVuc1tzeW0rK10gPSA4OyB9XG5cbiAgICBpbmZsYXRlX3RhYmxlKExFTlMsICBzdGF0ZS5sZW5zLCAwLCAyODgsIGxlbmZpeCwgICAwLCBzdGF0ZS53b3JrLCB7IGJpdHM6IDkgfSk7XG5cbiAgICAvKiBkaXN0YW5jZSB0YWJsZSAqL1xuICAgIHN5bSA9IDA7XG4gICAgd2hpbGUgKHN5bSA8IDMyKSB7IHN0YXRlLmxlbnNbc3ltKytdID0gNTsgfVxuXG4gICAgaW5mbGF0ZV90YWJsZShESVNUUywgc3RhdGUubGVucywgMCwgMzIsICAgZGlzdGZpeCwgMCwgc3RhdGUud29yaywgeyBiaXRzOiA1IH0pO1xuXG4gICAgLyogZG8gdGhpcyBqdXN0IG9uY2UgKi9cbiAgICB2aXJnaW4gPSBmYWxzZTtcbiAgfVxuXG4gIHN0YXRlLmxlbmNvZGUgPSBsZW5maXg7XG4gIHN0YXRlLmxlbmJpdHMgPSA5O1xuICBzdGF0ZS5kaXN0Y29kZSA9IGRpc3RmaXg7XG4gIHN0YXRlLmRpc3RiaXRzID0gNTtcbn1cblxuXG4vKlxuIFVwZGF0ZSB0aGUgd2luZG93IHdpdGggdGhlIGxhc3Qgd3NpemUgKG5vcm1hbGx5IDMySykgYnl0ZXMgd3JpdHRlbiBiZWZvcmVcbiByZXR1cm5pbmcuICBJZiB3aW5kb3cgZG9lcyBub3QgZXhpc3QgeWV0LCBjcmVhdGUgaXQuICBUaGlzIGlzIG9ubHkgY2FsbGVkXG4gd2hlbiBhIHdpbmRvdyBpcyBhbHJlYWR5IGluIHVzZSwgb3Igd2hlbiBvdXRwdXQgaGFzIGJlZW4gd3JpdHRlbiBkdXJpbmcgdGhpc1xuIGluZmxhdGUgY2FsbCwgYnV0IHRoZSBlbmQgb2YgdGhlIGRlZmxhdGUgc3RyZWFtIGhhcyBub3QgYmVlbiByZWFjaGVkIHlldC5cbiBJdCBpcyBhbHNvIGNhbGxlZCB0byBjcmVhdGUgYSB3aW5kb3cgZm9yIGRpY3Rpb25hcnkgZGF0YSB3aGVuIGEgZGljdGlvbmFyeVxuIGlzIGxvYWRlZC5cblxuIFByb3ZpZGluZyBvdXRwdXQgYnVmZmVycyBsYXJnZXIgdGhhbiAzMksgdG8gaW5mbGF0ZSgpIHNob3VsZCBwcm92aWRlIGEgc3BlZWRcbiBhZHZhbnRhZ2UsIHNpbmNlIG9ubHkgdGhlIGxhc3QgMzJLIG9mIG91dHB1dCBpcyBjb3BpZWQgdG8gdGhlIHNsaWRpbmcgd2luZG93XG4gdXBvbiByZXR1cm4gZnJvbSBpbmZsYXRlKCksIGFuZCBzaW5jZSBhbGwgZGlzdGFuY2VzIGFmdGVyIHRoZSBmaXJzdCAzMksgb2ZcbiBvdXRwdXQgd2lsbCBmYWxsIGluIHRoZSBvdXRwdXQgZGF0YSwgbWFraW5nIG1hdGNoIGNvcGllcyBzaW1wbGVyIGFuZCBmYXN0ZXIuXG4gVGhlIGFkdmFudGFnZSBtYXkgYmUgZGVwZW5kZW50IG9uIHRoZSBzaXplIG9mIHRoZSBwcm9jZXNzb3IncyBkYXRhIGNhY2hlcy5cbiAqL1xuZnVuY3Rpb24gdXBkYXRld2luZG93KHN0cm0sIHNyYywgZW5kLCBjb3B5KSB7XG4gIHZhciBkaXN0O1xuICB2YXIgc3RhdGUgPSBzdHJtLnN0YXRlO1xuXG4gIC8qIGlmIGl0IGhhc24ndCBiZWVuIGRvbmUgYWxyZWFkeSwgYWxsb2NhdGUgc3BhY2UgZm9yIHRoZSB3aW5kb3cgKi9cbiAgaWYgKHN0YXRlLndpbmRvdyA9PT0gbnVsbCkge1xuICAgIHN0YXRlLndzaXplID0gMSA8PCBzdGF0ZS53Yml0cztcbiAgICBzdGF0ZS53bmV4dCA9IDA7XG4gICAgc3RhdGUud2hhdmUgPSAwO1xuXG4gICAgc3RhdGUud2luZG93ID0gbmV3IHV0aWxzLkJ1Zjgoc3RhdGUud3NpemUpO1xuICB9XG5cbiAgLyogY29weSBzdGF0ZS0+d3NpemUgb3IgbGVzcyBvdXRwdXQgYnl0ZXMgaW50byB0aGUgY2lyY3VsYXIgd2luZG93ICovXG4gIGlmIChjb3B5ID49IHN0YXRlLndzaXplKSB7XG4gICAgdXRpbHMuYXJyYXlTZXQoc3RhdGUud2luZG93LCBzcmMsIGVuZCAtIHN0YXRlLndzaXplLCBzdGF0ZS53c2l6ZSwgMCk7XG4gICAgc3RhdGUud25leHQgPSAwO1xuICAgIHN0YXRlLndoYXZlID0gc3RhdGUud3NpemU7XG4gIH1cbiAgZWxzZSB7XG4gICAgZGlzdCA9IHN0YXRlLndzaXplIC0gc3RhdGUud25leHQ7XG4gICAgaWYgKGRpc3QgPiBjb3B5KSB7XG4gICAgICBkaXN0ID0gY29weTtcbiAgICB9XG4gICAgLy96bWVtY3B5KHN0YXRlLT53aW5kb3cgKyBzdGF0ZS0+d25leHQsIGVuZCAtIGNvcHksIGRpc3QpO1xuICAgIHV0aWxzLmFycmF5U2V0KHN0YXRlLndpbmRvdywgc3JjLCBlbmQgLSBjb3B5LCBkaXN0LCBzdGF0ZS53bmV4dCk7XG4gICAgY29weSAtPSBkaXN0O1xuICAgIGlmIChjb3B5KSB7XG4gICAgICAvL3ptZW1jcHkoc3RhdGUtPndpbmRvdywgZW5kIC0gY29weSwgY29weSk7XG4gICAgICB1dGlscy5hcnJheVNldChzdGF0ZS53aW5kb3csIHNyYywgZW5kIC0gY29weSwgY29weSwgMCk7XG4gICAgICBzdGF0ZS53bmV4dCA9IGNvcHk7XG4gICAgICBzdGF0ZS53aGF2ZSA9IHN0YXRlLndzaXplO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHN0YXRlLnduZXh0ICs9IGRpc3Q7XG4gICAgICBpZiAoc3RhdGUud25leHQgPT09IHN0YXRlLndzaXplKSB7IHN0YXRlLnduZXh0ID0gMDsgfVxuICAgICAgaWYgKHN0YXRlLndoYXZlIDwgc3RhdGUud3NpemUpIHsgc3RhdGUud2hhdmUgKz0gZGlzdDsgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gaW5mbGF0ZShzdHJtLCBmbHVzaCkge1xuICB2YXIgc3RhdGU7XG4gIHZhciBpbnB1dCwgb3V0cHV0OyAgICAgICAgICAvLyBpbnB1dC9vdXRwdXQgYnVmZmVyc1xuICB2YXIgbmV4dDsgICAgICAgICAgICAgICAgICAgLyogbmV4dCBpbnB1dCBJTkRFWCAqL1xuICB2YXIgcHV0OyAgICAgICAgICAgICAgICAgICAgLyogbmV4dCBvdXRwdXQgSU5ERVggKi9cbiAgdmFyIGhhdmUsIGxlZnQ7ICAgICAgICAgICAgIC8qIGF2YWlsYWJsZSBpbnB1dCBhbmQgb3V0cHV0ICovXG4gIHZhciBob2xkOyAgICAgICAgICAgICAgICAgICAvKiBiaXQgYnVmZmVyICovXG4gIHZhciBiaXRzOyAgICAgICAgICAgICAgICAgICAvKiBiaXRzIGluIGJpdCBidWZmZXIgKi9cbiAgdmFyIF9pbiwgX291dDsgICAgICAgICAgICAgIC8qIHNhdmUgc3RhcnRpbmcgYXZhaWxhYmxlIGlucHV0IGFuZCBvdXRwdXQgKi9cbiAgdmFyIGNvcHk7ICAgICAgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBzdG9yZWQgb3IgbWF0Y2ggYnl0ZXMgdG8gY29weSAqL1xuICB2YXIgZnJvbTsgICAgICAgICAgICAgICAgICAgLyogd2hlcmUgdG8gY29weSBtYXRjaCBieXRlcyBmcm9tICovXG4gIHZhciBmcm9tX3NvdXJjZTtcbiAgdmFyIGhlcmUgPSAwOyAgICAgICAgICAgICAgIC8qIGN1cnJlbnQgZGVjb2RpbmcgdGFibGUgZW50cnkgKi9cbiAgdmFyIGhlcmVfYml0cywgaGVyZV9vcCwgaGVyZV92YWw7IC8vIHBha2VkIFwiaGVyZVwiIGRlbm9ybWFsaXplZCAoSlMgc3BlY2lmaWMpXG4gIC8vdmFyIGxhc3Q7ICAgICAgICAgICAgICAgICAgIC8qIHBhcmVudCB0YWJsZSBlbnRyeSAqL1xuICB2YXIgbGFzdF9iaXRzLCBsYXN0X29wLCBsYXN0X3ZhbDsgLy8gcGFrZWQgXCJsYXN0XCIgZGVub3JtYWxpemVkIChKUyBzcGVjaWZpYylcbiAgdmFyIGxlbjsgICAgICAgICAgICAgICAgICAgIC8qIGxlbmd0aCB0byBjb3B5IGZvciByZXBlYXRzLCBiaXRzIHRvIGRyb3AgKi9cbiAgdmFyIHJldDsgICAgICAgICAgICAgICAgICAgIC8qIHJldHVybiBjb2RlICovXG4gIHZhciBoYnVmID0gbmV3IHV0aWxzLkJ1ZjgoNCk7ICAgIC8qIGJ1ZmZlciBmb3IgZ3ppcCBoZWFkZXIgY3JjIGNhbGN1bGF0aW9uICovXG4gIHZhciBvcHRzO1xuXG4gIHZhciBuOyAvLyB0ZW1wb3JhcnkgdmFyIGZvciBORUVEX0JJVFNcblxuICB2YXIgb3JkZXIgPSAvKiBwZXJtdXRhdGlvbiBvZiBjb2RlIGxlbmd0aHMgKi9cbiAgICBbIDE2LCAxNywgMTgsIDAsIDgsIDcsIDksIDYsIDEwLCA1LCAxMSwgNCwgMTIsIDMsIDEzLCAyLCAxNCwgMSwgMTUgXTtcblxuXG4gIGlmICghc3RybSB8fCAhc3RybS5zdGF0ZSB8fCAhc3RybS5vdXRwdXQgfHxcbiAgICAgICghc3RybS5pbnB1dCAmJiBzdHJtLmF2YWlsX2luICE9PSAwKSkge1xuICAgIHJldHVybiBaX1NUUkVBTV9FUlJPUjtcbiAgfVxuXG4gIHN0YXRlID0gc3RybS5zdGF0ZTtcbiAgaWYgKHN0YXRlLm1vZGUgPT09IFRZUEUpIHsgc3RhdGUubW9kZSA9IFRZUEVETzsgfSAgICAvKiBza2lwIGNoZWNrICovXG5cblxuICAvLy0tLSBMT0FEKCkgLS0tXG4gIHB1dCA9IHN0cm0ubmV4dF9vdXQ7XG4gIG91dHB1dCA9IHN0cm0ub3V0cHV0O1xuICBsZWZ0ID0gc3RybS5hdmFpbF9vdXQ7XG4gIG5leHQgPSBzdHJtLm5leHRfaW47XG4gIGlucHV0ID0gc3RybS5pbnB1dDtcbiAgaGF2ZSA9IHN0cm0uYXZhaWxfaW47XG4gIGhvbGQgPSBzdGF0ZS5ob2xkO1xuICBiaXRzID0gc3RhdGUuYml0cztcbiAgLy8tLS1cblxuICBfaW4gPSBoYXZlO1xuICBfb3V0ID0gbGVmdDtcbiAgcmV0ID0gWl9PSztcblxuICBpbmZfbGVhdmU6IC8vIGdvdG8gZW11bGF0aW9uXG4gIGZvciAoOzspIHtcbiAgICBzd2l0Y2ggKHN0YXRlLm1vZGUpIHtcbiAgICAgIGNhc2UgSEVBRDpcbiAgICAgICAgaWYgKHN0YXRlLndyYXAgPT09IDApIHtcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gVFlQRURPO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vPT09IE5FRURCSVRTKDE2KTtcbiAgICAgICAgd2hpbGUgKGJpdHMgPCAxNikge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0vL1xuICAgICAgICBpZiAoKHN0YXRlLndyYXAgJiAyKSAmJiBob2xkID09PSAweDhiMWYpIHsgIC8qIGd6aXAgaGVhZGVyICovXG4gICAgICAgICAgc3RhdGUuY2hlY2sgPSAwLypjcmMzMigwTCwgWl9OVUxMLCAwKSovO1xuICAgICAgICAgIC8vPT09IENSQzIoc3RhdGUuY2hlY2ssIGhvbGQpO1xuICAgICAgICAgIGhidWZbMF0gPSBob2xkICYgMHhmZjtcbiAgICAgICAgICBoYnVmWzFdID0gKGhvbGQgPj4+IDgpICYgMHhmZjtcbiAgICAgICAgICBzdGF0ZS5jaGVjayA9IGNyYzMyKHN0YXRlLmNoZWNrLCBoYnVmLCAyLCAwKTtcbiAgICAgICAgICAvLz09PS8vXG5cbiAgICAgICAgICAvLz09PSBJTklUQklUUygpO1xuICAgICAgICAgIGhvbGQgPSAwO1xuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICBzdGF0ZS5tb2RlID0gRkxBR1M7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuZmxhZ3MgPSAwOyAgICAgICAgICAgLyogZXhwZWN0IHpsaWIgaGVhZGVyICovXG4gICAgICAgIGlmIChzdGF0ZS5oZWFkKSB7XG4gICAgICAgICAgc3RhdGUuaGVhZC5kb25lID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCEoc3RhdGUud3JhcCAmIDEpIHx8ICAgLyogY2hlY2sgaWYgemxpYiBoZWFkZXIgYWxsb3dlZCAqL1xuICAgICAgICAgICgoKGhvbGQgJiAweGZmKS8qQklUUyg4KSovIDw8IDgpICsgKGhvbGQgPj4gOCkpICUgMzEpIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICdpbmNvcnJlY3QgaGVhZGVyIGNoZWNrJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoaG9sZCAmIDB4MGYpLypCSVRTKDQpKi8gIT09IFpfREVGTEFURUQpIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICd1bmtub3duIGNvbXByZXNzaW9uIG1ldGhvZCc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLy0tLSBEUk9QQklUUyg0KSAtLS0vL1xuICAgICAgICBob2xkID4+Pj0gNDtcbiAgICAgICAgYml0cyAtPSA0O1xuICAgICAgICAvLy0tLS8vXG4gICAgICAgIGxlbiA9IChob2xkICYgMHgwZikvKkJJVFMoNCkqLyArIDg7XG4gICAgICAgIGlmIChzdGF0ZS53Yml0cyA9PT0gMCkge1xuICAgICAgICAgIHN0YXRlLndiaXRzID0gbGVuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGxlbiA+IHN0YXRlLndiaXRzKSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCB3aW5kb3cgc2l6ZSc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5kbWF4ID0gMSA8PCBsZW47XG4gICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICB6bGliIGhlYWRlciBva1xcblwiKSk7XG4gICAgICAgIHN0cm0uYWRsZXIgPSBzdGF0ZS5jaGVjayA9IDEvKmFkbGVyMzIoMEwsIFpfTlVMTCwgMCkqLztcbiAgICAgICAgc3RhdGUubW9kZSA9IGhvbGQgJiAweDIwMCA/IERJQ1RJRCA6IFRZUEU7XG4gICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgIGhvbGQgPSAwO1xuICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgLy89PT0vL1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgRkxBR1M6XG4gICAgICAgIC8vPT09IE5FRURCSVRTKDE2KTsgKi9cbiAgICAgICAgd2hpbGUgKGJpdHMgPCAxNikge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0vL1xuICAgICAgICBzdGF0ZS5mbGFncyA9IGhvbGQ7XG4gICAgICAgIGlmICgoc3RhdGUuZmxhZ3MgJiAweGZmKSAhPT0gWl9ERUZMQVRFRCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ3Vua25vd24gY29tcHJlc3Npb24gbWV0aG9kJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4ZTAwMCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ3Vua25vd24gaGVhZGVyIGZsYWdzIHNldCc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgIHN0YXRlLmhlYWQudGV4dCA9ICgoaG9sZCA+PiA4KSAmIDEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4MDIwMCkge1xuICAgICAgICAgIC8vPT09IENSQzIoc3RhdGUuY2hlY2ssIGhvbGQpO1xuICAgICAgICAgIGhidWZbMF0gPSBob2xkICYgMHhmZjtcbiAgICAgICAgICBoYnVmWzFdID0gKGhvbGQgPj4+IDgpICYgMHhmZjtcbiAgICAgICAgICBzdGF0ZS5jaGVjayA9IGNyYzMyKHN0YXRlLmNoZWNrLCBoYnVmLCAyLCAwKTtcbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgIH1cbiAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0YXRlLm1vZGUgPSBUSU1FO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIFRJTUU6XG4gICAgICAgIC8vPT09IE5FRURCSVRTKDMyKTsgKi9cbiAgICAgICAgd2hpbGUgKGJpdHMgPCAzMikge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0vL1xuICAgICAgICBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgIHN0YXRlLmhlYWQudGltZSA9IGhvbGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgwMjAwKSB7XG4gICAgICAgICAgLy89PT0gQ1JDNChzdGF0ZS5jaGVjaywgaG9sZClcbiAgICAgICAgICBoYnVmWzBdID0gaG9sZCAmIDB4ZmY7XG4gICAgICAgICAgaGJ1ZlsxXSA9IChob2xkID4+PiA4KSAmIDB4ZmY7XG4gICAgICAgICAgaGJ1ZlsyXSA9IChob2xkID4+PiAxNikgJiAweGZmO1xuICAgICAgICAgIGhidWZbM10gPSAoaG9sZCA+Pj4gMjQpICYgMHhmZjtcbiAgICAgICAgICBzdGF0ZS5jaGVjayA9IGNyYzMyKHN0YXRlLmNoZWNrLCBoYnVmLCA0LCAwKTtcbiAgICAgICAgICAvLz09PVxuICAgICAgICB9XG4gICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgIGhvbGQgPSAwO1xuICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgLy89PT0vL1xuICAgICAgICBzdGF0ZS5tb2RlID0gT1M7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgT1M6XG4gICAgICAgIC8vPT09IE5FRURCSVRTKDE2KTsgKi9cbiAgICAgICAgd2hpbGUgKGJpdHMgPCAxNikge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0vL1xuICAgICAgICBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgIHN0YXRlLmhlYWQueGZsYWdzID0gKGhvbGQgJiAweGZmKTtcbiAgICAgICAgICBzdGF0ZS5oZWFkLm9zID0gKGhvbGQgPj4gOCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgwMjAwKSB7XG4gICAgICAgICAgLy89PT0gQ1JDMihzdGF0ZS5jaGVjaywgaG9sZCk7XG4gICAgICAgICAgaGJ1ZlswXSA9IGhvbGQgJiAweGZmO1xuICAgICAgICAgIGhidWZbMV0gPSAoaG9sZCA+Pj4gOCkgJiAweGZmO1xuICAgICAgICAgIHN0YXRlLmNoZWNrID0gY3JjMzIoc3RhdGUuY2hlY2ssIGhidWYsIDIsIDApO1xuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgfVxuICAgICAgICAvLz09PSBJTklUQklUUygpO1xuICAgICAgICBob2xkID0gMDtcbiAgICAgICAgYml0cyA9IDA7XG4gICAgICAgIC8vPT09Ly9cbiAgICAgICAgc3RhdGUubW9kZSA9IEVYTEVOO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIEVYTEVOOlxuICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDA0MDApIHtcbiAgICAgICAgICAvLz09PSBORUVEQklUUygxNik7ICovXG4gICAgICAgICAgd2hpbGUgKGJpdHMgPCAxNikge1xuICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICAgIHN0YXRlLmxlbmd0aCA9IGhvbGQ7XG4gICAgICAgICAgaWYgKHN0YXRlLmhlYWQpIHtcbiAgICAgICAgICAgIHN0YXRlLmhlYWQuZXh0cmFfbGVuID0gaG9sZDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgwMjAwKSB7XG4gICAgICAgICAgICAvLz09PSBDUkMyKHN0YXRlLmNoZWNrLCBob2xkKTtcbiAgICAgICAgICAgIGhidWZbMF0gPSBob2xkICYgMHhmZjtcbiAgICAgICAgICAgIGhidWZbMV0gPSAoaG9sZCA+Pj4gOCkgJiAweGZmO1xuICAgICAgICAgICAgc3RhdGUuY2hlY2sgPSBjcmMzMihzdGF0ZS5jaGVjaywgaGJ1ZiwgMiwgMCk7XG4gICAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN0YXRlLmhlYWQpIHtcbiAgICAgICAgICBzdGF0ZS5oZWFkLmV4dHJhID0gbnVsbC8qWl9OVUxMKi87XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUubW9kZSA9IEVYVFJBO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIEVYVFJBOlxuICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDA0MDApIHtcbiAgICAgICAgICBjb3B5ID0gc3RhdGUubGVuZ3RoO1xuICAgICAgICAgIGlmIChjb3B5ID4gaGF2ZSkgeyBjb3B5ID0gaGF2ZTsgfVxuICAgICAgICAgIGlmIChjb3B5KSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgICAgICBsZW4gPSBzdGF0ZS5oZWFkLmV4dHJhX2xlbiAtIHN0YXRlLmxlbmd0aDtcbiAgICAgICAgICAgICAgaWYgKCFzdGF0ZS5oZWFkLmV4dHJhKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHVudHlwZWQgYXJyYXkgZm9yIG1vcmUgY29udmVuaWVudCBwcm9jZXNzaW5nIGxhdGVyXG4gICAgICAgICAgICAgICAgc3RhdGUuaGVhZC5leHRyYSA9IG5ldyBBcnJheShzdGF0ZS5oZWFkLmV4dHJhX2xlbik7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdXRpbHMuYXJyYXlTZXQoXG4gICAgICAgICAgICAgICAgc3RhdGUuaGVhZC5leHRyYSxcbiAgICAgICAgICAgICAgICBpbnB1dCxcbiAgICAgICAgICAgICAgICBuZXh0LFxuICAgICAgICAgICAgICAgIC8vIGV4dHJhIGZpZWxkIGlzIGxpbWl0ZWQgdG8gNjU1MzYgYnl0ZXNcbiAgICAgICAgICAgICAgICAvLyAtIG5vIG5lZWQgZm9yIGFkZGl0aW9uYWwgc2l6ZSBjaGVja1xuICAgICAgICAgICAgICAgIGNvcHksXG4gICAgICAgICAgICAgICAgLypsZW4gKyBjb3B5ID4gc3RhdGUuaGVhZC5leHRyYV9tYXggLSBsZW4gPyBzdGF0ZS5oZWFkLmV4dHJhX21heCA6IGNvcHksKi9cbiAgICAgICAgICAgICAgICBsZW5cbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgLy96bWVtY3B5KHN0YXRlLmhlYWQuZXh0cmEgKyBsZW4sIG5leHQsXG4gICAgICAgICAgICAgIC8vICAgICAgICBsZW4gKyBjb3B5ID4gc3RhdGUuaGVhZC5leHRyYV9tYXggP1xuICAgICAgICAgICAgICAvLyAgICAgICAgc3RhdGUuaGVhZC5leHRyYV9tYXggLSBsZW4gOiBjb3B5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4MDIwMCkge1xuICAgICAgICAgICAgICBzdGF0ZS5jaGVjayA9IGNyYzMyKHN0YXRlLmNoZWNrLCBpbnB1dCwgY29weSwgbmV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBoYXZlIC09IGNvcHk7XG4gICAgICAgICAgICBuZXh0ICs9IGNvcHk7XG4gICAgICAgICAgICBzdGF0ZS5sZW5ndGggLT0gY29weTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHN0YXRlLmxlbmd0aCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5sZW5ndGggPSAwO1xuICAgICAgICBzdGF0ZS5tb2RlID0gTkFNRTtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBOQU1FOlxuICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDA4MDApIHtcbiAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICBjb3B5ID0gMDtcbiAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAvLyBUT0RPOiAyIG9yIDEgYnl0ZXM/XG4gICAgICAgICAgICBsZW4gPSBpbnB1dFtuZXh0ICsgY29weSsrXTtcbiAgICAgICAgICAgIC8qIHVzZSBjb25zdGFudCBsaW1pdCBiZWNhdXNlIGluIGpzIHdlIHNob3VsZCBub3QgcHJlYWxsb2NhdGUgbWVtb3J5ICovXG4gICAgICAgICAgICBpZiAoc3RhdGUuaGVhZCAmJiBsZW4gJiZcbiAgICAgICAgICAgICAgICAoc3RhdGUubGVuZ3RoIDwgNjU1MzYgLypzdGF0ZS5oZWFkLm5hbWVfbWF4Ki8pKSB7XG4gICAgICAgICAgICAgIHN0YXRlLmhlYWQubmFtZSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGxlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSB3aGlsZSAobGVuICYmIGNvcHkgPCBoYXZlKTtcblxuICAgICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4MDIwMCkge1xuICAgICAgICAgICAgc3RhdGUuY2hlY2sgPSBjcmMzMihzdGF0ZS5jaGVjaywgaW5wdXQsIGNvcHksIG5leHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBoYXZlIC09IGNvcHk7XG4gICAgICAgICAgbmV4dCArPSBjb3B5O1xuICAgICAgICAgIGlmIChsZW4pIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgIHN0YXRlLmhlYWQubmFtZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUubGVuZ3RoID0gMDtcbiAgICAgICAgc3RhdGUubW9kZSA9IENPTU1FTlQ7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgQ09NTUVOVDpcbiAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgxMDAwKSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgY29weSA9IDA7XG4gICAgICAgICAgZG8ge1xuICAgICAgICAgICAgbGVuID0gaW5wdXRbbmV4dCArIGNvcHkrK107XG4gICAgICAgICAgICAvKiB1c2UgY29uc3RhbnQgbGltaXQgYmVjYXVzZSBpbiBqcyB3ZSBzaG91bGQgbm90IHByZWFsbG9jYXRlIG1lbW9yeSAqL1xuICAgICAgICAgICAgaWYgKHN0YXRlLmhlYWQgJiYgbGVuICYmXG4gICAgICAgICAgICAgICAgKHN0YXRlLmxlbmd0aCA8IDY1NTM2IC8qc3RhdGUuaGVhZC5jb21tX21heCovKSkge1xuICAgICAgICAgICAgICBzdGF0ZS5oZWFkLmNvbW1lbnQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShsZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gd2hpbGUgKGxlbiAmJiBjb3B5IDwgaGF2ZSk7XG4gICAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgwMjAwKSB7XG4gICAgICAgICAgICBzdGF0ZS5jaGVjayA9IGNyYzMyKHN0YXRlLmNoZWNrLCBpbnB1dCwgY29weSwgbmV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGhhdmUgLT0gY29weTtcbiAgICAgICAgICBuZXh0ICs9IGNvcHk7XG4gICAgICAgICAgaWYgKGxlbikgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdGF0ZS5oZWFkKSB7XG4gICAgICAgICAgc3RhdGUuaGVhZC5jb21tZW50ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5tb2RlID0gSENSQztcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBIQ1JDOlxuICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDAyMDApIHtcbiAgICAgICAgICAvLz09PSBORUVEQklUUygxNik7ICovXG4gICAgICAgICAgd2hpbGUgKGJpdHMgPCAxNikge1xuICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICAgIGlmIChob2xkICE9PSAoc3RhdGUuY2hlY2sgJiAweGZmZmYpKSB7XG4gICAgICAgICAgICBzdHJtLm1zZyA9ICdoZWFkZXIgY3JjIG1pc21hdGNoJztcbiAgICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgICBob2xkID0gMDtcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRlLmhlYWQpIHtcbiAgICAgICAgICBzdGF0ZS5oZWFkLmhjcmMgPSAoKHN0YXRlLmZsYWdzID4+IDkpICYgMSk7XG4gICAgICAgICAgc3RhdGUuaGVhZC5kb25lID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBzdHJtLmFkbGVyID0gc3RhdGUuY2hlY2sgPSAwO1xuICAgICAgICBzdGF0ZS5tb2RlID0gVFlQRTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIERJQ1RJRDpcbiAgICAgICAgLy89PT0gTkVFREJJVFMoMzIpOyAqL1xuICAgICAgICB3aGlsZSAoYml0cyA8IDMyKSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0cm0uYWRsZXIgPSBzdGF0ZS5jaGVjayA9IHpzd2FwMzIoaG9sZCk7XG4gICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgIGhvbGQgPSAwO1xuICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgLy89PT0vL1xuICAgICAgICBzdGF0ZS5tb2RlID0gRElDVDtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBESUNUOlxuICAgICAgICBpZiAoc3RhdGUuaGF2ZWRpY3QgPT09IDApIHtcbiAgICAgICAgICAvLy0tLSBSRVNUT1JFKCkgLS0tXG4gICAgICAgICAgc3RybS5uZXh0X291dCA9IHB1dDtcbiAgICAgICAgICBzdHJtLmF2YWlsX291dCA9IGxlZnQ7XG4gICAgICAgICAgc3RybS5uZXh0X2luID0gbmV4dDtcbiAgICAgICAgICBzdHJtLmF2YWlsX2luID0gaGF2ZTtcbiAgICAgICAgICBzdGF0ZS5ob2xkID0gaG9sZDtcbiAgICAgICAgICBzdGF0ZS5iaXRzID0gYml0cztcbiAgICAgICAgICAvLy0tLVxuICAgICAgICAgIHJldHVybiBaX05FRURfRElDVDtcbiAgICAgICAgfVxuICAgICAgICBzdHJtLmFkbGVyID0gc3RhdGUuY2hlY2sgPSAxLyphZGxlcjMyKDBMLCBaX05VTEwsIDApKi87XG4gICAgICAgIHN0YXRlLm1vZGUgPSBUWVBFO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIFRZUEU6XG4gICAgICAgIGlmIChmbHVzaCA9PT0gWl9CTE9DSyB8fCBmbHVzaCA9PT0gWl9UUkVFUykgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBUWVBFRE86XG4gICAgICAgIGlmIChzdGF0ZS5sYXN0KSB7XG4gICAgICAgICAgLy8tLS0gQllURUJJVFMoKSAtLS0vL1xuICAgICAgICAgIGhvbGQgPj4+PSBiaXRzICYgNztcbiAgICAgICAgICBiaXRzIC09IGJpdHMgJiA3O1xuICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQ0hFQ0s7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0gTkVFREJJVFMoMyk7ICovXG4gICAgICAgIHdoaWxlIChiaXRzIDwgMykge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0vL1xuICAgICAgICBzdGF0ZS5sYXN0ID0gKGhvbGQgJiAweDAxKS8qQklUUygxKSovO1xuICAgICAgICAvLy0tLSBEUk9QQklUUygxKSAtLS0vL1xuICAgICAgICBob2xkID4+Pj0gMTtcbiAgICAgICAgYml0cyAtPSAxO1xuICAgICAgICAvLy0tLS8vXG5cbiAgICAgICAgc3dpdGNoICgoaG9sZCAmIDB4MDMpLypCSVRTKDIpKi8pIHtcbiAgICAgICAgICBjYXNlIDA6ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBzdG9yZWQgYmxvY2sgKi9cbiAgICAgICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgIHN0b3JlZCBibG9jayVzXFxuXCIsXG4gICAgICAgICAgICAvLyAgICAgICAgc3RhdGUubGFzdCA/IFwiIChsYXN0KVwiIDogXCJcIikpO1xuICAgICAgICAgICAgc3RhdGUubW9kZSA9IFNUT1JFRDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgMTogICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGZpeGVkIGJsb2NrICovXG4gICAgICAgICAgICBmaXhlZHRhYmxlcyhzdGF0ZSk7XG4gICAgICAgICAgICAvL1RyYWNldigoc3RkZXJyLCBcImluZmxhdGU6ICAgICBmaXhlZCBjb2RlcyBibG9jayVzXFxuXCIsXG4gICAgICAgICAgICAvLyAgICAgICAgc3RhdGUubGFzdCA/IFwiIChsYXN0KVwiIDogXCJcIikpO1xuICAgICAgICAgICAgc3RhdGUubW9kZSA9IExFTl87ICAgICAgICAgICAgIC8qIGRlY29kZSBjb2RlcyAqL1xuICAgICAgICAgICAgaWYgKGZsdXNoID09PSBaX1RSRUVTKSB7XG4gICAgICAgICAgICAgIC8vLS0tIERST1BCSVRTKDIpIC0tLS8vXG4gICAgICAgICAgICAgIGhvbGQgPj4+PSAyO1xuICAgICAgICAgICAgICBiaXRzIC09IDI7XG4gICAgICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICAgICAgYnJlYWsgaW5mX2xlYXZlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAyOiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZHluYW1pYyBibG9jayAqL1xuICAgICAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgZHluYW1pYyBjb2RlcyBibG9jayVzXFxuXCIsXG4gICAgICAgICAgICAvLyAgICAgICAgc3RhdGUubGFzdCA/IFwiIChsYXN0KVwiIDogXCJcIikpO1xuICAgICAgICAgICAgc3RhdGUubW9kZSA9IFRBQkxFO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCBibG9jayB0eXBlJztcbiAgICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgIH1cbiAgICAgICAgLy8tLS0gRFJPUEJJVFMoMikgLS0tLy9cbiAgICAgICAgaG9sZCA+Pj49IDI7XG4gICAgICAgIGJpdHMgLT0gMjtcbiAgICAgICAgLy8tLS0vL1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgU1RPUkVEOlxuICAgICAgICAvLy0tLSBCWVRFQklUUygpIC0tLS8vIC8qIGdvIHRvIGJ5dGUgYm91bmRhcnkgKi9cbiAgICAgICAgaG9sZCA+Pj49IGJpdHMgJiA3O1xuICAgICAgICBiaXRzIC09IGJpdHMgJiA3O1xuICAgICAgICAvLy0tLS8vXG4gICAgICAgIC8vPT09IE5FRURCSVRTKDMyKTsgKi9cbiAgICAgICAgd2hpbGUgKGJpdHMgPCAzMikge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0vL1xuICAgICAgICBpZiAoKGhvbGQgJiAweGZmZmYpICE9PSAoKGhvbGQgPj4+IDE2KSBeIDB4ZmZmZikpIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIHN0b3JlZCBibG9jayBsZW5ndGhzJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmxlbmd0aCA9IGhvbGQgJiAweGZmZmY7XG4gICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgc3RvcmVkIGxlbmd0aCAldVxcblwiLFxuICAgICAgICAvLyAgICAgICAgc3RhdGUubGVuZ3RoKSk7XG4gICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgIGhvbGQgPSAwO1xuICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgLy89PT0vL1xuICAgICAgICBzdGF0ZS5tb2RlID0gQ09QWV87XG4gICAgICAgIGlmIChmbHVzaCA9PT0gWl9UUkVFUykgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBDT1BZXzpcbiAgICAgICAgc3RhdGUubW9kZSA9IENPUFk7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgQ09QWTpcbiAgICAgICAgY29weSA9IHN0YXRlLmxlbmd0aDtcbiAgICAgICAgaWYgKGNvcHkpIHtcbiAgICAgICAgICBpZiAoY29weSA+IGhhdmUpIHsgY29weSA9IGhhdmU7IH1cbiAgICAgICAgICBpZiAoY29weSA+IGxlZnQpIHsgY29weSA9IGxlZnQ7IH1cbiAgICAgICAgICBpZiAoY29weSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAvLy0tLSB6bWVtY3B5KHB1dCwgbmV4dCwgY29weSk7IC0tLVxuICAgICAgICAgIHV0aWxzLmFycmF5U2V0KG91dHB1dCwgaW5wdXQsIG5leHQsIGNvcHksIHB1dCk7XG4gICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgIGhhdmUgLT0gY29weTtcbiAgICAgICAgICBuZXh0ICs9IGNvcHk7XG4gICAgICAgICAgbGVmdCAtPSBjb3B5O1xuICAgICAgICAgIHB1dCArPSBjb3B5O1xuICAgICAgICAgIHN0YXRlLmxlbmd0aCAtPSBjb3B5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgc3RvcmVkIGVuZFxcblwiKSk7XG4gICAgICAgIHN0YXRlLm1vZGUgPSBUWVBFO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVEFCTEU6XG4gICAgICAgIC8vPT09IE5FRURCSVRTKDE0KTsgKi9cbiAgICAgICAgd2hpbGUgKGJpdHMgPCAxNCkge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0vL1xuICAgICAgICBzdGF0ZS5ubGVuID0gKGhvbGQgJiAweDFmKS8qQklUUyg1KSovICsgMjU3O1xuICAgICAgICAvLy0tLSBEUk9QQklUUyg1KSAtLS0vL1xuICAgICAgICBob2xkID4+Pj0gNTtcbiAgICAgICAgYml0cyAtPSA1O1xuICAgICAgICAvLy0tLS8vXG4gICAgICAgIHN0YXRlLm5kaXN0ID0gKGhvbGQgJiAweDFmKS8qQklUUyg1KSovICsgMTtcbiAgICAgICAgLy8tLS0gRFJPUEJJVFMoNSkgLS0tLy9cbiAgICAgICAgaG9sZCA+Pj49IDU7XG4gICAgICAgIGJpdHMgLT0gNTtcbiAgICAgICAgLy8tLS0vL1xuICAgICAgICBzdGF0ZS5uY29kZSA9IChob2xkICYgMHgwZikvKkJJVFMoNCkqLyArIDQ7XG4gICAgICAgIC8vLS0tIERST1BCSVRTKDQpIC0tLS8vXG4gICAgICAgIGhvbGQgPj4+PSA0O1xuICAgICAgICBiaXRzIC09IDQ7XG4gICAgICAgIC8vLS0tLy9cbi8vI2lmbmRlZiBQS1pJUF9CVUdfV09SS0FST1VORFxuICAgICAgICBpZiAoc3RhdGUubmxlbiA+IDI4NiB8fCBzdGF0ZS5uZGlzdCA+IDMwKSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAndG9vIG1hbnkgbGVuZ3RoIG9yIGRpc3RhbmNlIHN5bWJvbHMnO1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbi8vI2VuZGlmXG4gICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgdGFibGUgc2l6ZXMgb2tcXG5cIikpO1xuICAgICAgICBzdGF0ZS5oYXZlID0gMDtcbiAgICAgICAgc3RhdGUubW9kZSA9IExFTkxFTlM7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgTEVOTEVOUzpcbiAgICAgICAgd2hpbGUgKHN0YXRlLmhhdmUgPCBzdGF0ZS5uY29kZSkge1xuICAgICAgICAgIC8vPT09IE5FRURCSVRTKDMpO1xuICAgICAgICAgIHdoaWxlIChiaXRzIDwgMykge1xuICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICAgIHN0YXRlLmxlbnNbb3JkZXJbc3RhdGUuaGF2ZSsrXV0gPSAoaG9sZCAmIDB4MDcpOy8vQklUUygzKTtcbiAgICAgICAgICAvLy0tLSBEUk9QQklUUygzKSAtLS0vL1xuICAgICAgICAgIGhvbGQgPj4+PSAzO1xuICAgICAgICAgIGJpdHMgLT0gMztcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHN0YXRlLmhhdmUgPCAxOSkge1xuICAgICAgICAgIHN0YXRlLmxlbnNbb3JkZXJbc3RhdGUuaGF2ZSsrXV0gPSAwO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlIGhhdmUgc2VwYXJhdGUgdGFibGVzICYgbm8gcG9pbnRlcnMuIDIgY29tbWVudGVkIGxpbmVzIGJlbG93IG5vdCBuZWVkZWQuXG4gICAgICAgIC8vc3RhdGUubmV4dCA9IHN0YXRlLmNvZGVzO1xuICAgICAgICAvL3N0YXRlLmxlbmNvZGUgPSBzdGF0ZS5uZXh0O1xuICAgICAgICAvLyBTd2l0Y2ggdG8gdXNlIGR5bmFtaWMgdGFibGVcbiAgICAgICAgc3RhdGUubGVuY29kZSA9IHN0YXRlLmxlbmR5bjtcbiAgICAgICAgc3RhdGUubGVuYml0cyA9IDc7XG5cbiAgICAgICAgb3B0cyA9IHsgYml0czogc3RhdGUubGVuYml0cyB9O1xuICAgICAgICByZXQgPSBpbmZsYXRlX3RhYmxlKENPREVTLCBzdGF0ZS5sZW5zLCAwLCAxOSwgc3RhdGUubGVuY29kZSwgMCwgc3RhdGUud29yaywgb3B0cyk7XG4gICAgICAgIHN0YXRlLmxlbmJpdHMgPSBvcHRzLmJpdHM7XG5cbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgY29kZSBsZW5ndGhzIHNldCc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvL1RyYWNldigoc3RkZXJyLCBcImluZmxhdGU6ICAgICAgIGNvZGUgbGVuZ3RocyBva1xcblwiKSk7XG4gICAgICAgIHN0YXRlLmhhdmUgPSAwO1xuICAgICAgICBzdGF0ZS5tb2RlID0gQ09ERUxFTlM7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgQ09ERUxFTlM6XG4gICAgICAgIHdoaWxlIChzdGF0ZS5oYXZlIDwgc3RhdGUubmxlbiArIHN0YXRlLm5kaXN0KSB7XG4gICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgaGVyZSA9IHN0YXRlLmxlbmNvZGVbaG9sZCAmICgoMSA8PCBzdGF0ZS5sZW5iaXRzKSAtIDEpXTsvKkJJVFMoc3RhdGUubGVuYml0cykqL1xuICAgICAgICAgICAgaGVyZV9iaXRzID0gaGVyZSA+Pj4gMjQ7XG4gICAgICAgICAgICBoZXJlX29wID0gKGhlcmUgPj4+IDE2KSAmIDB4ZmY7XG4gICAgICAgICAgICBoZXJlX3ZhbCA9IGhlcmUgJiAweGZmZmY7XG5cbiAgICAgICAgICAgIGlmICgoaGVyZV9iaXRzKSA8PSBiaXRzKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICAvLy0tLSBQVUxMQllURSgpIC0tLS8vXG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGVyZV92YWwgPCAxNikge1xuICAgICAgICAgICAgLy8tLS0gRFJPUEJJVFMoaGVyZS5iaXRzKSAtLS0vL1xuICAgICAgICAgICAgaG9sZCA+Pj49IGhlcmVfYml0cztcbiAgICAgICAgICAgIGJpdHMgLT0gaGVyZV9iaXRzO1xuICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgICAgc3RhdGUubGVuc1tzdGF0ZS5oYXZlKytdID0gaGVyZV92YWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKGhlcmVfdmFsID09PSAxNikge1xuICAgICAgICAgICAgICAvLz09PSBORUVEQklUUyhoZXJlLmJpdHMgKyAyKTtcbiAgICAgICAgICAgICAgbiA9IGhlcmVfYml0cyArIDI7XG4gICAgICAgICAgICAgIHdoaWxlIChiaXRzIDwgbikge1xuICAgICAgICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy89PT0vL1xuICAgICAgICAgICAgICAvLy0tLSBEUk9QQklUUyhoZXJlLmJpdHMpIC0tLS8vXG4gICAgICAgICAgICAgIGhvbGQgPj4+PSBoZXJlX2JpdHM7XG4gICAgICAgICAgICAgIGJpdHMgLT0gaGVyZV9iaXRzO1xuICAgICAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgICAgIGlmIChzdGF0ZS5oYXZlID09PSAwKSB7XG4gICAgICAgICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCBiaXQgbGVuZ3RoIHJlcGVhdCc7XG4gICAgICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBsZW4gPSBzdGF0ZS5sZW5zW3N0YXRlLmhhdmUgLSAxXTtcbiAgICAgICAgICAgICAgY29weSA9IDMgKyAoaG9sZCAmIDB4MDMpOy8vQklUUygyKTtcbiAgICAgICAgICAgICAgLy8tLS0gRFJPUEJJVFMoMikgLS0tLy9cbiAgICAgICAgICAgICAgaG9sZCA+Pj49IDI7XG4gICAgICAgICAgICAgIGJpdHMgLT0gMjtcbiAgICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVyZV92YWwgPT09IDE3KSB7XG4gICAgICAgICAgICAgIC8vPT09IE5FRURCSVRTKGhlcmUuYml0cyArIDMpO1xuICAgICAgICAgICAgICBuID0gaGVyZV9iaXRzICsgMztcbiAgICAgICAgICAgICAgd2hpbGUgKGJpdHMgPCBuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgICAgIC8vLS0tIERST1BCSVRTKGhlcmUuYml0cykgLS0tLy9cbiAgICAgICAgICAgICAgaG9sZCA+Pj49IGhlcmVfYml0cztcbiAgICAgICAgICAgICAgYml0cyAtPSBoZXJlX2JpdHM7XG4gICAgICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICAgICAgbGVuID0gMDtcbiAgICAgICAgICAgICAgY29weSA9IDMgKyAoaG9sZCAmIDB4MDcpOy8vQklUUygzKTtcbiAgICAgICAgICAgICAgLy8tLS0gRFJPUEJJVFMoMykgLS0tLy9cbiAgICAgICAgICAgICAgaG9sZCA+Pj49IDM7XG4gICAgICAgICAgICAgIGJpdHMgLT0gMztcbiAgICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIC8vPT09IE5FRURCSVRTKGhlcmUuYml0cyArIDcpO1xuICAgICAgICAgICAgICBuID0gaGVyZV9iaXRzICsgNztcbiAgICAgICAgICAgICAgd2hpbGUgKGJpdHMgPCBuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgICAgIC8vLS0tIERST1BCSVRTKGhlcmUuYml0cykgLS0tLy9cbiAgICAgICAgICAgICAgaG9sZCA+Pj49IGhlcmVfYml0cztcbiAgICAgICAgICAgICAgYml0cyAtPSBoZXJlX2JpdHM7XG4gICAgICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICAgICAgbGVuID0gMDtcbiAgICAgICAgICAgICAgY29weSA9IDExICsgKGhvbGQgJiAweDdmKTsvL0JJVFMoNyk7XG4gICAgICAgICAgICAgIC8vLS0tIERST1BCSVRTKDcpIC0tLS8vXG4gICAgICAgICAgICAgIGhvbGQgPj4+PSA3O1xuICAgICAgICAgICAgICBiaXRzIC09IDc7XG4gICAgICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGF0ZS5oYXZlICsgY29weSA+IHN0YXRlLm5sZW4gKyBzdGF0ZS5uZGlzdCkge1xuICAgICAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGJpdCBsZW5ndGggcmVwZWF0JztcbiAgICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAoY29weS0tKSB7XG4gICAgICAgICAgICAgIHN0YXRlLmxlbnNbc3RhdGUuaGF2ZSsrXSA9IGxlbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvKiBoYW5kbGUgZXJyb3IgYnJlYWtzIGluIHdoaWxlICovXG4gICAgICAgIGlmIChzdGF0ZS5tb2RlID09PSBCQUQpIHsgYnJlYWs7IH1cblxuICAgICAgICAvKiBjaGVjayBmb3IgZW5kLW9mLWJsb2NrIGNvZGUgKGJldHRlciBoYXZlIG9uZSkgKi9cbiAgICAgICAgaWYgKHN0YXRlLmxlbnNbMjU2XSA9PT0gMCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgY29kZSAtLSBtaXNzaW5nIGVuZC1vZi1ibG9jayc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIGJ1aWxkIGNvZGUgdGFibGVzIC0tIG5vdGU6IGRvIG5vdCBjaGFuZ2UgdGhlIGxlbmJpdHMgb3IgZGlzdGJpdHNcbiAgICAgICAgICAgdmFsdWVzIGhlcmUgKDkgYW5kIDYpIHdpdGhvdXQgcmVhZGluZyB0aGUgY29tbWVudHMgaW4gaW5mdHJlZXMuaFxuICAgICAgICAgICBjb25jZXJuaW5nIHRoZSBFTk9VR0ggY29uc3RhbnRzLCB3aGljaCBkZXBlbmQgb24gdGhvc2UgdmFsdWVzICovXG4gICAgICAgIHN0YXRlLmxlbmJpdHMgPSA5O1xuXG4gICAgICAgIG9wdHMgPSB7IGJpdHM6IHN0YXRlLmxlbmJpdHMgfTtcbiAgICAgICAgcmV0ID0gaW5mbGF0ZV90YWJsZShMRU5TLCBzdGF0ZS5sZW5zLCAwLCBzdGF0ZS5ubGVuLCBzdGF0ZS5sZW5jb2RlLCAwLCBzdGF0ZS53b3JrLCBvcHRzKTtcbiAgICAgICAgLy8gV2UgaGF2ZSBzZXBhcmF0ZSB0YWJsZXMgJiBubyBwb2ludGVycy4gMiBjb21tZW50ZWQgbGluZXMgYmVsb3cgbm90IG5lZWRlZC5cbiAgICAgICAgLy8gc3RhdGUubmV4dF9pbmRleCA9IG9wdHMudGFibGVfaW5kZXg7XG4gICAgICAgIHN0YXRlLmxlbmJpdHMgPSBvcHRzLmJpdHM7XG4gICAgICAgIC8vIHN0YXRlLmxlbmNvZGUgPSBzdGF0ZS5uZXh0O1xuXG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGxpdGVyYWwvbGVuZ3RocyBzZXQnO1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5kaXN0Yml0cyA9IDY7XG4gICAgICAgIC8vc3RhdGUuZGlzdGNvZGUuY29weShzdGF0ZS5jb2Rlcyk7XG4gICAgICAgIC8vIFN3aXRjaCB0byB1c2UgZHluYW1pYyB0YWJsZVxuICAgICAgICBzdGF0ZS5kaXN0Y29kZSA9IHN0YXRlLmRpc3RkeW47XG4gICAgICAgIG9wdHMgPSB7IGJpdHM6IHN0YXRlLmRpc3RiaXRzIH07XG4gICAgICAgIHJldCA9IGluZmxhdGVfdGFibGUoRElTVFMsIHN0YXRlLmxlbnMsIHN0YXRlLm5sZW4sIHN0YXRlLm5kaXN0LCBzdGF0ZS5kaXN0Y29kZSwgMCwgc3RhdGUud29yaywgb3B0cyk7XG4gICAgICAgIC8vIFdlIGhhdmUgc2VwYXJhdGUgdGFibGVzICYgbm8gcG9pbnRlcnMuIDIgY29tbWVudGVkIGxpbmVzIGJlbG93IG5vdCBuZWVkZWQuXG4gICAgICAgIC8vIHN0YXRlLm5leHRfaW5kZXggPSBvcHRzLnRhYmxlX2luZGV4O1xuICAgICAgICBzdGF0ZS5kaXN0Yml0cyA9IG9wdHMuYml0cztcbiAgICAgICAgLy8gc3RhdGUuZGlzdGNvZGUgPSBzdGF0ZS5uZXh0O1xuXG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGRpc3RhbmNlcyBzZXQnO1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgJ2luZmxhdGU6ICAgICAgIGNvZGVzIG9rXFxuJykpO1xuICAgICAgICBzdGF0ZS5tb2RlID0gTEVOXztcbiAgICAgICAgaWYgKGZsdXNoID09PSBaX1RSRUVTKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIExFTl86XG4gICAgICAgIHN0YXRlLm1vZGUgPSBMRU47XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgTEVOOlxuICAgICAgICBpZiAoaGF2ZSA+PSA2ICYmIGxlZnQgPj0gMjU4KSB7XG4gICAgICAgICAgLy8tLS0gUkVTVE9SRSgpIC0tLVxuICAgICAgICAgIHN0cm0ubmV4dF9vdXQgPSBwdXQ7XG4gICAgICAgICAgc3RybS5hdmFpbF9vdXQgPSBsZWZ0O1xuICAgICAgICAgIHN0cm0ubmV4dF9pbiA9IG5leHQ7XG4gICAgICAgICAgc3RybS5hdmFpbF9pbiA9IGhhdmU7XG4gICAgICAgICAgc3RhdGUuaG9sZCA9IGhvbGQ7XG4gICAgICAgICAgc3RhdGUuYml0cyA9IGJpdHM7XG4gICAgICAgICAgLy8tLS1cbiAgICAgICAgICBpbmZsYXRlX2Zhc3Qoc3RybSwgX291dCk7XG4gICAgICAgICAgLy8tLS0gTE9BRCgpIC0tLVxuICAgICAgICAgIHB1dCA9IHN0cm0ubmV4dF9vdXQ7XG4gICAgICAgICAgb3V0cHV0ID0gc3RybS5vdXRwdXQ7XG4gICAgICAgICAgbGVmdCA9IHN0cm0uYXZhaWxfb3V0O1xuICAgICAgICAgIG5leHQgPSBzdHJtLm5leHRfaW47XG4gICAgICAgICAgaW5wdXQgPSBzdHJtLmlucHV0O1xuICAgICAgICAgIGhhdmUgPSBzdHJtLmF2YWlsX2luO1xuICAgICAgICAgIGhvbGQgPSBzdGF0ZS5ob2xkO1xuICAgICAgICAgIGJpdHMgPSBzdGF0ZS5iaXRzO1xuICAgICAgICAgIC8vLS0tXG5cbiAgICAgICAgICBpZiAoc3RhdGUubW9kZSA9PT0gVFlQRSkge1xuICAgICAgICAgICAgc3RhdGUuYmFjayA9IC0xO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5iYWNrID0gMDtcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgIGhlcmUgPSBzdGF0ZS5sZW5jb2RlW2hvbGQgJiAoKDEgPDwgc3RhdGUubGVuYml0cykgLSAxKV07ICAvKkJJVFMoc3RhdGUubGVuYml0cykqL1xuICAgICAgICAgIGhlcmVfYml0cyA9IGhlcmUgPj4+IDI0O1xuICAgICAgICAgIGhlcmVfb3AgPSAoaGVyZSA+Pj4gMTYpICYgMHhmZjtcbiAgICAgICAgICBoZXJlX3ZhbCA9IGhlcmUgJiAweGZmZmY7XG5cbiAgICAgICAgICBpZiAoaGVyZV9iaXRzIDw9IGJpdHMpIHsgYnJlYWs7IH1cbiAgICAgICAgICAvLy0tLSBQVUxMQllURSgpIC0tLS8vXG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlcmVfb3AgJiYgKGhlcmVfb3AgJiAweGYwKSA9PT0gMCkge1xuICAgICAgICAgIGxhc3RfYml0cyA9IGhlcmVfYml0cztcbiAgICAgICAgICBsYXN0X29wID0gaGVyZV9vcDtcbiAgICAgICAgICBsYXN0X3ZhbCA9IGhlcmVfdmFsO1xuICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGhlcmUgPSBzdGF0ZS5sZW5jb2RlW2xhc3RfdmFsICtcbiAgICAgICAgICAgICAgICAgICAgKChob2xkICYgKCgxIDw8IChsYXN0X2JpdHMgKyBsYXN0X29wKSkgLSAxKSkvKkJJVFMobGFzdC5iaXRzICsgbGFzdC5vcCkqLyA+PiBsYXN0X2JpdHMpXTtcbiAgICAgICAgICAgIGhlcmVfYml0cyA9IGhlcmUgPj4+IDI0O1xuICAgICAgICAgICAgaGVyZV9vcCA9IChoZXJlID4+PiAxNikgJiAweGZmO1xuICAgICAgICAgICAgaGVyZV92YWwgPSBoZXJlICYgMHhmZmZmO1xuXG4gICAgICAgICAgICBpZiAoKGxhc3RfYml0cyArIGhlcmVfYml0cykgPD0gYml0cykgeyBicmVhazsgfVxuICAgICAgICAgICAgLy8tLS0gUFVMTEJZVEUoKSAtLS0vL1xuICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8tLS0gRFJPUEJJVFMobGFzdC5iaXRzKSAtLS0vL1xuICAgICAgICAgIGhvbGQgPj4+PSBsYXN0X2JpdHM7XG4gICAgICAgICAgYml0cyAtPSBsYXN0X2JpdHM7XG4gICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgIHN0YXRlLmJhY2sgKz0gbGFzdF9iaXRzO1xuICAgICAgICB9XG4gICAgICAgIC8vLS0tIERST1BCSVRTKGhlcmUuYml0cykgLS0tLy9cbiAgICAgICAgaG9sZCA+Pj49IGhlcmVfYml0cztcbiAgICAgICAgYml0cyAtPSBoZXJlX2JpdHM7XG4gICAgICAgIC8vLS0tLy9cbiAgICAgICAgc3RhdGUuYmFjayArPSBoZXJlX2JpdHM7XG4gICAgICAgIHN0YXRlLmxlbmd0aCA9IGhlcmVfdmFsO1xuICAgICAgICBpZiAoaGVyZV9vcCA9PT0gMCkge1xuICAgICAgICAgIC8vVHJhY2V2digoc3RkZXJyLCBoZXJlLnZhbCA+PSAweDIwICYmIGhlcmUudmFsIDwgMHg3ZiA/XG4gICAgICAgICAgLy8gICAgICAgIFwiaW5mbGF0ZTogICAgICAgICBsaXRlcmFsICclYydcXG5cIiA6XG4gICAgICAgICAgLy8gICAgICAgIFwiaW5mbGF0ZTogICAgICAgICBsaXRlcmFsIDB4JTAyeFxcblwiLCBoZXJlLnZhbCkpO1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBMSVQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlcmVfb3AgJiAzMikge1xuICAgICAgICAgIC8vVHJhY2V2digoc3RkZXJyLCBcImluZmxhdGU6ICAgICAgICAgZW5kIG9mIGJsb2NrXFxuXCIpKTtcbiAgICAgICAgICBzdGF0ZS5iYWNrID0gLTE7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IFRZUEU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlcmVfb3AgJiA2NCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgbGl0ZXJhbC9sZW5ndGggY29kZSc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5leHRyYSA9IGhlcmVfb3AgJiAxNTtcbiAgICAgICAgc3RhdGUubW9kZSA9IExFTkVYVDtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBMRU5FWFQ6XG4gICAgICAgIGlmIChzdGF0ZS5leHRyYSkge1xuICAgICAgICAgIC8vPT09IE5FRURCSVRTKHN0YXRlLmV4dHJhKTtcbiAgICAgICAgICBuID0gc3RhdGUuZXh0cmE7XG4gICAgICAgICAgd2hpbGUgKGJpdHMgPCBuKSB7XG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgc3RhdGUubGVuZ3RoICs9IGhvbGQgJiAoKDEgPDwgc3RhdGUuZXh0cmEpIC0gMSkvKkJJVFMoc3RhdGUuZXh0cmEpKi87XG4gICAgICAgICAgLy8tLS0gRFJPUEJJVFMoc3RhdGUuZXh0cmEpIC0tLS8vXG4gICAgICAgICAgaG9sZCA+Pj49IHN0YXRlLmV4dHJhO1xuICAgICAgICAgIGJpdHMgLT0gc3RhdGUuZXh0cmE7XG4gICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgIHN0YXRlLmJhY2sgKz0gc3RhdGUuZXh0cmE7XG4gICAgICAgIH1cbiAgICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgICBsZW5ndGggJXVcXG5cIiwgc3RhdGUubGVuZ3RoKSk7XG4gICAgICAgIHN0YXRlLndhcyA9IHN0YXRlLmxlbmd0aDtcbiAgICAgICAgc3RhdGUubW9kZSA9IERJU1Q7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgRElTVDpcbiAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgIGhlcmUgPSBzdGF0ZS5kaXN0Y29kZVtob2xkICYgKCgxIDw8IHN0YXRlLmRpc3RiaXRzKSAtIDEpXTsvKkJJVFMoc3RhdGUuZGlzdGJpdHMpKi9cbiAgICAgICAgICBoZXJlX2JpdHMgPSBoZXJlID4+PiAyNDtcbiAgICAgICAgICBoZXJlX29wID0gKGhlcmUgPj4+IDE2KSAmIDB4ZmY7XG4gICAgICAgICAgaGVyZV92YWwgPSBoZXJlICYgMHhmZmZmO1xuXG4gICAgICAgICAgaWYgKChoZXJlX2JpdHMpIDw9IGJpdHMpIHsgYnJlYWs7IH1cbiAgICAgICAgICAvLy0tLSBQVUxMQllURSgpIC0tLS8vXG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgIH1cbiAgICAgICAgaWYgKChoZXJlX29wICYgMHhmMCkgPT09IDApIHtcbiAgICAgICAgICBsYXN0X2JpdHMgPSBoZXJlX2JpdHM7XG4gICAgICAgICAgbGFzdF9vcCA9IGhlcmVfb3A7XG4gICAgICAgICAgbGFzdF92YWwgPSBoZXJlX3ZhbDtcbiAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBoZXJlID0gc3RhdGUuZGlzdGNvZGVbbGFzdF92YWwgK1xuICAgICAgICAgICAgICAgICAgICAoKGhvbGQgJiAoKDEgPDwgKGxhc3RfYml0cyArIGxhc3Rfb3ApKSAtIDEpKS8qQklUUyhsYXN0LmJpdHMgKyBsYXN0Lm9wKSovID4+IGxhc3RfYml0cyldO1xuICAgICAgICAgICAgaGVyZV9iaXRzID0gaGVyZSA+Pj4gMjQ7XG4gICAgICAgICAgICBoZXJlX29wID0gKGhlcmUgPj4+IDE2KSAmIDB4ZmY7XG4gICAgICAgICAgICBoZXJlX3ZhbCA9IGhlcmUgJiAweGZmZmY7XG5cbiAgICAgICAgICAgIGlmICgobGFzdF9iaXRzICsgaGVyZV9iaXRzKSA8PSBiaXRzKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICAvLy0tLSBQVUxMQllURSgpIC0tLS8vXG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLy0tLSBEUk9QQklUUyhsYXN0LmJpdHMpIC0tLS8vXG4gICAgICAgICAgaG9sZCA+Pj49IGxhc3RfYml0cztcbiAgICAgICAgICBiaXRzIC09IGxhc3RfYml0cztcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgc3RhdGUuYmFjayArPSBsYXN0X2JpdHM7XG4gICAgICAgIH1cbiAgICAgICAgLy8tLS0gRFJPUEJJVFMoaGVyZS5iaXRzKSAtLS0vL1xuICAgICAgICBob2xkID4+Pj0gaGVyZV9iaXRzO1xuICAgICAgICBiaXRzIC09IGhlcmVfYml0cztcbiAgICAgICAgLy8tLS0vL1xuICAgICAgICBzdGF0ZS5iYWNrICs9IGhlcmVfYml0cztcbiAgICAgICAgaWYgKGhlcmVfb3AgJiA2NCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgZGlzdGFuY2UgY29kZSc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5vZmZzZXQgPSBoZXJlX3ZhbDtcbiAgICAgICAgc3RhdGUuZXh0cmEgPSAoaGVyZV9vcCkgJiAxNTtcbiAgICAgICAgc3RhdGUubW9kZSA9IERJU1RFWFQ7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgRElTVEVYVDpcbiAgICAgICAgaWYgKHN0YXRlLmV4dHJhKSB7XG4gICAgICAgICAgLy89PT0gTkVFREJJVFMoc3RhdGUuZXh0cmEpO1xuICAgICAgICAgIG4gPSBzdGF0ZS5leHRyYTtcbiAgICAgICAgICB3aGlsZSAoYml0cyA8IG4pIHtcbiAgICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICBzdGF0ZS5vZmZzZXQgKz0gaG9sZCAmICgoMSA8PCBzdGF0ZS5leHRyYSkgLSAxKS8qQklUUyhzdGF0ZS5leHRyYSkqLztcbiAgICAgICAgICAvLy0tLSBEUk9QQklUUyhzdGF0ZS5leHRyYSkgLS0tLy9cbiAgICAgICAgICBob2xkID4+Pj0gc3RhdGUuZXh0cmE7XG4gICAgICAgICAgYml0cyAtPSBzdGF0ZS5leHRyYTtcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgc3RhdGUuYmFjayArPSBzdGF0ZS5leHRyYTtcbiAgICAgICAgfVxuLy8jaWZkZWYgSU5GTEFURV9TVFJJQ1RcbiAgICAgICAgaWYgKHN0YXRlLm9mZnNldCA+IHN0YXRlLmRtYXgpIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGRpc3RhbmNlIHRvbyBmYXIgYmFjayc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuLy8jZW5kaWZcbiAgICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgICBkaXN0YW5jZSAldVxcblwiLCBzdGF0ZS5vZmZzZXQpKTtcbiAgICAgICAgc3RhdGUubW9kZSA9IE1BVENIO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIE1BVENIOlxuICAgICAgICBpZiAobGVmdCA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgY29weSA9IF9vdXQgLSBsZWZ0O1xuICAgICAgICBpZiAoc3RhdGUub2Zmc2V0ID4gY29weSkgeyAgICAgICAgIC8qIGNvcHkgZnJvbSB3aW5kb3cgKi9cbiAgICAgICAgICBjb3B5ID0gc3RhdGUub2Zmc2V0IC0gY29weTtcbiAgICAgICAgICBpZiAoY29weSA+IHN0YXRlLndoYXZlKSB7XG4gICAgICAgICAgICBpZiAoc3RhdGUuc2FuZSkge1xuICAgICAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGRpc3RhbmNlIHRvbyBmYXIgYmFjayc7XG4gICAgICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuLy8gKCEpIFRoaXMgYmxvY2sgaXMgZGlzYWJsZWQgaW4gemxpYiBkZWZhdWx0cyxcbi8vIGRvbid0IGVuYWJsZSBpdCBmb3IgYmluYXJ5IGNvbXBhdGliaWxpdHlcbi8vI2lmZGVmIElORkxBVEVfQUxMT1dfSU5WQUxJRF9ESVNUQU5DRV9UT09GQVJfQVJSUlxuLy8gICAgICAgICAgVHJhY2UoKHN0ZGVyciwgXCJpbmZsYXRlLmMgdG9vIGZhclxcblwiKSk7XG4vLyAgICAgICAgICBjb3B5IC09IHN0YXRlLndoYXZlO1xuLy8gICAgICAgICAgaWYgKGNvcHkgPiBzdGF0ZS5sZW5ndGgpIHsgY29weSA9IHN0YXRlLmxlbmd0aDsgfVxuLy8gICAgICAgICAgaWYgKGNvcHkgPiBsZWZ0KSB7IGNvcHkgPSBsZWZ0OyB9XG4vLyAgICAgICAgICBsZWZ0IC09IGNvcHk7XG4vLyAgICAgICAgICBzdGF0ZS5sZW5ndGggLT0gY29weTtcbi8vICAgICAgICAgIGRvIHtcbi8vICAgICAgICAgICAgb3V0cHV0W3B1dCsrXSA9IDA7XG4vLyAgICAgICAgICB9IHdoaWxlICgtLWNvcHkpO1xuLy8gICAgICAgICAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCkgeyBzdGF0ZS5tb2RlID0gTEVOOyB9XG4vLyAgICAgICAgICBicmVhaztcbi8vI2VuZGlmXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjb3B5ID4gc3RhdGUud25leHQpIHtcbiAgICAgICAgICAgIGNvcHkgLT0gc3RhdGUud25leHQ7XG4gICAgICAgICAgICBmcm9tID0gc3RhdGUud3NpemUgLSBjb3B5O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGZyb20gPSBzdGF0ZS53bmV4dCAtIGNvcHk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjb3B5ID4gc3RhdGUubGVuZ3RoKSB7IGNvcHkgPSBzdGF0ZS5sZW5ndGg7IH1cbiAgICAgICAgICBmcm9tX3NvdXJjZSA9IHN0YXRlLndpbmRvdztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBjb3B5IGZyb20gb3V0cHV0ICovXG4gICAgICAgICAgZnJvbV9zb3VyY2UgPSBvdXRwdXQ7XG4gICAgICAgICAgZnJvbSA9IHB1dCAtIHN0YXRlLm9mZnNldDtcbiAgICAgICAgICBjb3B5ID0gc3RhdGUubGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb3B5ID4gbGVmdCkgeyBjb3B5ID0gbGVmdDsgfVxuICAgICAgICBsZWZ0IC09IGNvcHk7XG4gICAgICAgIHN0YXRlLmxlbmd0aCAtPSBjb3B5O1xuICAgICAgICBkbyB7XG4gICAgICAgICAgb3V0cHV0W3B1dCsrXSA9IGZyb21fc291cmNlW2Zyb20rK107XG4gICAgICAgIH0gd2hpbGUgKC0tY29weSk7XG4gICAgICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApIHsgc3RhdGUubW9kZSA9IExFTjsgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgTElUOlxuICAgICAgICBpZiAobGVmdCA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgb3V0cHV0W3B1dCsrXSA9IHN0YXRlLmxlbmd0aDtcbiAgICAgICAgbGVmdC0tO1xuICAgICAgICBzdGF0ZS5tb2RlID0gTEVOO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQ0hFQ0s6XG4gICAgICAgIGlmIChzdGF0ZS53cmFwKSB7XG4gICAgICAgICAgLy89PT0gTkVFREJJVFMoMzIpO1xuICAgICAgICAgIHdoaWxlIChiaXRzIDwgMzIpIHtcbiAgICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgLy8gVXNlICd8JyBpbnN0ZWFkIG9mICcrJyB0byBtYWtlIHN1cmUgdGhhdCByZXN1bHQgaXMgc2lnbmVkXG4gICAgICAgICAgICBob2xkIHw9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICAgIF9vdXQgLT0gbGVmdDtcbiAgICAgICAgICBzdHJtLnRvdGFsX291dCArPSBfb3V0O1xuICAgICAgICAgIHN0YXRlLnRvdGFsICs9IF9vdXQ7XG4gICAgICAgICAgaWYgKF9vdXQpIHtcbiAgICAgICAgICAgIHN0cm0uYWRsZXIgPSBzdGF0ZS5jaGVjayA9XG4gICAgICAgICAgICAgICAgLypVUERBVEUoc3RhdGUuY2hlY2ssIHB1dCAtIF9vdXQsIF9vdXQpOyovXG4gICAgICAgICAgICAgICAgKHN0YXRlLmZsYWdzID8gY3JjMzIoc3RhdGUuY2hlY2ssIG91dHB1dCwgX291dCwgcHV0IC0gX291dCkgOiBhZGxlcjMyKHN0YXRlLmNoZWNrLCBvdXRwdXQsIF9vdXQsIHB1dCAtIF9vdXQpKTtcblxuICAgICAgICAgIH1cbiAgICAgICAgICBfb3V0ID0gbGVmdDtcbiAgICAgICAgICAvLyBOQjogY3JjMzIgc3RvcmVkIGFzIHNpZ25lZCAzMi1iaXQgaW50LCB6c3dhcDMyIHJldHVybnMgc2lnbmVkIHRvb1xuICAgICAgICAgIGlmICgoc3RhdGUuZmxhZ3MgPyBob2xkIDogenN3YXAzMihob2xkKSkgIT09IHN0YXRlLmNoZWNrKSB7XG4gICAgICAgICAgICBzdHJtLm1zZyA9ICdpbmNvcnJlY3QgZGF0YSBjaGVjayc7XG4gICAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICBjaGVjayBtYXRjaGVzIHRyYWlsZXJcXG5cIikpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLm1vZGUgPSBMRU5HVEg7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgTEVOR1RIOlxuICAgICAgICBpZiAoc3RhdGUud3JhcCAmJiBzdGF0ZS5mbGFncykge1xuICAgICAgICAgIC8vPT09IE5FRURCSVRTKDMyKTtcbiAgICAgICAgICB3aGlsZSAoYml0cyA8IDMyKSB7XG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgaWYgKGhvbGQgIT09IChzdGF0ZS50b3RhbCAmIDB4ZmZmZmZmZmYpKSB7XG4gICAgICAgICAgICBzdHJtLm1zZyA9ICdpbmNvcnJlY3QgbGVuZ3RoIGNoZWNrJztcbiAgICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgICBob2xkID0gMDtcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgIGxlbmd0aCBtYXRjaGVzIHRyYWlsZXJcXG5cIikpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLm1vZGUgPSBET05FO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIERPTkU6XG4gICAgICAgIHJldCA9IFpfU1RSRUFNX0VORDtcbiAgICAgICAgYnJlYWsgaW5mX2xlYXZlO1xuICAgICAgY2FzZSBCQUQ6XG4gICAgICAgIHJldCA9IFpfREFUQV9FUlJPUjtcbiAgICAgICAgYnJlYWsgaW5mX2xlYXZlO1xuICAgICAgY2FzZSBNRU06XG4gICAgICAgIHJldHVybiBaX01FTV9FUlJPUjtcbiAgICAgIGNhc2UgU1lOQzpcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIFpfU1RSRUFNX0VSUk9SO1xuICAgIH1cbiAgfVxuXG4gIC8vIGluZl9sZWF2ZSA8LSBoZXJlIGlzIHJlYWwgcGxhY2UgZm9yIFwiZ290byBpbmZfbGVhdmVcIiwgZW11bGF0ZWQgdmlhIFwiYnJlYWsgaW5mX2xlYXZlXCJcblxuICAvKlxuICAgICBSZXR1cm4gZnJvbSBpbmZsYXRlKCksIHVwZGF0aW5nIHRoZSB0b3RhbCBjb3VudHMgYW5kIHRoZSBjaGVjayB2YWx1ZS5cbiAgICAgSWYgdGhlcmUgd2FzIG5vIHByb2dyZXNzIGR1cmluZyB0aGUgaW5mbGF0ZSgpIGNhbGwsIHJldHVybiBhIGJ1ZmZlclxuICAgICBlcnJvci4gIENhbGwgdXBkYXRld2luZG93KCkgdG8gY3JlYXRlIGFuZC9vciB1cGRhdGUgdGhlIHdpbmRvdyBzdGF0ZS5cbiAgICAgTm90ZTogYSBtZW1vcnkgZXJyb3IgZnJvbSBpbmZsYXRlKCkgaXMgbm9uLXJlY292ZXJhYmxlLlxuICAgKi9cblxuICAvLy0tLSBSRVNUT1JFKCkgLS0tXG4gIHN0cm0ubmV4dF9vdXQgPSBwdXQ7XG4gIHN0cm0uYXZhaWxfb3V0ID0gbGVmdDtcbiAgc3RybS5uZXh0X2luID0gbmV4dDtcbiAgc3RybS5hdmFpbF9pbiA9IGhhdmU7XG4gIHN0YXRlLmhvbGQgPSBob2xkO1xuICBzdGF0ZS5iaXRzID0gYml0cztcbiAgLy8tLS1cblxuICBpZiAoc3RhdGUud3NpemUgfHwgKF9vdXQgIT09IHN0cm0uYXZhaWxfb3V0ICYmIHN0YXRlLm1vZGUgPCBCQUQgJiZcbiAgICAgICAgICAgICAgICAgICAgICAoc3RhdGUubW9kZSA8IENIRUNLIHx8IGZsdXNoICE9PSBaX0ZJTklTSCkpKSB7XG4gICAgaWYgKHVwZGF0ZXdpbmRvdyhzdHJtLCBzdHJtLm91dHB1dCwgc3RybS5uZXh0X291dCwgX291dCAtIHN0cm0uYXZhaWxfb3V0KSkge1xuICAgICAgc3RhdGUubW9kZSA9IE1FTTtcbiAgICAgIHJldHVybiBaX01FTV9FUlJPUjtcbiAgICB9XG4gIH1cbiAgX2luIC09IHN0cm0uYXZhaWxfaW47XG4gIF9vdXQgLT0gc3RybS5hdmFpbF9vdXQ7XG4gIHN0cm0udG90YWxfaW4gKz0gX2luO1xuICBzdHJtLnRvdGFsX291dCArPSBfb3V0O1xuICBzdGF0ZS50b3RhbCArPSBfb3V0O1xuICBpZiAoc3RhdGUud3JhcCAmJiBfb3V0KSB7XG4gICAgc3RybS5hZGxlciA9IHN0YXRlLmNoZWNrID0gLypVUERBVEUoc3RhdGUuY2hlY2ssIHN0cm0ubmV4dF9vdXQgLSBfb3V0LCBfb3V0KTsqL1xuICAgICAgKHN0YXRlLmZsYWdzID8gY3JjMzIoc3RhdGUuY2hlY2ssIG91dHB1dCwgX291dCwgc3RybS5uZXh0X291dCAtIF9vdXQpIDogYWRsZXIzMihzdGF0ZS5jaGVjaywgb3V0cHV0LCBfb3V0LCBzdHJtLm5leHRfb3V0IC0gX291dCkpO1xuICB9XG4gIHN0cm0uZGF0YV90eXBlID0gc3RhdGUuYml0cyArIChzdGF0ZS5sYXN0ID8gNjQgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgIChzdGF0ZS5tb2RlID09PSBUWVBFID8gMTI4IDogMCkgK1xuICAgICAgICAgICAgICAgICAgICAoc3RhdGUubW9kZSA9PT0gTEVOXyB8fCBzdGF0ZS5tb2RlID09PSBDT1BZXyA/IDI1NiA6IDApO1xuICBpZiAoKChfaW4gPT09IDAgJiYgX291dCA9PT0gMCkgfHwgZmx1c2ggPT09IFpfRklOSVNIKSAmJiByZXQgPT09IFpfT0spIHtcbiAgICByZXQgPSBaX0JVRl9FUlJPUjtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBpbmZsYXRlRW5kKHN0cm0pIHtcblxuICBpZiAoIXN0cm0gfHwgIXN0cm0uc3RhdGUgLyp8fCBzdHJtLT56ZnJlZSA9PSAoZnJlZV9mdW5jKTAqLykge1xuICAgIHJldHVybiBaX1NUUkVBTV9FUlJPUjtcbiAgfVxuXG4gIHZhciBzdGF0ZSA9IHN0cm0uc3RhdGU7XG4gIGlmIChzdGF0ZS53aW5kb3cpIHtcbiAgICBzdGF0ZS53aW5kb3cgPSBudWxsO1xuICB9XG4gIHN0cm0uc3RhdGUgPSBudWxsO1xuICByZXR1cm4gWl9PSztcbn1cblxuZnVuY3Rpb24gaW5mbGF0ZUdldEhlYWRlcihzdHJtLCBoZWFkKSB7XG4gIHZhciBzdGF0ZTtcblxuICAvKiBjaGVjayBzdGF0ZSAqL1xuICBpZiAoIXN0cm0gfHwgIXN0cm0uc3RhdGUpIHsgcmV0dXJuIFpfU1RSRUFNX0VSUk9SOyB9XG4gIHN0YXRlID0gc3RybS5zdGF0ZTtcbiAgaWYgKChzdGF0ZS53cmFwICYgMikgPT09IDApIHsgcmV0dXJuIFpfU1RSRUFNX0VSUk9SOyB9XG5cbiAgLyogc2F2ZSBoZWFkZXIgc3RydWN0dXJlICovXG4gIHN0YXRlLmhlYWQgPSBoZWFkO1xuICBoZWFkLmRvbmUgPSBmYWxzZTtcbiAgcmV0dXJuIFpfT0s7XG59XG5cbmZ1bmN0aW9uIGluZmxhdGVTZXREaWN0aW9uYXJ5KHN0cm0sIGRpY3Rpb25hcnkpIHtcbiAgdmFyIGRpY3RMZW5ndGggPSBkaWN0aW9uYXJ5Lmxlbmd0aDtcblxuICB2YXIgc3RhdGU7XG4gIHZhciBkaWN0aWQ7XG4gIHZhciByZXQ7XG5cbiAgLyogY2hlY2sgc3RhdGUgKi9cbiAgaWYgKCFzdHJtIC8qID09IFpfTlVMTCAqLyB8fCAhc3RybS5zdGF0ZSAvKiA9PSBaX05VTEwgKi8pIHsgcmV0dXJuIFpfU1RSRUFNX0VSUk9SOyB9XG4gIHN0YXRlID0gc3RybS5zdGF0ZTtcblxuICBpZiAoc3RhdGUud3JhcCAhPT0gMCAmJiBzdGF0ZS5tb2RlICE9PSBESUNUKSB7XG4gICAgcmV0dXJuIFpfU1RSRUFNX0VSUk9SO1xuICB9XG5cbiAgLyogY2hlY2sgZm9yIGNvcnJlY3QgZGljdGlvbmFyeSBpZGVudGlmaWVyICovXG4gIGlmIChzdGF0ZS5tb2RlID09PSBESUNUKSB7XG4gICAgZGljdGlkID0gMTsgLyogYWRsZXIzMigwLCBudWxsLCAwKSovXG4gICAgLyogZGljdGlkID0gYWRsZXIzMihkaWN0aWQsIGRpY3Rpb25hcnksIGRpY3RMZW5ndGgpOyAqL1xuICAgIGRpY3RpZCA9IGFkbGVyMzIoZGljdGlkLCBkaWN0aW9uYXJ5LCBkaWN0TGVuZ3RoLCAwKTtcbiAgICBpZiAoZGljdGlkICE9PSBzdGF0ZS5jaGVjaykge1xuICAgICAgcmV0dXJuIFpfREFUQV9FUlJPUjtcbiAgICB9XG4gIH1cbiAgLyogY29weSBkaWN0aW9uYXJ5IHRvIHdpbmRvdyB1c2luZyB1cGRhdGV3aW5kb3coKSwgd2hpY2ggd2lsbCBhbWVuZCB0aGVcbiAgIGV4aXN0aW5nIGRpY3Rpb25hcnkgaWYgYXBwcm9wcmlhdGUgKi9cbiAgcmV0ID0gdXBkYXRld2luZG93KHN0cm0sIGRpY3Rpb25hcnksIGRpY3RMZW5ndGgsIGRpY3RMZW5ndGgpO1xuICBpZiAocmV0KSB7XG4gICAgc3RhdGUubW9kZSA9IE1FTTtcbiAgICByZXR1cm4gWl9NRU1fRVJST1I7XG4gIH1cbiAgc3RhdGUuaGF2ZWRpY3QgPSAxO1xuICAvLyBUcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgIGRpY3Rpb25hcnkgc2V0XFxuXCIpKTtcbiAgcmV0dXJuIFpfT0s7XG59XG5cbmV4cG9ydHMuaW5mbGF0ZVJlc2V0ID0gaW5mbGF0ZVJlc2V0O1xuZXhwb3J0cy5pbmZsYXRlUmVzZXQyID0gaW5mbGF0ZVJlc2V0MjtcbmV4cG9ydHMuaW5mbGF0ZVJlc2V0S2VlcCA9IGluZmxhdGVSZXNldEtlZXA7XG5leHBvcnRzLmluZmxhdGVJbml0ID0gaW5mbGF0ZUluaXQ7XG5leHBvcnRzLmluZmxhdGVJbml0MiA9IGluZmxhdGVJbml0MjtcbmV4cG9ydHMuaW5mbGF0ZSA9IGluZmxhdGU7XG5leHBvcnRzLmluZmxhdGVFbmQgPSBpbmZsYXRlRW5kO1xuZXhwb3J0cy5pbmZsYXRlR2V0SGVhZGVyID0gaW5mbGF0ZUdldEhlYWRlcjtcbmV4cG9ydHMuaW5mbGF0ZVNldERpY3Rpb25hcnkgPSBpbmZsYXRlU2V0RGljdGlvbmFyeTtcbmV4cG9ydHMuaW5mbGF0ZUluZm8gPSAncGFrbyBpbmZsYXRlIChmcm9tIE5vZGVjYSBwcm9qZWN0KSc7XG5cbi8qIE5vdCBpbXBsZW1lbnRlZFxuZXhwb3J0cy5pbmZsYXRlQ29weSA9IGluZmxhdGVDb3B5O1xuZXhwb3J0cy5pbmZsYXRlR2V0RGljdGlvbmFyeSA9IGluZmxhdGVHZXREaWN0aW9uYXJ5O1xuZXhwb3J0cy5pbmZsYXRlTWFyayA9IGluZmxhdGVNYXJrO1xuZXhwb3J0cy5pbmZsYXRlUHJpbWUgPSBpbmZsYXRlUHJpbWU7XG5leHBvcnRzLmluZmxhdGVTeW5jID0gaW5mbGF0ZVN5bmM7XG5leHBvcnRzLmluZmxhdGVTeW5jUG9pbnQgPSBpbmZsYXRlU3luY1BvaW50O1xuZXhwb3J0cy5pbmZsYXRlVW5kZXJtaW5lID0gaW5mbGF0ZVVuZGVybWluZTtcbiovXG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vLyAoQykgMTk5NS0yMDEzIEplYW4tbG91cCBHYWlsbHkgYW5kIE1hcmsgQWRsZXJcbi8vIChDKSAyMDE0LTIwMTcgVml0YWx5IFB1enJpbiBhbmQgQW5kcmV5IFR1cGl0c2luXG4vL1xuLy8gVGhpcyBzb2Z0d2FyZSBpcyBwcm92aWRlZCAnYXMtaXMnLCB3aXRob3V0IGFueSBleHByZXNzIG9yIGltcGxpZWRcbi8vIHdhcnJhbnR5LiBJbiBubyBldmVudCB3aWxsIHRoZSBhdXRob3JzIGJlIGhlbGQgbGlhYmxlIGZvciBhbnkgZGFtYWdlc1xuLy8gYXJpc2luZyBmcm9tIHRoZSB1c2Ugb2YgdGhpcyBzb2Z0d2FyZS5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGdyYW50ZWQgdG8gYW55b25lIHRvIHVzZSB0aGlzIHNvZnR3YXJlIGZvciBhbnkgcHVycG9zZSxcbi8vIGluY2x1ZGluZyBjb21tZXJjaWFsIGFwcGxpY2F0aW9ucywgYW5kIHRvIGFsdGVyIGl0IGFuZCByZWRpc3RyaWJ1dGUgaXRcbi8vIGZyZWVseSwgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIHJlc3RyaWN0aW9uczpcbi8vXG4vLyAxLiBUaGUgb3JpZ2luIG9mIHRoaXMgc29mdHdhcmUgbXVzdCBub3QgYmUgbWlzcmVwcmVzZW50ZWQ7IHlvdSBtdXN0IG5vdFxuLy8gICBjbGFpbSB0aGF0IHlvdSB3cm90ZSB0aGUgb3JpZ2luYWwgc29mdHdhcmUuIElmIHlvdSB1c2UgdGhpcyBzb2Z0d2FyZVxuLy8gICBpbiBhIHByb2R1Y3QsIGFuIGFja25vd2xlZGdtZW50IGluIHRoZSBwcm9kdWN0IGRvY3VtZW50YXRpb24gd291bGQgYmVcbi8vICAgYXBwcmVjaWF0ZWQgYnV0IGlzIG5vdCByZXF1aXJlZC5cbi8vIDIuIEFsdGVyZWQgc291cmNlIHZlcnNpb25zIG11c3QgYmUgcGxhaW5seSBtYXJrZWQgYXMgc3VjaCwgYW5kIG11c3Qgbm90IGJlXG4vLyAgIG1pc3JlcHJlc2VudGVkIGFzIGJlaW5nIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS5cbi8vIDMuIFRoaXMgbm90aWNlIG1heSBub3QgYmUgcmVtb3ZlZCBvciBhbHRlcmVkIGZyb20gYW55IHNvdXJjZSBkaXN0cmlidXRpb24uXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIC8qIEFsbG93ZWQgZmx1c2ggdmFsdWVzOyBzZWUgZGVmbGF0ZSgpIGFuZCBpbmZsYXRlKCkgYmVsb3cgZm9yIGRldGFpbHMgKi9cbiAgWl9OT19GTFVTSDogICAgICAgICAwLFxuICBaX1BBUlRJQUxfRkxVU0g6ICAgIDEsXG4gIFpfU1lOQ19GTFVTSDogICAgICAgMixcbiAgWl9GVUxMX0ZMVVNIOiAgICAgICAzLFxuICBaX0ZJTklTSDogICAgICAgICAgIDQsXG4gIFpfQkxPQ0s6ICAgICAgICAgICAgNSxcbiAgWl9UUkVFUzogICAgICAgICAgICA2LFxuXG4gIC8qIFJldHVybiBjb2RlcyBmb3IgdGhlIGNvbXByZXNzaW9uL2RlY29tcHJlc3Npb24gZnVuY3Rpb25zLiBOZWdhdGl2ZSB2YWx1ZXNcbiAgKiBhcmUgZXJyb3JzLCBwb3NpdGl2ZSB2YWx1ZXMgYXJlIHVzZWQgZm9yIHNwZWNpYWwgYnV0IG5vcm1hbCBldmVudHMuXG4gICovXG4gIFpfT0s6ICAgICAgICAgICAgICAgMCxcbiAgWl9TVFJFQU1fRU5EOiAgICAgICAxLFxuICBaX05FRURfRElDVDogICAgICAgIDIsXG4gIFpfRVJSTk86ICAgICAgICAgICAtMSxcbiAgWl9TVFJFQU1fRVJST1I6ICAgIC0yLFxuICBaX0RBVEFfRVJST1I6ICAgICAgLTMsXG4gIC8vWl9NRU1fRVJST1I6ICAgICAtNCxcbiAgWl9CVUZfRVJST1I6ICAgICAgIC01LFxuICAvL1pfVkVSU0lPTl9FUlJPUjogLTYsXG5cbiAgLyogY29tcHJlc3Npb24gbGV2ZWxzICovXG4gIFpfTk9fQ09NUFJFU1NJT046ICAgICAgICAgMCxcbiAgWl9CRVNUX1NQRUVEOiAgICAgICAgICAgICAxLFxuICBaX0JFU1RfQ09NUFJFU1NJT046ICAgICAgIDksXG4gIFpfREVGQVVMVF9DT01QUkVTU0lPTjogICAtMSxcblxuXG4gIFpfRklMVEVSRUQ6ICAgICAgICAgICAgICAgMSxcbiAgWl9IVUZGTUFOX09OTFk6ICAgICAgICAgICAyLFxuICBaX1JMRTogICAgICAgICAgICAgICAgICAgIDMsXG4gIFpfRklYRUQ6ICAgICAgICAgICAgICAgICAgNCxcbiAgWl9ERUZBVUxUX1NUUkFURUdZOiAgICAgICAwLFxuXG4gIC8qIFBvc3NpYmxlIHZhbHVlcyBvZiB0aGUgZGF0YV90eXBlIGZpZWxkICh0aG91Z2ggc2VlIGluZmxhdGUoKSkgKi9cbiAgWl9CSU5BUlk6ICAgICAgICAgICAgICAgICAwLFxuICBaX1RFWFQ6ICAgICAgICAgICAgICAgICAgIDEsXG4gIC8vWl9BU0NJSTogICAgICAgICAgICAgICAgMSwgLy8gPSBaX1RFWFQgKGRlcHJlY2F0ZWQpXG4gIFpfVU5LTk9XTjogICAgICAgICAgICAgICAgMixcblxuICAvKiBUaGUgZGVmbGF0ZSBjb21wcmVzc2lvbiBtZXRob2QgKi9cbiAgWl9ERUZMQVRFRDogICAgICAgICAgICAgICA4XG4gIC8vWl9OVUxMOiAgICAgICAgICAgICAgICAgbnVsbCAvLyBVc2UgLTEgb3IgbnVsbCBpbmxpbmUsIGRlcGVuZGluZyBvbiB2YXIgdHlwZVxufTtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxuZnVuY3Rpb24gR1poZWFkZXIoKSB7XG4gIC8qIHRydWUgaWYgY29tcHJlc3NlZCBkYXRhIGJlbGlldmVkIHRvIGJlIHRleHQgKi9cbiAgdGhpcy50ZXh0ICAgICAgID0gMDtcbiAgLyogbW9kaWZpY2F0aW9uIHRpbWUgKi9cbiAgdGhpcy50aW1lICAgICAgID0gMDtcbiAgLyogZXh0cmEgZmxhZ3MgKG5vdCB1c2VkIHdoZW4gd3JpdGluZyBhIGd6aXAgZmlsZSkgKi9cbiAgdGhpcy54ZmxhZ3MgICAgID0gMDtcbiAgLyogb3BlcmF0aW5nIHN5c3RlbSAqL1xuICB0aGlzLm9zICAgICAgICAgPSAwO1xuICAvKiBwb2ludGVyIHRvIGV4dHJhIGZpZWxkIG9yIFpfTlVMTCBpZiBub25lICovXG4gIHRoaXMuZXh0cmEgICAgICA9IG51bGw7XG4gIC8qIGV4dHJhIGZpZWxkIGxlbmd0aCAodmFsaWQgaWYgZXh0cmEgIT0gWl9OVUxMKSAqL1xuICB0aGlzLmV4dHJhX2xlbiAgPSAwOyAvLyBBY3R1YWxseSwgd2UgZG9uJ3QgbmVlZCBpdCBpbiBKUyxcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gYnV0IGxlYXZlIGZvciBmZXcgY29kZSBtb2RpZmljYXRpb25zXG5cbiAgLy9cbiAgLy8gU2V0dXAgbGltaXRzIGlzIG5vdCBuZWNlc3NhcnkgYmVjYXVzZSBpbiBqcyB3ZSBzaG91bGQgbm90IHByZWFsbG9jYXRlIG1lbW9yeVxuICAvLyBmb3IgaW5mbGF0ZSB1c2UgY29uc3RhbnQgbGltaXQgaW4gNjU1MzYgYnl0ZXNcbiAgLy9cblxuICAvKiBzcGFjZSBhdCBleHRyYSAob25seSB3aGVuIHJlYWRpbmcgaGVhZGVyKSAqL1xuICAvLyB0aGlzLmV4dHJhX21heCAgPSAwO1xuICAvKiBwb2ludGVyIHRvIHplcm8tdGVybWluYXRlZCBmaWxlIG5hbWUgb3IgWl9OVUxMICovXG4gIHRoaXMubmFtZSAgICAgICA9ICcnO1xuICAvKiBzcGFjZSBhdCBuYW1lIChvbmx5IHdoZW4gcmVhZGluZyBoZWFkZXIpICovXG4gIC8vIHRoaXMubmFtZV9tYXggICA9IDA7XG4gIC8qIHBvaW50ZXIgdG8gemVyby10ZXJtaW5hdGVkIGNvbW1lbnQgb3IgWl9OVUxMICovXG4gIHRoaXMuY29tbWVudCAgICA9ICcnO1xuICAvKiBzcGFjZSBhdCBjb21tZW50IChvbmx5IHdoZW4gcmVhZGluZyBoZWFkZXIpICovXG4gIC8vIHRoaXMuY29tbV9tYXggICA9IDA7XG4gIC8qIHRydWUgaWYgdGhlcmUgd2FzIG9yIHdpbGwgYmUgYSBoZWFkZXIgY3JjICovXG4gIHRoaXMuaGNyYyAgICAgICA9IDA7XG4gIC8qIHRydWUgd2hlbiBkb25lIHJlYWRpbmcgZ3ppcCBoZWFkZXIgKG5vdCB1c2VkIHdoZW4gd3JpdGluZyBhIGd6aXAgZmlsZSkgKi9cbiAgdGhpcy5kb25lICAgICAgID0gZmFsc2U7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR1poZWFkZXI7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciB6bGliX2luZmxhdGUgPSByZXF1aXJlKCcuL3psaWIvaW5mbGF0ZScpO1xudmFyIHV0aWxzICAgICAgICA9IHJlcXVpcmUoJy4vdXRpbHMvY29tbW9uJyk7XG52YXIgc3RyaW5ncyAgICAgID0gcmVxdWlyZSgnLi91dGlscy9zdHJpbmdzJyk7XG52YXIgYyAgICAgICAgICAgID0gcmVxdWlyZSgnLi96bGliL2NvbnN0YW50cycpO1xudmFyIG1zZyAgICAgICAgICA9IHJlcXVpcmUoJy4vemxpYi9tZXNzYWdlcycpO1xudmFyIFpTdHJlYW0gICAgICA9IHJlcXVpcmUoJy4vemxpYi96c3RyZWFtJyk7XG52YXIgR1poZWFkZXIgICAgID0gcmVxdWlyZSgnLi96bGliL2d6aGVhZGVyJyk7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogY2xhc3MgSW5mbGF0ZVxuICpcbiAqIEdlbmVyaWMgSlMtc3R5bGUgd3JhcHBlciBmb3IgemxpYiBjYWxscy4gSWYgeW91IGRvbid0IG5lZWRcbiAqIHN0cmVhbWluZyBiZWhhdmlvdXIgLSB1c2UgbW9yZSBzaW1wbGUgZnVuY3Rpb25zOiBbW2luZmxhdGVdXVxuICogYW5kIFtbaW5mbGF0ZVJhd11dLlxuICoqL1xuXG4vKiBpbnRlcm5hbFxuICogaW5mbGF0ZS5jaHVua3MgLT4gQXJyYXlcbiAqXG4gKiBDaHVua3Mgb2Ygb3V0cHV0IGRhdGEsIGlmIFtbSW5mbGF0ZSNvbkRhdGFdXSBub3Qgb3ZlcnJpZGRlbi5cbiAqKi9cblxuLyoqXG4gKiBJbmZsYXRlLnJlc3VsdCAtPiBVaW50OEFycmF5fEFycmF5fFN0cmluZ1xuICpcbiAqIFVuY29tcHJlc3NlZCByZXN1bHQsIGdlbmVyYXRlZCBieSBkZWZhdWx0IFtbSW5mbGF0ZSNvbkRhdGFdXVxuICogYW5kIFtbSW5mbGF0ZSNvbkVuZF1dIGhhbmRsZXJzLiBGaWxsZWQgYWZ0ZXIgeW91IHB1c2ggbGFzdCBjaHVua1xuICogKGNhbGwgW1tJbmZsYXRlI3B1c2hdXSB3aXRoIGBaX0ZJTklTSGAgLyBgdHJ1ZWAgcGFyYW0pIG9yIGlmIHlvdVxuICogcHVzaCBhIGNodW5rIHdpdGggZXhwbGljaXQgZmx1c2ggKGNhbGwgW1tJbmZsYXRlI3B1c2hdXSB3aXRoXG4gKiBgWl9TWU5DX0ZMVVNIYCBwYXJhbSkuXG4gKiovXG5cbi8qKlxuICogSW5mbGF0ZS5lcnIgLT4gTnVtYmVyXG4gKlxuICogRXJyb3IgY29kZSBhZnRlciBpbmZsYXRlIGZpbmlzaGVkLiAwIChaX09LKSBvbiBzdWNjZXNzLlxuICogU2hvdWxkIGJlIGNoZWNrZWQgaWYgYnJva2VuIGRhdGEgcG9zc2libGUuXG4gKiovXG5cbi8qKlxuICogSW5mbGF0ZS5tc2cgLT4gU3RyaW5nXG4gKlxuICogRXJyb3IgbWVzc2FnZSwgaWYgW1tJbmZsYXRlLmVycl1dICE9IDBcbiAqKi9cblxuXG4vKipcbiAqIG5ldyBJbmZsYXRlKG9wdGlvbnMpXG4gKiAtIG9wdGlvbnMgKE9iamVjdCk6IHpsaWIgaW5mbGF0ZSBvcHRpb25zLlxuICpcbiAqIENyZWF0ZXMgbmV3IGluZmxhdG9yIGluc3RhbmNlIHdpdGggc3BlY2lmaWVkIHBhcmFtcy4gVGhyb3dzIGV4Y2VwdGlvblxuICogb24gYmFkIHBhcmFtcy4gU3VwcG9ydGVkIG9wdGlvbnM6XG4gKlxuICogLSBgd2luZG93Qml0c2BcbiAqIC0gYGRpY3Rpb25hcnlgXG4gKlxuICogW2h0dHA6Ly96bGliLm5ldC9tYW51YWwuaHRtbCNBZHZhbmNlZF0oaHR0cDovL3psaWIubmV0L21hbnVhbC5odG1sI0FkdmFuY2VkKVxuICogZm9yIG1vcmUgaW5mb3JtYXRpb24gb24gdGhlc2UuXG4gKlxuICogQWRkaXRpb25hbCBvcHRpb25zLCBmb3IgaW50ZXJuYWwgbmVlZHM6XG4gKlxuICogLSBgY2h1bmtTaXplYCAtIHNpemUgb2YgZ2VuZXJhdGVkIGRhdGEgY2h1bmtzICgxNksgYnkgZGVmYXVsdClcbiAqIC0gYHJhd2AgKEJvb2xlYW4pIC0gZG8gcmF3IGluZmxhdGVcbiAqIC0gYHRvYCAoU3RyaW5nKSAtIGlmIGVxdWFsIHRvICdzdHJpbmcnLCB0aGVuIHJlc3VsdCB3aWxsIGJlIGNvbnZlcnRlZFxuICogICBmcm9tIHV0ZjggdG8gdXRmMTYgKGphdmFzY3JpcHQpIHN0cmluZy4gV2hlbiBzdHJpbmcgb3V0cHV0IHJlcXVlc3RlZCxcbiAqICAgY2h1bmsgbGVuZ3RoIGNhbiBkaWZmZXIgZnJvbSBgY2h1bmtTaXplYCwgZGVwZW5kaW5nIG9uIGNvbnRlbnQuXG4gKlxuICogQnkgZGVmYXVsdCwgd2hlbiBubyBvcHRpb25zIHNldCwgYXV0b2RldGVjdCBkZWZsYXRlL2d6aXAgZGF0YSBmb3JtYXQgdmlhXG4gKiB3cmFwcGVyIGhlYWRlci5cbiAqXG4gKiAjIyMjIyBFeGFtcGxlOlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHZhciBwYWtvID0gcmVxdWlyZSgncGFrbycpXG4gKiAgICwgY2h1bmsxID0gVWludDhBcnJheShbMSwyLDMsNCw1LDYsNyw4LDldKVxuICogICAsIGNodW5rMiA9IFVpbnQ4QXJyYXkoWzEwLDExLDEyLDEzLDE0LDE1LDE2LDE3LDE4LDE5XSk7XG4gKlxuICogdmFyIGluZmxhdGUgPSBuZXcgcGFrby5JbmZsYXRlKHsgbGV2ZWw6IDN9KTtcbiAqXG4gKiBpbmZsYXRlLnB1c2goY2h1bmsxLCBmYWxzZSk7XG4gKiBpbmZsYXRlLnB1c2goY2h1bmsyLCB0cnVlKTsgIC8vIHRydWUgLT4gbGFzdCBjaHVua1xuICpcbiAqIGlmIChpbmZsYXRlLmVycikgeyB0aHJvdyBuZXcgRXJyb3IoaW5mbGF0ZS5lcnIpOyB9XG4gKlxuICogY29uc29sZS5sb2coaW5mbGF0ZS5yZXN1bHQpO1xuICogYGBgXG4gKiovXG5mdW5jdGlvbiBJbmZsYXRlKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEluZmxhdGUpKSByZXR1cm4gbmV3IEluZmxhdGUob3B0aW9ucyk7XG5cbiAgdGhpcy5vcHRpb25zID0gdXRpbHMuYXNzaWduKHtcbiAgICBjaHVua1NpemU6IDE2Mzg0LFxuICAgIHdpbmRvd0JpdHM6IDAsXG4gICAgdG86ICcnXG4gIH0sIG9wdGlvbnMgfHwge30pO1xuXG4gIHZhciBvcHQgPSB0aGlzLm9wdGlvbnM7XG5cbiAgLy8gRm9yY2Ugd2luZG93IHNpemUgZm9yIGByYXdgIGRhdGEsIGlmIG5vdCBzZXQgZGlyZWN0bHksXG4gIC8vIGJlY2F1c2Ugd2UgaGF2ZSBubyBoZWFkZXIgZm9yIGF1dG9kZXRlY3QuXG4gIGlmIChvcHQucmF3ICYmIChvcHQud2luZG93Qml0cyA+PSAwKSAmJiAob3B0LndpbmRvd0JpdHMgPCAxNikpIHtcbiAgICBvcHQud2luZG93Qml0cyA9IC1vcHQud2luZG93Qml0cztcbiAgICBpZiAob3B0LndpbmRvd0JpdHMgPT09IDApIHsgb3B0LndpbmRvd0JpdHMgPSAtMTU7IH1cbiAgfVxuXG4gIC8vIElmIGB3aW5kb3dCaXRzYCBub3QgZGVmaW5lZCAoYW5kIG1vZGUgbm90IHJhdykgLSBzZXQgYXV0b2RldGVjdCBmbGFnIGZvciBnemlwL2RlZmxhdGVcbiAgaWYgKChvcHQud2luZG93Qml0cyA+PSAwKSAmJiAob3B0LndpbmRvd0JpdHMgPCAxNikgJiZcbiAgICAgICEob3B0aW9ucyAmJiBvcHRpb25zLndpbmRvd0JpdHMpKSB7XG4gICAgb3B0LndpbmRvd0JpdHMgKz0gMzI7XG4gIH1cblxuICAvLyBHemlwIGhlYWRlciBoYXMgbm8gaW5mbyBhYm91dCB3aW5kb3dzIHNpemUsIHdlIGNhbiBkbyBhdXRvZGV0ZWN0IG9ubHlcbiAgLy8gZm9yIGRlZmxhdGUuIFNvLCBpZiB3aW5kb3cgc2l6ZSBub3Qgc2V0LCBmb3JjZSBpdCB0byBtYXggd2hlbiBnemlwIHBvc3NpYmxlXG4gIGlmICgob3B0LndpbmRvd0JpdHMgPiAxNSkgJiYgKG9wdC53aW5kb3dCaXRzIDwgNDgpKSB7XG4gICAgLy8gYml0IDMgKDE2KSAtPiBnemlwcGVkIGRhdGFcbiAgICAvLyBiaXQgNCAoMzIpIC0+IGF1dG9kZXRlY3QgZ3ppcC9kZWZsYXRlXG4gICAgaWYgKChvcHQud2luZG93Qml0cyAmIDE1KSA9PT0gMCkge1xuICAgICAgb3B0LndpbmRvd0JpdHMgfD0gMTU7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5lcnIgICAgPSAwOyAgICAgIC8vIGVycm9yIGNvZGUsIGlmIGhhcHBlbnMgKDAgPSBaX09LKVxuICB0aGlzLm1zZyAgICA9ICcnOyAgICAgLy8gZXJyb3IgbWVzc2FnZVxuICB0aGlzLmVuZGVkICA9IGZhbHNlOyAgLy8gdXNlZCB0byBhdm9pZCBtdWx0aXBsZSBvbkVuZCgpIGNhbGxzXG4gIHRoaXMuY2h1bmtzID0gW107ICAgICAvLyBjaHVua3Mgb2YgY29tcHJlc3NlZCBkYXRhXG5cbiAgdGhpcy5zdHJtICAgPSBuZXcgWlN0cmVhbSgpO1xuICB0aGlzLnN0cm0uYXZhaWxfb3V0ID0gMDtcblxuICB2YXIgc3RhdHVzICA9IHpsaWJfaW5mbGF0ZS5pbmZsYXRlSW5pdDIoXG4gICAgdGhpcy5zdHJtLFxuICAgIG9wdC53aW5kb3dCaXRzXG4gICk7XG5cbiAgaWYgKHN0YXR1cyAhPT0gYy5aX09LKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKG1zZ1tzdGF0dXNdKTtcbiAgfVxuXG4gIHRoaXMuaGVhZGVyID0gbmV3IEdaaGVhZGVyKCk7XG5cbiAgemxpYl9pbmZsYXRlLmluZmxhdGVHZXRIZWFkZXIodGhpcy5zdHJtLCB0aGlzLmhlYWRlcik7XG5cbiAgLy8gU2V0dXAgZGljdGlvbmFyeVxuICBpZiAob3B0LmRpY3Rpb25hcnkpIHtcbiAgICAvLyBDb252ZXJ0IGRhdGEgaWYgbmVlZGVkXG4gICAgaWYgKHR5cGVvZiBvcHQuZGljdGlvbmFyeSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG9wdC5kaWN0aW9uYXJ5ID0gc3RyaW5ncy5zdHJpbmcyYnVmKG9wdC5kaWN0aW9uYXJ5KTtcbiAgICB9IGVsc2UgaWYgKHRvU3RyaW5nLmNhbGwob3B0LmRpY3Rpb25hcnkpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nKSB7XG4gICAgICBvcHQuZGljdGlvbmFyeSA9IG5ldyBVaW50OEFycmF5KG9wdC5kaWN0aW9uYXJ5KTtcbiAgICB9XG4gICAgaWYgKG9wdC5yYXcpIHsgLy9JbiByYXcgbW9kZSB3ZSBuZWVkIHRvIHNldCB0aGUgZGljdGlvbmFyeSBlYXJseVxuICAgICAgc3RhdHVzID0gemxpYl9pbmZsYXRlLmluZmxhdGVTZXREaWN0aW9uYXJ5KHRoaXMuc3RybSwgb3B0LmRpY3Rpb25hcnkpO1xuICAgICAgaWYgKHN0YXR1cyAhPT0gYy5aX09LKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2dbc3RhdHVzXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogSW5mbGF0ZSNwdXNoKGRhdGFbLCBtb2RlXSkgLT4gQm9vbGVhblxuICogLSBkYXRhIChVaW50OEFycmF5fEFycmF5fEFycmF5QnVmZmVyfFN0cmluZyk6IGlucHV0IGRhdGFcbiAqIC0gbW9kZSAoTnVtYmVyfEJvb2xlYW4pOiAwLi42IGZvciBjb3JyZXNwb25kaW5nIFpfTk9fRkxVU0guLlpfVFJFRSBtb2Rlcy5cbiAqICAgU2VlIGNvbnN0YW50cy4gU2tpcHBlZCBvciBgZmFsc2VgIG1lYW5zIFpfTk9fRkxVU0gsIGB0cnVlYCBtZWFucyBaX0ZJTklTSC5cbiAqXG4gKiBTZW5kcyBpbnB1dCBkYXRhIHRvIGluZmxhdGUgcGlwZSwgZ2VuZXJhdGluZyBbW0luZmxhdGUjb25EYXRhXV0gY2FsbHMgd2l0aFxuICogbmV3IG91dHB1dCBjaHVua3MuIFJldHVybnMgYHRydWVgIG9uIHN1Y2Nlc3MuIFRoZSBsYXN0IGRhdGEgYmxvY2sgbXVzdCBoYXZlXG4gKiBtb2RlIFpfRklOSVNIIChvciBgdHJ1ZWApLiBUaGF0IHdpbGwgZmx1c2ggaW50ZXJuYWwgcGVuZGluZyBidWZmZXJzIGFuZCBjYWxsXG4gKiBbW0luZmxhdGUjb25FbmRdXS4gRm9yIGludGVyaW0gZXhwbGljaXQgZmx1c2hlcyAod2l0aG91dCBlbmRpbmcgdGhlIHN0cmVhbSkgeW91XG4gKiBjYW4gdXNlIG1vZGUgWl9TWU5DX0ZMVVNILCBrZWVwaW5nIHRoZSBkZWNvbXByZXNzaW9uIGNvbnRleHQuXG4gKlxuICogT24gZmFpbCBjYWxsIFtbSW5mbGF0ZSNvbkVuZF1dIHdpdGggZXJyb3IgY29kZSBhbmQgcmV0dXJuIGZhbHNlLlxuICpcbiAqIFdlIHN0cm9uZ2x5IHJlY29tbWVuZCB0byB1c2UgYFVpbnQ4QXJyYXlgIG9uIGlucHV0IGZvciBiZXN0IHNwZWVkIChvdXRwdXRcbiAqIGZvcm1hdCBpcyBkZXRlY3RlZCBhdXRvbWF0aWNhbGx5KS4gQWxzbywgZG9uJ3Qgc2tpcCBsYXN0IHBhcmFtIGFuZCBhbHdheXNcbiAqIHVzZSB0aGUgc2FtZSB0eXBlIGluIHlvdXIgY29kZSAoYm9vbGVhbiBvciBudW1iZXIpLiBUaGF0IHdpbGwgaW1wcm92ZSBKUyBzcGVlZC5cbiAqXG4gKiBGb3IgcmVndWxhciBgQXJyYXlgLXMgbWFrZSBzdXJlIGFsbCBlbGVtZW50cyBhcmUgWzAuLjI1NV0uXG4gKlxuICogIyMjIyMgRXhhbXBsZVxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHB1c2goY2h1bmssIGZhbHNlKTsgLy8gcHVzaCBvbmUgb2YgZGF0YSBjaHVua3NcbiAqIC4uLlxuICogcHVzaChjaHVuaywgdHJ1ZSk7ICAvLyBwdXNoIGxhc3QgY2h1bmtcbiAqIGBgYFxuICoqL1xuSW5mbGF0ZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChkYXRhLCBtb2RlKSB7XG4gIHZhciBzdHJtID0gdGhpcy5zdHJtO1xuICB2YXIgY2h1bmtTaXplID0gdGhpcy5vcHRpb25zLmNodW5rU2l6ZTtcbiAgdmFyIGRpY3Rpb25hcnkgPSB0aGlzLm9wdGlvbnMuZGljdGlvbmFyeTtcbiAgdmFyIHN0YXR1cywgX21vZGU7XG4gIHZhciBuZXh0X291dF91dGY4LCB0YWlsLCB1dGY4c3RyO1xuXG4gIC8vIEZsYWcgdG8gcHJvcGVybHkgcHJvY2VzcyBaX0JVRl9FUlJPUiBvbiB0ZXN0aW5nIGluZmxhdGUgY2FsbFxuICAvLyB3aGVuIHdlIGNoZWNrIHRoYXQgYWxsIG91dHB1dCBkYXRhIHdhcyBmbHVzaGVkLlxuICB2YXIgYWxsb3dCdWZFcnJvciA9IGZhbHNlO1xuXG4gIGlmICh0aGlzLmVuZGVkKSB7IHJldHVybiBmYWxzZTsgfVxuICBfbW9kZSA9IChtb2RlID09PSB+fm1vZGUpID8gbW9kZSA6ICgobW9kZSA9PT0gdHJ1ZSkgPyBjLlpfRklOSVNIIDogYy5aX05PX0ZMVVNIKTtcblxuICAvLyBDb252ZXJ0IGRhdGEgaWYgbmVlZGVkXG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBPbmx5IGJpbmFyeSBzdHJpbmdzIGNhbiBiZSBkZWNvbXByZXNzZWQgb24gcHJhY3RpY2VcbiAgICBzdHJtLmlucHV0ID0gc3RyaW5ncy5iaW5zdHJpbmcyYnVmKGRhdGEpO1xuICB9IGVsc2UgaWYgKHRvU3RyaW5nLmNhbGwoZGF0YSkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXScpIHtcbiAgICBzdHJtLmlucHV0ID0gbmV3IFVpbnQ4QXJyYXkoZGF0YSk7XG4gIH0gZWxzZSB7XG4gICAgc3RybS5pbnB1dCA9IGRhdGE7XG4gIH1cblxuICBzdHJtLm5leHRfaW4gPSAwO1xuICBzdHJtLmF2YWlsX2luID0gc3RybS5pbnB1dC5sZW5ndGg7XG5cbiAgZG8ge1xuICAgIGlmIChzdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgc3RybS5vdXRwdXQgPSBuZXcgdXRpbHMuQnVmOChjaHVua1NpemUpO1xuICAgICAgc3RybS5uZXh0X291dCA9IDA7XG4gICAgICBzdHJtLmF2YWlsX291dCA9IGNodW5rU2l6ZTtcbiAgICB9XG5cbiAgICBzdGF0dXMgPSB6bGliX2luZmxhdGUuaW5mbGF0ZShzdHJtLCBjLlpfTk9fRkxVU0gpOyAgICAvKiBubyBiYWQgcmV0dXJuIHZhbHVlICovXG5cbiAgICBpZiAoc3RhdHVzID09PSBjLlpfTkVFRF9ESUNUICYmIGRpY3Rpb25hcnkpIHtcbiAgICAgIHN0YXR1cyA9IHpsaWJfaW5mbGF0ZS5pbmZsYXRlU2V0RGljdGlvbmFyeSh0aGlzLnN0cm0sIGRpY3Rpb25hcnkpO1xuICAgIH1cblxuICAgIGlmIChzdGF0dXMgPT09IGMuWl9CVUZfRVJST1IgJiYgYWxsb3dCdWZFcnJvciA9PT0gdHJ1ZSkge1xuICAgICAgc3RhdHVzID0gYy5aX09LO1xuICAgICAgYWxsb3dCdWZFcnJvciA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChzdGF0dXMgIT09IGMuWl9TVFJFQU1fRU5EICYmIHN0YXR1cyAhPT0gYy5aX09LKSB7XG4gICAgICB0aGlzLm9uRW5kKHN0YXR1cyk7XG4gICAgICB0aGlzLmVuZGVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoc3RybS5uZXh0X291dCkge1xuICAgICAgaWYgKHN0cm0uYXZhaWxfb3V0ID09PSAwIHx8IHN0YXR1cyA9PT0gYy5aX1NUUkVBTV9FTkQgfHwgKHN0cm0uYXZhaWxfaW4gPT09IDAgJiYgKF9tb2RlID09PSBjLlpfRklOSVNIIHx8IF9tb2RlID09PSBjLlpfU1lOQ19GTFVTSCkpKSB7XG5cbiAgICAgICAgaWYgKHRoaXMub3B0aW9ucy50byA9PT0gJ3N0cmluZycpIHtcblxuICAgICAgICAgIG5leHRfb3V0X3V0ZjggPSBzdHJpbmdzLnV0Zjhib3JkZXIoc3RybS5vdXRwdXQsIHN0cm0ubmV4dF9vdXQpO1xuXG4gICAgICAgICAgdGFpbCA9IHN0cm0ubmV4dF9vdXQgLSBuZXh0X291dF91dGY4O1xuICAgICAgICAgIHV0ZjhzdHIgPSBzdHJpbmdzLmJ1ZjJzdHJpbmcoc3RybS5vdXRwdXQsIG5leHRfb3V0X3V0ZjgpO1xuXG4gICAgICAgICAgLy8gbW92ZSB0YWlsXG4gICAgICAgICAgc3RybS5uZXh0X291dCA9IHRhaWw7XG4gICAgICAgICAgc3RybS5hdmFpbF9vdXQgPSBjaHVua1NpemUgLSB0YWlsO1xuICAgICAgICAgIGlmICh0YWlsKSB7IHV0aWxzLmFycmF5U2V0KHN0cm0ub3V0cHV0LCBzdHJtLm91dHB1dCwgbmV4dF9vdXRfdXRmOCwgdGFpbCwgMCk7IH1cblxuICAgICAgICAgIHRoaXMub25EYXRhKHV0ZjhzdHIpO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5vbkRhdGEodXRpbHMuc2hyaW5rQnVmKHN0cm0ub3V0cHV0LCBzdHJtLm5leHRfb3V0KSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXaGVuIG5vIG1vcmUgaW5wdXQgZGF0YSwgd2Ugc2hvdWxkIGNoZWNrIHRoYXQgaW50ZXJuYWwgaW5mbGF0ZSBidWZmZXJzXG4gICAgLy8gYXJlIGZsdXNoZWQuIFRoZSBvbmx5IHdheSB0byBkbyBpdCB3aGVuIGF2YWlsX291dCA9IDAgLSBydW4gb25lIG1vcmVcbiAgICAvLyBpbmZsYXRlIHBhc3MuIEJ1dCBpZiBvdXRwdXQgZGF0YSBub3QgZXhpc3RzLCBpbmZsYXRlIHJldHVybiBaX0JVRl9FUlJPUi5cbiAgICAvLyBIZXJlIHdlIHNldCBmbGFnIHRvIHByb2Nlc3MgdGhpcyBlcnJvciBwcm9wZXJseS5cbiAgICAvL1xuICAgIC8vIE5PVEUuIERlZmxhdGUgZG9lcyBub3QgcmV0dXJuIGVycm9yIGluIHRoaXMgY2FzZSBhbmQgZG9lcyBub3QgbmVlZHMgc3VjaFxuICAgIC8vIGxvZ2ljLlxuICAgIGlmIChzdHJtLmF2YWlsX2luID09PSAwICYmIHN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICBhbGxvd0J1ZkVycm9yID0gdHJ1ZTtcbiAgICB9XG5cbiAgfSB3aGlsZSAoKHN0cm0uYXZhaWxfaW4gPiAwIHx8IHN0cm0uYXZhaWxfb3V0ID09PSAwKSAmJiBzdGF0dXMgIT09IGMuWl9TVFJFQU1fRU5EKTtcblxuICBpZiAoc3RhdHVzID09PSBjLlpfU1RSRUFNX0VORCkge1xuICAgIF9tb2RlID0gYy5aX0ZJTklTSDtcbiAgfVxuXG4gIC8vIEZpbmFsaXplIG9uIHRoZSBsYXN0IGNodW5rLlxuICBpZiAoX21vZGUgPT09IGMuWl9GSU5JU0gpIHtcbiAgICBzdGF0dXMgPSB6bGliX2luZmxhdGUuaW5mbGF0ZUVuZCh0aGlzLnN0cm0pO1xuICAgIHRoaXMub25FbmQoc3RhdHVzKTtcbiAgICB0aGlzLmVuZGVkID0gdHJ1ZTtcbiAgICByZXR1cm4gc3RhdHVzID09PSBjLlpfT0s7XG4gIH1cblxuICAvLyBjYWxsYmFjayBpbnRlcmltIHJlc3VsdHMgaWYgWl9TWU5DX0ZMVVNILlxuICBpZiAoX21vZGUgPT09IGMuWl9TWU5DX0ZMVVNIKSB7XG4gICAgdGhpcy5vbkVuZChjLlpfT0spO1xuICAgIHN0cm0uYXZhaWxfb3V0ID0gMDtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqIEluZmxhdGUjb25EYXRhKGNodW5rKSAtPiBWb2lkXG4gKiAtIGNodW5rIChVaW50OEFycmF5fEFycmF5fFN0cmluZyk6IG91dHB1dCBkYXRhLiBUeXBlIG9mIGFycmF5IGRlcGVuZHNcbiAqICAgb24ganMgZW5naW5lIHN1cHBvcnQuIFdoZW4gc3RyaW5nIG91dHB1dCByZXF1ZXN0ZWQsIGVhY2ggY2h1bmtcbiAqICAgd2lsbCBiZSBzdHJpbmcuXG4gKlxuICogQnkgZGVmYXVsdCwgc3RvcmVzIGRhdGEgYmxvY2tzIGluIGBjaHVua3NbXWAgcHJvcGVydHkgYW5kIGdsdWVcbiAqIHRob3NlIGluIGBvbkVuZGAuIE92ZXJyaWRlIHRoaXMgaGFuZGxlciwgaWYgeW91IG5lZWQgYW5vdGhlciBiZWhhdmlvdXIuXG4gKiovXG5JbmZsYXRlLnByb3RvdHlwZS5vbkRhdGEgPSBmdW5jdGlvbiAoY2h1bmspIHtcbiAgdGhpcy5jaHVua3MucHVzaChjaHVuayk7XG59O1xuXG5cbi8qKlxuICogSW5mbGF0ZSNvbkVuZChzdGF0dXMpIC0+IFZvaWRcbiAqIC0gc3RhdHVzIChOdW1iZXIpOiBpbmZsYXRlIHN0YXR1cy4gMCAoWl9PSykgb24gc3VjY2VzcyxcbiAqICAgb3RoZXIgaWYgbm90LlxuICpcbiAqIENhbGxlZCBlaXRoZXIgYWZ0ZXIgeW91IHRlbGwgaW5mbGF0ZSB0aGF0IHRoZSBpbnB1dCBzdHJlYW0gaXNcbiAqIGNvbXBsZXRlIChaX0ZJTklTSCkgb3Igc2hvdWxkIGJlIGZsdXNoZWQgKFpfU1lOQ19GTFVTSClcbiAqIG9yIGlmIGFuIGVycm9yIGhhcHBlbmVkLiBCeSBkZWZhdWx0IC0gam9pbiBjb2xsZWN0ZWQgY2h1bmtzLFxuICogZnJlZSBtZW1vcnkgYW5kIGZpbGwgYHJlc3VsdHNgIC8gYGVycmAgcHJvcGVydGllcy5cbiAqKi9cbkluZmxhdGUucHJvdG90eXBlLm9uRW5kID0gZnVuY3Rpb24gKHN0YXR1cykge1xuICAvLyBPbiBzdWNjZXNzIC0gam9pblxuICBpZiAoc3RhdHVzID09PSBjLlpfT0spIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRvID09PSAnc3RyaW5nJykge1xuICAgICAgLy8gR2x1ZSAmIGNvbnZlcnQgaGVyZSwgdW50aWwgd2UgdGVhY2ggcGFrbyB0byBzZW5kXG4gICAgICAvLyB1dGY4IGFsaWduZWQgc3RyaW5ncyB0byBvbkRhdGFcbiAgICAgIHRoaXMucmVzdWx0ID0gdGhpcy5jaHVua3Muam9pbignJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVzdWx0ID0gdXRpbHMuZmxhdHRlbkNodW5rcyh0aGlzLmNodW5rcyk7XG4gICAgfVxuICB9XG4gIHRoaXMuY2h1bmtzID0gW107XG4gIHRoaXMuZXJyID0gc3RhdHVzO1xuICB0aGlzLm1zZyA9IHRoaXMuc3RybS5tc2c7XG59O1xuXG5cbi8qKlxuICogaW5mbGF0ZShkYXRhWywgb3B0aW9uc10pIC0+IFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nXG4gKiAtIGRhdGEgKFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nKTogaW5wdXQgZGF0YSB0byBkZWNvbXByZXNzLlxuICogLSBvcHRpb25zIChPYmplY3QpOiB6bGliIGluZmxhdGUgb3B0aW9ucy5cbiAqXG4gKiBEZWNvbXByZXNzIGBkYXRhYCB3aXRoIGluZmxhdGUvdW5nemlwIGFuZCBgb3B0aW9uc2AuIEF1dG9kZXRlY3RcbiAqIGZvcm1hdCB2aWEgd3JhcHBlciBoZWFkZXIgYnkgZGVmYXVsdC4gVGhhdCdzIHdoeSB3ZSBkb24ndCBwcm92aWRlXG4gKiBzZXBhcmF0ZSBgdW5nemlwYCBtZXRob2QuXG4gKlxuICogU3VwcG9ydGVkIG9wdGlvbnMgYXJlOlxuICpcbiAqIC0gd2luZG93Qml0c1xuICpcbiAqIFtodHRwOi8vemxpYi5uZXQvbWFudWFsLmh0bWwjQWR2YW5jZWRdKGh0dHA6Ly96bGliLm5ldC9tYW51YWwuaHRtbCNBZHZhbmNlZClcbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICpcbiAqIFN1Z2FyIChvcHRpb25zKTpcbiAqXG4gKiAtIGByYXdgIChCb29sZWFuKSAtIHNheSB0aGF0IHdlIHdvcmsgd2l0aCByYXcgc3RyZWFtLCBpZiB5b3UgZG9uJ3Qgd2lzaCB0byBzcGVjaWZ5XG4gKiAgIG5lZ2F0aXZlIHdpbmRvd0JpdHMgaW1wbGljaXRseS5cbiAqIC0gYHRvYCAoU3RyaW5nKSAtIGlmIGVxdWFsIHRvICdzdHJpbmcnLCB0aGVuIHJlc3VsdCB3aWxsIGJlIGNvbnZlcnRlZFxuICogICBmcm9tIHV0ZjggdG8gdXRmMTYgKGphdmFzY3JpcHQpIHN0cmluZy4gV2hlbiBzdHJpbmcgb3V0cHV0IHJlcXVlc3RlZCxcbiAqICAgY2h1bmsgbGVuZ3RoIGNhbiBkaWZmZXIgZnJvbSBgY2h1bmtTaXplYCwgZGVwZW5kaW5nIG9uIGNvbnRlbnQuXG4gKlxuICpcbiAqICMjIyMjIEV4YW1wbGU6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIHBha28gPSByZXF1aXJlKCdwYWtvJylcbiAqICAgLCBpbnB1dCA9IHBha28uZGVmbGF0ZShbMSwyLDMsNCw1LDYsNyw4LDldKVxuICogICAsIG91dHB1dDtcbiAqXG4gKiB0cnkge1xuICogICBvdXRwdXQgPSBwYWtvLmluZmxhdGUoaW5wdXQpO1xuICogfSBjYXRjaCAoZXJyKVxuICogICBjb25zb2xlLmxvZyhlcnIpO1xuICogfVxuICogYGBgXG4gKiovXG5mdW5jdGlvbiBpbmZsYXRlKGlucHV0LCBvcHRpb25zKSB7XG4gIHZhciBpbmZsYXRvciA9IG5ldyBJbmZsYXRlKG9wdGlvbnMpO1xuXG4gIGluZmxhdG9yLnB1c2goaW5wdXQsIHRydWUpO1xuXG4gIC8vIFRoYXQgd2lsbCBuZXZlciBoYXBwZW5zLCBpZiB5b3UgZG9uJ3QgY2hlYXQgd2l0aCBvcHRpb25zIDopXG4gIGlmIChpbmZsYXRvci5lcnIpIHsgdGhyb3cgaW5mbGF0b3IubXNnIHx8IG1zZ1tpbmZsYXRvci5lcnJdOyB9XG5cbiAgcmV0dXJuIGluZmxhdG9yLnJlc3VsdDtcbn1cblxuXG4vKipcbiAqIGluZmxhdGVSYXcoZGF0YVssIG9wdGlvbnNdKSAtPiBVaW50OEFycmF5fEFycmF5fFN0cmluZ1xuICogLSBkYXRhIChVaW50OEFycmF5fEFycmF5fFN0cmluZyk6IGlucHV0IGRhdGEgdG8gZGVjb21wcmVzcy5cbiAqIC0gb3B0aW9ucyAoT2JqZWN0KTogemxpYiBpbmZsYXRlIG9wdGlvbnMuXG4gKlxuICogVGhlIHNhbWUgYXMgW1tpbmZsYXRlXV0sIGJ1dCBjcmVhdGVzIHJhdyBkYXRhLCB3aXRob3V0IHdyYXBwZXJcbiAqIChoZWFkZXIgYW5kIGFkbGVyMzIgY3JjKS5cbiAqKi9cbmZ1bmN0aW9uIGluZmxhdGVSYXcoaW5wdXQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMucmF3ID0gdHJ1ZTtcbiAgcmV0dXJuIGluZmxhdGUoaW5wdXQsIG9wdGlvbnMpO1xufVxuXG5cbi8qKlxuICogdW5nemlwKGRhdGFbLCBvcHRpb25zXSkgLT4gVWludDhBcnJheXxBcnJheXxTdHJpbmdcbiAqIC0gZGF0YSAoVWludDhBcnJheXxBcnJheXxTdHJpbmcpOiBpbnB1dCBkYXRhIHRvIGRlY29tcHJlc3MuXG4gKiAtIG9wdGlvbnMgKE9iamVjdCk6IHpsaWIgaW5mbGF0ZSBvcHRpb25zLlxuICpcbiAqIEp1c3Qgc2hvcnRjdXQgdG8gW1tpbmZsYXRlXV0sIGJlY2F1c2UgaXQgYXV0b2RldGVjdHMgZm9ybWF0XG4gKiBieSBoZWFkZXIuY29udGVudC4gRG9uZSBmb3IgY29udmVuaWVuY2UuXG4gKiovXG5cblxuZXhwb3J0cy5JbmZsYXRlID0gSW5mbGF0ZTtcbmV4cG9ydHMuaW5mbGF0ZSA9IGluZmxhdGU7XG5leHBvcnRzLmluZmxhdGVSYXcgPSBpbmZsYXRlUmF3O1xuZXhwb3J0cy51bmd6aXAgID0gaW5mbGF0ZTtcbiIsICIvLyBUb3AgbGV2ZWwgZmlsZSBpcyBqdXN0IGEgbWl4aW4gb2Ygc3VibW9kdWxlcyAmIGNvbnN0YW50c1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgYXNzaWduICAgID0gcmVxdWlyZSgnLi9saWIvdXRpbHMvY29tbW9uJykuYXNzaWduO1xuXG52YXIgZGVmbGF0ZSAgID0gcmVxdWlyZSgnLi9saWIvZGVmbGF0ZScpO1xudmFyIGluZmxhdGUgICA9IHJlcXVpcmUoJy4vbGliL2luZmxhdGUnKTtcbnZhciBjb25zdGFudHMgPSByZXF1aXJlKCcuL2xpYi96bGliL2NvbnN0YW50cycpO1xuXG52YXIgcGFrbyA9IHt9O1xuXG5hc3NpZ24ocGFrbywgZGVmbGF0ZSwgaW5mbGF0ZSwgY29uc3RhbnRzKTtcblxubW9kdWxlLmV4cG9ydHMgPSBwYWtvO1xuIiwgIlxuOyhmdW5jdGlvbigpe1xudmFyIFVQTkcgPSB7fTtcblxuLy8gTWFrZSBhdmFpbGFibGUgZm9yIGltcG9ydCBieSBgcmVxdWlyZSgpYFxudmFyIHBha287XG5pZiAodHlwZW9mIG1vZHVsZSA9PSBcIm9iamVjdFwiKSB7bW9kdWxlLmV4cG9ydHMgPSBVUE5HO30gIGVsc2Uge3dpbmRvdy5VUE5HID0gVVBORzt9XG5pZiAodHlwZW9mIHJlcXVpcmUgPT0gXCJmdW5jdGlvblwiKSB7cGFrbyA9IHJlcXVpcmUoXCJwYWtvXCIpO30gIGVsc2Uge3Bha28gPSB3aW5kb3cucGFrbzt9XG5mdW5jdGlvbiBsb2coKSB7IGlmICh0eXBlb2YgcHJvY2Vzcz09XCJ1bmRlZmluZWRcIiB8fCBwcm9jZXNzLmVudi5OT0RFX0VOVj09XCJkZXZlbG9wbWVudFwiKSBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpOyAgfVxuKGZ1bmN0aW9uKFVQTkcsIHBha28pe1xuXG5cdFxuXG5cdFxuXG5VUE5HLnRvUkdCQTggPSBmdW5jdGlvbihvdXQpXG57XG5cdHZhciB3ID0gb3V0LndpZHRoLCBoID0gb3V0LmhlaWdodDtcblx0aWYob3V0LnRhYnMuYWNUTD09bnVsbCkgcmV0dXJuIFtVUE5HLnRvUkdCQTguZGVjb2RlSW1hZ2Uob3V0LmRhdGEsIHcsIGgsIG91dCkuYnVmZmVyXTtcblx0XG5cdHZhciBmcm1zID0gW107XG5cdGlmKG91dC5mcmFtZXNbMF0uZGF0YT09bnVsbCkgb3V0LmZyYW1lc1swXS5kYXRhID0gb3V0LmRhdGE7XG5cdFxuXHR2YXIgaW1nLCBlbXB0eSA9IG5ldyBVaW50OEFycmF5KHcqaCo0KTtcblx0Zm9yKHZhciBpPTA7IGk8b3V0LmZyYW1lcy5sZW5ndGg7IGkrKylcblx0e1xuXHRcdHZhciBmcm0gPSBvdXQuZnJhbWVzW2ldO1xuXHRcdHZhciBmeD1mcm0ucmVjdC54LCBmeT1mcm0ucmVjdC55LCBmdyA9IGZybS5yZWN0LndpZHRoLCBmaCA9IGZybS5yZWN0LmhlaWdodDtcblx0XHR2YXIgZmRhdGEgPSBVUE5HLnRvUkdCQTguZGVjb2RlSW1hZ2UoZnJtLmRhdGEsIGZ3LGZoLCBvdXQpO1xuXHRcdFxuXHRcdGlmKGk9PTApIGltZyA9IGZkYXRhO1xuXHRcdGVsc2UgaWYoZnJtLmJsZW5kICA9PTApIFVQTkcuX2NvcHlUaWxlKGZkYXRhLCBmdywgZmgsIGltZywgdywgaCwgZngsIGZ5LCAwKTtcblx0XHRlbHNlIGlmKGZybS5ibGVuZCAgPT0xKSBVUE5HLl9jb3B5VGlsZShmZGF0YSwgZncsIGZoLCBpbWcsIHcsIGgsIGZ4LCBmeSwgMSk7XG5cdFx0XG5cdFx0ZnJtcy5wdXNoKGltZy5idWZmZXIpOyAgaW1nID0gaW1nLnNsaWNlKDApO1xuXHRcdFxuXHRcdGlmICAgICAoZnJtLmRpc3Bvc2U9PTApIHt9XG5cdFx0ZWxzZSBpZihmcm0uZGlzcG9zZT09MSkgVVBORy5fY29weVRpbGUoZW1wdHksIGZ3LCBmaCwgaW1nLCB3LCBoLCBmeCwgZnksIDApO1xuXHRcdGVsc2UgaWYoZnJtLmRpc3Bvc2U9PTIpIHtcblx0XHRcdHZhciBwaSA9IGktMTtcblx0XHRcdHdoaWxlKG91dC5mcmFtZXNbcGldLmRpc3Bvc2U9PTIpIHBpLS07XG5cdFx0XHRpbWcgPSBuZXcgVWludDhBcnJheShmcm1zW3BpXSkuc2xpY2UoMCk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBmcm1zO1xufVxuVVBORy50b1JHQkE4LmRlY29kZUltYWdlID0gZnVuY3Rpb24oZGF0YSwgdywgaCwgb3V0KVxue1xuXHR2YXIgYXJlYSA9IHcqaCwgYnBwID0gVVBORy5kZWNvZGUuX2dldEJQUChvdXQpO1xuXHR2YXIgYnBsID0gTWF0aC5jZWlsKHcqYnBwLzgpO1x0Ly8gYnl0ZXMgcGVyIGxpbmVcblxuXHR2YXIgYmYgPSBuZXcgVWludDhBcnJheShhcmVhKjQpLCBiZjMyID0gbmV3IFVpbnQzMkFycmF5KGJmLmJ1ZmZlcik7XG5cdHZhciBjdHlwZSA9IG91dC5jdHlwZSwgZGVwdGggPSBvdXQuZGVwdGg7XG5cdHZhciBycyA9IFVQTkcuX2Jpbi5yZWFkVXNob3J0O1xuXHRcblx0Ly9jb25zb2xlLmxvZyhjdHlwZSwgZGVwdGgpO1xuXG5cdGlmICAgICAoY3R5cGU9PTYpIHsgLy8gUkdCICsgYWxwaGFcblx0XHR2YXIgcWFyZWEgPSBhcmVhPDwyO1xuXHRcdGlmKGRlcHRoPT0gOCkgZm9yKHZhciBpPTA7IGk8cWFyZWE7aSsrKSB7ICBiZltpXSA9IGRhdGFbaV07ICAvKmlmKChpJjMpPT0zICYmIGRhdGFbaV0hPTApIGJmW2ldPTI1NTsqLyB9XG5cdFx0aWYoZGVwdGg9PTE2KSBmb3IodmFyIGk9MDsgaTxxYXJlYTtpKyspIHsgIGJmW2ldID0gZGF0YVtpPDwxXTsgIH1cblx0fVxuXHRlbHNlIGlmKGN0eXBlPT0yKSB7XHQvLyBSR0Jcblx0XHR2YXIgdHM9b3V0LnRhYnNbXCJ0Uk5TXCJdLCB0cj0tMSwgdGc9LTEsIHRiPS0xO1xuXHRcdGlmKHRzKSB7ICB0cj10c1swXTsgIHRnPXRzWzFdOyAgdGI9dHNbMl07ICB9XG5cdFx0aWYoZGVwdGg9PSA4KSBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgIHZhciBxaT1pPDwyLCB0aT1pKjM7ICBiZltxaV0gPSBkYXRhW3RpXTsgIGJmW3FpKzFdID0gZGF0YVt0aSsxXTsgIGJmW3FpKzJdID0gZGF0YVt0aSsyXTsgIGJmW3FpKzNdID0gMjU1O1xuXHRcdFx0aWYodHIhPS0xICYmIGRhdGFbdGldICAgPT10ciAmJiBkYXRhW3RpKzFdICAgPT10ZyAmJiBkYXRhW3RpKzJdICAgPT10YikgYmZbcWkrM10gPSAwOyAgfVxuXHRcdGlmKGRlcHRoPT0xNikgZm9yKHZhciBpPTA7IGk8YXJlYTsgaSsrKSB7ICB2YXIgcWk9aTw8MiwgdGk9aSo2OyAgYmZbcWldID0gZGF0YVt0aV07ICBiZltxaSsxXSA9IGRhdGFbdGkrMl07ICBiZltxaSsyXSA9IGRhdGFbdGkrNF07ICBiZltxaSszXSA9IDI1NTtcblx0XHRcdGlmKHRyIT0tMSAmJiBycyhkYXRhLHRpKT09dHIgJiYgcnMoZGF0YSx0aSsyKT09dGcgJiYgcnMoZGF0YSx0aSs0KT09dGIpIGJmW3FpKzNdID0gMDsgIH1cblx0fVxuXHRlbHNlIGlmKGN0eXBlPT0zKSB7XHQvLyBwYWxldHRlXG5cdFx0dmFyIHA9b3V0LnRhYnNbXCJQTFRFXCJdLCBhcD1vdXQudGFic1tcInRSTlNcIl0sIHRsPWFwP2FwLmxlbmd0aDowO1xuXHRcdC8vY29uc29sZS5sb2cocCwgYXApO1xuXHRcdGlmKGRlcHRoPT0xKSBmb3IodmFyIHk9MDsgeTxoOyB5KyspIHsgIHZhciBzMCA9IHkqYnBsLCB0MCA9IHkqdztcblx0XHRcdGZvcih2YXIgaT0wOyBpPHc7IGkrKykgeyB2YXIgcWk9KHQwK2kpPDwyLCBqPSgoZGF0YVtzMCsoaT4+MyldPj4oNy0oKGkmNyk8PDApKSkmIDEpLCBjaj0zKmo7ICBiZltxaV09cFtjal07ICBiZltxaSsxXT1wW2NqKzFdOyAgYmZbcWkrMl09cFtjaisyXTsgIGJmW3FpKzNdPShqPHRsKT9hcFtqXToyNTU7ICB9XG5cdFx0fVxuXHRcdGlmKGRlcHRoPT0yKSBmb3IodmFyIHk9MDsgeTxoOyB5KyspIHsgIHZhciBzMCA9IHkqYnBsLCB0MCA9IHkqdztcblx0XHRcdGZvcih2YXIgaT0wOyBpPHc7IGkrKykgeyB2YXIgcWk9KHQwK2kpPDwyLCBqPSgoZGF0YVtzMCsoaT4+MildPj4oNi0oKGkmMyk8PDEpKSkmIDMpLCBjaj0zKmo7ICBiZltxaV09cFtjal07ICBiZltxaSsxXT1wW2NqKzFdOyAgYmZbcWkrMl09cFtjaisyXTsgIGJmW3FpKzNdPShqPHRsKT9hcFtqXToyNTU7ICB9XG5cdFx0fVxuXHRcdGlmKGRlcHRoPT00KSBmb3IodmFyIHk9MDsgeTxoOyB5KyspIHsgIHZhciBzMCA9IHkqYnBsLCB0MCA9IHkqdztcblx0XHRcdGZvcih2YXIgaT0wOyBpPHc7IGkrKykgeyB2YXIgcWk9KHQwK2kpPDwyLCBqPSgoZGF0YVtzMCsoaT4+MSldPj4oNC0oKGkmMSk8PDIpKSkmMTUpLCBjaj0zKmo7ICBiZltxaV09cFtjal07ICBiZltxaSsxXT1wW2NqKzFdOyAgYmZbcWkrMl09cFtjaisyXTsgIGJmW3FpKzNdPShqPHRsKT9hcFtqXToyNTU7ICB9XG5cdFx0fVxuXHRcdGlmKGRlcHRoPT04KSBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKysgKSB7ICB2YXIgcWk9aTw8Miwgaj1kYXRhW2ldICAgICAgICAgICAgICAgICAgICAgICwgY2o9MypqOyAgYmZbcWldPXBbY2pdOyAgYmZbcWkrMV09cFtjaisxXTsgIGJmW3FpKzJdPXBbY2orMl07ICBiZltxaSszXT0oajx0bCk/YXBbal06MjU1OyAgfVxuXHR9XG5cdGVsc2UgaWYoY3R5cGU9PTQpIHtcdC8vIGdyYXkgKyBhbHBoYVxuXHRcdGlmKGRlcHRoPT0gOCkgIGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKykgeyAgdmFyIHFpPWk8PDIsIGRpPWk8PDEsIGdyPWRhdGFbZGldOyAgYmZbcWldPWdyOyAgYmZbcWkrMV09Z3I7ICBiZltxaSsyXT1ncjsgIGJmW3FpKzNdPWRhdGFbZGkrMV07ICB9XG5cdFx0aWYoZGVwdGg9PTE2KSAgZm9yKHZhciBpPTA7IGk8YXJlYTsgaSsrKSB7ICB2YXIgcWk9aTw8MiwgZGk9aTw8MiwgZ3I9ZGF0YVtkaV07ICBiZltxaV09Z3I7ICBiZltxaSsxXT1ncjsgIGJmW3FpKzJdPWdyOyAgYmZbcWkrM109ZGF0YVtkaSsyXTsgIH1cblx0fVxuXHRlbHNlIGlmKGN0eXBlPT0wKSB7XHQvLyBncmF5XG5cdFx0dmFyIHRyID0gb3V0LnRhYnNbXCJ0Uk5TXCJdID8gb3V0LnRhYnNbXCJ0Uk5TXCJdIDogLTE7XG5cdFx0aWYoZGVwdGg9PSAxKSBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgIHZhciBncj0yNTUqKChkYXRhW2k+PjNdPj4oNyAtKChpJjcpICAgKSkpJiAxKSwgYWw9KGdyPT10cioyNTUpPzA6MjU1OyAgYmYzMltpXT0oYWw8PDI0KXwoZ3I8PDE2KXwoZ3I8PDgpfGdyOyAgfVxuXHRcdGlmKGRlcHRoPT0gMikgZm9yKHZhciBpPTA7IGk8YXJlYTsgaSsrKSB7ICB2YXIgZ3I9IDg1KigoZGF0YVtpPj4yXT4+KDYgLSgoaSYzKTw8MSkpKSYgMyksIGFsPShncj09dHIqIDg1KT8wOjI1NTsgIGJmMzJbaV09KGFsPDwyNCl8KGdyPDwxNil8KGdyPDw4KXxncjsgIH1cblx0XHRpZihkZXB0aD09IDQpIGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKykgeyAgdmFyIGdyPSAxNyooKGRhdGFbaT4+MV0+Pig0IC0oKGkmMSk8PDIpKSkmMTUpLCBhbD0oZ3I9PXRyKiAxNyk/MDoyNTU7ICBiZjMyW2ldPShhbDw8MjQpfChncjw8MTYpfChncjw8OCl8Z3I7ICB9XG5cdFx0aWYoZGVwdGg9PSA4KSBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgIHZhciBncj1kYXRhW2kgIF0gLCBhbD0oZ3IgICAgICAgICAgID09dHIpPzA6MjU1OyAgYmYzMltpXT0oYWw8PDI0KXwoZ3I8PDE2KXwoZ3I8PDgpfGdyOyAgfVxuXHRcdGlmKGRlcHRoPT0xNikgZm9yKHZhciBpPTA7IGk8YXJlYTsgaSsrKSB7ICB2YXIgZ3I9ZGF0YVtpPDwxXSwgYWw9KHJzKGRhdGEsaTw8MSk9PXRyKT8wOjI1NTsgIGJmMzJbaV09KGFsPDwyNCl8KGdyPDwxNil8KGdyPDw4KXxncjsgIH1cblx0fVxuXHRyZXR1cm4gYmY7XG59XG5cblxuXG5VUE5HLmRlY29kZSA9IGZ1bmN0aW9uKGJ1ZmYpXG57XG5cdHZhciBkYXRhID0gbmV3IFVpbnQ4QXJyYXkoYnVmZiksIG9mZnNldCA9IDgsIGJpbiA9IFVQTkcuX2JpbiwgclVzID0gYmluLnJlYWRVc2hvcnQsIHJVaSA9IGJpbi5yZWFkVWludDtcblx0dmFyIG91dCA9IHt0YWJzOnt9LCBmcmFtZXM6W119O1xuXHR2YXIgZGQgPSBuZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCksIGRvZmYgPSAwO1x0IC8vIHB1dCBhbGwgSURBVCBkYXRhIGludG8gaXRcblx0dmFyIGZkLCBmb2ZmID0gMDtcdC8vIGZyYW1lc1xuXHRcblx0dmFyIG1nY2sgPSBbMHg4OSwgMHg1MCwgMHg0ZSwgMHg0NywgMHgwZCwgMHgwYSwgMHgxYSwgMHgwYV07XG5cdGZvcih2YXIgaT0wOyBpPDg7IGkrKykgaWYoZGF0YVtpXSE9bWdja1tpXSkgdGhyb3cgXCJUaGUgaW5wdXQgaXMgbm90IGEgUE5HIGZpbGUhXCI7XG5cblx0d2hpbGUob2Zmc2V0PGRhdGEubGVuZ3RoKVxuXHR7XG5cdFx0dmFyIGxlbiAgPSBiaW4ucmVhZFVpbnQoZGF0YSwgb2Zmc2V0KTsgIG9mZnNldCArPSA0O1xuXHRcdHZhciB0eXBlID0gYmluLnJlYWRBU0NJSShkYXRhLCBvZmZzZXQsIDQpOyAgb2Zmc2V0ICs9IDQ7XG5cdFx0Ly9sb2codHlwZSxsZW4pO1xuXHRcdFxuXHRcdGlmICAgICAodHlwZT09XCJJSERSXCIpICB7ICBVUE5HLmRlY29kZS5fSUhEUihkYXRhLCBvZmZzZXQsIG91dCk7ICB9XG5cdFx0ZWxzZSBpZih0eXBlPT1cIklEQVRcIikge1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8bGVuOyBpKyspIGRkW2RvZmYraV0gPSBkYXRhW29mZnNldCtpXTtcblx0XHRcdGRvZmYgKz0gbGVuO1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGU9PVwiYWNUTFwiKSAge1xuXHRcdFx0b3V0LnRhYnNbdHlwZV0gPSB7ICBudW1fZnJhbWVzOnJVaShkYXRhLCBvZmZzZXQpLCBudW1fcGxheXM6clVpKGRhdGEsIG9mZnNldCs0KSAgfTtcblx0XHRcdGZkID0gbmV3IFVpbnQ4QXJyYXkoZGF0YS5sZW5ndGgpO1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGU9PVwiZmNUTFwiKSAge1xuXHRcdFx0aWYoZm9mZiE9MCkgeyAgdmFyIGZyID0gb3V0LmZyYW1lc1tvdXQuZnJhbWVzLmxlbmd0aC0xXTtcblx0XHRcdFx0ZnIuZGF0YSA9IFVQTkcuZGVjb2RlLl9kZWNvbXByZXNzKG91dCwgZmQuc2xpY2UoMCxmb2ZmKSwgZnIucmVjdC53aWR0aCwgZnIucmVjdC5oZWlnaHQpOyAgZm9mZj0wO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHJjdCA9IHt4OnJVaShkYXRhLCBvZmZzZXQrMTIpLHk6clVpKGRhdGEsIG9mZnNldCsxNiksd2lkdGg6clVpKGRhdGEsIG9mZnNldCs0KSxoZWlnaHQ6clVpKGRhdGEsIG9mZnNldCs4KX07XG5cdFx0XHR2YXIgZGVsID0gclVzKGRhdGEsIG9mZnNldCsyMik7ICBkZWwgPSByVXMoZGF0YSwgb2Zmc2V0KzIwKSAvIChkZWw9PTA/MTAwOmRlbCk7XG5cdFx0XHR2YXIgZnJtID0ge3JlY3Q6cmN0LCBkZWxheTpNYXRoLnJvdW5kKGRlbCoxMDAwKSwgZGlzcG9zZTpkYXRhW29mZnNldCsyNF0sIGJsZW5kOmRhdGFbb2Zmc2V0KzI1XX07XG5cdFx0XHQvL2NvbnNvbGUubG9nKGZybSk7XG5cdFx0XHRvdXQuZnJhbWVzLnB1c2goZnJtKTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlPT1cImZkQVRcIikge1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8bGVuLTQ7IGkrKykgZmRbZm9mZitpXSA9IGRhdGFbb2Zmc2V0K2krNF07XG5cdFx0XHRmb2ZmICs9IGxlbi00O1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGU9PVwicEhZc1wiKSB7XG5cdFx0XHRvdXQudGFic1t0eXBlXSA9IFtiaW4ucmVhZFVpbnQoZGF0YSwgb2Zmc2V0KSwgYmluLnJlYWRVaW50KGRhdGEsIG9mZnNldCs0KSwgZGF0YVtvZmZzZXQrOF1dO1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGU9PVwiY0hSTVwiKSB7XG5cdFx0XHRvdXQudGFic1t0eXBlXSA9IFtdO1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8ODsgaSsrKSBvdXQudGFic1t0eXBlXS5wdXNoKGJpbi5yZWFkVWludChkYXRhLCBvZmZzZXQraSo0KSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJ0RVh0XCIpIHtcblx0XHRcdGlmKG91dC50YWJzW3R5cGVdPT1udWxsKSBvdXQudGFic1t0eXBlXSA9IHt9O1xuXHRcdFx0dmFyIG56ID0gYmluLm5leHRaZXJvKGRhdGEsIG9mZnNldCk7XG5cdFx0XHR2YXIga2V5dyA9IGJpbi5yZWFkQVNDSUkoZGF0YSwgb2Zmc2V0LCBuei1vZmZzZXQpO1xuXHRcdFx0dmFyIHRleHQgPSBiaW4ucmVhZEFTQ0lJKGRhdGEsIG56KzEsIG9mZnNldCtsZW4tbnotMSk7XG5cdFx0XHRvdXQudGFic1t0eXBlXVtrZXl3XSA9IHRleHQ7XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJpVFh0XCIpIHtcblx0XHRcdGlmKG91dC50YWJzW3R5cGVdPT1udWxsKSBvdXQudGFic1t0eXBlXSA9IHt9O1xuXHRcdFx0dmFyIG56ID0gMCwgb2ZmID0gb2Zmc2V0O1xuXHRcdFx0bnogPSBiaW4ubmV4dFplcm8oZGF0YSwgb2ZmKTtcblx0XHRcdHZhciBrZXl3ID0gYmluLnJlYWRBU0NJSShkYXRhLCBvZmYsIG56LW9mZik7ICBvZmYgPSBueiArIDE7XG5cdFx0XHR2YXIgY2ZsYWcgPSBkYXRhW29mZl0sIGNtZXRoID0gZGF0YVtvZmYrMV07ICBvZmYrPTI7XG5cdFx0XHRueiA9IGJpbi5uZXh0WmVybyhkYXRhLCBvZmYpO1xuXHRcdFx0dmFyIGx0YWcgPSBiaW4ucmVhZEFTQ0lJKGRhdGEsIG9mZiwgbnotb2ZmKTsgIG9mZiA9IG56ICsgMTtcblx0XHRcdG56ID0gYmluLm5leHRaZXJvKGRhdGEsIG9mZik7XG5cdFx0XHR2YXIgdGtleXcgPSBiaW4ucmVhZFVURjgoZGF0YSwgb2ZmLCBuei1vZmYpOyAgb2ZmID0gbnogKyAxO1xuXHRcdFx0dmFyIHRleHQgID0gYmluLnJlYWRVVEY4KGRhdGEsIG9mZiwgbGVuLShvZmYtb2Zmc2V0KSk7XG5cdFx0XHRvdXQudGFic1t0eXBlXVtrZXl3XSA9IHRleHQ7XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJQTFRFXCIpIHtcblx0XHRcdG91dC50YWJzW3R5cGVdID0gYmluLnJlYWRCeXRlcyhkYXRhLCBvZmZzZXQsIGxlbik7XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJoSVNUXCIpIHtcblx0XHRcdHZhciBwbCA9IG91dC50YWJzW1wiUExURVwiXS5sZW5ndGgvMztcblx0XHRcdG91dC50YWJzW3R5cGVdID0gW107ICBmb3IodmFyIGk9MDsgaTxwbDsgaSsrKSBvdXQudGFic1t0eXBlXS5wdXNoKHJVcyhkYXRhLCBvZmZzZXQraSoyKSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJ0Uk5TXCIpIHtcblx0XHRcdGlmICAgICAob3V0LmN0eXBlPT0zKSBvdXQudGFic1t0eXBlXSA9IGJpbi5yZWFkQnl0ZXMoZGF0YSwgb2Zmc2V0LCBsZW4pO1xuXHRcdFx0ZWxzZSBpZihvdXQuY3R5cGU9PTApIG91dC50YWJzW3R5cGVdID0gclVzKGRhdGEsIG9mZnNldCk7XG5cdFx0XHRlbHNlIGlmKG91dC5jdHlwZT09Mikgb3V0LnRhYnNbdHlwZV0gPSBbIHJVcyhkYXRhLG9mZnNldCksclVzKGRhdGEsb2Zmc2V0KzIpLHJVcyhkYXRhLG9mZnNldCs0KSBdO1xuXHRcdFx0Ly9lbHNlIGNvbnNvbGUubG9nKFwidFJOUyBmb3IgdW5zdXBwb3J0ZWQgY29sb3IgdHlwZVwiLG91dC5jdHlwZSwgbGVuKTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlPT1cImdBTUFcIikgb3V0LnRhYnNbdHlwZV0gPSBiaW4ucmVhZFVpbnQoZGF0YSwgb2Zmc2V0KS8xMDAwMDA7XG5cdFx0ZWxzZSBpZih0eXBlPT1cInNSR0JcIikgb3V0LnRhYnNbdHlwZV0gPSBkYXRhW29mZnNldF07XG5cdFx0ZWxzZSBpZih0eXBlPT1cImJLR0RcIilcblx0XHR7XG5cdFx0XHRpZiAgICAgKG91dC5jdHlwZT09MCB8fCBvdXQuY3R5cGU9PTQpIG91dC50YWJzW3R5cGVdID0gW3JVcyhkYXRhLCBvZmZzZXQpXTtcblx0XHRcdGVsc2UgaWYob3V0LmN0eXBlPT0yIHx8IG91dC5jdHlwZT09Nikgb3V0LnRhYnNbdHlwZV0gPSBbclVzKGRhdGEsIG9mZnNldCksIHJVcyhkYXRhLCBvZmZzZXQrMiksIHJVcyhkYXRhLCBvZmZzZXQrNCldO1xuXHRcdFx0ZWxzZSBpZihvdXQuY3R5cGU9PTMpIG91dC50YWJzW3R5cGVdID0gZGF0YVtvZmZzZXRdO1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGU9PVwiSUVORFwiKSB7XG5cdFx0XHRpZihmb2ZmIT0wKSB7ICB2YXIgZnIgPSBvdXQuZnJhbWVzW291dC5mcmFtZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHRmci5kYXRhID0gVVBORy5kZWNvZGUuX2RlY29tcHJlc3Mob3V0LCBmZC5zbGljZSgwLGZvZmYpLCBmci5yZWN0LndpZHRoLCBmci5yZWN0LmhlaWdodCk7ICBmb2ZmPTA7XG5cdFx0XHR9XHRcblx0XHRcdG91dC5kYXRhID0gVVBORy5kZWNvZGUuX2RlY29tcHJlc3Mob3V0LCBkZCwgb3V0LndpZHRoLCBvdXQuaGVpZ2h0KTsgIGJyZWFrO1xuXHRcdH1cblx0XHQvL2Vsc2UgeyAgbG9nKFwidW5rbm93biBjaHVuayB0eXBlXCIsIHR5cGUsIGxlbik7ICB9XG5cdFx0b2Zmc2V0ICs9IGxlbjtcblx0XHR2YXIgY3JjID0gYmluLnJlYWRVaW50KGRhdGEsIG9mZnNldCk7ICBvZmZzZXQgKz0gNDtcblx0fVxuXHRkZWxldGUgb3V0LmNvbXByZXNzOyAgZGVsZXRlIG91dC5pbnRlcmxhY2U7ICBkZWxldGUgb3V0LmZpbHRlcjtcblx0cmV0dXJuIG91dDtcbn1cblxuVVBORy5kZWNvZGUuX2RlY29tcHJlc3MgPSBmdW5jdGlvbihvdXQsIGRkLCB3LCBoKSB7XG5cdGlmKG91dC5jb21wcmVzcyA9PTApIGRkID0gVVBORy5kZWNvZGUuX2luZmxhdGUoZGQpO1xuXG5cdGlmICAgICAob3V0LmludGVybGFjZT09MCkgZGQgPSBVUE5HLmRlY29kZS5fZmlsdGVyWmVybyhkZCwgb3V0LCAwLCB3LCBoKTtcblx0ZWxzZSBpZihvdXQuaW50ZXJsYWNlPT0xKSBkZCA9IFVQTkcuZGVjb2RlLl9yZWFkSW50ZXJsYWNlKGRkLCBvdXQpO1xuXHRyZXR1cm4gZGQ7XG59XG5cblVQTkcuZGVjb2RlLl9pbmZsYXRlID0gZnVuY3Rpb24oZGF0YSkgeyAgcmV0dXJuIHBha29bXCJpbmZsYXRlXCJdKGRhdGEpOyAgfVxuXG5VUE5HLmRlY29kZS5fcmVhZEludGVybGFjZSA9IGZ1bmN0aW9uKGRhdGEsIG91dClcbntcblx0dmFyIHcgPSBvdXQud2lkdGgsIGggPSBvdXQuaGVpZ2h0O1xuXHR2YXIgYnBwID0gVVBORy5kZWNvZGUuX2dldEJQUChvdXQpLCBjYnBwID0gYnBwPj4zLCBicGwgPSBNYXRoLmNlaWwodypicHAvOCk7XG5cdHZhciBpbWcgPSBuZXcgVWludDhBcnJheSggaCAqIGJwbCApO1xuXHR2YXIgZGkgPSAwO1xuXG5cdHZhciBzdGFydGluZ19yb3cgID0gWyAwLCAwLCA0LCAwLCAyLCAwLCAxIF07XG5cdHZhciBzdGFydGluZ19jb2wgID0gWyAwLCA0LCAwLCAyLCAwLCAxLCAwIF07XG5cdHZhciByb3dfaW5jcmVtZW50ID0gWyA4LCA4LCA4LCA0LCA0LCAyLCAyIF07XG5cdHZhciBjb2xfaW5jcmVtZW50ID0gWyA4LCA4LCA0LCA0LCAyLCAyLCAxIF07XG5cblx0dmFyIHBhc3M9MDtcblx0d2hpbGUocGFzczw3KVxuXHR7XG5cdFx0dmFyIHJpID0gcm93X2luY3JlbWVudFtwYXNzXSwgY2kgPSBjb2xfaW5jcmVtZW50W3Bhc3NdO1xuXHRcdHZhciBzdyA9IDAsIHNoID0gMDtcblx0XHR2YXIgY3IgPSBzdGFydGluZ19yb3dbcGFzc107ICB3aGlsZShjcjxoKSB7ICBjcis9cmk7ICBzaCsrOyAgfVxuXHRcdHZhciBjYyA9IHN0YXJ0aW5nX2NvbFtwYXNzXTsgIHdoaWxlKGNjPHcpIHsgIGNjKz1jaTsgIHN3Kys7ICB9XG5cdFx0dmFyIGJwbGwgPSBNYXRoLmNlaWwoc3cqYnBwLzgpO1xuXHRcdFVQTkcuZGVjb2RlLl9maWx0ZXJaZXJvKGRhdGEsIG91dCwgZGksIHN3LCBzaCk7XG5cblx0XHR2YXIgeT0wLCByb3cgPSBzdGFydGluZ19yb3dbcGFzc107XG5cdFx0d2hpbGUocm93PGgpXG5cdFx0e1xuXHRcdFx0dmFyIGNvbCA9IHN0YXJ0aW5nX2NvbFtwYXNzXTtcblx0XHRcdHZhciBjZGkgPSAoZGkreSpicGxsKTw8MztcblxuXHRcdFx0d2hpbGUoY29sPHcpXG5cdFx0XHR7XG5cdFx0XHRcdGlmKGJwcD09MSkge1xuXHRcdFx0XHRcdHZhciB2YWwgPSBkYXRhW2NkaT4+M107ICB2YWwgPSAodmFsPj4oNy0oY2RpJjcpKSkmMTtcblx0XHRcdFx0XHRpbWdbcm93KmJwbCArIChjb2w+PjMpXSB8PSAodmFsIDw8ICg3LSgoY29sJjMpPDwwKSkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKGJwcD09Mikge1xuXHRcdFx0XHRcdHZhciB2YWwgPSBkYXRhW2NkaT4+M107ICB2YWwgPSAodmFsPj4oNi0oY2RpJjcpKSkmMztcblx0XHRcdFx0XHRpbWdbcm93KmJwbCArIChjb2w+PjIpXSB8PSAodmFsIDw8ICg2LSgoY29sJjMpPDwxKSkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKGJwcD09NCkge1xuXHRcdFx0XHRcdHZhciB2YWwgPSBkYXRhW2NkaT4+M107ICB2YWwgPSAodmFsPj4oNC0oY2RpJjcpKSkmMTU7XG5cdFx0XHRcdFx0aW1nW3JvdypicGwgKyAoY29sPj4xKV0gfD0gKHZhbCA8PCAoNC0oKGNvbCYxKTw8MikpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZihicHA+PTgpIHtcblx0XHRcdFx0XHR2YXIgaWkgPSByb3cqYnBsK2NvbCpjYnBwO1xuXHRcdFx0XHRcdGZvcih2YXIgaj0wOyBqPGNicHA7IGorKykgaW1nW2lpK2pdID0gZGF0YVsoY2RpPj4zKStqXTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjZGkrPWJwcDsgIGNvbCs9Y2k7XG5cdFx0XHR9XG5cdFx0XHR5Kys7ICByb3cgKz0gcmk7XG5cdFx0fVxuXHRcdGlmKHN3KnNoIT0wKSBkaSArPSBzaCAqICgxICsgYnBsbCk7XG5cdFx0cGFzcyA9IHBhc3MgKyAxO1xuXHR9XG5cdHJldHVybiBpbWc7XG59XG5cblVQTkcuZGVjb2RlLl9nZXRCUFAgPSBmdW5jdGlvbihvdXQpIHtcblx0dmFyIG5vYyA9IFsxLG51bGwsMywxLDIsbnVsbCw0XVtvdXQuY3R5cGVdO1xuXHRyZXR1cm4gbm9jICogb3V0LmRlcHRoO1xufVxuXG5VUE5HLmRlY29kZS5fZmlsdGVyWmVybyA9IGZ1bmN0aW9uKGRhdGEsIG91dCwgb2ZmLCB3LCBoKVxue1xuXHR2YXIgYnBwID0gVVBORy5kZWNvZGUuX2dldEJQUChvdXQpLCBicGwgPSBNYXRoLmNlaWwodypicHAvOCksIHBhZXRoID0gVVBORy5kZWNvZGUuX3BhZXRoO1xuXHRicHAgPSBNYXRoLmNlaWwoYnBwLzgpO1xuXG5cdGZvcih2YXIgeT0wOyB5PGg7IHkrKykgIHtcblx0XHR2YXIgaSA9IG9mZit5KmJwbCwgZGkgPSBpK3krMTtcblx0XHR2YXIgdHlwZSA9IGRhdGFbZGktMV07XG5cblx0XHRpZiAgICAgKHR5cGU9PTApIGZvcih2YXIgeD0gIDA7IHg8YnBsOyB4KyspIGRhdGFbaSt4XSA9IGRhdGFbZGkreF07XG5cdFx0ZWxzZSBpZih0eXBlPT0xKSB7XG5cdFx0XHRmb3IodmFyIHg9ICAwOyB4PGJwcDsgeCsrKSBkYXRhW2kreF0gPSBkYXRhW2RpK3hdO1xuXHRcdFx0Zm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtpK3hdID0gKGRhdGFbZGkreF0gKyBkYXRhW2kreC1icHBdKSYyNTU7XG5cdFx0fVxuXHRcdGVsc2UgaWYoeT09MCkge1xuXHRcdFx0Zm9yKHZhciB4PSAgMDsgeDxicHA7IHgrKykgZGF0YVtpK3hdID0gZGF0YVtkaSt4XTtcblx0XHRcdGlmKHR5cGU9PTIpIGZvcih2YXIgeD1icHA7IHg8YnBsOyB4KyspIGRhdGFbaSt4XSA9IChkYXRhW2RpK3hdKSYyNTU7XG5cdFx0XHRpZih0eXBlPT0zKSBmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2kreF0gPSAoZGF0YVtkaSt4XSArIChkYXRhW2kreC1icHBdPj4xKSApJjI1NTtcblx0XHRcdGlmKHR5cGU9PTQpIGZvcih2YXIgeD1icHA7IHg8YnBsOyB4KyspIGRhdGFbaSt4XSA9IChkYXRhW2RpK3hdICsgcGFldGgoZGF0YVtpK3gtYnBwXSwgMCwgMCkgKSYyNTU7XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0aWYodHlwZT09MikgeyBmb3IodmFyIHg9ICAwOyB4PGJwbDsgeCsrKSBkYXRhW2kreF0gPSAoZGF0YVtkaSt4XSArIGRhdGFbaSt4LWJwbF0pJjI1NTsgIH1cblxuXHRcdFx0aWYodHlwZT09MykgeyBmb3IodmFyIHg9ICAwOyB4PGJwcDsgeCsrKSBkYXRhW2kreF0gPSAoZGF0YVtkaSt4XSArIChkYXRhW2kreC1icGxdPj4xKSkmMjU1O1xuXHRcdFx0ICAgICAgICAgICAgICBmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2kreF0gPSAoZGF0YVtkaSt4XSArICgoZGF0YVtpK3gtYnBsXStkYXRhW2kreC1icHBdKT4+MSkgKSYyNTU7ICB9XG5cblx0XHRcdGlmKHR5cGU9PTQpIHsgZm9yKHZhciB4PSAgMDsgeDxicHA7IHgrKykgZGF0YVtpK3hdID0gKGRhdGFbZGkreF0gKyBwYWV0aCgwLCBkYXRhW2kreC1icGxdLCAwKSkmMjU1O1xuXHRcdFx0XHRcdFx0ICBmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2kreF0gPSAoZGF0YVtkaSt4XSArIHBhZXRoKGRhdGFbaSt4LWJwcF0sIGRhdGFbaSt4LWJwbF0sIGRhdGFbaSt4LWJwcC1icGxdKSApJjI1NTsgIH1cblx0XHR9XG5cdH1cblx0cmV0dXJuIGRhdGE7XG59XG5cblVQTkcuZGVjb2RlLl9wYWV0aCA9IGZ1bmN0aW9uKGEsYixjKVxue1xuXHR2YXIgcCA9IGErYi1jLCBwYSA9IE1hdGguYWJzKHAtYSksIHBiID0gTWF0aC5hYnMocC1iKSwgcGMgPSBNYXRoLmFicyhwLWMpO1xuXHRpZiAocGEgPD0gcGIgJiYgcGEgPD0gcGMpICByZXR1cm4gYTtcblx0ZWxzZSBpZiAocGIgPD0gcGMpICByZXR1cm4gYjtcblx0cmV0dXJuIGM7XG59XG5cblVQTkcuZGVjb2RlLl9JSERSID0gZnVuY3Rpb24oZGF0YSwgb2Zmc2V0LCBvdXQpXG57XG5cdHZhciBiaW4gPSBVUE5HLl9iaW47XG5cdG91dC53aWR0aCAgPSBiaW4ucmVhZFVpbnQoZGF0YSwgb2Zmc2V0KTsgIG9mZnNldCArPSA0O1xuXHRvdXQuaGVpZ2h0ID0gYmluLnJlYWRVaW50KGRhdGEsIG9mZnNldCk7ICBvZmZzZXQgKz0gNDtcblx0b3V0LmRlcHRoICAgICA9IGRhdGFbb2Zmc2V0XTsgIG9mZnNldCsrO1xuXHRvdXQuY3R5cGUgICAgID0gZGF0YVtvZmZzZXRdOyAgb2Zmc2V0Kys7XG5cdG91dC5jb21wcmVzcyAgPSBkYXRhW29mZnNldF07ICBvZmZzZXQrKztcblx0b3V0LmZpbHRlciAgICA9IGRhdGFbb2Zmc2V0XTsgIG9mZnNldCsrO1xuXHRvdXQuaW50ZXJsYWNlID0gZGF0YVtvZmZzZXRdOyAgb2Zmc2V0Kys7XG59XG5cblVQTkcuX2JpbiA9IHtcblx0bmV4dFplcm8gICA6IGZ1bmN0aW9uKGRhdGEscCkgIHsgIHdoaWxlKGRhdGFbcF0hPTApIHArKzsgIHJldHVybiBwOyAgfSxcblx0cmVhZFVzaG9ydCA6IGZ1bmN0aW9uKGJ1ZmYscCkgIHsgIHJldHVybiAoYnVmZltwXTw8IDgpIHwgYnVmZltwKzFdOyAgfSxcblx0d3JpdGVVc2hvcnQ6IGZ1bmN0aW9uKGJ1ZmYscCxuKXsgIGJ1ZmZbcF0gPSAobj4+OCkmMjU1OyAgYnVmZltwKzFdID0gbiYyNTU7ICB9LFxuXHRyZWFkVWludCAgIDogZnVuY3Rpb24oYnVmZixwKSAgeyAgcmV0dXJuIChidWZmW3BdKigyNTYqMjU2KjI1NikpICsgKChidWZmW3ArMV08PDE2KSB8IChidWZmW3ArMl08PCA4KSB8IGJ1ZmZbcCszXSk7ICB9LFxuXHR3cml0ZVVpbnQgIDogZnVuY3Rpb24oYnVmZixwLG4peyAgYnVmZltwXT0obj4+MjQpJjI1NTsgIGJ1ZmZbcCsxXT0obj4+MTYpJjI1NTsgIGJ1ZmZbcCsyXT0obj4+OCkmMjU1OyAgYnVmZltwKzNdPW4mMjU1OyAgfSxcblx0cmVhZEFTQ0lJICA6IGZ1bmN0aW9uKGJ1ZmYscCxsKXsgIHZhciBzID0gXCJcIjsgIGZvcih2YXIgaT0wOyBpPGw7IGkrKykgcyArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZmZbcCtpXSk7ICByZXR1cm4gczsgICAgfSxcblx0d3JpdGVBU0NJSSA6IGZ1bmN0aW9uKGRhdGEscCxzKXsgIGZvcih2YXIgaT0wOyBpPHMubGVuZ3RoOyBpKyspIGRhdGFbcCtpXSA9IHMuY2hhckNvZGVBdChpKTsgIH0sXG5cdHJlYWRCeXRlcyAgOiBmdW5jdGlvbihidWZmLHAsbCl7ICB2YXIgYXJyID0gW107ICAgZm9yKHZhciBpPTA7IGk8bDsgaSsrKSBhcnIucHVzaChidWZmW3AraV0pOyAgIHJldHVybiBhcnI7ICB9LFxuXHRwYWQgOiBmdW5jdGlvbihuKSB7IHJldHVybiBuLmxlbmd0aCA8IDIgPyBcIjBcIiArIG4gOiBuOyB9LFxuXHRyZWFkVVRGOCA6IGZ1bmN0aW9uKGJ1ZmYsIHAsIGwpIHtcblx0XHR2YXIgcyA9IFwiXCIsIG5zO1xuXHRcdGZvcih2YXIgaT0wOyBpPGw7IGkrKykgcyArPSBcIiVcIiArIFVQTkcuX2Jpbi5wYWQoYnVmZltwK2ldLnRvU3RyaW5nKDE2KSk7XG5cdFx0dHJ5IHsgIG5zID0gZGVjb2RlVVJJQ29tcG9uZW50KHMpOyB9XG5cdFx0Y2F0Y2goZSkgeyAgcmV0dXJuIFVQTkcuX2Jpbi5yZWFkQVNDSUkoYnVmZiwgcCwgbCk7ICB9XG5cdFx0cmV0dXJuICBucztcblx0fVxufVxuVVBORy5fY29weVRpbGUgPSBmdW5jdGlvbihzYiwgc3csIHNoLCB0YiwgdHcsIHRoLCB4b2ZmLCB5b2ZmLCBtb2RlKVxue1xuXHR2YXIgdyA9IE1hdGgubWluKHN3LHR3KSwgaCA9IE1hdGgubWluKHNoLHRoKTtcblx0dmFyIHNpPTAsIHRpPTA7XG5cdGZvcih2YXIgeT0wOyB5PGg7IHkrKylcblx0XHRmb3IodmFyIHg9MDsgeDx3OyB4KyspXG5cdFx0e1xuXHRcdFx0aWYoeG9mZj49MCAmJiB5b2ZmPj0wKSB7ICBzaSA9ICh5KnN3K3gpPDwyOyAgdGkgPSAoKCB5b2ZmK3kpKnR3K3hvZmYreCk8PDI7ICB9XG5cdFx0XHRlbHNlICAgICAgICAgICAgICAgICAgIHsgIHNpID0gKCgteW9mZit5KSpzdy14b2ZmK3gpPDwyOyAgdGkgPSAoeSp0dyt4KTw8MjsgIH1cblx0XHRcdFxuXHRcdFx0aWYgICAgIChtb2RlPT0wKSB7ICB0Ylt0aV0gPSBzYltzaV07ICB0Ylt0aSsxXSA9IHNiW3NpKzFdOyAgdGJbdGkrMl0gPSBzYltzaSsyXTsgIHRiW3RpKzNdID0gc2Jbc2krM107ICB9XG5cdFx0XHRlbHNlIGlmKG1vZGU9PTEpIHtcblx0XHRcdFx0dmFyIGZhID0gc2Jbc2krM10qKDEvMjU1KSwgZnI9c2Jbc2ldKmZhLCBmZz1zYltzaSsxXSpmYSwgZmI9c2Jbc2krMl0qZmE7IFxuXHRcdFx0XHR2YXIgYmEgPSB0Ylt0aSszXSooMS8yNTUpLCBicj10Ylt0aV0qYmEsIGJnPXRiW3RpKzFdKmJhLCBiYj10Ylt0aSsyXSpiYTsgXG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgaWZhPTEtZmEsIG9hID0gZmErYmEqaWZhLCBpb2EgPSAob2E9PTA/MDoxL29hKTtcblx0XHRcdFx0dGJbdGkrM10gPSAyNTUqb2E7ICBcblx0XHRcdFx0dGJbdGkrMF0gPSAoZnIrYnIqaWZhKSppb2E7ICBcblx0XHRcdFx0dGJbdGkrMV0gPSAoZmcrYmcqaWZhKSppb2E7ICAgXG5cdFx0XHRcdHRiW3RpKzJdID0gKGZiK2JiKmlmYSkqaW9hOyAgXG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmKG1vZGU9PTIpe1x0Ly8gY29weSBvbmx5IGRpZmZlcmVuY2VzLCBvdGhlcndpc2UgemVyb1xuXHRcdFx0XHR2YXIgZmEgPSBzYltzaSszXSwgZnI9c2Jbc2ldLCBmZz1zYltzaSsxXSwgZmI9c2Jbc2krMl07IFxuXHRcdFx0XHR2YXIgYmEgPSB0Ylt0aSszXSwgYnI9dGJbdGldLCBiZz10Ylt0aSsxXSwgYmI9dGJbdGkrMl07IFxuXHRcdFx0XHRpZihmYT09YmEgJiYgZnI9PWJyICYmIGZnPT1iZyAmJiBmYj09YmIpIHsgIHRiW3RpXT0wOyAgdGJbdGkrMV09MDsgIHRiW3RpKzJdPTA7ICB0Ylt0aSszXT0wOyAgfVxuXHRcdFx0XHRlbHNlIHsgIHRiW3RpXT1mcjsgIHRiW3RpKzFdPWZnOyAgdGJbdGkrMl09ZmI7ICB0Ylt0aSszXT1mYTsgIH1cblx0XHRcdH1cblx0XHRcdGVsc2UgaWYobW9kZT09Myl7XHQvLyBjaGVjayBpZiBjYW4gYmUgYmxlbmRlZFxuXHRcdFx0XHR2YXIgZmEgPSBzYltzaSszXSwgZnI9c2Jbc2ldLCBmZz1zYltzaSsxXSwgZmI9c2Jbc2krMl07IFxuXHRcdFx0XHR2YXIgYmEgPSB0Ylt0aSszXSwgYnI9dGJbdGldLCBiZz10Ylt0aSsxXSwgYmI9dGJbdGkrMl07IFxuXHRcdFx0XHRpZihmYT09YmEgJiYgZnI9PWJyICYmIGZnPT1iZyAmJiBmYj09YmIpIGNvbnRpbnVlO1xuXHRcdFx0XHQvL2lmKGZhIT0yNTUgJiYgYmEhPTApIHJldHVybiBmYWxzZTtcblx0XHRcdFx0aWYoZmE8MjIwICYmIGJhPjIwKSByZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fVxuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuXG5cblVQTkcuZW5jb2RlID0gZnVuY3Rpb24oYnVmcywgdywgaCwgcHMsIGRlbHMsIGZvcmJpZFBsdGUpXG57XG5cdGlmKHBzPT1udWxsKSBwcz0wO1xuXHRpZihmb3JiaWRQbHRlPT1udWxsKSBmb3JiaWRQbHRlID0gZmFsc2U7XG5cdHZhciBkYXRhID0gbmV3IFVpbnQ4QXJyYXkoYnVmc1swXS5ieXRlTGVuZ3RoKmJ1ZnMubGVuZ3RoKzEwMCk7XG5cdHZhciB3cj1bMHg4OSwgMHg1MCwgMHg0ZSwgMHg0NywgMHgwZCwgMHgwYSwgMHgxYSwgMHgwYV07XG5cdGZvcih2YXIgaT0wOyBpPDg7IGkrKykgZGF0YVtpXT13cltpXTtcblx0dmFyIG9mZnNldCA9IDgsICBiaW4gPSBVUE5HLl9iaW4sIGNyYyA9IFVQTkcuY3JjLmNyYywgd1VpID0gYmluLndyaXRlVWludCwgd1VzID0gYmluLndyaXRlVXNob3J0LCB3QXMgPSBiaW4ud3JpdGVBU0NJSTtcblxuXHR2YXIgbmltZyA9IFVQTkcuZW5jb2RlLmNvbXByZXNzUE5HKGJ1ZnMsIHcsIGgsIHBzLCBmb3JiaWRQbHRlKTtcblxuXHR3VWkoZGF0YSxvZmZzZXQsIDEzKTsgICAgIG9mZnNldCs9NDtcblx0d0FzKGRhdGEsb2Zmc2V0LFwiSUhEUlwiKTsgIG9mZnNldCs9NDtcblx0d1VpKGRhdGEsb2Zmc2V0LHcpOyAgb2Zmc2V0Kz00O1xuXHR3VWkoZGF0YSxvZmZzZXQsaCk7ICBvZmZzZXQrPTQ7XG5cdGRhdGFbb2Zmc2V0XSA9IG5pbWcuZGVwdGg7ICBvZmZzZXQrKzsgIC8vIGRlcHRoXG5cdGRhdGFbb2Zmc2V0XSA9IG5pbWcuY3R5cGU7ICBvZmZzZXQrKzsgIC8vIGN0eXBlXG5cdGRhdGFbb2Zmc2V0XSA9IDA7ICBvZmZzZXQrKzsgIC8vIGNvbXByZXNzXG5cdGRhdGFbb2Zmc2V0XSA9IDA7ICBvZmZzZXQrKzsgIC8vIGZpbHRlclxuXHRkYXRhW29mZnNldF0gPSAwOyAgb2Zmc2V0Kys7ICAvLyBpbnRlcmxhY2Vcblx0d1VpKGRhdGEsb2Zmc2V0LGNyYyhkYXRhLG9mZnNldC0xNywxNykpOyAgb2Zmc2V0Kz00OyAvLyBjcmNcblxuXHQvLyA5IGJ5dGVzIHRvIHNheSwgdGhhdCBpdCBpcyBzUkdCXG5cdHdVaShkYXRhLG9mZnNldCwgMSk7ICAgICAgb2Zmc2V0Kz00O1xuXHR3QXMoZGF0YSxvZmZzZXQsXCJzUkdCXCIpOyAgb2Zmc2V0Kz00O1xuXHRkYXRhW29mZnNldF0gPSAxOyAgb2Zmc2V0Kys7XG5cdHdVaShkYXRhLG9mZnNldCxjcmMoZGF0YSxvZmZzZXQtNSw1KSk7ICBvZmZzZXQrPTQ7IC8vIGNyY1xuXG5cdHZhciBhbmltID0gYnVmcy5sZW5ndGg+MTtcblx0aWYoYW5pbSkge1xuXHRcdHdVaShkYXRhLG9mZnNldCwgOCk7ICAgICAgb2Zmc2V0Kz00O1xuXHRcdHdBcyhkYXRhLG9mZnNldCxcImFjVExcIik7ICBvZmZzZXQrPTQ7XG5cdFx0d1VpKGRhdGEsb2Zmc2V0LCBidWZzLmxlbmd0aCk7ICAgICAgb2Zmc2V0Kz00O1xuXHRcdHdVaShkYXRhLG9mZnNldCwgMCk7ICAgICAgb2Zmc2V0Kz00O1xuXHRcdHdVaShkYXRhLG9mZnNldCxjcmMoZGF0YSxvZmZzZXQtMTIsMTIpKTsgIG9mZnNldCs9NDsgLy8gY3JjXG5cdH1cblxuXHRpZihuaW1nLmN0eXBlPT0zKSB7XG5cdFx0dmFyIGRsID0gbmltZy5wbHRlLmxlbmd0aDtcblx0XHR3VWkoZGF0YSxvZmZzZXQsIGRsKjMpOyAgb2Zmc2V0Kz00O1xuXHRcdHdBcyhkYXRhLG9mZnNldCxcIlBMVEVcIik7ICBvZmZzZXQrPTQ7XG5cdFx0Zm9yKHZhciBpPTA7IGk8ZGw7IGkrKyl7XG5cdFx0XHR2YXIgdGk9aSozLCBjPW5pbWcucGx0ZVtpXSwgcj0oYykmMjU1LCBnPShjPj44KSYyNTUsIGI9KGM+PjE2KSYyNTU7XG5cdFx0XHRkYXRhW29mZnNldCt0aSswXT1yOyAgZGF0YVtvZmZzZXQrdGkrMV09ZzsgIGRhdGFbb2Zmc2V0K3RpKzJdPWI7XG5cdFx0fVxuXHRcdG9mZnNldCs9ZGwqMztcblx0XHR3VWkoZGF0YSxvZmZzZXQsY3JjKGRhdGEsb2Zmc2V0LWRsKjMtNCxkbCozKzQpKTsgIG9mZnNldCs9NDsgLy8gY3JjXG5cblx0XHRpZihuaW1nLmdvdEFscGhhKSB7XG5cdFx0XHR3VWkoZGF0YSxvZmZzZXQsIGRsKTsgIG9mZnNldCs9NDtcblx0XHRcdHdBcyhkYXRhLG9mZnNldCxcInRSTlNcIik7ICBvZmZzZXQrPTQ7XG5cdFx0XHRmb3IodmFyIGk9MDsgaTxkbDsgaSsrKSAgZGF0YVtvZmZzZXQraV09KG5pbWcucGx0ZVtpXT4+MjQpJjI1NTtcblx0XHRcdG9mZnNldCs9ZGw7XG5cdFx0XHR3VWkoZGF0YSxvZmZzZXQsY3JjKGRhdGEsb2Zmc2V0LWRsLTQsZGwrNCkpOyAgb2Zmc2V0Kz00OyAvLyBjcmNcblx0XHR9XG5cdH1cblx0XG5cdHZhciBmaSA9IDA7XG5cdGZvcih2YXIgaj0wOyBqPG5pbWcuZnJhbWVzLmxlbmd0aDsgaisrKVxuXHR7XG5cdFx0dmFyIGZyID0gbmltZy5mcmFtZXNbal07XG5cdFx0aWYoYW5pbSkge1xuXHRcdFx0d1VpKGRhdGEsb2Zmc2V0LCAyNik7ICAgICBvZmZzZXQrPTQ7XG5cdFx0XHR3QXMoZGF0YSxvZmZzZXQsXCJmY1RMXCIpOyAgb2Zmc2V0Kz00O1xuXHRcdFx0d1VpKGRhdGEsIG9mZnNldCwgZmkrKyk7ICAgb2Zmc2V0Kz00O1xuXHRcdFx0d1VpKGRhdGEsIG9mZnNldCwgZnIucmVjdC53aWR0aCApOyAgIG9mZnNldCs9NDtcblx0XHRcdHdVaShkYXRhLCBvZmZzZXQsIGZyLnJlY3QuaGVpZ2h0KTsgICBvZmZzZXQrPTQ7XG5cdFx0XHR3VWkoZGF0YSwgb2Zmc2V0LCBmci5yZWN0LngpOyAgIG9mZnNldCs9NDtcblx0XHRcdHdVaShkYXRhLCBvZmZzZXQsIGZyLnJlY3QueSk7ICAgb2Zmc2V0Kz00O1xuXHRcdFx0d1VzKGRhdGEsIG9mZnNldCwgZGVsc1tqXSk7ICAgb2Zmc2V0Kz0yO1xuXHRcdFx0d1VzKGRhdGEsIG9mZnNldCwgIDEwMDApOyAgIG9mZnNldCs9Mjtcblx0XHRcdGRhdGFbb2Zmc2V0XSA9IGZyLmRpc3Bvc2U7ICBvZmZzZXQrKztcdC8vIGRpc3Bvc2Vcblx0XHRcdGRhdGFbb2Zmc2V0XSA9IGZyLmJsZW5kICA7ICBvZmZzZXQrKztcdC8vIGJsZW5kXG5cdFx0XHR3VWkoZGF0YSxvZmZzZXQsY3JjKGRhdGEsb2Zmc2V0LTMwLDMwKSk7ICBvZmZzZXQrPTQ7IC8vIGNyY1xuXHRcdH1cblx0XHRcdFx0XG5cdFx0dmFyIGltZ2QgPSBmci5jaW1nLCBkbCA9IGltZ2QubGVuZ3RoO1xuXHRcdHdVaShkYXRhLG9mZnNldCwgZGwrKGo9PTA/MDo0KSk7ICAgICBvZmZzZXQrPTQ7XG5cdFx0dmFyIGlvZmYgPSBvZmZzZXQ7XG5cdFx0d0FzKGRhdGEsb2Zmc2V0LChqPT0wKT9cIklEQVRcIjpcImZkQVRcIik7ICBvZmZzZXQrPTQ7XG5cdFx0aWYoaiE9MCkgeyAgd1VpKGRhdGEsIG9mZnNldCwgZmkrKyk7ICBvZmZzZXQrPTQ7ICB9XG5cdFx0Zm9yKHZhciBpPTA7IGk8ZGw7IGkrKykgZGF0YVtvZmZzZXQraV0gPSBpbWdkW2ldO1xuXHRcdG9mZnNldCArPSBkbDtcblx0XHR3VWkoZGF0YSxvZmZzZXQsY3JjKGRhdGEsaW9mZixvZmZzZXQtaW9mZikpOyAgb2Zmc2V0Kz00OyAvLyBjcmNcblx0fVxuXG5cdHdVaShkYXRhLG9mZnNldCwgMCk7ICAgICBvZmZzZXQrPTQ7XG5cdHdBcyhkYXRhLG9mZnNldCxcIklFTkRcIik7ICBvZmZzZXQrPTQ7XG5cdHdVaShkYXRhLG9mZnNldCxjcmMoZGF0YSxvZmZzZXQtNCw0KSk7ICBvZmZzZXQrPTQ7IC8vIGNyY1xuXG5cdHJldHVybiBkYXRhLmJ1ZmZlci5zbGljZSgwLG9mZnNldCk7XG59XG5cblVQTkcuZW5jb2RlLmNvbXByZXNzUE5HID0gZnVuY3Rpb24oYnVmcywgdywgaCwgcHMsIGZvcmJpZFBsdGUpXG57XG5cdHZhciBvdXQgPSBVUE5HLmVuY29kZS5jb21wcmVzcyhidWZzLCB3LCBoLCBwcywgZmFsc2UsIGZvcmJpZFBsdGUpO1xuXHRmb3IodmFyIGk9MDsgaTxidWZzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGZybSA9IG91dC5mcmFtZXNbaV0sIG53PWZybS5yZWN0LndpZHRoLCBuaD1mcm0ucmVjdC5oZWlnaHQsIGJwbD1mcm0uYnBsLCBicHA9ZnJtLmJwcDtcblx0XHR2YXIgZmRhdGEgPSBuZXcgVWludDhBcnJheShuaCpicGwrbmgpO1xuXHRcdGZybS5jaW1nID0gVVBORy5lbmNvZGUuX2ZpbHRlclplcm8oZnJtLmltZyxuaCxicHAsYnBsLGZkYXRhKTtcblx0fVx0XG5cdHJldHVybiBvdXQ7XG59XG5cblVQTkcuZW5jb2RlLmNvbXByZXNzID0gZnVuY3Rpb24oYnVmcywgdywgaCwgcHMsIGZvckdJRiwgZm9yYmlkUGx0ZSlcbntcblx0aWYoZm9yYmlkUGx0ZT09bnVsbCkgZm9yYmlkUGx0ZSA9IGZhbHNlO1xuXHRcblx0dmFyIGN0eXBlID0gNiwgZGVwdGggPSA4LCBicHAgPSA0LCBhbHBoYUFuZD0yNTVcblx0XG5cdGZvcih2YXIgaj0wOyBqPGJ1ZnMubGVuZ3RoOyBqKyspICB7ICAvLyB3aGVuIG5vdCBxdWFudGl6ZWQsIG90aGVyIGZyYW1lcyBjYW4gY29udGFpbiBjb2xvcnMsIHRoYXQgYXJlIG5vdCBpbiBhbiBpbml0aWFsIGZyYW1lXG5cdFx0dmFyIGltZyA9IG5ldyBVaW50OEFycmF5KGJ1ZnNbal0pLCBpbGVuID0gaW1nLmxlbmd0aDtcblx0XHRmb3IodmFyIGk9MDsgaTxpbGVuOyBpKz00KSBhbHBoYUFuZCAmPSBpbWdbaSszXTtcblx0fVxuXHR2YXIgZ290QWxwaGEgPSAoYWxwaGFBbmQpIT0yNTU7XG5cdFxuXHR2YXIgY21hcD17fSwgcGx0ZT1bXTsgIGlmKGJ1ZnMubGVuZ3RoIT0wKSB7ICBjbWFwWzBdPTA7ICBwbHRlLnB1c2goMCk7ICBpZihwcyE9MCkgcHMtLTsgIH0gXG5cdFxuXHRcblx0aWYocHMhPTApIHtcblx0XHR2YXIgcXJlcyA9IFVQTkcucXVhbnRpemUoYnVmcywgcHMsIGZvckdJRik7ICBidWZzID0gcXJlcy5idWZzO1xuXHRcdGZvcih2YXIgaT0wOyBpPHFyZXMucGx0ZS5sZW5ndGg7IGkrKykgeyAgdmFyIGM9cXJlcy5wbHRlW2ldLmVzdC5yZ2JhOyAgaWYoY21hcFtjXT09bnVsbCkgeyAgY21hcFtjXT1wbHRlLmxlbmd0aDsgIHBsdGUucHVzaChjKTsgIH0gICAgIH1cblx0fVxuXHRlbHNlIHtcblx0XHQvLyB3aGF0IGlmIHBzPT0wLCBidXQgdGhlcmUgYXJlIDw9MjU2IGNvbG9ycz8gIHdlIHN0aWxsIG5lZWQgdG8gZGV0ZWN0LCBpZiB0aGUgcGFsZXR0ZSBjb3VsZCBiZSB1c2VkXG5cdFx0Zm9yKHZhciBqPTA7IGo8YnVmcy5sZW5ndGg7IGorKykgIHsgIC8vIHdoZW4gbm90IHF1YW50aXplZCwgb3RoZXIgZnJhbWVzIGNhbiBjb250YWluIGNvbG9ycywgdGhhdCBhcmUgbm90IGluIGFuIGluaXRpYWwgZnJhbWVcblx0XHRcdHZhciBpbWczMiA9IG5ldyBVaW50MzJBcnJheShidWZzW2pdKSwgaWxlbiA9IGltZzMyLmxlbmd0aDtcblx0XHRcdGZvcih2YXIgaT0wOyBpPGlsZW47IGkrKykge1xuXHRcdFx0XHR2YXIgYyA9IGltZzMyW2ldO1xuXHRcdFx0XHRpZigoaTx3IHx8IChjIT1pbWczMltpLTFdICYmIGMhPWltZzMyW2ktd10pKSAmJiBjbWFwW2NdPT1udWxsKSB7ICBjbWFwW2NdPXBsdGUubGVuZ3RoOyAgcGx0ZS5wdXNoKGMpOyAgaWYocGx0ZS5sZW5ndGg+PTMwMCkgYnJlYWs7ICB9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdFxuXHR2YXIgYnJ1dGUgPSBnb3RBbHBoYSA/IGZvckdJRiA6IGZhbHNlO1x0XHQvLyBicnV0ZSA6IGZyYW1lcyBjYW4gb25seSBiZSBjb3BpZWQsIG5vdCBcImJsZW5kZWRcIlxuXHR2YXIgY2M9cGx0ZS5sZW5ndGg7ICAvL2NvbnNvbGUubG9nKGNjKTtcblx0aWYoY2M8PTI1NiAmJiBmb3JiaWRQbHRlPT1mYWxzZSkge1xuXHRcdGlmKGNjPD0gMikgZGVwdGg9MTsgIGVsc2UgaWYoY2M8PSA0KSBkZXB0aD0yOyAgZWxzZSBpZihjYzw9MTYpIGRlcHRoPTQ7ICBlbHNlIGRlcHRoPTg7XG5cdFx0aWYoZm9yR0lGKSBkZXB0aD04O1xuXHRcdGdvdEFscGhhID0gdHJ1ZTtcblx0fVxuXHRcblx0XG5cdHZhciBmcm1zID0gW107XG5cdGZvcih2YXIgaj0wOyBqPGJ1ZnMubGVuZ3RoOyBqKyspXG5cdHtcblx0XHR2YXIgY2ltZyA9IG5ldyBVaW50OEFycmF5KGJ1ZnNbal0pLCBjaW1nMzIgPSBuZXcgVWludDMyQXJyYXkoY2ltZy5idWZmZXIpO1xuXHRcdFxuXHRcdHZhciBueD0wLCBueT0wLCBudz13LCBuaD1oLCBibGVuZD0wO1xuXHRcdGlmKGohPTAgJiYgIWJydXRlKSB7XG5cdFx0XHR2YXIgdGxpbSA9IChmb3JHSUYgfHwgaj09MSB8fCBmcm1zW2ZybXMubGVuZ3RoLTJdLmRpc3Bvc2U9PTIpPzE6MiwgdHN0cCA9IDAsIHRhcmVhID0gMWU5O1xuXHRcdFx0Zm9yKHZhciBpdD0wOyBpdDx0bGltOyBpdCsrKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcGltZyA9IG5ldyBVaW50OEFycmF5KGJ1ZnNbai0xLWl0XSksIHAzMiA9IG5ldyBVaW50MzJBcnJheShidWZzW2otMS1pdF0pO1xuXHRcdFx0XHR2YXIgbWl4PXcsbWl5PWgsbWF4PS0xLG1heT0tMTtcblx0XHRcdFx0Zm9yKHZhciB5PTA7IHk8aDsgeSsrKSBmb3IodmFyIHg9MDsgeDx3OyB4KyspIHtcblx0XHRcdFx0XHR2YXIgaSA9IHkqdyt4O1xuXHRcdFx0XHRcdGlmKGNpbWczMltpXSE9cDMyW2ldKSB7XG5cdFx0XHRcdFx0XHRpZih4PG1peCkgbWl4PXg7ICBpZih4Pm1heCkgbWF4PXg7XG5cdFx0XHRcdFx0XHRpZih5PG1peSkgbWl5PXk7ICBpZih5Pm1heSkgbWF5PXk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBzYXJlYSA9IChtYXg9PS0xKSA/IDEgOiAobWF4LW1peCsxKSoobWF5LW1peSsxKTtcblx0XHRcdFx0aWYoc2FyZWE8dGFyZWEpIHtcblx0XHRcdFx0XHR0YXJlYSA9IHNhcmVhOyAgdHN0cCA9IGl0OyAgXG5cdFx0XHRcdFx0aWYobWF4PT0tMSkgeyAgbng9bnk9MDsgIG53PW5oPTE7ICB9XG5cdFx0XHRcdFx0ZWxzZSB7ICBueCA9IG1peDsgbnkgPSBtaXk7IG53ID0gbWF4LW1peCsxOyBuaCA9IG1heS1taXkrMTsgIH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR2YXIgcGltZyA9IG5ldyBVaW50OEFycmF5KGJ1ZnNbai0xLXRzdHBdKTtcblx0XHRcdGlmKHRzdHA9PTEpIGZybXNbZnJtcy5sZW5ndGgtMV0uZGlzcG9zZSA9IDI7XG5cdFx0XHRcblx0XHRcdHZhciBuaW1nID0gbmV3IFVpbnQ4QXJyYXkobncqbmgqNCksIG5pbWczMiA9IG5ldyBVaW50MzJBcnJheShuaW1nLmJ1ZmZlcik7XG5cdFx0XHRVUE5HLiAgIF9jb3B5VGlsZShwaW1nLHcsaCwgbmltZyxudyxuaCwgLW54LC1ueSwgMCk7XG5cdFx0XHRpZihVUE5HLl9jb3B5VGlsZShjaW1nLHcsaCwgbmltZyxudyxuaCwgLW54LC1ueSwgMykpIHtcblx0XHRcdFx0VVBORy5fY29weVRpbGUoY2ltZyx3LGgsIG5pbWcsbncsbmgsIC1ueCwtbnksIDIpOyAgYmxlbmQgPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdFVQTkcuX2NvcHlUaWxlKGNpbWcsdyxoLCBuaW1nLG53LG5oLCAtbngsLW55LCAwKTsgIGJsZW5kID0gMDtcblx0XHRcdH1cblx0XHRcdGNpbWcgPSBuaW1nOyAgY2ltZzMyID0gbmV3IFVpbnQzMkFycmF5KGNpbWcuYnVmZmVyKTtcblx0XHR9XG5cdFx0dmFyIGJwbCA9IDQqbnc7XG5cdFx0aWYoY2M8PTI1NiAmJiBmb3JiaWRQbHRlPT1mYWxzZSkge1xuXHRcdFx0YnBsID0gTWF0aC5jZWlsKGRlcHRoKm53LzgpO1xuXHRcdFx0dmFyIG5pbWcgPSBuZXcgVWludDhBcnJheShicGwqbmgpO1xuXHRcdFx0Zm9yKHZhciB5PTA7IHk8bmg7IHkrKykgeyAgdmFyIGk9eSpicGwsIGlpPXkqbnc7XG5cdFx0XHRcdGlmICAgICAoZGVwdGg9PTgpIGZvcih2YXIgeD0wOyB4PG53OyB4KyspIG5pbWdbaSsoeCkgICBdICAgPSAgKGNtYXBbY2ltZzMyW2lpK3hdXSAgICAgICAgICAgICApO1xuXHRcdFx0XHRlbHNlIGlmKGRlcHRoPT00KSBmb3IodmFyIHg9MDsgeDxudzsgeCsrKSBuaW1nW2krKHg+PjEpXSAgfD0gIChjbWFwW2NpbWczMltpaSt4XV08PCg0LSh4JjEpKjQpKTtcblx0XHRcdFx0ZWxzZSBpZihkZXB0aD09MikgZm9yKHZhciB4PTA7IHg8bnc7IHgrKykgbmltZ1tpKyh4Pj4yKV0gIHw9ICAoY21hcFtjaW1nMzJbaWkreF1dPDwoNi0oeCYzKSoyKSk7XG5cdFx0XHRcdGVsc2UgaWYoZGVwdGg9PTEpIGZvcih2YXIgeD0wOyB4PG53OyB4KyspIG5pbWdbaSsoeD4+MyldICB8PSAgKGNtYXBbY2ltZzMyW2lpK3hdXTw8KDctKHgmNykqMSkpO1xuXHRcdFx0fVxuXHRcdFx0Y2ltZz1uaW1nOyAgY3R5cGU9MzsgIGJwcD0xO1xuXHRcdH1cblx0XHRlbHNlIGlmKGdvdEFscGhhPT1mYWxzZSAmJiBidWZzLmxlbmd0aD09MSkge1x0Ly8gc29tZSBuZXh0IFwicmVkdWNlZFwiIGZyYW1lcyBtYXkgY29udGFpbiBhbHBoYSBmb3IgYmxlbmRpbmdcblx0XHRcdHZhciBuaW1nID0gbmV3IFVpbnQ4QXJyYXkobncqbmgqMyksIGFyZWE9bncqbmg7XG5cdFx0XHRmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgdmFyIHRpPWkqMywgcWk9aSo0OyAgbmltZ1t0aV09Y2ltZ1txaV07ICBuaW1nW3RpKzFdPWNpbWdbcWkrMV07ICBuaW1nW3RpKzJdPWNpbWdbcWkrMl07ICB9XG5cdFx0XHRjaW1nPW5pbWc7ICBjdHlwZT0yOyAgYnBwPTM7ICBicGw9Mypudztcblx0XHR9XG5cdFx0ZnJtcy5wdXNoKHtyZWN0Ont4Om54LHk6bnksd2lkdGg6bncsaGVpZ2h0Om5ofSwgaW1nOmNpbWcsIGJwbDpicGwsIGJwcDpicHAsIGJsZW5kOmJsZW5kLCBkaXNwb3NlOmJydXRlPzE6MH0pO1xuXHR9XG5cdHJldHVybiB7Y3R5cGU6Y3R5cGUsIGRlcHRoOmRlcHRoLCBwbHRlOnBsdGUsIGdvdEFscGhhOmdvdEFscGhhLCBmcmFtZXM6ZnJtcyAgfTtcbn1cblxuVVBORy5lbmNvZGUuX2ZpbHRlclplcm8gPSBmdW5jdGlvbihpbWcsaCxicHAsYnBsLGRhdGEpXG57XG5cdHZhciBmbHMgPSBbXTtcblx0Zm9yKHZhciB0PTA7IHQ8NTsgdCsrKSB7ICBpZihoKmJwbD41MDAwMDAgJiYgKHQ9PTIgfHwgdD09MyB8fCB0PT00KSkgY29udGludWU7XG5cdFx0Zm9yKHZhciB5PTA7IHk8aDsgeSsrKSBVUE5HLmVuY29kZS5fZmlsdGVyTGluZShkYXRhLCBpbWcsIHksIGJwbCwgYnBwLCB0KTtcblx0XHRmbHMucHVzaChwYWtvW1wiZGVmbGF0ZVwiXShkYXRhKSk7ICBpZihicHA9PTEpIGJyZWFrO1xuXHR9XG5cdHZhciB0aSwgdHNpemU9MWU5O1xuXHRmb3IodmFyIGk9MDsgaTxmbHMubGVuZ3RoOyBpKyspIGlmKGZsc1tpXS5sZW5ndGg8dHNpemUpIHsgIHRpPWk7ICB0c2l6ZT1mbHNbaV0ubGVuZ3RoOyAgfVxuXHRyZXR1cm4gZmxzW3RpXTtcbn1cblVQTkcuZW5jb2RlLl9maWx0ZXJMaW5lID0gZnVuY3Rpb24oZGF0YSwgaW1nLCB5LCBicGwsIGJwcCwgdHlwZSlcbntcblx0dmFyIGkgPSB5KmJwbCwgZGkgPSBpK3ksIHBhZXRoID0gVVBORy5kZWNvZGUuX3BhZXRoXG5cdGRhdGFbZGldPXR5cGU7ICBkaSsrO1xuXG5cdGlmKHR5cGU9PTApIGZvcih2YXIgeD0wOyB4PGJwbDsgeCsrKSBkYXRhW2RpK3hdID0gaW1nW2kreF07XG5cdGVsc2UgaWYodHlwZT09MSkge1xuXHRcdGZvcih2YXIgeD0gIDA7IHg8YnBwOyB4KyspIGRhdGFbZGkreF0gPSAgaW1nW2kreF07XG5cdFx0Zm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XS1pbWdbaSt4LWJwcF0rMjU2KSYyNTU7XG5cdH1cblx0ZWxzZSBpZih5PT0wKSB7XG5cdFx0Zm9yKHZhciB4PSAgMDsgeDxicHA7IHgrKykgZGF0YVtkaSt4XSA9IGltZ1tpK3hdO1xuXG5cdFx0aWYodHlwZT09MikgZm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtkaSt4XSA9IGltZ1tpK3hdO1xuXHRcdGlmKHR5cGU9PTMpIGZvcih2YXIgeD1icHA7IHg8YnBsOyB4KyspIGRhdGFbZGkreF0gPSAoaW1nW2kreF0gLSAoaW1nW2kreC1icHBdPj4xKSArMjU2KSYyNTU7XG5cdFx0aWYodHlwZT09NCkgZm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XSAtIHBhZXRoKGltZ1tpK3gtYnBwXSwgMCwgMCkgKzI1NikmMjU1O1xuXHR9XG5cdGVsc2Uge1xuXHRcdGlmKHR5cGU9PTIpIHsgZm9yKHZhciB4PSAgMDsgeDxicGw7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XSsyNTYgLSBpbWdbaSt4LWJwbF0pJjI1NTsgIH1cblx0XHRpZih0eXBlPT0zKSB7IGZvcih2YXIgeD0gIDA7IHg8YnBwOyB4KyspIGRhdGFbZGkreF0gPSAoaW1nW2kreF0rMjU2IC0gKGltZ1tpK3gtYnBsXT4+MSkpJjI1NTtcblx0XHRcdFx0XHQgIGZvcih2YXIgeD1icHA7IHg8YnBsOyB4KyspIGRhdGFbZGkreF0gPSAoaW1nW2kreF0rMjU2IC0gKChpbWdbaSt4LWJwbF0raW1nW2kreC1icHBdKT4+MSkpJjI1NTsgIH1cblx0XHRpZih0eXBlPT00KSB7IGZvcih2YXIgeD0gIDA7IHg8YnBwOyB4KyspIGRhdGFbZGkreF0gPSAoaW1nW2kreF0rMjU2IC0gcGFldGgoMCwgaW1nW2kreC1icGxdLCAwKSkmMjU1O1xuXHRcdFx0XHRcdCAgZm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XSsyNTYgLSBwYWV0aChpbWdbaSt4LWJwcF0sIGltZ1tpK3gtYnBsXSwgaW1nW2kreC1icHAtYnBsXSkpJjI1NTsgIH1cblx0fVxufVxuXG5VUE5HLmNyYyA9IHtcblx0dGFibGUgOiAoIGZ1bmN0aW9uKCkge1xuXHQgICB2YXIgdGFiID0gbmV3IFVpbnQzMkFycmF5KDI1Nik7XG5cdCAgIGZvciAodmFyIG49MDsgbjwyNTY7IG4rKykge1xuXHRcdFx0dmFyIGMgPSBuO1xuXHRcdFx0Zm9yICh2YXIgaz0wOyBrPDg7IGsrKykge1xuXHRcdFx0XHRpZiAoYyAmIDEpICBjID0gMHhlZGI4ODMyMCBeIChjID4+PiAxKTtcblx0XHRcdFx0ZWxzZSAgICAgICAgYyA9IGMgPj4+IDE7XG5cdFx0XHR9XG5cdFx0XHR0YWJbbl0gPSBjOyAgfVxuXHRcdHJldHVybiB0YWI7ICB9KSgpLFxuXHR1cGRhdGUgOiBmdW5jdGlvbihjLCBidWYsIG9mZiwgbGVuKSB7XG5cdFx0Zm9yICh2YXIgaT0wOyBpPGxlbjsgaSsrKSAgYyA9IFVQTkcuY3JjLnRhYmxlWyhjIF4gYnVmW29mZitpXSkgJiAweGZmXSBeIChjID4+PiA4KTtcblx0XHRyZXR1cm4gYztcblx0fSxcblx0Y3JjIDogZnVuY3Rpb24oYixvLGwpICB7ICByZXR1cm4gVVBORy5jcmMudXBkYXRlKDB4ZmZmZmZmZmYsYixvLGwpIF4gMHhmZmZmZmZmZjsgIH1cbn1cblxuXG5VUE5HLnF1YW50aXplID0gZnVuY3Rpb24oYnVmcywgcHMsIHJvdW5kQWxwaGEpXG57XHRcblx0dmFyIGltZ3MgPSBbXSwgdG90bCA9IDA7XG5cdGZvcih2YXIgaT0wOyBpPGJ1ZnMubGVuZ3RoOyBpKyspIHsgIGltZ3MucHVzaChVUE5HLmVuY29kZS5hbHBoYU11bChuZXcgVWludDhBcnJheShidWZzW2ldKSwgcm91bmRBbHBoYSkpOyAgdG90bCs9YnVmc1tpXS5ieXRlTGVuZ3RoOyAgfVxuXHRcblx0dmFyIG5pbWcgPSBuZXcgVWludDhBcnJheSh0b3RsKSwgbmltZzMyID0gbmV3IFVpbnQzMkFycmF5KG5pbWcuYnVmZmVyKSwgbm9mZj0wO1xuXHRmb3IodmFyIGk9MDsgaTxpbWdzLmxlbmd0aDsgaSsrKSB7XG5cdFx0dmFyIGltZyA9IGltZ3NbaV0sIGlsID0gaW1nLmxlbmd0aDtcblx0XHRmb3IodmFyIGo9MDsgajxpbDsgaisrKSBuaW1nW25vZmYral0gPSBpbWdbal07XG5cdFx0bm9mZiArPSBpbDtcblx0fVxuXHRcblx0dmFyIHJvb3QgPSB7aTA6MCwgaTE6bmltZy5sZW5ndGgsIGJzdDpudWxsLCBlc3Q6bnVsbCwgdGRzdDowLCBsZWZ0Om51bGwsIHJpZ2h0Om51bGwgfTsgIC8vIGJhc2ljIHN0YXRpc3RpYywgZXh0cmEgc3RhdGlzdGljXG5cdHJvb3QuYnN0ID0gVVBORy5xdWFudGl6ZS5zdGF0cyggIG5pbWcscm9vdC5pMCwgcm9vdC5pMSAgKTsgIHJvb3QuZXN0ID0gVVBORy5xdWFudGl6ZS5lc3RhdHMoIHJvb3QuYnN0ICk7XG5cdHZhciBsZWFmcyA9IFtyb290XTtcblx0XG5cdHdoaWxlKGxlYWZzLmxlbmd0aDxwcylcblx0e1xuXHRcdHZhciBtYXhMID0gMCwgbWk9MDtcblx0XHRmb3IodmFyIGk9MDsgaTxsZWFmcy5sZW5ndGg7IGkrKykgaWYobGVhZnNbaV0uZXN0LkwgPiBtYXhMKSB7ICBtYXhMPWxlYWZzW2ldLmVzdC5MOyAgbWk9aTsgIH1cblx0XHRpZihtYXhMPDFlLTMpIGJyZWFrO1xuXHRcdHZhciBub2RlID0gbGVhZnNbbWldO1xuXHRcdFxuXHRcdHZhciBzMCA9IFVQTkcucXVhbnRpemUuc3BsaXRQaXhlbHMobmltZyxuaW1nMzIsIG5vZGUuaTAsIG5vZGUuaTEsIG5vZGUuZXN0LmUsIG5vZGUuZXN0LmVNcTI1NSk7XG5cdFx0XG5cdFx0dmFyIGxuID0ge2kwOm5vZGUuaTAsIGkxOnMwLCBic3Q6bnVsbCwgZXN0Om51bGwsIHRkc3Q6MCwgbGVmdDpudWxsLCByaWdodDpudWxsIH07ICBsbi5ic3QgPSBVUE5HLnF1YW50aXplLnN0YXRzKCBuaW1nLCBsbi5pMCwgbG4uaTEgKTsgIFxuXHRcdGxuLmVzdCA9IFVQTkcucXVhbnRpemUuZXN0YXRzKCBsbi5ic3QgKTtcblx0XHR2YXIgcm4gPSB7aTA6czAsIGkxOm5vZGUuaTEsIGJzdDpudWxsLCBlc3Q6bnVsbCwgdGRzdDowLCBsZWZ0Om51bGwsIHJpZ2h0Om51bGwgfTsgIHJuLmJzdCA9IHtSOltdLCBtOltdLCBOOm5vZGUuYnN0Lk4tbG4uYnN0Lk59O1xuXHRcdGZvcih2YXIgaT0wOyBpPDE2OyBpKyspIHJuLmJzdC5SW2ldID0gbm9kZS5ic3QuUltpXS1sbi5ic3QuUltpXTtcblx0XHRmb3IodmFyIGk9MDsgaTwgNDsgaSsrKSBybi5ic3QubVtpXSA9IG5vZGUuYnN0Lm1baV0tbG4uYnN0Lm1baV07XG5cdFx0cm4uZXN0ID0gVVBORy5xdWFudGl6ZS5lc3RhdHMoIHJuLmJzdCApO1xuXHRcdFxuXHRcdG5vZGUubGVmdCA9IGxuOyAgbm9kZS5yaWdodCA9IHJuO1xuXHRcdGxlYWZzW21pXT1sbjsgIGxlYWZzLnB1c2gocm4pO1xuXHR9XG5cdGxlYWZzLnNvcnQoZnVuY3Rpb24oYSxiKSB7ICByZXR1cm4gYi5ic3QuTi1hLmJzdC5OOyAgfSk7XG5cdFxuXHRmb3IodmFyIGlpPTA7IGlpPGltZ3MubGVuZ3RoOyBpaSsrKSB7XG5cdFx0dmFyIHBsYW5lRHN0ID0gVVBORy5xdWFudGl6ZS5wbGFuZURzdDtcblx0XHR2YXIgc2IgPSBuZXcgVWludDhBcnJheShpbWdzW2lpXS5idWZmZXIpLCB0YiA9IG5ldyBVaW50MzJBcnJheShpbWdzW2lpXS5idWZmZXIpLCBsZW4gPSBzYi5sZW5ndGg7XG5cdFx0XG5cdFx0dmFyIHN0YWNrID0gW10sIHNpPTA7XG5cdFx0Zm9yKHZhciBpPTA7IGk8bGVuOyBpKz00KSB7XG5cdFx0XHR2YXIgcj1zYltpXSooMS8yNTUpLCBnPXNiW2krMV0qKDEvMjU1KSwgYj1zYltpKzJdKigxLzI1NSksIGE9c2JbaSszXSooMS8yNTUpO1xuXHRcdFx0XG5cdFx0XHQvLyAgZXhhY3QsIGJ1dCB0b28gc2xvdyA6KFxuXHRcdFx0Ly92YXIgbmQgPSBVUE5HLnF1YW50aXplLmdldE5lYXJlc3Qocm9vdCwgciwgZywgYiwgYSk7XG5cdFx0XHR2YXIgbmQgPSByb290O1xuXHRcdFx0d2hpbGUobmQubGVmdCkgbmQgPSAocGxhbmVEc3QobmQuZXN0LHIsZyxiLGEpPD0wKSA/IG5kLmxlZnQgOiBuZC5yaWdodDtcblx0XHRcdFxuXHRcdFx0dGJbaT4+Ml0gPSBuZC5lc3QucmdiYTtcblx0XHR9XG5cdFx0aW1nc1tpaV09dGIuYnVmZmVyO1xuXHR9XG5cdHJldHVybiB7ICBidWZzOmltZ3MsIHBsdGU6bGVhZnMgIH07XG59XG5VUE5HLnF1YW50aXplLmdldE5lYXJlc3QgPSBmdW5jdGlvbihuZCwgcixnLGIsYSlcbntcblx0aWYobmQubGVmdD09bnVsbCkgeyAgbmQudGRzdCA9IFVQTkcucXVhbnRpemUuZGlzdChuZC5lc3QucSxyLGcsYixhKTsgIHJldHVybiBuZDsgIH1cblx0dmFyIHBsYW5lRHN0ID0gVVBORy5xdWFudGl6ZS5wbGFuZURzdChuZC5lc3QscixnLGIsYSk7XG5cdFxuXHR2YXIgbm9kZTAgPSBuZC5sZWZ0LCBub2RlMSA9IG5kLnJpZ2h0O1xuXHRpZihwbGFuZURzdD4wKSB7ICBub2RlMD1uZC5yaWdodDsgIG5vZGUxPW5kLmxlZnQ7ICB9XG5cdFxuXHR2YXIgbG4gPSBVUE5HLnF1YW50aXplLmdldE5lYXJlc3Qobm9kZTAsIHIsZyxiLGEpO1xuXHRpZihsbi50ZHN0PD1wbGFuZURzdCpwbGFuZURzdCkgcmV0dXJuIGxuO1xuXHR2YXIgcm4gPSBVUE5HLnF1YW50aXplLmdldE5lYXJlc3Qobm9kZTEsIHIsZyxiLGEpO1xuXHRyZXR1cm4gcm4udGRzdDxsbi50ZHN0ID8gcm4gOiBsbjtcbn1cblVQTkcucXVhbnRpemUucGxhbmVEc3QgPSBmdW5jdGlvbihlc3QsIHIsZyxiLGEpIHsgIHZhciBlID0gZXN0LmU7ICByZXR1cm4gZVswXSpyICsgZVsxXSpnICsgZVsyXSpiICsgZVszXSphIC0gZXN0LmVNcTsgIH1cblVQTkcucXVhbnRpemUuZGlzdCAgICAgPSBmdW5jdGlvbihxLCAgIHIsZyxiLGEpIHsgIHZhciBkMD1yLXFbMF0sIGQxPWctcVsxXSwgZDI9Yi1xWzJdLCBkMz1hLXFbM107ICByZXR1cm4gZDAqZDArZDEqZDErZDIqZDIrZDMqZDM7ICB9XG5cblVQTkcucXVhbnRpemUuc3BsaXRQaXhlbHMgPSBmdW5jdGlvbihuaW1nLCBuaW1nMzIsIGkwLCBpMSwgZSwgZU1xKVxue1xuXHR2YXIgdmVjRG90ID0gVVBORy5xdWFudGl6ZS52ZWNEb3Q7XG5cdGkxLT00O1xuXHR2YXIgc2hmcyA9IDA7XG5cdHdoaWxlKGkwPGkxKVxuXHR7XG5cdFx0d2hpbGUodmVjRG90KG5pbWcsIGkwLCBlKTw9ZU1xKSBpMCs9NDtcblx0XHR3aGlsZSh2ZWNEb3QobmltZywgaTEsIGUpPiBlTXEpIGkxLT00O1xuXHRcdGlmKGkwPj1pMSkgYnJlYWs7XG5cdFx0XG5cdFx0dmFyIHQgPSBuaW1nMzJbaTA+PjJdOyAgbmltZzMyW2kwPj4yXSA9IG5pbWczMltpMT4+Ml07ICBuaW1nMzJbaTE+PjJdPXQ7XG5cdFx0XG5cdFx0aTArPTQ7ICBpMS09NDtcblx0fVxuXHR3aGlsZSh2ZWNEb3QobmltZywgaTAsIGUpPmVNcSkgaTAtPTQ7XG5cdHJldHVybiBpMCs0O1xufVxuVVBORy5xdWFudGl6ZS52ZWNEb3QgPSBmdW5jdGlvbihuaW1nLCBpLCBlKVxue1xuXHRyZXR1cm4gbmltZ1tpXSplWzBdICsgbmltZ1tpKzFdKmVbMV0gKyBuaW1nW2krMl0qZVsyXSArIG5pbWdbaSszXSplWzNdO1xufVxuVVBORy5xdWFudGl6ZS5zdGF0cyA9IGZ1bmN0aW9uKG5pbWcsIGkwLCBpMSl7XG5cdHZhciBSID0gWzAsMCwwLDAsICAwLDAsMCwwLCAgMCwwLDAsMCwgIDAsMCwwLDBdO1xuXHR2YXIgbSA9IFswLDAsMCwwXTtcblx0dmFyIE4gPSAoaTEtaTApPj4yO1xuXHRmb3IodmFyIGk9aTA7IGk8aTE7IGkrPTQpXG5cdHtcblx0XHR2YXIgciA9IG5pbWdbaV0qKDEvMjU1KSwgZyA9IG5pbWdbaSsxXSooMS8yNTUpLCBiID0gbmltZ1tpKzJdKigxLzI1NSksIGEgPSBuaW1nW2krM10qKDEvMjU1KTtcblx0XHQvL3ZhciByID0gbmltZ1tpXSwgZyA9IG5pbWdbaSsxXSwgYiA9IG5pbWdbaSsyXSwgYSA9IG5pbWdbaSszXTtcblx0XHRtWzBdKz1yOyAgbVsxXSs9ZzsgIG1bMl0rPWI7ICBtWzNdKz1hO1xuXHRcdFxuXHRcdFJbIDBdICs9IHIqcjsgIFJbIDFdICs9IHIqZzsgIFJbIDJdICs9IHIqYjsgIFJbIDNdICs9IHIqYTsgIFxuXHRcdCAgICAgICAgICAgICAgIFJbIDVdICs9IGcqZzsgIFJbIDZdICs9IGcqYjsgIFJbIDddICs9IGcqYTsgXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUlsxMF0gKz0gYipiOyAgUlsxMV0gKz0gYiphOyAgXG5cdFx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUlsxNV0gKz0gYSphOyAgXG5cdH1cblx0Uls0XT1SWzFdOyAgUls4XT1SWzJdOyAgUlsxMl09UlszXTsgIFJbOV09Uls2XTsgIFJbMTNdPVJbN107ICBSWzE0XT1SWzExXTtcblx0XG5cdHJldHVybiB7UjpSLCBtOm0sIE46Tn07XG59XG5VUE5HLnF1YW50aXplLmVzdGF0cyA9IGZ1bmN0aW9uKHN0YXRzKXtcblx0dmFyIFIgPSBzdGF0cy5SLCBtID0gc3RhdHMubSwgTiA9IHN0YXRzLk47XG5cdFxuXHR2YXIgbTAgPSBtWzBdLCBtMSA9IG1bMV0sIG0yID0gbVsyXSwgbTMgPSBtWzNdLCBpTiA9IChOPT0wID8gMCA6IDEvTik7XG5cdHZhciBSaiA9IFtcblx0XHRSWyAwXSAtIG0wKm0wKmlOLCAgUlsgMV0gLSBtMCptMSppTiwgIFJbIDJdIC0gbTAqbTIqaU4sICBSWyAzXSAtIG0wKm0zKmlOLCAgXG5cdFx0UlsgNF0gLSBtMSptMCppTiwgIFJbIDVdIC0gbTEqbTEqaU4sICBSWyA2XSAtIG0xKm0yKmlOLCAgUlsgN10gLSBtMSptMyppTixcblx0XHRSWyA4XSAtIG0yKm0wKmlOLCAgUlsgOV0gLSBtMiptMSppTiwgIFJbMTBdIC0gbTIqbTIqaU4sICBSWzExXSAtIG0yKm0zKmlOLCAgXG5cdFx0UlsxMl0gLSBtMyptMCppTiwgIFJbMTNdIC0gbTMqbTEqaU4sICBSWzE0XSAtIG0zKm0yKmlOLCAgUlsxNV0gLSBtMyptMyppTiBcblx0XTtcblx0XG5cdHZhciBBID0gUmosIE0gPSBVUE5HLk00O1xuXHR2YXIgYiA9IFswLjUsMC41LDAuNSwwLjVdLCBtaSA9IDAsIHRtaSA9IDA7XG5cdFxuXHRpZihOIT0wKVxuXHRmb3IodmFyIGk9MDsgaTwxMDsgaSsrKSB7XG5cdFx0YiA9IE0ubXVsdFZlYyhBLCBiKTsgIHRtaSA9IE1hdGguc3FydChNLmRvdChiLGIpKTsgIGIgPSBNLnNtbCgxL3RtaSwgIGIpO1xuXHRcdGlmKE1hdGguYWJzKHRtaS1taSk8MWUtOSkgYnJlYWs7ICBtaSA9IHRtaTtcblx0fVx0XG5cdC8vYiA9IFswLDAsMSwwXTsgIG1pPU47XG5cdHZhciBxID0gW20wKmlOLCBtMSppTiwgbTIqaU4sIG0zKmlOXTtcblx0dmFyIGVNcTI1NSA9IE0uZG90KE0uc21sKDI1NSxxKSxiKTtcblx0XG5cdHZhciBpYSA9IChxWzNdPDAuMDAxKSA/IDAgOiAxL3FbM107XG5cdFxuXHRyZXR1cm4geyAgQ292OlJqLCBxOnEsIGU6YiwgTDptaSwgIGVNcTI1NTplTXEyNTUsIGVNcSA6IE0uZG90KGIscSksXG5cdFx0XHRcdHJnYmE6ICgoKE1hdGgucm91bmQoMjU1KnFbM10pPDwyNCkgfCAoTWF0aC5yb3VuZCgyNTUqcVsyXSppYSk8PDE2KSB8ICAoTWF0aC5yb3VuZCgyNTUqcVsxXSppYSk8PDgpIHwgKE1hdGgucm91bmQoMjU1KnFbMF0qaWEpPDwwKSk+Pj4wKSAgfTtcbn1cblVQTkcuTTQgPSB7XG5cdG11bHRWZWMgOiBmdW5jdGlvbihtLHYpIHtcblx0XHRcdHJldHVybiBbXG5cdFx0XHRcdG1bIDBdKnZbMF0gKyBtWyAxXSp2WzFdICsgbVsgMl0qdlsyXSArIG1bIDNdKnZbM10sXG5cdFx0XHRcdG1bIDRdKnZbMF0gKyBtWyA1XSp2WzFdICsgbVsgNl0qdlsyXSArIG1bIDddKnZbM10sXG5cdFx0XHRcdG1bIDhdKnZbMF0gKyBtWyA5XSp2WzFdICsgbVsxMF0qdlsyXSArIG1bMTFdKnZbM10sXG5cdFx0XHRcdG1bMTJdKnZbMF0gKyBtWzEzXSp2WzFdICsgbVsxNF0qdlsyXSArIG1bMTVdKnZbM11cblx0XHRcdF07XG5cdH0sXG5cdGRvdCA6IGZ1bmN0aW9uKHgseSkgeyAgcmV0dXJuICB4WzBdKnlbMF0reFsxXSp5WzFdK3hbMl0qeVsyXSt4WzNdKnlbM107ICB9LFxuXHRzbWwgOiBmdW5jdGlvbihhLHkpIHsgIHJldHVybiBbYSp5WzBdLGEqeVsxXSxhKnlbMl0sYSp5WzNdXTsgIH1cbn1cblxuVVBORy5lbmNvZGUuYWxwaGFNdWwgPSBmdW5jdGlvbihpbWcsIHJvdW5kQSkge1xuXHR2YXIgbmltZyA9IG5ldyBVaW50OEFycmF5KGltZy5sZW5ndGgpLCBhcmVhID0gaW1nLmxlbmd0aD4+MjsgXG5cdGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKykge1xuXHRcdHZhciBxaT1pPDwyLCBpYT1pbWdbcWkrM107ICAgXG5cdFx0aWYocm91bmRBKSBpYSA9ICgoaWE8MTI4KSk/MDoyNTU7XG5cdFx0dmFyIGEgPSBpYSooMS8yNTUpO1xuXHRcdG5pbWdbcWkrMF0gPSBpbWdbcWkrMF0qYTsgIG5pbWdbcWkrMV0gPSBpbWdbcWkrMV0qYTsgIG5pbWdbcWkrMl0gPSBpbWdbcWkrMl0qYTsgIG5pbWdbcWkrM10gPSBpYTtcblx0fVxuXHRyZXR1cm4gbmltZztcbn1cblxuXHRcblx0XG5cdFxuXHRcblx0XG5cblxufSkoVVBORywgcGFrbyk7XG59KSgpO1xuXG4iLCAiLyohXG5cbnBpY2Fcbmh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlY2EvcGljYVxuXG4qL1xuXG4oZnVuY3Rpb24oZil7aWYodHlwZW9mIGV4cG9ydHM9PT1cIm9iamVjdFwiJiZ0eXBlb2YgbW9kdWxlIT09XCJ1bmRlZmluZWRcIil7bW9kdWxlLmV4cG9ydHM9ZigpfWVsc2UgaWYodHlwZW9mIGRlZmluZT09PVwiZnVuY3Rpb25cIiYmZGVmaW5lLmFtZCl7ZGVmaW5lKFtdLGYpfWVsc2V7dmFyIGc7aWYodHlwZW9mIHdpbmRvdyE9PVwidW5kZWZpbmVkXCIpe2c9d2luZG93fWVsc2UgaWYodHlwZW9mIGdsb2JhbCE9PVwidW5kZWZpbmVkXCIpe2c9Z2xvYmFsfWVsc2UgaWYodHlwZW9mIHNlbGYhPT1cInVuZGVmaW5lZFwiKXtnPXNlbGZ9ZWxzZXtnPXRoaXN9Zy5waWNhID0gZigpfX0pKGZ1bmN0aW9uKCl7dmFyIGRlZmluZSxtb2R1bGUsZXhwb3J0cztyZXR1cm4gKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSh7MTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBDb2xsZWN0aW9uIG9mIG1hdGggZnVuY3Rpb25zXG4vL1xuLy8gMS4gQ29tYmluZSBjb21wb25lbnRzIHRvZ2V0aGVyXG4vLyAyLiBIYXMgYXN5bmMgaW5pdCB0byBsb2FkIHdhc20gbW9kdWxlc1xuLy9cbid1c2Ugc3RyaWN0JztcblxudmFyIGluaGVyaXRzID0gX2RlcmVxXygnaW5oZXJpdHMnKTtcblxudmFyIE11bHRpbWF0aCA9IF9kZXJlcV8oJ211bHRpbWF0aCcpO1xuXG52YXIgbW1fdW5zaGFycF9tYXNrID0gX2RlcmVxXygnbXVsdGltYXRoL2xpYi91bnNoYXJwX21hc2snKTtcblxudmFyIG1tX3Jlc2l6ZSA9IF9kZXJlcV8oJy4vbW1fcmVzaXplJyk7XG5cbmZ1bmN0aW9uIE1hdGhMaWIocmVxdWVzdGVkX2ZlYXR1cmVzKSB7XG4gIHZhciBfX3JlcXVlc3RlZF9mZWF0dXJlcyA9IHJlcXVlc3RlZF9mZWF0dXJlcyB8fCBbXTtcblxuICB2YXIgZmVhdHVyZXMgPSB7XG4gICAganM6IF9fcmVxdWVzdGVkX2ZlYXR1cmVzLmluZGV4T2YoJ2pzJykgPj0gMCxcbiAgICB3YXNtOiBfX3JlcXVlc3RlZF9mZWF0dXJlcy5pbmRleE9mKCd3YXNtJykgPj0gMFxuICB9O1xuICBNdWx0aW1hdGguY2FsbCh0aGlzLCBmZWF0dXJlcyk7XG4gIHRoaXMuZmVhdHVyZXMgPSB7XG4gICAganM6IGZlYXR1cmVzLmpzLFxuICAgIHdhc206IGZlYXR1cmVzLndhc20gJiYgdGhpcy5oYXNfd2FzbSgpXG4gIH07XG4gIHRoaXMudXNlKG1tX3Vuc2hhcnBfbWFzayk7XG4gIHRoaXMudXNlKG1tX3Jlc2l6ZSk7XG59XG5cbmluaGVyaXRzKE1hdGhMaWIsIE11bHRpbWF0aCk7XG5cbk1hdGhMaWIucHJvdG90eXBlLnJlc2l6ZUFuZFVuc2hhcnAgPSBmdW5jdGlvbiByZXNpemVBbmRVbnNoYXJwKG9wdGlvbnMsIGNhY2hlKSB7XG4gIHZhciByZXN1bHQgPSB0aGlzLnJlc2l6ZShvcHRpb25zLCBjYWNoZSk7XG5cbiAgaWYgKG9wdGlvbnMudW5zaGFycEFtb3VudCkge1xuICAgIHRoaXMudW5zaGFycF9tYXNrKHJlc3VsdCwgb3B0aW9ucy50b1dpZHRoLCBvcHRpb25zLnRvSGVpZ2h0LCBvcHRpb25zLnVuc2hhcnBBbW91bnQsIG9wdGlvbnMudW5zaGFycFJhZGl1cywgb3B0aW9ucy51bnNoYXJwVGhyZXNob2xkKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hdGhMaWI7XG5cbn0se1wiLi9tbV9yZXNpemVcIjo0LFwiaW5oZXJpdHNcIjoxNSxcIm11bHRpbWF0aFwiOjE2LFwibXVsdGltYXRoL2xpYi91bnNoYXJwX21hc2tcIjoxOX1dLDI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gUmVzaXplIGNvbnZvbHZlcnMsIHB1cmUgSlMgaW1wbGVtZW50YXRpb25cbi8vXG4ndXNlIHN0cmljdCc7IC8vIFByZWNpc2lvbiBvZiBmaXhlZCBGUCB2YWx1ZXNcbi8vdmFyIEZJWEVEX0ZSQUNfQklUUyA9IDE0O1xuXG5mdW5jdGlvbiBjbGFtcFRvOChpKSB7XG4gIHJldHVybiBpIDwgMCA/IDAgOiBpID4gMjU1ID8gMjU1IDogaTtcbn0gLy8gQ29udm9sdmUgaW1hZ2UgaW4gaG9yaXpvbnRhbCBkaXJlY3Rpb25zIGFuZCB0cmFuc3Bvc2Ugb3V0cHV0LiBJbiB0aGVvcnksXG4vLyB0cmFuc3Bvc2UgYWxsb3c6XG4vL1xuLy8gLSB1c2UgdGhlIHNhbWUgY29udm9sdmVyIGZvciBib3RoIHBhc3NlcyAodGhpcyBmYWlscyBkdWUgZGlmZmVyZW50XG4vLyAgIHR5cGVzIG9mIGlucHV0IGFycmF5IGFuZCB0ZW1wb3JhcnkgYnVmZmVyKVxuLy8gLSBtYWtpbmcgdmVydGljYWwgcGFzcyBieSBob3Jpc29ubHRhbCBsaW5lcyBpbnByb3ZlIENQVSBjYWNoZSB1c2UuXG4vL1xuLy8gQnV0IGluIHJlYWwgbGlmZSB0aGlzIGRvZXNuJ3Qgd29yayA6KVxuLy9cblxuXG5mdW5jdGlvbiBjb252b2x2ZUhvcml6b250YWxseShzcmMsIGRlc3QsIHNyY1csIHNyY0gsIGRlc3RXLCBmaWx0ZXJzKSB7XG4gIHZhciByLCBnLCBiLCBhO1xuICB2YXIgZmlsdGVyUHRyLCBmaWx0ZXJTaGlmdCwgZmlsdGVyU2l6ZTtcbiAgdmFyIHNyY1B0ciwgc3JjWSwgZGVzdFgsIGZpbHRlclZhbDtcbiAgdmFyIHNyY09mZnNldCA9IDAsXG4gICAgICBkZXN0T2Zmc2V0ID0gMDsgLy8gRm9yIGVhY2ggcm93XG5cbiAgZm9yIChzcmNZID0gMDsgc3JjWSA8IHNyY0g7IHNyY1krKykge1xuICAgIGZpbHRlclB0ciA9IDA7IC8vIEFwcGx5IHByZWNvbXB1dGVkIGZpbHRlcnMgdG8gZWFjaCBkZXN0aW5hdGlvbiByb3cgcG9pbnRcblxuICAgIGZvciAoZGVzdFggPSAwOyBkZXN0WCA8IGRlc3RXOyBkZXN0WCsrKSB7XG4gICAgICAvLyBHZXQgdGhlIGZpbHRlciB0aGF0IGRldGVybWluZXMgdGhlIGN1cnJlbnQgb3V0cHV0IHBpeGVsLlxuICAgICAgZmlsdGVyU2hpZnQgPSBmaWx0ZXJzW2ZpbHRlclB0cisrXTtcbiAgICAgIGZpbHRlclNpemUgPSBmaWx0ZXJzW2ZpbHRlclB0cisrXTtcbiAgICAgIHNyY1B0ciA9IHNyY09mZnNldCArIGZpbHRlclNoaWZ0ICogNCB8IDA7XG4gICAgICByID0gZyA9IGIgPSBhID0gMDsgLy8gQXBwbHkgdGhlIGZpbHRlciB0byB0aGUgcm93IHRvIGdldCB0aGUgZGVzdGluYXRpb24gcGl4ZWwgciwgZywgYiwgYVxuXG4gICAgICBmb3IgKDsgZmlsdGVyU2l6ZSA+IDA7IGZpbHRlclNpemUtLSkge1xuICAgICAgICBmaWx0ZXJWYWwgPSBmaWx0ZXJzW2ZpbHRlclB0cisrXTsgLy8gVXNlIHJldmVyc2Ugb3JkZXIgdG8gd29ya2Fyb3VuZCBkZW9wdHMgaW4gb2xkIHY4IChub2RlIHYuMTApXG4gICAgICAgIC8vIEJpZyB0aGFua3MgdG8gQG1yYWxlcGggKFZ5YWNoZXNsYXYgRWdvcm92KSBmb3IgdGhlIHRpcC5cblxuICAgICAgICBhID0gYSArIGZpbHRlclZhbCAqIHNyY1tzcmNQdHIgKyAzXSB8IDA7XG4gICAgICAgIGIgPSBiICsgZmlsdGVyVmFsICogc3JjW3NyY1B0ciArIDJdIHwgMDtcbiAgICAgICAgZyA9IGcgKyBmaWx0ZXJWYWwgKiBzcmNbc3JjUHRyICsgMV0gfCAwO1xuICAgICAgICByID0gciArIGZpbHRlclZhbCAqIHNyY1tzcmNQdHJdIHwgMDtcbiAgICAgICAgc3JjUHRyID0gc3JjUHRyICsgNCB8IDA7XG4gICAgICB9IC8vIEJyaW5nIHRoaXMgdmFsdWUgYmFjayBpbiByYW5nZS4gQWxsIG9mIHRoZSBmaWx0ZXIgc2NhbGluZyBmYWN0b3JzXG4gICAgICAvLyBhcmUgaW4gZml4ZWQgcG9pbnQgd2l0aCBGSVhFRF9GUkFDX0JJVFMgYml0cyBvZiBmcmFjdGlvbmFsIHBhcnQuXG4gICAgICAvL1xuICAgICAgLy8gKCEpIEFkZCAxLzIgb2YgdmFsdWUgYmVmb3JlIGNsYW1waW5nIHRvIGdldCBwcm9wZXIgcm91bmRpbmcuIEluIG90aGVyXG4gICAgICAvLyBjYXNlIGJyaWdodG5lc3MgbG9zcyB3aWxsIGJlIG5vdGljZWFibGUgaWYgeW91IHJlc2l6ZSBpbWFnZSB3aXRoIHdoaXRlXG4gICAgICAvLyBib3JkZXIgYW5kIHBsYWNlIGl0IG9uIHdoaXRlIGJhY2tncm91bmQuXG4gICAgICAvL1xuXG5cbiAgICAgIGRlc3RbZGVzdE9mZnNldCArIDNdID0gY2xhbXBUbzgoYSArICgxIDw8IDEzKSA+PiAxNFxuICAgICAgLypGSVhFRF9GUkFDX0JJVFMqL1xuICAgICAgKTtcbiAgICAgIGRlc3RbZGVzdE9mZnNldCArIDJdID0gY2xhbXBUbzgoYiArICgxIDw8IDEzKSA+PiAxNFxuICAgICAgLypGSVhFRF9GUkFDX0JJVFMqL1xuICAgICAgKTtcbiAgICAgIGRlc3RbZGVzdE9mZnNldCArIDFdID0gY2xhbXBUbzgoZyArICgxIDw8IDEzKSA+PiAxNFxuICAgICAgLypGSVhFRF9GUkFDX0JJVFMqL1xuICAgICAgKTtcbiAgICAgIGRlc3RbZGVzdE9mZnNldF0gPSBjbGFtcFRvOChyICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdE9mZnNldCA9IGRlc3RPZmZzZXQgKyBzcmNIICogNCB8IDA7XG4gICAgfVxuXG4gICAgZGVzdE9mZnNldCA9IChzcmNZICsgMSkgKiA0IHwgMDtcbiAgICBzcmNPZmZzZXQgPSAoc3JjWSArIDEpICogc3JjVyAqIDQgfCAwO1xuICB9XG59IC8vIFRlY2huaWNhbGx5LCBjb252b2x2ZXJzIGFyZSB0aGUgc2FtZS4gQnV0IGlucHV0IGFycmF5IGFuZCB0ZW1wb3Jhcnlcbi8vIGJ1ZmZlciBjYW4gYmUgb2YgZGlmZmVyZW50IHR5cGUgKGVzcGVjaWFsbHksIGluIG9sZCBicm93c2VycykuIFNvLFxuLy8ga2VlcCBjb2RlIGluIHNlcGFyYXRlIGZ1bmN0aW9ucyB0byBhdm9pZCBkZW9wdGltaXphdGlvbnMgJiBzcGVlZCBsb3NzLlxuXG5cbmZ1bmN0aW9uIGNvbnZvbHZlVmVydGljYWxseShzcmMsIGRlc3QsIHNyY1csIHNyY0gsIGRlc3RXLCBmaWx0ZXJzKSB7XG4gIHZhciByLCBnLCBiLCBhO1xuICB2YXIgZmlsdGVyUHRyLCBmaWx0ZXJTaGlmdCwgZmlsdGVyU2l6ZTtcbiAgdmFyIHNyY1B0ciwgc3JjWSwgZGVzdFgsIGZpbHRlclZhbDtcbiAgdmFyIHNyY09mZnNldCA9IDAsXG4gICAgICBkZXN0T2Zmc2V0ID0gMDsgLy8gRm9yIGVhY2ggcm93XG5cbiAgZm9yIChzcmNZID0gMDsgc3JjWSA8IHNyY0g7IHNyY1krKykge1xuICAgIGZpbHRlclB0ciA9IDA7IC8vIEFwcGx5IHByZWNvbXB1dGVkIGZpbHRlcnMgdG8gZWFjaCBkZXN0aW5hdGlvbiByb3cgcG9pbnRcblxuICAgIGZvciAoZGVzdFggPSAwOyBkZXN0WCA8IGRlc3RXOyBkZXN0WCsrKSB7XG4gICAgICAvLyBHZXQgdGhlIGZpbHRlciB0aGF0IGRldGVybWluZXMgdGhlIGN1cnJlbnQgb3V0cHV0IHBpeGVsLlxuICAgICAgZmlsdGVyU2hpZnQgPSBmaWx0ZXJzW2ZpbHRlclB0cisrXTtcbiAgICAgIGZpbHRlclNpemUgPSBmaWx0ZXJzW2ZpbHRlclB0cisrXTtcbiAgICAgIHNyY1B0ciA9IHNyY09mZnNldCArIGZpbHRlclNoaWZ0ICogNCB8IDA7XG4gICAgICByID0gZyA9IGIgPSBhID0gMDsgLy8gQXBwbHkgdGhlIGZpbHRlciB0byB0aGUgcm93IHRvIGdldCB0aGUgZGVzdGluYXRpb24gcGl4ZWwgciwgZywgYiwgYVxuXG4gICAgICBmb3IgKDsgZmlsdGVyU2l6ZSA+IDA7IGZpbHRlclNpemUtLSkge1xuICAgICAgICBmaWx0ZXJWYWwgPSBmaWx0ZXJzW2ZpbHRlclB0cisrXTsgLy8gVXNlIHJldmVyc2Ugb3JkZXIgdG8gd29ya2Fyb3VuZCBkZW9wdHMgaW4gb2xkIHY4IChub2RlIHYuMTApXG4gICAgICAgIC8vIEJpZyB0aGFua3MgdG8gQG1yYWxlcGggKFZ5YWNoZXNsYXYgRWdvcm92KSBmb3IgdGhlIHRpcC5cblxuICAgICAgICBhID0gYSArIGZpbHRlclZhbCAqIHNyY1tzcmNQdHIgKyAzXSB8IDA7XG4gICAgICAgIGIgPSBiICsgZmlsdGVyVmFsICogc3JjW3NyY1B0ciArIDJdIHwgMDtcbiAgICAgICAgZyA9IGcgKyBmaWx0ZXJWYWwgKiBzcmNbc3JjUHRyICsgMV0gfCAwO1xuICAgICAgICByID0gciArIGZpbHRlclZhbCAqIHNyY1tzcmNQdHJdIHwgMDtcbiAgICAgICAgc3JjUHRyID0gc3JjUHRyICsgNCB8IDA7XG4gICAgICB9IC8vIEJyaW5nIHRoaXMgdmFsdWUgYmFjayBpbiByYW5nZS4gQWxsIG9mIHRoZSBmaWx0ZXIgc2NhbGluZyBmYWN0b3JzXG4gICAgICAvLyBhcmUgaW4gZml4ZWQgcG9pbnQgd2l0aCBGSVhFRF9GUkFDX0JJVFMgYml0cyBvZiBmcmFjdGlvbmFsIHBhcnQuXG4gICAgICAvL1xuICAgICAgLy8gKCEpIEFkZCAxLzIgb2YgdmFsdWUgYmVmb3JlIGNsYW1waW5nIHRvIGdldCBwcm9wZXIgcm91bmRpbmcuIEluIG90aGVyXG4gICAgICAvLyBjYXNlIGJyaWdodG5lc3MgbG9zcyB3aWxsIGJlIG5vdGljZWFibGUgaWYgeW91IHJlc2l6ZSBpbWFnZSB3aXRoIHdoaXRlXG4gICAgICAvLyBib3JkZXIgYW5kIHBsYWNlIGl0IG9uIHdoaXRlIGJhY2tncm91bmQuXG4gICAgICAvL1xuXG5cbiAgICAgIGRlc3RbZGVzdE9mZnNldCArIDNdID0gY2xhbXBUbzgoYSArICgxIDw8IDEzKSA+PiAxNFxuICAgICAgLypGSVhFRF9GUkFDX0JJVFMqL1xuICAgICAgKTtcbiAgICAgIGRlc3RbZGVzdE9mZnNldCArIDJdID0gY2xhbXBUbzgoYiArICgxIDw8IDEzKSA+PiAxNFxuICAgICAgLypGSVhFRF9GUkFDX0JJVFMqL1xuICAgICAgKTtcbiAgICAgIGRlc3RbZGVzdE9mZnNldCArIDFdID0gY2xhbXBUbzgoZyArICgxIDw8IDEzKSA+PiAxNFxuICAgICAgLypGSVhFRF9GUkFDX0JJVFMqL1xuICAgICAgKTtcbiAgICAgIGRlc3RbZGVzdE9mZnNldF0gPSBjbGFtcFRvOChyICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdE9mZnNldCA9IGRlc3RPZmZzZXQgKyBzcmNIICogNCB8IDA7XG4gICAgfVxuXG4gICAgZGVzdE9mZnNldCA9IChzcmNZICsgMSkgKiA0IHwgMDtcbiAgICBzcmNPZmZzZXQgPSAoc3JjWSArIDEpICogc3JjVyAqIDQgfCAwO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjb252b2x2ZUhvcml6b250YWxseTogY29udm9sdmVIb3Jpem9udGFsbHksXG4gIGNvbnZvbHZlVmVydGljYWxseTogY29udm9sdmVWZXJ0aWNhbGx5XG59O1xuXG59LHt9XSwzOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8vIFRoaXMgaXMgYXV0b2dlbmVyYXRlZCBmaWxlIGZyb20gbWF0aC53YXNtLCBkb24ndCBlZGl0LlxuLy9cbid1c2Ugc3RyaWN0Jztcbi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSAnQUdGemJRRUFBQUFCRkFKZ0JuOS9mMzkvZndCZ0IzOS9mMzkvZjM4QUFnOEJBMlZ1ZGdadFpXMXZjbmtDQUFFREF3SUFBUVFFQVhBQUFBY1pBZ2hqYjI1MmIyeDJaUUFBQ21OdmJuWnZiSFpsU0ZZQUFRa0JBQXJtQXdMQkF3RVFmd0pBSUFORkRRQWdCRVVOQUNBRlFRUnFJUlZCQUNFTVFRQWhEUU5BSUEwaERrRUFJUkZCQUNFSEEwQWdCMEVDYWlFU0FuOGdCU0FIUVFGMElnZHFJZ1pCQW1vdUFRQWlFd1JBUVFBaENFRUFJQk5ySVJRZ0ZTQUhhaUVQSUFBZ0RDQUdMZ0VBYWtFQ2RHb2hFRUVBSVFsQkFDRUtRUUFoQ3dOQUlCQW9BZ0FpQjBFWWRpQVBMZ0VBSWdac0lBdHFJUXNnQjBIL0FYRWdCbXdnQ0dvaENDQUhRUkIyUWY4QmNTQUdiQ0FLYWlFS0lBZEJDSFpCL3dGeElBWnNJQWxxSVFrZ0QwRUNhaUVQSUJCQkJHb2hFQ0FVUVFGcUloUU5BQXNnRWlBVGFnd0JDMEVBSVF0QkFDRUtRUUFoQ1VFQUlRZ2dFZ3NoQnlBQklBNUJBblJxSUFwQmdNQUFha0VPZFNJR1FmOEJJQVpCL3dGSUcwRVFkRUdBZ1B3SGNVRUFJQVpCQUVvYklBdEJnTUFBYWtFT2RTSUdRZjhCSUFaQi93RklHMEVZZEVFQUlBWkJBRW9iY2lBSlFZREFBR3BCRG5VaUJrSC9BU0FHUWY4QlNCdEJDSFJCZ1A0RGNVRUFJQVpCQUVvYmNpQUlRWURBQUdwQkRuVWlCa0gvQVNBR1FmOEJTQnRCL3dGeFFRQWdCa0VBU2h0eU5nSUFJQTRnQTJvaERpQVJRUUZxSWhFZ0JFY05BQXNnRENBQ2FpRU1JQTFCQVdvaURTQURSdzBBQ3dzTElRQUNRRUVBSUFJZ0F5QUVJQVVnQUJBQUlBSkJBQ0FFSUFVZ0JpQUJFQUFMQ3c9PSc7XG5cbn0se31dLDQ6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbmFtZTogJ3Jlc2l6ZScsXG4gIGZuOiBfZGVyZXFfKCcuL3Jlc2l6ZScpLFxuICB3YXNtX2ZuOiBfZGVyZXFfKCcuL3Jlc2l6ZV93YXNtJyksXG4gIHdhc21fc3JjOiBfZGVyZXFfKCcuL2NvbnZvbHZlX3dhc21fYmFzZTY0Jylcbn07XG5cbn0se1wiLi9jb252b2x2ZV93YXNtX2Jhc2U2NFwiOjMsXCIuL3Jlc2l6ZVwiOjUsXCIuL3Jlc2l6ZV93YXNtXCI6OH1dLDU6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3JlYXRlRmlsdGVycyA9IF9kZXJlcV8oJy4vcmVzaXplX2ZpbHRlcl9nZW4nKTtcblxudmFyIGNvbnZvbHZlSG9yaXpvbnRhbGx5ID0gX2RlcmVxXygnLi9jb252b2x2ZScpLmNvbnZvbHZlSG9yaXpvbnRhbGx5O1xuXG52YXIgY29udm9sdmVWZXJ0aWNhbGx5ID0gX2RlcmVxXygnLi9jb252b2x2ZScpLmNvbnZvbHZlVmVydGljYWxseTtcblxuZnVuY3Rpb24gcmVzZXRBbHBoYShkc3QsIHdpZHRoLCBoZWlnaHQpIHtcbiAgdmFyIHB0ciA9IDMsXG4gICAgICBsZW4gPSB3aWR0aCAqIGhlaWdodCAqIDQgfCAwO1xuXG4gIHdoaWxlIChwdHIgPCBsZW4pIHtcbiAgICBkc3RbcHRyXSA9IDB4RkY7XG4gICAgcHRyID0gcHRyICsgNCB8IDA7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByZXNpemUob3B0aW9ucykge1xuICB2YXIgc3JjID0gb3B0aW9ucy5zcmM7XG4gIHZhciBzcmNXID0gb3B0aW9ucy53aWR0aDtcbiAgdmFyIHNyY0ggPSBvcHRpb25zLmhlaWdodDtcbiAgdmFyIGRlc3RXID0gb3B0aW9ucy50b1dpZHRoO1xuICB2YXIgZGVzdEggPSBvcHRpb25zLnRvSGVpZ2h0O1xuICB2YXIgc2NhbGVYID0gb3B0aW9ucy5zY2FsZVggfHwgb3B0aW9ucy50b1dpZHRoIC8gb3B0aW9ucy53aWR0aDtcbiAgdmFyIHNjYWxlWSA9IG9wdGlvbnMuc2NhbGVZIHx8IG9wdGlvbnMudG9IZWlnaHQgLyBvcHRpb25zLmhlaWdodDtcbiAgdmFyIG9mZnNldFggPSBvcHRpb25zLm9mZnNldFggfHwgMDtcbiAgdmFyIG9mZnNldFkgPSBvcHRpb25zLm9mZnNldFkgfHwgMDtcbiAgdmFyIGRlc3QgPSBvcHRpb25zLmRlc3QgfHwgbmV3IFVpbnQ4QXJyYXkoZGVzdFcgKiBkZXN0SCAqIDQpO1xuICB2YXIgcXVhbGl0eSA9IHR5cGVvZiBvcHRpb25zLnF1YWxpdHkgPT09ICd1bmRlZmluZWQnID8gMyA6IG9wdGlvbnMucXVhbGl0eTtcbiAgdmFyIGFscGhhID0gb3B0aW9ucy5hbHBoYSB8fCBmYWxzZTtcbiAgdmFyIGZpbHRlcnNYID0gY3JlYXRlRmlsdGVycyhxdWFsaXR5LCBzcmNXLCBkZXN0Vywgc2NhbGVYLCBvZmZzZXRYKSxcbiAgICAgIGZpbHRlcnNZID0gY3JlYXRlRmlsdGVycyhxdWFsaXR5LCBzcmNILCBkZXN0SCwgc2NhbGVZLCBvZmZzZXRZKTtcbiAgdmFyIHRtcCA9IG5ldyBVaW50OEFycmF5KGRlc3RXICogc3JjSCAqIDQpOyAvLyBUbyB1c2Ugc2luZ2xlIGZ1bmN0aW9uIHdlIG5lZWQgc3JjICYgdG1wIG9mIHRoZSBzYW1lIHR5cGUuXG4gIC8vIEJ1dCBzcmMgY2FuIGJlIENhbnZhc1BpeGVsQXJyYXksIGFuZCB0bXAgLSBVaW50OEFycmF5LiBTbywga2VlcFxuICAvLyB2ZXJ0aWNhbCBhbmQgaG9yaXpvbnRhbCBwYXNzZXMgc2VwYXJhdGVseSB0byBhdm9pZCBkZW9wdGltaXphdGlvbi5cblxuICBjb252b2x2ZUhvcml6b250YWxseShzcmMsIHRtcCwgc3JjVywgc3JjSCwgZGVzdFcsIGZpbHRlcnNYKTtcbiAgY29udm9sdmVWZXJ0aWNhbGx5KHRtcCwgZGVzdCwgc3JjSCwgZGVzdFcsIGRlc3RILCBmaWx0ZXJzWSk7IC8vIFRoYXQncyBmYXN0ZXIgdGhhbiBkb2luZyBjaGVja3MgaW4gY29udm9sdmVyLlxuICAvLyAhISEgTm90ZSwgY2FudmFzIGRhdGEgaXMgbm90IHByZW11bHRpcGxlZC4gV2UgZG9uJ3QgbmVlZCBvdGhlclxuICAvLyBhbHBoYSBjb3JyZWN0aW9ucy5cblxuICBpZiAoIWFscGhhKSByZXNldEFscGhhKGRlc3QsIGRlc3RXLCBkZXN0SCk7XG4gIHJldHVybiBkZXN0O1xufTtcblxufSx7XCIuL2NvbnZvbHZlXCI6MixcIi4vcmVzaXplX2ZpbHRlcl9nZW5cIjo2fV0sNjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBDYWxjdWxhdGUgY29udm9sdXRpb24gZmlsdGVycyBmb3IgZWFjaCBkZXN0aW5hdGlvbiBwb2ludCxcbi8vIGFuZCBwYWNrIGRhdGEgdG8gSW50MTZBcnJheTpcbi8vXG4vLyBbIHNoaWZ0LCBsZW5ndGgsIGRhdGEuLi4sIHNoaWZ0MiwgbGVuZ3RoMiwgZGF0YS4uLiwgLi4uIF1cbi8vXG4vLyAtIHNoaWZ0IC0gb2Zmc2V0IGluIHNyYyBpbWFnZVxuLy8gLSBsZW5ndGggLSBmaWx0ZXIgbGVuZ3RoIChpbiBzcmMgcG9pbnRzKVxuLy8gLSBkYXRhIC0gZmlsdGVyIHZhbHVlcyBzZXF1ZW5jZVxuLy9cbid1c2Ugc3RyaWN0JztcblxudmFyIEZJTFRFUl9JTkZPID0gX2RlcmVxXygnLi9yZXNpemVfZmlsdGVyX2luZm8nKTsgLy8gUHJlY2lzaW9uIG9mIGZpeGVkIEZQIHZhbHVlc1xuXG5cbnZhciBGSVhFRF9GUkFDX0JJVFMgPSAxNDtcblxuZnVuY3Rpb24gdG9GaXhlZFBvaW50KG51bSkge1xuICByZXR1cm4gTWF0aC5yb3VuZChudW0gKiAoKDEgPDwgRklYRURfRlJBQ19CSVRTKSAtIDEpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByZXNpemVGaWx0ZXJHZW4ocXVhbGl0eSwgc3JjU2l6ZSwgZGVzdFNpemUsIHNjYWxlLCBvZmZzZXQpIHtcbiAgdmFyIGZpbHRlckZ1bmN0aW9uID0gRklMVEVSX0lORk9bcXVhbGl0eV0uZmlsdGVyO1xuICB2YXIgc2NhbGVJbnZlcnRlZCA9IDEuMCAvIHNjYWxlO1xuICB2YXIgc2NhbGVDbGFtcGVkID0gTWF0aC5taW4oMS4wLCBzY2FsZSk7IC8vIEZvciB1cHNjYWxlXG4gIC8vIEZpbHRlciB3aW5kb3cgKGF2ZXJhZ2luZyBpbnRlcnZhbCksIHNjYWxlZCB0byBzcmMgaW1hZ2VcblxuICB2YXIgc3JjV2luZG93ID0gRklMVEVSX0lORk9bcXVhbGl0eV0ud2luIC8gc2NhbGVDbGFtcGVkO1xuICB2YXIgZGVzdFBpeGVsLCBzcmNQaXhlbCwgc3JjRmlyc3QsIHNyY0xhc3QsIGZpbHRlckVsZW1lbnRTaXplLCBmbG9hdEZpbHRlciwgZnhwRmlsdGVyLCB0b3RhbCwgcHhsLCBpZHgsIGZsb2F0VmFsLCBmaWx0ZXJUb3RhbCwgZmlsdGVyVmFsO1xuICB2YXIgbGVmdE5vdEVtcHR5LCByaWdodE5vdEVtcHR5LCBmaWx0ZXJTaGlmdCwgZmlsdGVyU2l6ZTtcbiAgdmFyIG1heEZpbHRlckVsZW1lbnRTaXplID0gTWF0aC5mbG9vcigoc3JjV2luZG93ICsgMSkgKiAyKTtcbiAgdmFyIHBhY2tlZEZpbHRlciA9IG5ldyBJbnQxNkFycmF5KChtYXhGaWx0ZXJFbGVtZW50U2l6ZSArIDIpICogZGVzdFNpemUpO1xuICB2YXIgcGFja2VkRmlsdGVyUHRyID0gMDtcbiAgdmFyIHNsb3dDb3B5ID0gIXBhY2tlZEZpbHRlci5zdWJhcnJheSB8fCAhcGFja2VkRmlsdGVyLnNldDsgLy8gRm9yIGVhY2ggZGVzdGluYXRpb24gcGl4ZWwgY2FsY3VsYXRlIHNvdXJjZSByYW5nZSBhbmQgYnVpbHQgZmlsdGVyIHZhbHVlc1xuXG4gIGZvciAoZGVzdFBpeGVsID0gMDsgZGVzdFBpeGVsIDwgZGVzdFNpemU7IGRlc3RQaXhlbCsrKSB7XG4gICAgLy8gU2NhbGluZyBzaG91bGQgYmUgZG9uZSByZWxhdGl2ZSB0byBjZW50cmFsIHBpeGVsIHBvaW50XG4gICAgc3JjUGl4ZWwgPSAoZGVzdFBpeGVsICsgMC41KSAqIHNjYWxlSW52ZXJ0ZWQgKyBvZmZzZXQ7XG4gICAgc3JjRmlyc3QgPSBNYXRoLm1heCgwLCBNYXRoLmZsb29yKHNyY1BpeGVsIC0gc3JjV2luZG93KSk7XG4gICAgc3JjTGFzdCA9IE1hdGgubWluKHNyY1NpemUgLSAxLCBNYXRoLmNlaWwoc3JjUGl4ZWwgKyBzcmNXaW5kb3cpKTtcbiAgICBmaWx0ZXJFbGVtZW50U2l6ZSA9IHNyY0xhc3QgLSBzcmNGaXJzdCArIDE7XG4gICAgZmxvYXRGaWx0ZXIgPSBuZXcgRmxvYXQzMkFycmF5KGZpbHRlckVsZW1lbnRTaXplKTtcbiAgICBmeHBGaWx0ZXIgPSBuZXcgSW50MTZBcnJheShmaWx0ZXJFbGVtZW50U2l6ZSk7XG4gICAgdG90YWwgPSAwLjA7IC8vIEZpbGwgZmlsdGVyIHZhbHVlcyBmb3IgY2FsY3VsYXRlZCByYW5nZVxuXG4gICAgZm9yIChweGwgPSBzcmNGaXJzdCwgaWR4ID0gMDsgcHhsIDw9IHNyY0xhc3Q7IHB4bCsrLCBpZHgrKykge1xuICAgICAgZmxvYXRWYWwgPSBmaWx0ZXJGdW5jdGlvbigocHhsICsgMC41IC0gc3JjUGl4ZWwpICogc2NhbGVDbGFtcGVkKTtcbiAgICAgIHRvdGFsICs9IGZsb2F0VmFsO1xuICAgICAgZmxvYXRGaWx0ZXJbaWR4XSA9IGZsb2F0VmFsO1xuICAgIH0gLy8gTm9ybWFsaXplIGZpbHRlciwgY29udmVydCB0byBmaXhlZCBwb2ludCBhbmQgYWNjdW11bGF0ZSBjb252ZXJzaW9uIGVycm9yXG5cblxuICAgIGZpbHRlclRvdGFsID0gMDtcblxuICAgIGZvciAoaWR4ID0gMDsgaWR4IDwgZmxvYXRGaWx0ZXIubGVuZ3RoOyBpZHgrKykge1xuICAgICAgZmlsdGVyVmFsID0gZmxvYXRGaWx0ZXJbaWR4XSAvIHRvdGFsO1xuICAgICAgZmlsdGVyVG90YWwgKz0gZmlsdGVyVmFsO1xuICAgICAgZnhwRmlsdGVyW2lkeF0gPSB0b0ZpeGVkUG9pbnQoZmlsdGVyVmFsKTtcbiAgICB9IC8vIENvbXBlbnNhdGUgbm9ybWFsaXphdGlvbiBlcnJvciwgdG8gbWluaW1pemUgYnJpZ2h0bmVzcyBkcmlmdFxuXG5cbiAgICBmeHBGaWx0ZXJbZGVzdFNpemUgPj4gMV0gKz0gdG9GaXhlZFBvaW50KDEuMCAtIGZpbHRlclRvdGFsKTsgLy9cbiAgICAvLyBOb3cgcGFjayBmaWx0ZXIgdG8gdXNlYWJsZSBmb3JtXG4gICAgLy9cbiAgICAvLyAxLiBUcmltIGhlYWRpbmcgYW5kIHRhaWxpbmcgemVybyB2YWx1ZXMsIGFuZCBjb21wZW5zYXRlIHNoaXRmL2xlbmd0aFxuICAgIC8vIDIuIFB1dCBhbGwgdG8gc2luZ2xlIGFycmF5IGluIHRoaXMgZm9ybWF0OlxuICAgIC8vXG4gICAgLy8gICAgWyBwb3Mgc2hpZnQsIGRhdGEgbGVuZ3RoLCB2YWx1ZTEsIHZhbHVlMiwgdmFsdWUzLCAuLi4gXVxuICAgIC8vXG5cbiAgICBsZWZ0Tm90RW1wdHkgPSAwO1xuXG4gICAgd2hpbGUgKGxlZnROb3RFbXB0eSA8IGZ4cEZpbHRlci5sZW5ndGggJiYgZnhwRmlsdGVyW2xlZnROb3RFbXB0eV0gPT09IDApIHtcbiAgICAgIGxlZnROb3RFbXB0eSsrO1xuICAgIH1cblxuICAgIGlmIChsZWZ0Tm90RW1wdHkgPCBmeHBGaWx0ZXIubGVuZ3RoKSB7XG4gICAgICByaWdodE5vdEVtcHR5ID0gZnhwRmlsdGVyLmxlbmd0aCAtIDE7XG5cbiAgICAgIHdoaWxlIChyaWdodE5vdEVtcHR5ID4gMCAmJiBmeHBGaWx0ZXJbcmlnaHROb3RFbXB0eV0gPT09IDApIHtcbiAgICAgICAgcmlnaHROb3RFbXB0eS0tO1xuICAgICAgfVxuXG4gICAgICBmaWx0ZXJTaGlmdCA9IHNyY0ZpcnN0ICsgbGVmdE5vdEVtcHR5O1xuICAgICAgZmlsdGVyU2l6ZSA9IHJpZ2h0Tm90RW1wdHkgLSBsZWZ0Tm90RW1wdHkgKyAxO1xuICAgICAgcGFja2VkRmlsdGVyW3BhY2tlZEZpbHRlclB0cisrXSA9IGZpbHRlclNoaWZ0OyAvLyBzaGlmdFxuXG4gICAgICBwYWNrZWRGaWx0ZXJbcGFja2VkRmlsdGVyUHRyKytdID0gZmlsdGVyU2l6ZTsgLy8gc2l6ZVxuXG4gICAgICBpZiAoIXNsb3dDb3B5KSB7XG4gICAgICAgIHBhY2tlZEZpbHRlci5zZXQoZnhwRmlsdGVyLnN1YmFycmF5KGxlZnROb3RFbXB0eSwgcmlnaHROb3RFbXB0eSArIDEpLCBwYWNrZWRGaWx0ZXJQdHIpO1xuICAgICAgICBwYWNrZWRGaWx0ZXJQdHIgKz0gZmlsdGVyU2l6ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGZhbGxiYWNrIGZvciBvbGQgSUUgPCAxMSwgd2l0aG91dCBzdWJhcnJheS9zZXQgbWV0aG9kc1xuICAgICAgICBmb3IgKGlkeCA9IGxlZnROb3RFbXB0eTsgaWR4IDw9IHJpZ2h0Tm90RW1wdHk7IGlkeCsrKSB7XG4gICAgICAgICAgcGFja2VkRmlsdGVyW3BhY2tlZEZpbHRlclB0cisrXSA9IGZ4cEZpbHRlcltpZHhdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHplcm8gZGF0YSwgd3JpdGUgaGVhZGVyIG9ubHlcbiAgICAgIHBhY2tlZEZpbHRlcltwYWNrZWRGaWx0ZXJQdHIrK10gPSAwOyAvLyBzaGlmdFxuXG4gICAgICBwYWNrZWRGaWx0ZXJbcGFja2VkRmlsdGVyUHRyKytdID0gMDsgLy8gc2l6ZVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYWNrZWRGaWx0ZXI7XG59O1xuXG59LHtcIi4vcmVzaXplX2ZpbHRlcl9pbmZvXCI6N31dLDc6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gRmlsdGVyIGRlZmluaXRpb25zIHRvIGJ1aWxkIHRhYmxlcyBmb3Jcbi8vIHJlc2l6aW5nIGNvbnZvbHZlcnMuXG4vL1xuLy8gUHJlc2V0cyBmb3IgcXVhbGl0eSAwLi4zLiBGaWx0ZXIgZnVuY3Rpb25zICsgd2luZG93IHNpemVcbi8vXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gW3tcbiAgLy8gTmVhcmVzdCBuZWlib3IgKEJveClcbiAgd2luOiAwLjUsXG4gIGZpbHRlcjogZnVuY3Rpb24gZmlsdGVyKHgpIHtcbiAgICByZXR1cm4geCA+PSAtMC41ICYmIHggPCAwLjUgPyAxLjAgOiAwLjA7XG4gIH1cbn0sIHtcbiAgLy8gSGFtbWluZ1xuICB3aW46IDEuMCxcbiAgZmlsdGVyOiBmdW5jdGlvbiBmaWx0ZXIoeCkge1xuICAgIGlmICh4IDw9IC0xLjAgfHwgeCA+PSAxLjApIHtcbiAgICAgIHJldHVybiAwLjA7XG4gICAgfVxuXG4gICAgaWYgKHggPiAtMS4xOTIwOTI5MEUtMDcgJiYgeCA8IDEuMTkyMDkyOTBFLTA3KSB7XG4gICAgICByZXR1cm4gMS4wO1xuICAgIH1cblxuICAgIHZhciB4cGkgPSB4ICogTWF0aC5QSTtcbiAgICByZXR1cm4gTWF0aC5zaW4oeHBpKSAvIHhwaSAqICgwLjU0ICsgMC40NiAqIE1hdGguY29zKHhwaSAvIDEuMCkpO1xuICB9XG59LCB7XG4gIC8vIExhbmN6b3MsIHdpbiA9IDJcbiAgd2luOiAyLjAsXG4gIGZpbHRlcjogZnVuY3Rpb24gZmlsdGVyKHgpIHtcbiAgICBpZiAoeCA8PSAtMi4wIHx8IHggPj0gMi4wKSB7XG4gICAgICByZXR1cm4gMC4wO1xuICAgIH1cblxuICAgIGlmICh4ID4gLTEuMTkyMDkyOTBFLTA3ICYmIHggPCAxLjE5MjA5MjkwRS0wNykge1xuICAgICAgcmV0dXJuIDEuMDtcbiAgICB9XG5cbiAgICB2YXIgeHBpID0geCAqIE1hdGguUEk7XG4gICAgcmV0dXJuIE1hdGguc2luKHhwaSkgLyB4cGkgKiBNYXRoLnNpbih4cGkgLyAyLjApIC8gKHhwaSAvIDIuMCk7XG4gIH1cbn0sIHtcbiAgLy8gTGFuY3pvcywgd2luID0gM1xuICB3aW46IDMuMCxcbiAgZmlsdGVyOiBmdW5jdGlvbiBmaWx0ZXIoeCkge1xuICAgIGlmICh4IDw9IC0zLjAgfHwgeCA+PSAzLjApIHtcbiAgICAgIHJldHVybiAwLjA7XG4gICAgfVxuXG4gICAgaWYgKHggPiAtMS4xOTIwOTI5MEUtMDcgJiYgeCA8IDEuMTkyMDkyOTBFLTA3KSB7XG4gICAgICByZXR1cm4gMS4wO1xuICAgIH1cblxuICAgIHZhciB4cGkgPSB4ICogTWF0aC5QSTtcbiAgICByZXR1cm4gTWF0aC5zaW4oeHBpKSAvIHhwaSAqIE1hdGguc2luKHhwaSAvIDMuMCkgLyAoeHBpIC8gMy4wKTtcbiAgfVxufV07XG5cbn0se31dLDg6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3JlYXRlRmlsdGVycyA9IF9kZXJlcV8oJy4vcmVzaXplX2ZpbHRlcl9nZW4nKTtcblxuZnVuY3Rpb24gcmVzZXRBbHBoYShkc3QsIHdpZHRoLCBoZWlnaHQpIHtcbiAgdmFyIHB0ciA9IDMsXG4gICAgICBsZW4gPSB3aWR0aCAqIGhlaWdodCAqIDQgfCAwO1xuXG4gIHdoaWxlIChwdHIgPCBsZW4pIHtcbiAgICBkc3RbcHRyXSA9IDB4RkY7XG4gICAgcHRyID0gcHRyICsgNCB8IDA7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNVaW50OEFycmF5KHNyYykge1xuICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoc3JjLmJ1ZmZlciwgMCwgc3JjLmJ5dGVMZW5ndGgpO1xufVxuXG52YXIgSVNfTEUgPSB0cnVlOyAvLyBzaG91bGQgbm90IGNyYXNoIGV2ZXJ5dGhpbmcgb24gbW9kdWxlIGxvYWQgaW4gb2xkIGJyb3dzZXJzXG5cbnRyeSB7XG4gIElTX0xFID0gbmV3IFVpbnQzMkFycmF5KG5ldyBVaW50OEFycmF5KFsxLCAwLCAwLCAwXSkuYnVmZmVyKVswXSA9PT0gMTtcbn0gY2F0Y2ggKF9fKSB7fVxuXG5mdW5jdGlvbiBjb3B5SW50MTZhc0xFKHNyYywgdGFyZ2V0LCB0YXJnZXRfb2Zmc2V0KSB7XG4gIGlmIChJU19MRSkge1xuICAgIHRhcmdldC5zZXQoYXNVaW50OEFycmF5KHNyYyksIHRhcmdldF9vZmZzZXQpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGZvciAodmFyIHB0ciA9IHRhcmdldF9vZmZzZXQsIGkgPSAwOyBpIDwgc3JjLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGRhdGEgPSBzcmNbaV07XG4gICAgdGFyZ2V0W3B0cisrXSA9IGRhdGEgJiAweEZGO1xuICAgIHRhcmdldFtwdHIrK10gPSBkYXRhID4+IDggJiAweEZGO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcmVzaXplX3dhc20ob3B0aW9ucykge1xuICB2YXIgc3JjID0gb3B0aW9ucy5zcmM7XG4gIHZhciBzcmNXID0gb3B0aW9ucy53aWR0aDtcbiAgdmFyIHNyY0ggPSBvcHRpb25zLmhlaWdodDtcbiAgdmFyIGRlc3RXID0gb3B0aW9ucy50b1dpZHRoO1xuICB2YXIgZGVzdEggPSBvcHRpb25zLnRvSGVpZ2h0O1xuICB2YXIgc2NhbGVYID0gb3B0aW9ucy5zY2FsZVggfHwgb3B0aW9ucy50b1dpZHRoIC8gb3B0aW9ucy53aWR0aDtcbiAgdmFyIHNjYWxlWSA9IG9wdGlvbnMuc2NhbGVZIHx8IG9wdGlvbnMudG9IZWlnaHQgLyBvcHRpb25zLmhlaWdodDtcbiAgdmFyIG9mZnNldFggPSBvcHRpb25zLm9mZnNldFggfHwgMC4wO1xuICB2YXIgb2Zmc2V0WSA9IG9wdGlvbnMub2Zmc2V0WSB8fCAwLjA7XG4gIHZhciBkZXN0ID0gb3B0aW9ucy5kZXN0IHx8IG5ldyBVaW50OEFycmF5KGRlc3RXICogZGVzdEggKiA0KTtcbiAgdmFyIHF1YWxpdHkgPSB0eXBlb2Ygb3B0aW9ucy5xdWFsaXR5ID09PSAndW5kZWZpbmVkJyA/IDMgOiBvcHRpb25zLnF1YWxpdHk7XG4gIHZhciBhbHBoYSA9IG9wdGlvbnMuYWxwaGEgfHwgZmFsc2U7XG4gIHZhciBmaWx0ZXJzWCA9IGNyZWF0ZUZpbHRlcnMocXVhbGl0eSwgc3JjVywgZGVzdFcsIHNjYWxlWCwgb2Zmc2V0WCksXG4gICAgICBmaWx0ZXJzWSA9IGNyZWF0ZUZpbHRlcnMocXVhbGl0eSwgc3JjSCwgZGVzdEgsIHNjYWxlWSwgb2Zmc2V0WSk7IC8vIGRlc3RpbmF0aW9uIGlzIDAgdG9vLlxuXG4gIHZhciBzcmNfb2Zmc2V0ID0gMDsgLy8gYnVmZmVyIGJldHdlZW4gY29udm9sdmUgcGFzc2VzXG5cbiAgdmFyIHRtcF9vZmZzZXQgPSB0aGlzLl9fYWxpZ24oc3JjX29mZnNldCArIE1hdGgubWF4KHNyYy5ieXRlTGVuZ3RoLCBkZXN0LmJ5dGVMZW5ndGgpKTtcblxuICB2YXIgZmlsdGVyc1hfb2Zmc2V0ID0gdGhpcy5fX2FsaWduKHRtcF9vZmZzZXQgKyBzcmNIICogZGVzdFcgKiA0KTtcblxuICB2YXIgZmlsdGVyc1lfb2Zmc2V0ID0gdGhpcy5fX2FsaWduKGZpbHRlcnNYX29mZnNldCArIGZpbHRlcnNYLmJ5dGVMZW5ndGgpO1xuXG4gIHZhciBhbGxvY19ieXRlcyA9IGZpbHRlcnNZX29mZnNldCArIGZpbHRlcnNZLmJ5dGVMZW5ndGg7XG5cbiAgdmFyIGluc3RhbmNlID0gdGhpcy5fX2luc3RhbmNlKCdyZXNpemUnLCBhbGxvY19ieXRlcyk7IC8vXG4gIC8vIEZpbGwgbWVtb3J5IGJsb2NrIHdpdGggZGF0YSB0byBwcm9jZXNzXG4gIC8vXG5cblxuICB2YXIgbWVtID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5fX21lbW9yeS5idWZmZXIpO1xuICB2YXIgbWVtMzIgPSBuZXcgVWludDMyQXJyYXkodGhpcy5fX21lbW9yeS5idWZmZXIpOyAvLyAzMi1iaXQgY29weSBpcyBtdWNoIGZhc3RlciBpbiBjaHJvbWVcblxuICB2YXIgc3JjMzIgPSBuZXcgVWludDMyQXJyYXkoc3JjLmJ1ZmZlcik7XG4gIG1lbTMyLnNldChzcmMzMik7IC8vIFdlIHNob3VsZCBndWFyYW50ZWUgTEUgYnl0ZXMgb3JkZXIuIEZpbHRlcnMgYXJlIG5vdCBiaWcsIHNvXG4gIC8vIHNwZWVkIGRpZmZlcmVuY2UgaXMgbm90IHNpZ25pZmljYW50IHZzIGRpcmVjdCAuc2V0KClcblxuICBjb3B5SW50MTZhc0xFKGZpbHRlcnNYLCBtZW0sIGZpbHRlcnNYX29mZnNldCk7XG4gIGNvcHlJbnQxNmFzTEUoZmlsdGVyc1ksIG1lbSwgZmlsdGVyc1lfb2Zmc2V0KTsgLy9cbiAgLy8gTm93IGNhbGwgd2ViYXNzZW1ibHkgbWV0aG9kXG4gIC8vIGVtc2RrIGRvZXMgbWV0aG9kIG5hbWVzIHdpdGggJ18nXG5cbiAgdmFyIGZuID0gaW5zdGFuY2UuZXhwb3J0cy5jb252b2x2ZUhWIHx8IGluc3RhbmNlLmV4cG9ydHMuX2NvbnZvbHZlSFY7XG4gIGZuKGZpbHRlcnNYX29mZnNldCwgZmlsdGVyc1lfb2Zmc2V0LCB0bXBfb2Zmc2V0LCBzcmNXLCBzcmNILCBkZXN0VywgZGVzdEgpOyAvL1xuICAvLyBDb3B5IGRhdGEgYmFjayB0byB0eXBlZCBhcnJheVxuICAvL1xuICAvLyAzMi1iaXQgY29weSBpcyBtdWNoIGZhc3RlciBpbiBjaHJvbWVcblxuICB2YXIgZGVzdDMyID0gbmV3IFVpbnQzMkFycmF5KGRlc3QuYnVmZmVyKTtcbiAgZGVzdDMyLnNldChuZXcgVWludDMyQXJyYXkodGhpcy5fX21lbW9yeS5idWZmZXIsIDAsIGRlc3RIICogZGVzdFcpKTsgLy8gVGhhdCdzIGZhc3RlciB0aGFuIGRvaW5nIGNoZWNrcyBpbiBjb252b2x2ZXIuXG4gIC8vICEhISBOb3RlLCBjYW52YXMgZGF0YSBpcyBub3QgcHJlbXVsdGlwbGVkLiBXZSBkb24ndCBuZWVkIG90aGVyXG4gIC8vIGFscGhhIGNvcnJlY3Rpb25zLlxuXG4gIGlmICghYWxwaGEpIHJlc2V0QWxwaGEoZGVzdCwgZGVzdFcsIGRlc3RIKTtcbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG59LHtcIi4vcmVzaXplX2ZpbHRlcl9nZW5cIjo2fV0sOTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBHQ19JTlRFUlZBTCA9IDEwMDtcblxuZnVuY3Rpb24gUG9vbChjcmVhdGUsIGlkbGUpIHtcbiAgdGhpcy5jcmVhdGUgPSBjcmVhdGU7XG4gIHRoaXMuYXZhaWxhYmxlID0gW107XG4gIHRoaXMuYWNxdWlyZWQgPSB7fTtcbiAgdGhpcy5sYXN0SWQgPSAxO1xuICB0aGlzLnRpbWVvdXRJZCA9IDA7XG4gIHRoaXMuaWRsZSA9IGlkbGUgfHwgMjAwMDtcbn1cblxuUG9vbC5wcm90b3R5cGUuYWNxdWlyZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF90aGlzID0gdGhpcztcblxuICB2YXIgcmVzb3VyY2U7XG5cbiAgaWYgKHRoaXMuYXZhaWxhYmxlLmxlbmd0aCAhPT0gMCkge1xuICAgIHJlc291cmNlID0gdGhpcy5hdmFpbGFibGUucG9wKCk7XG4gIH0gZWxzZSB7XG4gICAgcmVzb3VyY2UgPSB0aGlzLmNyZWF0ZSgpO1xuICAgIHJlc291cmNlLmlkID0gdGhpcy5sYXN0SWQrKztcblxuICAgIHJlc291cmNlLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMucmVsZWFzZShyZXNvdXJjZSk7XG4gICAgfTtcbiAgfVxuXG4gIHRoaXMuYWNxdWlyZWRbcmVzb3VyY2UuaWRdID0gcmVzb3VyY2U7XG4gIHJldHVybiByZXNvdXJjZTtcbn07XG5cblBvb2wucHJvdG90eXBlLnJlbGVhc2UgPSBmdW5jdGlvbiAocmVzb3VyY2UpIHtcbiAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgZGVsZXRlIHRoaXMuYWNxdWlyZWRbcmVzb3VyY2UuaWRdO1xuICByZXNvdXJjZS5sYXN0VXNlZCA9IERhdGUubm93KCk7XG4gIHRoaXMuYXZhaWxhYmxlLnB1c2gocmVzb3VyY2UpO1xuXG4gIGlmICh0aGlzLnRpbWVvdXRJZCA9PT0gMCkge1xuICAgIHRoaXMudGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMyLmdjKCk7XG4gICAgfSwgR0NfSU5URVJWQUwpO1xuICB9XG59O1xuXG5Qb29sLnByb3RvdHlwZS5nYyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gIHRoaXMuYXZhaWxhYmxlID0gdGhpcy5hdmFpbGFibGUuZmlsdGVyKGZ1bmN0aW9uIChyZXNvdXJjZSkge1xuICAgIGlmIChub3cgLSByZXNvdXJjZS5sYXN0VXNlZCA+IF90aGlzMy5pZGxlKSB7XG4gICAgICByZXNvdXJjZS5kZXN0cm95KCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuXG4gIGlmICh0aGlzLmF2YWlsYWJsZS5sZW5ndGggIT09IDApIHtcbiAgICB0aGlzLnRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIF90aGlzMy5nYygpO1xuICAgIH0sIEdDX0lOVEVSVkFMKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnRpbWVvdXRJZCA9IDA7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUG9vbDtcblxufSx7fV0sMTA6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gQWRkIGludGVybWVkaWF0ZSByZXNpemluZyBzdGVwcyB3aGVuIHNjYWxpbmcgZG93biBieSBhIHZlcnkgbGFyZ2UgZmFjdG9yLlxuLy9cbi8vIEZvciBleGFtcGxlLCB3aGVuIHJlc2l6aW5nIDEwMDAweDEwMDAwIGRvd24gdG8gMTB4MTAsIGl0J2xsIHJlc2l6ZSBpdCB0b1xuLy8gMzAweDMwMCBmaXJzdC5cbi8vXG4vLyBJdCdzIG5lZWRlZCBiZWNhdXNlIHRpbGVyIGhhcyBpc3N1ZXMgd2hlbiB0aGUgZW50aXJlIHRpbGUgaXMgc2NhbGVkIGRvd25cbi8vIHRvIGEgZmV3IHBpeGVscyAoMTAyNHB4IHNvdXJjZSB0aWxlIHdpdGggYm9yZGVyIHNpemUgMyBzaG91bGQgcmVzdWx0IGluXG4vLyBhdCBsZWFzdCAzKzMrMiA9IDhweCB0YXJnZXQgdGlsZSwgc28gbWF4IHNjYWxlIGZhY3RvciBpcyAxMjggaGVyZSkuXG4vL1xuLy8gQWxzbywgYWRkaW5nIGludGVybWVkaWF0ZSBzdGVwcyBjYW4gc3BlZWQgdXAgcHJvY2Vzc2luZyBpZiB3ZSB1c2UgbG93ZXJcbi8vIHF1YWxpdHkgYWxnb3JpdGhtcyBmb3IgZmlyc3Qgc3RhZ2VzLlxuLy9cbid1c2Ugc3RyaWN0JzsgLy8gbWluIHNpemUgPSAwIHJlc3VsdHMgaW4gaW5maW5pdGUgbG9vcCxcbi8vIG1pbiBzaXplID0gMSBjYW4gY29uc3VtZSBsYXJnZSBhbW91bnQgb2YgbWVtb3J5XG5cbnZhciBNSU5fSU5ORVJfVElMRV9TSVpFID0gMjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjcmVhdGVTdGFnZXMoZnJvbVdpZHRoLCBmcm9tSGVpZ2h0LCB0b1dpZHRoLCB0b0hlaWdodCwgc3JjVGlsZVNpemUsIGRlc3RUaWxlQm9yZGVyKSB7XG4gIHZhciBzY2FsZVggPSB0b1dpZHRoIC8gZnJvbVdpZHRoO1xuICB2YXIgc2NhbGVZID0gdG9IZWlnaHQgLyBmcm9tSGVpZ2h0OyAvLyBkZXJpdmVkIGZyb20gY3JlYXRlUmVnaW9ucyBlcXVhdGlvbjpcbiAgLy8gaW5uZXJUaWxlV2lkdGggPSBwaXhlbEZsb29yKHNyY1RpbGVTaXplICogc2NhbGVYKSAtIDIgKiBkZXN0VGlsZUJvcmRlcjtcblxuICB2YXIgbWluU2NhbGUgPSAoMiAqIGRlc3RUaWxlQm9yZGVyICsgTUlOX0lOTkVSX1RJTEVfU0laRSArIDEpIC8gc3JjVGlsZVNpemU7IC8vIHJlZnVzZSB0byBzY2FsZSBpbWFnZSBtdWx0aXBsZSB0aW1lcyBieSBsZXNzIHRoYW4gdHdpY2UgZWFjaCB0aW1lLFxuICAvLyBpdCBjb3VsZCBvbmx5IGhhcHBlbiBiZWNhdXNlIG9mIGludmFsaWQgb3B0aW9uc1xuXG4gIGlmIChtaW5TY2FsZSA+IDAuNSkgcmV0dXJuIFtbdG9XaWR0aCwgdG9IZWlnaHRdXTtcbiAgdmFyIHN0YWdlQ291bnQgPSBNYXRoLmNlaWwoTWF0aC5sb2coTWF0aC5taW4oc2NhbGVYLCBzY2FsZVkpKSAvIE1hdGgubG9nKG1pblNjYWxlKSk7IC8vIG5vIGFkZGl0aW9uYWwgcmVzaXplcyBhcmUgbmVjZXNzYXJ5LFxuICAvLyBzdGFnZUNvdW50IGNhbiBiZSB6ZXJvIG9yIGJlIG5lZ2F0aXZlIHdoZW4gZW5sYXJnaW5nIHRoZSBpbWFnZVxuXG4gIGlmIChzdGFnZUNvdW50IDw9IDEpIHJldHVybiBbW3RvV2lkdGgsIHRvSGVpZ2h0XV07XG4gIHZhciByZXN1bHQgPSBbXTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0YWdlQ291bnQ7IGkrKykge1xuICAgIHZhciB3aWR0aCA9IE1hdGgucm91bmQoTWF0aC5wb3coTWF0aC5wb3coZnJvbVdpZHRoLCBzdGFnZUNvdW50IC0gaSAtIDEpICogTWF0aC5wb3codG9XaWR0aCwgaSArIDEpLCAxIC8gc3RhZ2VDb3VudCkpO1xuICAgIHZhciBoZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgucG93KE1hdGgucG93KGZyb21IZWlnaHQsIHN0YWdlQ291bnQgLSBpIC0gMSkgKiBNYXRoLnBvdyh0b0hlaWdodCwgaSArIDEpLCAxIC8gc3RhZ2VDb3VudCkpO1xuICAgIHJlc3VsdC5wdXNoKFt3aWR0aCwgaGVpZ2h0XSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxufSx7fV0sMTE6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gU3BsaXQgb3JpZ2luYWwgaW1hZ2UgaW50byBtdWx0aXBsZSAxMDI0eDEwMjQgY2h1bmtzIHRvIHJlZHVjZSBtZW1vcnkgdXNhZ2Vcbi8vIChpbWFnZXMgaGF2ZSB0byBiZSB1bnBhY2tlZCBpbnRvIHR5cGVkIGFycmF5cyBmb3IgcmVzaXppbmcpIGFuZCBhbGxvd1xuLy8gcGFyYWxsZWwgcHJvY2Vzc2luZyBvZiBtdWx0aXBsZSB0aWxlcyBhdCBhIHRpbWUuXG4vL1xuJ3VzZSBzdHJpY3QnO1xuLypcbiAqIHBpeGVsRmxvb3IgYW5kIHBpeGVsQ2VpbCBhcmUgbW9kaWZpZWQgdmVyc2lvbnMgb2YgTWF0aC5mbG9vciBhbmQgTWF0aC5jZWlsXG4gKiBmdW5jdGlvbnMgd2hpY2ggdGFrZSBpbnRvIGFjY291bnQgZmxvYXRpbmcgcG9pbnQgYXJpdGhtZXRpYyBlcnJvcnMuXG4gKiBUaG9zZSBlcnJvcnMgY2FuIGNhdXNlIHVuZGVzaXJlZCBpbmNyZW1lbnRzL2RlY3JlbWVudHMgb2Ygc2l6ZXMgYW5kIG9mZnNldHM6XG4gKiBNYXRoLmNlaWwoMzYgLyAoMzYgLyA1MDApKSA9IDUwMVxuICogcGl4ZWxDZWlsKDM2IC8gKDM2IC8gNTAwKSkgPSA1MDBcbiAqL1xuXG52YXIgUElYRUxfRVBTSUxPTiA9IDFlLTU7XG5cbmZ1bmN0aW9uIHBpeGVsRmxvb3IoeCkge1xuICB2YXIgbmVhcmVzdCA9IE1hdGgucm91bmQoeCk7XG5cbiAgaWYgKE1hdGguYWJzKHggLSBuZWFyZXN0KSA8IFBJWEVMX0VQU0lMT04pIHtcbiAgICByZXR1cm4gbmVhcmVzdDtcbiAgfVxuXG4gIHJldHVybiBNYXRoLmZsb29yKHgpO1xufVxuXG5mdW5jdGlvbiBwaXhlbENlaWwoeCkge1xuICB2YXIgbmVhcmVzdCA9IE1hdGgucm91bmQoeCk7XG5cbiAgaWYgKE1hdGguYWJzKHggLSBuZWFyZXN0KSA8IFBJWEVMX0VQU0lMT04pIHtcbiAgICByZXR1cm4gbmVhcmVzdDtcbiAgfVxuXG4gIHJldHVybiBNYXRoLmNlaWwoeCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlUmVnaW9ucyhvcHRpb25zKSB7XG4gIHZhciBzY2FsZVggPSBvcHRpb25zLnRvV2lkdGggLyBvcHRpb25zLndpZHRoO1xuICB2YXIgc2NhbGVZID0gb3B0aW9ucy50b0hlaWdodCAvIG9wdGlvbnMuaGVpZ2h0O1xuICB2YXIgaW5uZXJUaWxlV2lkdGggPSBwaXhlbEZsb29yKG9wdGlvbnMuc3JjVGlsZVNpemUgKiBzY2FsZVgpIC0gMiAqIG9wdGlvbnMuZGVzdFRpbGVCb3JkZXI7XG4gIHZhciBpbm5lclRpbGVIZWlnaHQgPSBwaXhlbEZsb29yKG9wdGlvbnMuc3JjVGlsZVNpemUgKiBzY2FsZVkpIC0gMiAqIG9wdGlvbnMuZGVzdFRpbGVCb3JkZXI7IC8vIHByZXZlbnQgaW5maW5pdGUgbG9vcCwgdGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuXG5cbiAgaWYgKGlubmVyVGlsZVdpZHRoIDwgMSB8fCBpbm5lclRpbGVIZWlnaHQgPCAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnRlcm5hbCBlcnJvciBpbiBwaWNhOiB0YXJnZXQgdGlsZSB3aWR0aC9oZWlnaHQgaXMgdG9vIHNtYWxsLicpO1xuICB9XG5cbiAgdmFyIHgsIHk7XG4gIHZhciBpbm5lclgsIGlubmVyWSwgdG9UaWxlV2lkdGgsIHRvVGlsZUhlaWdodDtcbiAgdmFyIHRpbGVzID0gW107XG4gIHZhciB0aWxlOyAvLyB3ZSBnbyB0b3AtdG8tZG93biBpbnN0ZWFkIG9mIGxlZnQtdG8tcmlnaHQgdG8gbWFrZSBpbWFnZSBkaXNwbGF5ZWQgZnJvbSB0b3AgdG9cbiAgLy8gZG9lc24gaW4gdGhlIGJyb3dzZXJcblxuICBmb3IgKGlubmVyWSA9IDA7IGlubmVyWSA8IG9wdGlvbnMudG9IZWlnaHQ7IGlubmVyWSArPSBpbm5lclRpbGVIZWlnaHQpIHtcbiAgICBmb3IgKGlubmVyWCA9IDA7IGlubmVyWCA8IG9wdGlvbnMudG9XaWR0aDsgaW5uZXJYICs9IGlubmVyVGlsZVdpZHRoKSB7XG4gICAgICB4ID0gaW5uZXJYIC0gb3B0aW9ucy5kZXN0VGlsZUJvcmRlcjtcblxuICAgICAgaWYgKHggPCAwKSB7XG4gICAgICAgIHggPSAwO1xuICAgICAgfVxuXG4gICAgICB0b1RpbGVXaWR0aCA9IGlubmVyWCArIGlubmVyVGlsZVdpZHRoICsgb3B0aW9ucy5kZXN0VGlsZUJvcmRlciAtIHg7XG5cbiAgICAgIGlmICh4ICsgdG9UaWxlV2lkdGggPj0gb3B0aW9ucy50b1dpZHRoKSB7XG4gICAgICAgIHRvVGlsZVdpZHRoID0gb3B0aW9ucy50b1dpZHRoIC0geDtcbiAgICAgIH1cblxuICAgICAgeSA9IGlubmVyWSAtIG9wdGlvbnMuZGVzdFRpbGVCb3JkZXI7XG5cbiAgICAgIGlmICh5IDwgMCkge1xuICAgICAgICB5ID0gMDtcbiAgICAgIH1cblxuICAgICAgdG9UaWxlSGVpZ2h0ID0gaW5uZXJZICsgaW5uZXJUaWxlSGVpZ2h0ICsgb3B0aW9ucy5kZXN0VGlsZUJvcmRlciAtIHk7XG5cbiAgICAgIGlmICh5ICsgdG9UaWxlSGVpZ2h0ID49IG9wdGlvbnMudG9IZWlnaHQpIHtcbiAgICAgICAgdG9UaWxlSGVpZ2h0ID0gb3B0aW9ucy50b0hlaWdodCAtIHk7XG4gICAgICB9XG5cbiAgICAgIHRpbGUgPSB7XG4gICAgICAgIHRvWDogeCxcbiAgICAgICAgdG9ZOiB5LFxuICAgICAgICB0b1dpZHRoOiB0b1RpbGVXaWR0aCxcbiAgICAgICAgdG9IZWlnaHQ6IHRvVGlsZUhlaWdodCxcbiAgICAgICAgdG9Jbm5lclg6IGlubmVyWCxcbiAgICAgICAgdG9Jbm5lclk6IGlubmVyWSxcbiAgICAgICAgdG9Jbm5lcldpZHRoOiBpbm5lclRpbGVXaWR0aCxcbiAgICAgICAgdG9Jbm5lckhlaWdodDogaW5uZXJUaWxlSGVpZ2h0LFxuICAgICAgICBvZmZzZXRYOiB4IC8gc2NhbGVYIC0gcGl4ZWxGbG9vcih4IC8gc2NhbGVYKSxcbiAgICAgICAgb2Zmc2V0WTogeSAvIHNjYWxlWSAtIHBpeGVsRmxvb3IoeSAvIHNjYWxlWSksXG4gICAgICAgIHNjYWxlWDogc2NhbGVYLFxuICAgICAgICBzY2FsZVk6IHNjYWxlWSxcbiAgICAgICAgeDogcGl4ZWxGbG9vcih4IC8gc2NhbGVYKSxcbiAgICAgICAgeTogcGl4ZWxGbG9vcih5IC8gc2NhbGVZKSxcbiAgICAgICAgd2lkdGg6IHBpeGVsQ2VpbCh0b1RpbGVXaWR0aCAvIHNjYWxlWCksXG4gICAgICAgIGhlaWdodDogcGl4ZWxDZWlsKHRvVGlsZUhlaWdodCAvIHNjYWxlWSlcbiAgICAgIH07XG4gICAgICB0aWxlcy5wdXNoKHRpbGUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aWxlcztcbn07XG5cbn0se31dLDEyOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gb2JqQ2xhc3Mob2JqKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKTtcbn1cblxubW9kdWxlLmV4cG9ydHMuaXNDYW52YXMgPSBmdW5jdGlvbiBpc0NhbnZhcyhlbGVtZW50KSB7XG4gIHZhciBjbmFtZSA9IG9iakNsYXNzKGVsZW1lbnQpO1xuICByZXR1cm4gY25hbWUgPT09ICdbb2JqZWN0IEhUTUxDYW52YXNFbGVtZW50XSdcbiAgLyogYnJvd3NlciAqL1xuICB8fCBjbmFtZSA9PT0gJ1tvYmplY3QgT2Zmc2NyZWVuQ2FudmFzXScgfHwgY25hbWUgPT09ICdbb2JqZWN0IENhbnZhc10nXG4gIC8qIG5vZGUtY2FudmFzICovXG4gIDtcbn07XG5cbm1vZHVsZS5leHBvcnRzLmlzSW1hZ2UgPSBmdW5jdGlvbiBpc0ltYWdlKGVsZW1lbnQpIHtcbiAgcmV0dXJuIG9iakNsYXNzKGVsZW1lbnQpID09PSAnW29iamVjdCBIVE1MSW1hZ2VFbGVtZW50XSc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5pc0ltYWdlQml0bWFwID0gZnVuY3Rpb24gaXNJbWFnZUJpdG1hcChlbGVtZW50KSB7XG4gIHJldHVybiBvYmpDbGFzcyhlbGVtZW50KSA9PT0gJ1tvYmplY3QgSW1hZ2VCaXRtYXBdJztcbn07XG5cbm1vZHVsZS5leHBvcnRzLmxpbWl0ZXIgPSBmdW5jdGlvbiBsaW1pdGVyKGNvbmN1cnJlbmN5KSB7XG4gIHZhciBhY3RpdmUgPSAwLFxuICAgICAgcXVldWUgPSBbXTtcblxuICBmdW5jdGlvbiByb2xsKCkge1xuICAgIGlmIChhY3RpdmUgPCBjb25jdXJyZW5jeSAmJiBxdWV1ZS5sZW5ndGgpIHtcbiAgICAgIGFjdGl2ZSsrO1xuICAgICAgcXVldWUuc2hpZnQoKSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiBsaW1pdChmbikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBxdWV1ZS5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm4oKS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgYWN0aXZlLS07XG4gICAgICAgICAgcm9sbCgpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgYWN0aXZlLS07XG4gICAgICAgICAgcm9sbCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcm9sbCgpO1xuICAgIH0pO1xuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMuY2liX3F1YWxpdHlfbmFtZSA9IGZ1bmN0aW9uIGNpYl9xdWFsaXR5X25hbWUobnVtKSB7XG4gIHN3aXRjaCAobnVtKSB7XG4gICAgY2FzZSAwOlxuICAgICAgcmV0dXJuICdwaXhlbGF0ZWQnO1xuXG4gICAgY2FzZSAxOlxuICAgICAgcmV0dXJuICdsb3cnO1xuXG4gICAgY2FzZSAyOlxuICAgICAgcmV0dXJuICdtZWRpdW0nO1xuICB9XG5cbiAgcmV0dXJuICdoaWdoJztcbn07XG5cbm1vZHVsZS5leHBvcnRzLmNpYl9zdXBwb3J0ID0gZnVuY3Rpb24gY2liX3N1cHBvcnQoY3JlYXRlQ2FudmFzKSB7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIGNyZWF0ZUltYWdlQml0bWFwID09PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBjID0gY3JlYXRlQ2FudmFzKDEwMCwgMTAwKTtcbiAgICByZXR1cm4gY3JlYXRlSW1hZ2VCaXRtYXAoYywgMCwgMCwgMTAwLCAxMDAsIHtcbiAgICAgIHJlc2l6ZVdpZHRoOiAxMCxcbiAgICAgIHJlc2l6ZUhlaWdodDogMTAsXG4gICAgICByZXNpemVRdWFsaXR5OiAnaGlnaCdcbiAgICB9KS50aGVuKGZ1bmN0aW9uIChiaXRtYXApIHtcbiAgICAgIHZhciBzdGF0dXMgPSBiaXRtYXAud2lkdGggPT09IDEwOyAvLyBCcmFuY2ggYmVsb3cgaXMgZmlsdGVyZWQgb24gdXBwZXIgbGV2ZWwuIFdlIGRvIG5vdCBjYWxsIHJlc2l6ZVxuICAgICAgLy8gZGV0ZWN0aW9uIGZvciBiYXNpYyBJbWFnZUJpdG1hcC5cbiAgICAgIC8vXG4gICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvSW1hZ2VCaXRtYXBcbiAgICAgIC8vIG9sZCBDcm9tZSA1MSBoYXMgSW1hZ2VCaXRtYXAgd2l0aG91dCAuY2xvc2UoKS4gVGhlbiB0aGlzIGNvZGVcbiAgICAgIC8vIHdpbGwgdGhyb3cgYW5kIHJldHVybiAnZmFsc2UnIGFzIGV4cGVjdGVkLlxuICAgICAgLy9cblxuICAgICAgYml0bWFwLmNsb3NlKCk7XG4gICAgICBjID0gbnVsbDtcbiAgICAgIHJldHVybiBzdGF0dXM7XG4gICAgfSk7XG4gIH0pW1wiY2F0Y2hcIl0oZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG59O1xuXG59LHt9XSwxMzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBXZWIgV29ya2VyIHdyYXBwZXIgZm9yIGltYWdlIHJlc2l6ZSBmdW5jdGlvblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIE1hdGhMaWIgPSBfZGVyZXFfKCcuL21hdGhsaWInKTtcblxuICB2YXIgbWF0aExpYjtcbiAgLyogZXNsaW50LWRpc2FibGUgbm8tdW5kZWYgKi9cblxuICBvbm1lc3NhZ2UgPSBmdW5jdGlvbiBvbm1lc3NhZ2UoZXYpIHtcbiAgICB2YXIgb3B0cyA9IGV2LmRhdGEub3B0cztcbiAgICBpZiAoIW1hdGhMaWIpIG1hdGhMaWIgPSBuZXcgTWF0aExpYihldi5kYXRhLmZlYXR1cmVzKTsgLy8gVXNlIG11bHRpbWF0aCdzIHN5bmMgYXV0by1pbml0LiBBdm9pZCBQcm9taXNlIHVzZSBpbiBvbGQgYnJvd3NlcnMsXG4gICAgLy8gYmVjYXVzZSBwb2x5ZmlsbHMgYXJlIG5vdCBwcm9wYWdhdGVkIHRvIHdlYndvcmtlci5cblxuICAgIHZhciByZXN1bHQgPSBtYXRoTGliLnJlc2l6ZUFuZFVuc2hhcnAob3B0cyk7XG4gICAgcG9zdE1lc3NhZ2Uoe1xuICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICB9LCBbcmVzdWx0LmJ1ZmZlcl0pO1xuICB9O1xufTtcblxufSx7XCIuL21hdGhsaWJcIjoxfV0sMTQ6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gQ2FsY3VsYXRlIEdhdXNzaWFuIGJsdXIgb2YgYW4gaW1hZ2UgdXNpbmcgSUlSIGZpbHRlclxuLy8gVGhlIG1ldGhvZCBpcyB0YWtlbiBmcm9tIEludGVsJ3Mgd2hpdGUgcGFwZXIgYW5kIGNvZGUgZXhhbXBsZSBhdHRhY2hlZCB0byBpdDpcbi8vIGh0dHBzOi8vc29mdHdhcmUuaW50ZWwuY29tL2VuLXVzL2FydGljbGVzL2lpci1nYXVzc2lhbi1ibHVyLWZpbHRlclxuLy8gLWltcGxlbWVudGF0aW9uLXVzaW5nLWludGVsLWFkdmFuY2VkLXZlY3Rvci1leHRlbnNpb25zXG5cbnZhciBhMCwgYTEsIGEyLCBhMywgYjEsIGIyLCBsZWZ0X2Nvcm5lciwgcmlnaHRfY29ybmVyO1xuXG5mdW5jdGlvbiBnYXVzc0NvZWYoc2lnbWEpIHtcbiAgaWYgKHNpZ21hIDwgMC41KSB7XG4gICAgc2lnbWEgPSAwLjU7XG4gIH1cblxuICB2YXIgYSA9IE1hdGguZXhwKDAuNzI2ICogMC43MjYpIC8gc2lnbWEsXG4gICAgICBnMSA9IE1hdGguZXhwKC1hKSxcbiAgICAgIGcyID0gTWF0aC5leHAoLTIgKiBhKSxcbiAgICAgIGsgPSAoMSAtIGcxKSAqICgxIC0gZzEpIC8gKDEgKyAyICogYSAqIGcxIC0gZzIpO1xuXG4gIGEwID0gaztcbiAgYTEgPSBrICogKGEgLSAxKSAqIGcxO1xuICBhMiA9IGsgKiAoYSArIDEpICogZzE7XG4gIGEzID0gLWsgKiBnMjtcbiAgYjEgPSAyICogZzE7XG4gIGIyID0gLWcyO1xuICBsZWZ0X2Nvcm5lciA9IChhMCArIGExKSAvICgxIC0gYjEgLSBiMik7XG4gIHJpZ2h0X2Nvcm5lciA9IChhMiArIGEzKSAvICgxIC0gYjEgLSBiMik7XG5cbiAgLy8gQXR0ZW1wdCB0byBmb3JjZSB0eXBlIHRvIEZQMzIuXG4gIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KFsgYTAsIGExLCBhMiwgYTMsIGIxLCBiMiwgbGVmdF9jb3JuZXIsIHJpZ2h0X2Nvcm5lciBdKTtcbn1cblxuZnVuY3Rpb24gY29udm9sdmVNb25vMTYoc3JjLCBvdXQsIGxpbmUsIGNvZWZmLCB3aWR0aCwgaGVpZ2h0KSB7XG4gIC8vIHRha2VzIHNyYyBpbWFnZSBhbmQgd3JpdGVzIHRoZSBibHVycmVkIGFuZCB0cmFuc3Bvc2VkIHJlc3VsdCBpbnRvIG91dFxuXG4gIHZhciBwcmV2X3NyYywgY3Vycl9zcmMsIGN1cnJfb3V0LCBwcmV2X291dCwgcHJldl9wcmV2X291dDtcbiAgdmFyIHNyY19pbmRleCwgb3V0X2luZGV4LCBsaW5lX2luZGV4O1xuICB2YXIgaSwgajtcbiAgdmFyIGNvZWZmX2EwLCBjb2VmZl9hMSwgY29lZmZfYjEsIGNvZWZmX2IyO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBoZWlnaHQ7IGkrKykge1xuICAgIHNyY19pbmRleCA9IGkgKiB3aWR0aDtcbiAgICBvdXRfaW5kZXggPSBpO1xuICAgIGxpbmVfaW5kZXggPSAwO1xuXG4gICAgLy8gbGVmdCB0byByaWdodFxuICAgIHByZXZfc3JjID0gc3JjW3NyY19pbmRleF07XG4gICAgcHJldl9wcmV2X291dCA9IHByZXZfc3JjICogY29lZmZbNl07XG4gICAgcHJldl9vdXQgPSBwcmV2X3ByZXZfb3V0O1xuXG4gICAgY29lZmZfYTAgPSBjb2VmZlswXTtcbiAgICBjb2VmZl9hMSA9IGNvZWZmWzFdO1xuICAgIGNvZWZmX2IxID0gY29lZmZbNF07XG4gICAgY29lZmZfYjIgPSBjb2VmZls1XTtcblxuICAgIGZvciAoaiA9IDA7IGogPCB3aWR0aDsgaisrKSB7XG4gICAgICBjdXJyX3NyYyA9IHNyY1tzcmNfaW5kZXhdO1xuXG4gICAgICBjdXJyX291dCA9IGN1cnJfc3JjICogY29lZmZfYTAgK1xuICAgICAgICAgICAgICAgICBwcmV2X3NyYyAqIGNvZWZmX2ExICtcbiAgICAgICAgICAgICAgICAgcHJldl9vdXQgKiBjb2VmZl9iMSArXG4gICAgICAgICAgICAgICAgIHByZXZfcHJldl9vdXQgKiBjb2VmZl9iMjtcblxuICAgICAgcHJldl9wcmV2X291dCA9IHByZXZfb3V0O1xuICAgICAgcHJldl9vdXQgPSBjdXJyX291dDtcbiAgICAgIHByZXZfc3JjID0gY3Vycl9zcmM7XG5cbiAgICAgIGxpbmVbbGluZV9pbmRleF0gPSBwcmV2X291dDtcbiAgICAgIGxpbmVfaW5kZXgrKztcbiAgICAgIHNyY19pbmRleCsrO1xuICAgIH1cblxuICAgIHNyY19pbmRleC0tO1xuICAgIGxpbmVfaW5kZXgtLTtcbiAgICBvdXRfaW5kZXggKz0gaGVpZ2h0ICogKHdpZHRoIC0gMSk7XG5cbiAgICAvLyByaWdodCB0byBsZWZ0XG4gICAgcHJldl9zcmMgPSBzcmNbc3JjX2luZGV4XTtcbiAgICBwcmV2X3ByZXZfb3V0ID0gcHJldl9zcmMgKiBjb2VmZls3XTtcbiAgICBwcmV2X291dCA9IHByZXZfcHJldl9vdXQ7XG4gICAgY3Vycl9zcmMgPSBwcmV2X3NyYztcblxuICAgIGNvZWZmX2EwID0gY29lZmZbMl07XG4gICAgY29lZmZfYTEgPSBjb2VmZlszXTtcblxuICAgIGZvciAoaiA9IHdpZHRoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgIGN1cnJfb3V0ID0gY3Vycl9zcmMgKiBjb2VmZl9hMCArXG4gICAgICAgICAgICAgICAgIHByZXZfc3JjICogY29lZmZfYTEgK1xuICAgICAgICAgICAgICAgICBwcmV2X291dCAqIGNvZWZmX2IxICtcbiAgICAgICAgICAgICAgICAgcHJldl9wcmV2X291dCAqIGNvZWZmX2IyO1xuXG4gICAgICBwcmV2X3ByZXZfb3V0ID0gcHJldl9vdXQ7XG4gICAgICBwcmV2X291dCA9IGN1cnJfb3V0O1xuXG4gICAgICBwcmV2X3NyYyA9IGN1cnJfc3JjO1xuICAgICAgY3Vycl9zcmMgPSBzcmNbc3JjX2luZGV4XTtcblxuICAgICAgb3V0W291dF9pbmRleF0gPSBsaW5lW2xpbmVfaW5kZXhdICsgcHJldl9vdXQ7XG5cbiAgICAgIHNyY19pbmRleC0tO1xuICAgICAgbGluZV9pbmRleC0tO1xuICAgICAgb3V0X2luZGV4IC09IGhlaWdodDtcbiAgICB9XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBibHVyTW9ubzE2KHNyYywgd2lkdGgsIGhlaWdodCwgcmFkaXVzKSB7XG4gIC8vIFF1aWNrIGV4aXQgb24gemVybyByYWRpdXNcbiAgaWYgKCFyYWRpdXMpIHsgcmV0dXJuOyB9XG5cbiAgdmFyIG91dCAgICAgID0gbmV3IFVpbnQxNkFycmF5KHNyYy5sZW5ndGgpLFxuICAgICAgdG1wX2xpbmUgPSBuZXcgRmxvYXQzMkFycmF5KE1hdGgubWF4KHdpZHRoLCBoZWlnaHQpKTtcblxuICB2YXIgY29lZmYgPSBnYXVzc0NvZWYocmFkaXVzKTtcblxuICBjb252b2x2ZU1vbm8xNihzcmMsIG91dCwgdG1wX2xpbmUsIGNvZWZmLCB3aWR0aCwgaGVpZ2h0LCByYWRpdXMpO1xuICBjb252b2x2ZU1vbm8xNihvdXQsIHNyYywgdG1wX2xpbmUsIGNvZWZmLCBoZWlnaHQsIHdpZHRoLCByYWRpdXMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJsdXJNb25vMTY7XG5cbn0se31dLDE1OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbmlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGlmIChzdXBlckN0b3IpIHtcbiAgICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgaWYgKHN1cGVyQ3Rvcikge1xuICAgICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgICB9XG4gIH1cbn1cblxufSx7fV0sMTY6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBhc3NpZ24gICAgICAgICA9IF9kZXJlcV8oJ29iamVjdC1hc3NpZ24nKTtcbnZhciBiYXNlNjRkZWNvZGUgICA9IF9kZXJlcV8oJy4vbGliL2Jhc2U2NGRlY29kZScpO1xudmFyIGhhc1dlYkFzc2VtYmx5ID0gX2RlcmVxXygnLi9saWIvd2FfZGV0ZWN0Jyk7XG5cblxudmFyIERFRkFVTFRfT1BUSU9OUyA9IHtcbiAganM6IHRydWUsXG4gIHdhc206IHRydWVcbn07XG5cblxuZnVuY3Rpb24gTXVsdGlNYXRoKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE11bHRpTWF0aCkpIHJldHVybiBuZXcgTXVsdGlNYXRoKG9wdGlvbnMpO1xuXG4gIHZhciBvcHRzID0gYXNzaWduKHt9LCBERUZBVUxUX09QVElPTlMsIG9wdGlvbnMgfHwge30pO1xuXG4gIHRoaXMub3B0aW9ucyAgICAgICAgID0gb3B0cztcblxuICB0aGlzLl9fY2FjaGUgICAgICAgICA9IHt9O1xuXG4gIHRoaXMuX19pbml0X3Byb21pc2UgID0gbnVsbDtcbiAgdGhpcy5fX21vZHVsZXMgICAgICAgPSBvcHRzLm1vZHVsZXMgfHwge307XG4gIHRoaXMuX19tZW1vcnkgICAgICAgID0gbnVsbDtcbiAgdGhpcy5fX3dhc20gICAgICAgICAgPSB7fTtcblxuICB0aGlzLl9faXNMRSA9ICgobmV3IFVpbnQzMkFycmF5KChuZXcgVWludDhBcnJheShbIDEsIDAsIDAsIDAgXSkpLmJ1ZmZlcikpWzBdID09PSAxKTtcblxuICBpZiAoIXRoaXMub3B0aW9ucy5qcyAmJiAhdGhpcy5vcHRpb25zLndhc20pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ21hdGhsaWI6IGF0IGxlYXN0IFwianNcIiBvciBcIndhc21cIiBzaG91bGQgYmUgZW5hYmxlZCcpO1xuICB9XG59XG5cblxuTXVsdGlNYXRoLnByb3RvdHlwZS5oYXNfd2FzbSA9IGhhc1dlYkFzc2VtYmx5O1xuXG5cbk11bHRpTWF0aC5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gKG1vZHVsZSkge1xuICB0aGlzLl9fbW9kdWxlc1ttb2R1bGUubmFtZV0gPSBtb2R1bGU7XG5cbiAgLy8gUGluIHRoZSBiZXN0IHBvc3NpYmxlIGltcGxlbWVudGF0aW9uXG4gIGlmICh0aGlzLm9wdGlvbnMud2FzbSAmJiB0aGlzLmhhc193YXNtKCkgJiYgbW9kdWxlLndhc21fZm4pIHtcbiAgICB0aGlzW21vZHVsZS5uYW1lXSA9IG1vZHVsZS53YXNtX2ZuO1xuICB9IGVsc2Uge1xuICAgIHRoaXNbbW9kdWxlLm5hbWVdID0gbW9kdWxlLmZuO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbk11bHRpTWF0aC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuX19pbml0X3Byb21pc2UpIHJldHVybiB0aGlzLl9faW5pdF9wcm9taXNlO1xuXG4gIGlmICghdGhpcy5vcHRpb25zLmpzICYmIHRoaXMub3B0aW9ucy53YXNtICYmICF0aGlzLmhhc193YXNtKCkpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdtYXRobGliOiBvbmx5IFwid2FzbVwiIHdhcyBlbmFibGVkLCBidXQgaXRcXCdzIG5vdCBzdXBwb3J0ZWQnKSk7XG4gIH1cblxuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdGhpcy5fX2luaXRfcHJvbWlzZSA9IFByb21pc2UuYWxsKE9iamVjdC5rZXlzKHNlbGYuX19tb2R1bGVzKS5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgbW9kdWxlID0gc2VsZi5fX21vZHVsZXNbbmFtZV07XG5cbiAgICBpZiAoIXNlbGYub3B0aW9ucy53YXNtIHx8ICFzZWxmLmhhc193YXNtKCkgfHwgIW1vZHVsZS53YXNtX2ZuKSByZXR1cm4gbnVsbDtcblxuICAgIC8vIElmIGFscmVhZHkgY29tcGlsZWQgLSBleGl0XG4gICAgaWYgKHNlbGYuX193YXNtW25hbWVdKSByZXR1cm4gbnVsbDtcblxuICAgIC8vIENvbXBpbGUgd2FzbSBzb3VyY2VcbiAgICByZXR1cm4gV2ViQXNzZW1ibHkuY29tcGlsZShzZWxmLl9fYmFzZTY0ZGVjb2RlKG1vZHVsZS53YXNtX3NyYykpXG4gICAgICAudGhlbihmdW5jdGlvbiAobSkgeyBzZWxmLl9fd2FzbVtuYW1lXSA9IG07IH0pO1xuICB9KSlcbiAgICAudGhlbihmdW5jdGlvbiAoKSB7IHJldHVybiBzZWxmOyB9KTtcblxuICByZXR1cm4gdGhpcy5fX2luaXRfcHJvbWlzZTtcbn07XG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cbi8vIE1ldGhvZHMgYmVsb3cgYXJlIGZvciBpbnRlcm5hbCB1c2UgZnJvbSBwbHVnaW5zXG5cblxuLy8gU2ltcGxlIGRlY29kZSBiYXNlNjQgdG8gdHlwZWQgYXJyYXkuIFVzZWZ1bCB0byBsb2FkIGVtYmVkZGVkIHdlYmFzc2VtYmx5XG4vLyBjb2RlLiBZb3UgcHJvYmFibHkgZG9uJ3QgbmVlZCB0byBjYWxsIHRoaXMgbWV0aG9kIGRpcmVjdGx5LlxuLy9cbk11bHRpTWF0aC5wcm90b3R5cGUuX19iYXNlNjRkZWNvZGUgPSBiYXNlNjRkZWNvZGU7XG5cblxuLy8gSW5jcmVhc2UgY3VycmVudCBtZW1vcnkgdG8gaW5jbHVkZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGJ5dGVzLiBEbyBub3RoaW5nIGlmXG4vLyBzaXplIGlzIGFscmVhZHkgb2suIFlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBtZXRob2QgZGlyZWN0bHksXG4vLyBiZWNhdXNlIGl0IHdpbGwgYmUgaW52b2tlZCBmcm9tIGAuX19pbnN0YW5jZSgpYC5cbi8vXG5NdWx0aU1hdGgucHJvdG90eXBlLl9fcmVhbGxvY2F0ZSA9IGZ1bmN0aW9uIG1lbV9ncm93X3RvKGJ5dGVzKSB7XG4gIGlmICghdGhpcy5fX21lbW9yeSkge1xuICAgIHRoaXMuX19tZW1vcnkgPSBuZXcgV2ViQXNzZW1ibHkuTWVtb3J5KHtcbiAgICAgIGluaXRpYWw6IE1hdGguY2VpbChieXRlcyAvICg2NCAqIDEwMjQpKVxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLl9fbWVtb3J5O1xuICB9XG5cbiAgdmFyIG1lbV9zaXplID0gdGhpcy5fX21lbW9yeS5idWZmZXIuYnl0ZUxlbmd0aDtcblxuICBpZiAobWVtX3NpemUgPCBieXRlcykge1xuICAgIHRoaXMuX19tZW1vcnkuZ3JvdyhNYXRoLmNlaWwoKGJ5dGVzIC0gbWVtX3NpemUpIC8gKDY0ICogMTAyNCkpKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9fbWVtb3J5O1xufTtcblxuXG4vLyBSZXR1cm5zIGluc3RhbnRpbmF0ZWQgd2ViYXNzZW1ibHkgaXRlbSBieSBuYW1lLCB3aXRoIHNwZWNpZmllZCBtZW1vcnkgc2l6ZVxuLy8gYW5kIGVudmlyb25tZW50LlxuLy8gLSB1c2UgY2FjaGUgaWYgYXZhaWxhYmxlXG4vLyAtIGRvIHN5bmMgbW9kdWxlIGluaXQsIGlmIGFzeW5jIGluaXQgd2FzIG5vdCBjYWxsZWQgZWFybGllclxuLy8gLSBhbGxvY2F0ZSBtZW1vcnkgaWYgbm90IGVub3VndGhcbi8vIC0gY2FuIGV4cG9ydCBmdW5jdGlvbnMgdG8gd2ViYXNzZW1ibHkgdmlhIFwiZW52X2V4dHJhXCIsXG4vLyAgIGZvciBleGFtcGxlLCB7IGV4cDogTWF0aC5leHAgfVxuLy9cbk11bHRpTWF0aC5wcm90b3R5cGUuX19pbnN0YW5jZSA9IGZ1bmN0aW9uIGluc3RhbmNlKG5hbWUsIG1lbXNpemUsIGVudl9leHRyYSkge1xuICBpZiAobWVtc2l6ZSkgdGhpcy5fX3JlYWxsb2NhdGUobWVtc2l6ZSk7XG5cbiAgLy8gSWYgLmluaXQoKSB3YXMgbm90IGNhbGxlZCwgZG8gc3luYyBjb21waWxlXG4gIGlmICghdGhpcy5fX3dhc21bbmFtZV0pIHtcbiAgICB2YXIgbW9kdWxlID0gdGhpcy5fX21vZHVsZXNbbmFtZV07XG4gICAgdGhpcy5fX3dhc21bbmFtZV0gPSBuZXcgV2ViQXNzZW1ibHkuTW9kdWxlKHRoaXMuX19iYXNlNjRkZWNvZGUobW9kdWxlLndhc21fc3JjKSk7XG4gIH1cblxuICBpZiAoIXRoaXMuX19jYWNoZVtuYW1lXSkge1xuICAgIHZhciBlbnZfYmFzZSA9IHtcbiAgICAgIG1lbW9yeUJhc2U6IDAsXG4gICAgICBtZW1vcnk6IHRoaXMuX19tZW1vcnksXG4gICAgICB0YWJsZUJhc2U6IDAsXG4gICAgICB0YWJsZTogbmV3IFdlYkFzc2VtYmx5LlRhYmxlKHsgaW5pdGlhbDogMCwgZWxlbWVudDogJ2FueWZ1bmMnIH0pXG4gICAgfTtcblxuICAgIHRoaXMuX19jYWNoZVtuYW1lXSA9IG5ldyBXZWJBc3NlbWJseS5JbnN0YW5jZSh0aGlzLl9fd2FzbVtuYW1lXSwge1xuICAgICAgZW52OiBhc3NpZ24oZW52X2Jhc2UsIGVudl9leHRyYSB8fCB7fSlcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLl9fY2FjaGVbbmFtZV07XG59O1xuXG5cbi8vIEhlbHBlciB0byBjYWxjdWxhdGUgbWVtb3J5IGFsaWdoIGZvciBwb2ludGVycy4gV2ViYXNzZW1ibHkgZG9lcyBub3QgcmVxdWlyZVxuLy8gdGhpcywgYnV0IHlvdSBtYXkgd2lzaCB0byBleHBlcmltZW50LiBEZWZhdWx0IGJhc2UgPSA4O1xuLy9cbk11bHRpTWF0aC5wcm90b3R5cGUuX19hbGlnbiA9IGZ1bmN0aW9uIGFsaWduKG51bWJlciwgYmFzZSkge1xuICBiYXNlID0gYmFzZSB8fCA4O1xuICB2YXIgcmVtaW5kZXIgPSBudW1iZXIgJSBiYXNlO1xuICByZXR1cm4gbnVtYmVyICsgKHJlbWluZGVyID8gYmFzZSAtIHJlbWluZGVyIDogMCk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTXVsdGlNYXRoO1xuXG59LHtcIi4vbGliL2Jhc2U2NGRlY29kZVwiOjE3LFwiLi9saWIvd2FfZGV0ZWN0XCI6MjMsXCJvYmplY3QtYXNzaWduXCI6MjR9XSwxNzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBiYXNlNjQgZGVjb2RlIHN0ciAtPiBVaW50OEFycmF5LCB0byBsb2FkIFdBIG1vZHVsZXNcbi8vXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIEJBU0U2NF9NQVAgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiYXNlNjRkZWNvZGUoc3RyKSB7XG4gIHZhciBpbnB1dCA9IHN0ci5yZXBsYWNlKC9bXFxyXFxuPV0vZywgJycpLCAvLyByZW1vdmUgQ1IvTEYgJiBwYWRkaW5nIHRvIHNpbXBsaWZ5IHNjYW5cbiAgICAgIG1heCAgID0gaW5wdXQubGVuZ3RoO1xuXG4gIHZhciBvdXQgPSBuZXcgVWludDhBcnJheSgobWF4ICogMykgPj4gMik7XG5cbiAgLy8gQ29sbGVjdCBieSA2KjQgYml0cyAoMyBieXRlcylcblxuICB2YXIgYml0cyA9IDA7XG4gIHZhciBwdHIgID0gMDtcblxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBtYXg7IGlkeCsrKSB7XG4gICAgaWYgKChpZHggJSA0ID09PSAwKSAmJiBpZHgpIHtcbiAgICAgIG91dFtwdHIrK10gPSAoYml0cyA+PiAxNikgJiAweEZGO1xuICAgICAgb3V0W3B0cisrXSA9IChiaXRzID4+IDgpICYgMHhGRjtcbiAgICAgIG91dFtwdHIrK10gPSBiaXRzICYgMHhGRjtcbiAgICB9XG5cbiAgICBiaXRzID0gKGJpdHMgPDwgNikgfCBCQVNFNjRfTUFQLmluZGV4T2YoaW5wdXQuY2hhckF0KGlkeCkpO1xuICB9XG5cbiAgLy8gRHVtcCB0YWlsXG5cbiAgdmFyIHRhaWxiaXRzID0gKG1heCAlIDQpICogNjtcblxuICBpZiAodGFpbGJpdHMgPT09IDApIHtcbiAgICBvdXRbcHRyKytdID0gKGJpdHMgPj4gMTYpICYgMHhGRjtcbiAgICBvdXRbcHRyKytdID0gKGJpdHMgPj4gOCkgJiAweEZGO1xuICAgIG91dFtwdHIrK10gPSBiaXRzICYgMHhGRjtcbiAgfSBlbHNlIGlmICh0YWlsYml0cyA9PT0gMTgpIHtcbiAgICBvdXRbcHRyKytdID0gKGJpdHMgPj4gMTApICYgMHhGRjtcbiAgICBvdXRbcHRyKytdID0gKGJpdHMgPj4gMikgJiAweEZGO1xuICB9IGVsc2UgaWYgKHRhaWxiaXRzID09PSAxMikge1xuICAgIG91dFtwdHIrK10gPSAoYml0cyA+PiA0KSAmIDB4RkY7XG4gIH1cblxuICByZXR1cm4gb3V0O1xufTtcblxufSx7fV0sMTg6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gQ2FsY3VsYXRlcyAxNi1iaXQgcHJlY2lzaW9uIEhTTCBsaWdodG5lc3MgZnJvbSA4LWJpdCByZ2JhIGJ1ZmZlclxuLy9cbid1c2Ugc3RyaWN0JztcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhzbF9sMTZfanMoaW1nLCB3aWR0aCwgaGVpZ2h0KSB7XG4gIHZhciBzaXplID0gd2lkdGggKiBoZWlnaHQ7XG4gIHZhciBvdXQgPSBuZXcgVWludDE2QXJyYXkoc2l6ZSk7XG4gIHZhciByLCBnLCBiLCBtaW4sIG1heDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICByID0gaW1nWzQgKiBpXTtcbiAgICBnID0gaW1nWzQgKiBpICsgMV07XG4gICAgYiA9IGltZ1s0ICogaSArIDJdO1xuICAgIG1heCA9IChyID49IGcgJiYgciA+PSBiKSA/IHIgOiAoZyA+PSBiICYmIGcgPj0gcikgPyBnIDogYjtcbiAgICBtaW4gPSAociA8PSBnICYmIHIgPD0gYikgPyByIDogKGcgPD0gYiAmJiBnIDw9IHIpID8gZyA6IGI7XG4gICAgb3V0W2ldID0gKG1heCArIG1pbikgKiAyNTcgPj4gMTtcbiAgfVxuICByZXR1cm4gb3V0O1xufTtcblxufSx7fV0sMTk6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgbmFtZTogICAgICd1bnNoYXJwX21hc2snLFxuICBmbjogICAgICAgX2RlcmVxXygnLi91bnNoYXJwX21hc2snKSxcbiAgd2FzbV9mbjogIF9kZXJlcV8oJy4vdW5zaGFycF9tYXNrX3dhc20nKSxcbiAgd2FzbV9zcmM6IF9kZXJlcV8oJy4vdW5zaGFycF9tYXNrX3dhc21fYmFzZTY0Jylcbn07XG5cbn0se1wiLi91bnNoYXJwX21hc2tcIjoyMCxcIi4vdW5zaGFycF9tYXNrX3dhc21cIjoyMSxcIi4vdW5zaGFycF9tYXNrX3dhc21fYmFzZTY0XCI6MjJ9XSwyMDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBVbnNoYXJwIG1hc2sgZmlsdGVyXG4vL1xuLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjMzMjI4MjAvMTAzMTgwNFxuLy8gVVNNKE8pID0gTyArICgyICogKEFtb3VudCAvIDEwMCkgKiAoTyAtIEdCKSlcbi8vIEdCIC0gZ2F1c3NpYW4gYmx1ci5cbi8vXG4vLyBJbWFnZSBpcyBjb252ZXJ0ZWQgZnJvbSBSR0IgdG8gSFNMLCB1bnNoYXJwIG1hc2sgaXMgYXBwbGllZCB0byB0aGVcbi8vIGxpZ2h0bmVzcyBjaGFubmVsIGFuZCB0aGVuIGltYWdlIGlzIGNvbnZlcnRlZCBiYWNrIHRvIFJHQi5cbi8vXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIGdsdXJfbW9ubzE2ID0gX2RlcmVxXygnZ2x1ci9tb25vMTYnKTtcbnZhciBoc2xfbDE2ICAgICA9IF9kZXJlcV8oJy4vaHNsX2wxNicpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdW5zaGFycChpbWcsIHdpZHRoLCBoZWlnaHQsIGFtb3VudCwgcmFkaXVzLCB0aHJlc2hvbGQpIHtcbiAgdmFyIHIsIGcsIGI7XG4gIHZhciBoLCBzLCBsO1xuICB2YXIgbWluLCBtYXg7XG4gIHZhciBtMSwgbTIsIGhTaGlmdGVkO1xuICB2YXIgZGlmZiwgaVRpbWVzNDtcblxuICBpZiAoYW1vdW50ID09PSAwIHx8IHJhZGl1cyA8IDAuNSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAocmFkaXVzID4gMi4wKSB7XG4gICAgcmFkaXVzID0gMi4wO1xuICB9XG5cbiAgdmFyIGxpZ2h0bmVzcyA9IGhzbF9sMTYoaW1nLCB3aWR0aCwgaGVpZ2h0KTtcblxuICB2YXIgYmx1cmVkID0gbmV3IFVpbnQxNkFycmF5KGxpZ2h0bmVzcyk7IC8vIGNvcHksIGJlY2F1c2UgYmx1ciBtb2RpZnkgc3JjXG5cbiAgZ2x1cl9tb25vMTYoYmx1cmVkLCB3aWR0aCwgaGVpZ2h0LCByYWRpdXMpO1xuXG4gIHZhciBhbW91bnRGcCA9IChhbW91bnQgLyAxMDAgKiAweDEwMDAgKyAwLjUpfDA7XG4gIHZhciB0aHJlc2hvbGRGcCA9ICh0aHJlc2hvbGQgKiAyNTcpfDA7XG5cbiAgdmFyIHNpemUgPSB3aWR0aCAqIGhlaWdodDtcblxuICAvKiBlc2xpbnQtZGlzYWJsZSBpbmRlbnQgKi9cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICBkaWZmID0gMiAqIChsaWdodG5lc3NbaV0gLSBibHVyZWRbaV0pO1xuXG4gICAgaWYgKE1hdGguYWJzKGRpZmYpID49IHRocmVzaG9sZEZwKSB7XG4gICAgICBpVGltZXM0ID0gaSAqIDQ7XG4gICAgICByID0gaW1nW2lUaW1lczRdO1xuICAgICAgZyA9IGltZ1tpVGltZXM0ICsgMV07XG4gICAgICBiID0gaW1nW2lUaW1lczQgKyAyXTtcblxuICAgICAgLy8gY29udmVydCBSR0IgdG8gSFNMXG4gICAgICAvLyB0YWtlIFJHQiwgOC1iaXQgdW5zaWduZWQgaW50ZWdlciBwZXIgZWFjaCBjaGFubmVsXG4gICAgICAvLyBzYXZlIEhTTCwgSCBhbmQgTCBhcmUgMTYtYml0IHVuc2lnbmVkIGludGVnZXJzLCBTIGlzIDEyLWJpdCB1bnNpZ25lZCBpbnRlZ2VyXG4gICAgICAvLyBtYXRoIGlzIHRha2VuIGZyb20gaGVyZTogaHR0cDovL3d3dy5lYXN5cmdiLmNvbS9pbmRleC5waHA/WD1NQVRIJkg9MThcbiAgICAgIC8vIGFuZCBhZG9wdGVkIHRvIGJlIGludGVnZXIgKGZpeGVkIHBvaW50IGluIGZhY3QpIGZvciBzYWtlIG9mIHBlcmZvcm1hbmNlXG4gICAgICBtYXggPSAociA+PSBnICYmIHIgPj0gYikgPyByIDogKGcgPj0gciAmJiBnID49IGIpID8gZyA6IGI7IC8vIG1pbiBhbmQgbWF4IGFyZSBpbiBbMC4uMHhmZl1cbiAgICAgIG1pbiA9IChyIDw9IGcgJiYgciA8PSBiKSA/IHIgOiAoZyA8PSByICYmIGcgPD0gYikgPyBnIDogYjtcbiAgICAgIGwgPSAobWF4ICsgbWluKSAqIDI1NyA+PiAxOyAvLyBsIGlzIGluIFswLi4weGZmZmZdIHRoYXQgaXMgY2F1c2VkIGJ5IG11bHRpcGxpY2F0aW9uIGJ5IDI1N1xuXG4gICAgICBpZiAobWluID09PSBtYXgpIHtcbiAgICAgICAgaCA9IHMgPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcyA9IChsIDw9IDB4N2ZmZikgP1xuICAgICAgICAgICgoKG1heCAtIG1pbikgKiAweGZmZikgLyAobWF4ICsgbWluKSl8MCA6XG4gICAgICAgICAgKCgobWF4IC0gbWluKSAqIDB4ZmZmKSAvICgyICogMHhmZiAtIG1heCAtIG1pbikpfDA7IC8vIHMgaXMgaW4gWzAuLjB4ZmZmXVxuICAgICAgICAvLyBoIGNvdWxkIGJlIGxlc3MgMCwgaXQgd2lsbCBiZSBmaXhlZCBpbiBiYWNrd2FyZCBjb252ZXJzaW9uIHRvIFJHQiwgfGh8IDw9IDB4ZmZmZiAvIDZcbiAgICAgICAgaCA9IChyID09PSBtYXgpID8gKCgoZyAtIGIpICogMHhmZmZmKSAvICg2ICogKG1heCAtIG1pbikpKXwwXG4gICAgICAgICAgOiAoZyA9PT0gbWF4KSA/IDB4NTU1NSArICgoKChiIC0gcikgKiAweGZmZmYpIC8gKDYgKiAobWF4IC0gbWluKSkpfDApIC8vIDB4NTU1NSA9PSAweGZmZmYgLyAzXG4gICAgICAgICAgOiAweGFhYWEgKyAoKCgociAtIGcpICogMHhmZmZmKSAvICg2ICogKG1heCAtIG1pbikpKXwwKTsgLy8gMHhhYWFhID09IDB4ZmZmZiAqIDIgLyAzXG4gICAgICB9XG5cbiAgICAgIC8vIGFkZCB1bnNoYXJwIG1hc2sgbWFzayB0byB0aGUgbGlnaHRuZXNzIGNoYW5uZWxcbiAgICAgIGwgKz0gKGFtb3VudEZwICogZGlmZiArIDB4ODAwKSA+PiAxMjtcbiAgICAgIGlmIChsID4gMHhmZmZmKSB7XG4gICAgICAgIGwgPSAweGZmZmY7XG4gICAgICB9IGVsc2UgaWYgKGwgPCAwKSB7XG4gICAgICAgIGwgPSAwO1xuICAgICAgfVxuXG4gICAgICAvLyBjb252ZXJ0IEhTTCBiYWNrIHRvIFJHQlxuICAgICAgLy8gZm9yIGluZm9ybWF0aW9uIGFib3V0IG1hdGggbG9vayBhYm92ZVxuICAgICAgaWYgKHMgPT09IDApIHtcbiAgICAgICAgciA9IGcgPSBiID0gbCA+PiA4O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbTIgPSAobCA8PSAweDdmZmYpID8gKGwgKiAoMHgxMDAwICsgcykgKyAweDgwMCkgPj4gMTIgOlxuICAgICAgICAgIGwgICsgKCgoMHhmZmZmIC0gbCkgKiBzICsgMHg4MDApID4+ICAxMik7XG4gICAgICAgIG0xID0gMiAqIGwgLSBtMiA+PiA4O1xuICAgICAgICBtMiA+Pj0gODtcbiAgICAgICAgLy8gc2F2ZSByZXN1bHQgdG8gUkdCIGNoYW5uZWxzXG4gICAgICAgIC8vIFIgY2hhbm5lbFxuICAgICAgICBoU2hpZnRlZCA9IChoICsgMHg1NTU1KSAmIDB4ZmZmZjsgLy8gMHg1NTU1ID09IDB4ZmZmZiAvIDNcbiAgICAgICAgciA9IChoU2hpZnRlZCA+PSAweGFhYWEpID8gbTEgLy8gMHhhYWFhID09IDB4ZmZmZiAqIDIgLyAzXG4gICAgICAgICAgOiAoaFNoaWZ0ZWQgPj0gMHg3ZmZmKSA/ICBtMSArICgobTIgLSBtMSkgKiA2ICogKDB4YWFhYSAtIGhTaGlmdGVkKSArIDB4ODAwMCA+PiAxNilcbiAgICAgICAgICA6IChoU2hpZnRlZCA+PSAweDJhYWEpID8gbTIgLy8gMHgyYWFhID09IDB4ZmZmZiAvIDZcbiAgICAgICAgICA6IG0xICsgKChtMiAtIG0xKSAqIDYgKiBoU2hpZnRlZCArIDB4ODAwMCA+PiAxNik7XG4gICAgICAgIC8vIEcgY2hhbm5lbFxuICAgICAgICBoU2hpZnRlZCA9IGggJiAweGZmZmY7XG4gICAgICAgIGcgPSAoaFNoaWZ0ZWQgPj0gMHhhYWFhKSA/IG0xIC8vIDB4YWFhYSA9PSAweGZmZmYgKiAyIC8gM1xuICAgICAgICAgIDogKGhTaGlmdGVkID49IDB4N2ZmZikgPyAgbTEgKyAoKG0yIC0gbTEpICogNiAqICgweGFhYWEgLSBoU2hpZnRlZCkgKyAweDgwMDAgPj4gMTYpXG4gICAgICAgICAgOiAoaFNoaWZ0ZWQgPj0gMHgyYWFhKSA/IG0yIC8vIDB4MmFhYSA9PSAweGZmZmYgLyA2XG4gICAgICAgICAgOiBtMSArICgobTIgLSBtMSkgKiA2ICogaFNoaWZ0ZWQgKyAweDgwMDAgPj4gMTYpO1xuICAgICAgICAvLyBCIGNoYW5uZWxcbiAgICAgICAgaFNoaWZ0ZWQgPSAoaCAtIDB4NTU1NSkgJiAweGZmZmY7XG4gICAgICAgIGIgPSAoaFNoaWZ0ZWQgPj0gMHhhYWFhKSA/IG0xIC8vIDB4YWFhYSA9PSAweGZmZmYgKiAyIC8gM1xuICAgICAgICAgIDogKGhTaGlmdGVkID49IDB4N2ZmZikgPyAgbTEgKyAoKG0yIC0gbTEpICogNiAqICgweGFhYWEgLSBoU2hpZnRlZCkgKyAweDgwMDAgPj4gMTYpXG4gICAgICAgICAgOiAoaFNoaWZ0ZWQgPj0gMHgyYWFhKSA/IG0yIC8vIDB4MmFhYSA9PSAweGZmZmYgLyA2XG4gICAgICAgICAgOiBtMSArICgobTIgLSBtMSkgKiA2ICogaFNoaWZ0ZWQgKyAweDgwMDAgPj4gMTYpO1xuICAgICAgfVxuXG4gICAgICBpbWdbaVRpbWVzNF0gPSByO1xuICAgICAgaW1nW2lUaW1lczQgKyAxXSA9IGc7XG4gICAgICBpbWdbaVRpbWVzNCArIDJdID0gYjtcbiAgICB9XG4gIH1cbn07XG5cbn0se1wiLi9oc2xfbDE2XCI6MTgsXCJnbHVyL21vbm8xNlwiOjE0fV0sMjE6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdW5zaGFycChpbWcsIHdpZHRoLCBoZWlnaHQsIGFtb3VudCwgcmFkaXVzLCB0aHJlc2hvbGQpIHtcbiAgaWYgKGFtb3VudCA9PT0gMCB8fCByYWRpdXMgPCAwLjUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAocmFkaXVzID4gMi4wKSB7XG4gICAgcmFkaXVzID0gMi4wO1xuICB9XG5cbiAgdmFyIHBpeGVscyA9IHdpZHRoICogaGVpZ2h0O1xuXG4gIHZhciBpbWdfYnl0ZXNfY250ICAgICAgICA9IHBpeGVscyAqIDQ7XG4gIHZhciBoc2xfYnl0ZXNfY250ICAgICAgICA9IHBpeGVscyAqIDI7XG4gIHZhciBibHVyX2J5dGVzX2NudCAgICAgICA9IHBpeGVscyAqIDI7XG4gIHZhciBibHVyX2xpbmVfYnl0ZV9jbnQgICA9IE1hdGgubWF4KHdpZHRoLCBoZWlnaHQpICogNDsgLy8gZmxvYXQzMiBhcnJheVxuICB2YXIgYmx1cl9jb2VmZnNfYnl0ZV9jbnQgPSA4ICogNDsgLy8gZmxvYXQzMiBhcnJheVxuXG4gIHZhciBpbWdfb2Zmc2V0ICAgICAgICAgPSAwO1xuICB2YXIgaHNsX29mZnNldCAgICAgICAgID0gaW1nX2J5dGVzX2NudDtcbiAgdmFyIGJsdXJfb2Zmc2V0ICAgICAgICA9IGhzbF9vZmZzZXQgKyBoc2xfYnl0ZXNfY250O1xuICB2YXIgYmx1cl90bXBfb2Zmc2V0ICAgID0gYmx1cl9vZmZzZXQgKyBibHVyX2J5dGVzX2NudDtcbiAgdmFyIGJsdXJfbGluZV9vZmZzZXQgICA9IGJsdXJfdG1wX29mZnNldCArIGJsdXJfYnl0ZXNfY250O1xuICB2YXIgYmx1cl9jb2VmZnNfb2Zmc2V0ID0gYmx1cl9saW5lX29mZnNldCArIGJsdXJfbGluZV9ieXRlX2NudDtcblxuICB2YXIgaW5zdGFuY2UgPSB0aGlzLl9faW5zdGFuY2UoXG4gICAgJ3Vuc2hhcnBfbWFzaycsXG4gICAgaW1nX2J5dGVzX2NudCArIGhzbF9ieXRlc19jbnQgKyBibHVyX2J5dGVzX2NudCAqIDIgKyBibHVyX2xpbmVfYnl0ZV9jbnQgKyBibHVyX2NvZWZmc19ieXRlX2NudCxcbiAgICB7IGV4cDogTWF0aC5leHAgfVxuICApO1xuXG4gIC8vIDMyLWJpdCBjb3B5IGlzIG11Y2ggZmFzdGVyIGluIGNocm9tZVxuICB2YXIgaW1nMzIgPSBuZXcgVWludDMyQXJyYXkoaW1nLmJ1ZmZlcik7XG4gIHZhciBtZW0zMiA9IG5ldyBVaW50MzJBcnJheSh0aGlzLl9fbWVtb3J5LmJ1ZmZlcik7XG4gIG1lbTMyLnNldChpbWczMik7XG5cbiAgLy8gSFNMXG4gIHZhciBmbiA9IGluc3RhbmNlLmV4cG9ydHMuaHNsX2wxNiB8fCBpbnN0YW5jZS5leHBvcnRzLl9oc2xfbDE2O1xuICBmbihpbWdfb2Zmc2V0LCBoc2xfb2Zmc2V0LCB3aWR0aCwgaGVpZ2h0KTtcblxuICAvLyBCTFVSXG4gIGZuID0gaW5zdGFuY2UuZXhwb3J0cy5ibHVyTW9ubzE2IHx8IGluc3RhbmNlLmV4cG9ydHMuX2JsdXJNb25vMTY7XG4gIGZuKGhzbF9vZmZzZXQsIGJsdXJfb2Zmc2V0LCBibHVyX3RtcF9vZmZzZXQsXG4gICAgYmx1cl9saW5lX29mZnNldCwgYmx1cl9jb2VmZnNfb2Zmc2V0LCB3aWR0aCwgaGVpZ2h0LCByYWRpdXMpO1xuXG4gIC8vIFVOU0hBUlBcbiAgZm4gPSBpbnN0YW5jZS5leHBvcnRzLnVuc2hhcnAgfHwgaW5zdGFuY2UuZXhwb3J0cy5fdW5zaGFycDtcbiAgZm4oaW1nX29mZnNldCwgaW1nX29mZnNldCwgaHNsX29mZnNldCxcbiAgICBibHVyX29mZnNldCwgd2lkdGgsIGhlaWdodCwgYW1vdW50LCB0aHJlc2hvbGQpO1xuXG4gIC8vIDMyLWJpdCBjb3B5IGlzIG11Y2ggZmFzdGVyIGluIGNocm9tZVxuICBpbWczMi5zZXQobmV3IFVpbnQzMkFycmF5KHRoaXMuX19tZW1vcnkuYnVmZmVyLCAwLCBwaXhlbHMpKTtcbn07XG5cbn0se31dLDIyOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8vIFRoaXMgaXMgYXV0b2dlbmVyYXRlZCBmaWxlIGZyb20gbWF0aC53YXNtLCBkb24ndCBlZGl0LlxuLy9cbid1c2Ugc3RyaWN0JztcblxuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAnQUdGemJRRUFBQUFCTVFaZ0FYd0JmR0FDZlg4QVlBWi9mMzkvZjM4QVlBaC9mMzkvZjM5L2ZRQmdCSDkvZjM4QVlBaC9mMzkvZjM5L2Z3QUNHUUlEWlc1MkEyVjRjQUFBQTJWdWRnWnRaVzF2Y25rQ0FBRURCZ1VCQWdNRUJRUUVBWEFBQUFkTUJSWmZYMkoxYVd4a1gyZGhkWE56YVdGdVgyTnZaV1p6QUFFT1gxOW5ZWFZ6Y3pFMlgyeHBibVVBQWdwaWJIVnlUVzl1YnpFMkFBTUhhSE5zWDJ3eE5nQUVCM1Z1YzJoaGNuQUFCUWtCQUFxSkVBWFpBUUVHZkFKQUlBRkUyNGE2UTRJYSt6OGdBTHVqSWdPYUVBQWlCQ0FFb0NJR3RqZ0NFQ0FCSUFORUFBQUFBQUFBQU1DaUVBQWlCYmFNT0FJVUlBRkVBQUFBQUFBQThEOGdCS0VpQWlBQ29pQUVJQU1nQTZDaVJBQUFBQUFBQVBBL29DQUZvYU1pQXJZNEFnQWdBU0FFSUFORUFBQUFBQUFBOEwrZ0lBS2lvaUlIdGpnQ0JDQUJJQVFnQTBRQUFBQUFBQUR3UDZBZ0FxS2lJZ08yT0FJSUlBRWdCU0FDb2lJRXRvdzRBZ3dnQVNBQ0lBZWdJQVZFQUFBQUFBQUE4RDhnQnFHZ0lnS2p0amdDR0NBQklBTWdCS0VnQXFPMk9BSWNDd3UzQXdNRGZ3UjlDSHdDUUNBREtnSVVJUWtnQXlvQ0VDRUtJQU1xQWd3aEN5QURLZ0lJSVF3Q1FDQUVRWDlxSWdkQkFFZ2lDQTBBSUFJZ0FDOEJBTGdpRFNBREtnSVl1NklpRGlBSnV5SVFvaUFPSUFxN0loR2lJQTBnQXlvQ0JMc2lFcUlnQXlvQ0FMc2lFeUFOb3FDZ29DSVB0amdDQUNBQ1FRUnFJUUlnQUVFQ2FpRUFJQWRGRFFBZ0JDRUdBMEFnQWlBT0lCQ2lJQThpRGlBUm9pQU5JQktpSUJNZ0FDOEJBTGdpRGFLZ29LQWlEN1k0QWdBZ0FrRUVhaUVDSUFCQkFtb2hBQ0FHUVg5cUlnWkJBVW9OQUFzTEFrQWdDQTBBSUFFZ0J5QUZiRUVCZEdvZ0FFRithaThCQUNJSXVDSU5JQXU3SWhHaUlBMGdETHNpRXFLZ0lBMGdBeW9DSEx1aUlnNGdDcnNpRTZLZ0lBNGdDYnNpRktLZ0lnOGdBa0Y4YWlvQ0FMdWdxenNCQUNBSFJRMEFJQUpCZUdvaEFpQUFRWHhxSVFCQkFDQUZRUUYwYXlFSElBRWdCU0FFUVFGMFFYeHFiR29oQmdOQUlBZ2hBeUFBTHdFQUlRZ2dCaUFOSUJHaUlBTzRJZzBnRXFLZ0lBOGlFQ0FUb3FBZ0RpQVVvcUFpRHlBQ0tnSUF1NkNyT3dFQUlBWWdCMm9oQmlBQVFYNXFJUUFnQWtGOGFpRUNJQkFoRGlBRVFYOXFJZ1JCQVVvTkFBc0xDd3ZmQWdJRGZ3WjhBa0FnQjBNQUFBQUFXdzBBSUFSRTI0YTZRNElhK3o4Z0IwTUFBQUEvbDd1aklneWFFQUFpRFNBTm9DSVB0amdDRUNBRUlBeEVBQUFBQUFBQUFNQ2lFQUFpRHJhTU9BSVVJQVJFQUFBQUFBQUE4RDhnRGFFaUN5QUxvaUFOSUF3Z0RLQ2lSQUFBQUFBQUFQQS9vQ0FPb2FNaUM3WTRBZ0FnQkNBTklBeEVBQUFBQUFBQThMK2dJQXVpb2lJUXRqZ0NCQ0FFSUEwZ0RFUUFBQUFBQUFEd1A2QWdDNktpSWd5Mk9BSUlJQVFnRGlBTG9pSU50b3c0QWd3Z0JDQUxJQkNnSUE1RUFBQUFBQUFBOEQ4Z0Q2R2dJZ3VqdGpnQ0dDQUVJQXdnRGFFZ0M2TzJPQUljSUFZRVFDQUZRUUYwSVFvZ0JpRUpJQUloQ0FOQUlBQWdDQ0FESUFRZ0JTQUdFQUlnQUNBS2FpRUFJQWhCQW1vaENDQUpRWDlxSWdrTkFBc0xJQVZGRFFBZ0JrRUJkQ0VJSUFVaEFBTkFJQUlnQVNBRElBUWdCaUFGRUFJZ0FpQUlhaUVDSUFGQkFtb2hBU0FBUVg5cUlnQU5BQXNMQzd3QkFRVi9JQU1nQW13aUF3UkFRUUFnQTJzaEJnTkFJQUFvQWdBaUJFRUlkaUlIUWY4QmNTRUNBbjhnQkVIL0FYRWlBeUFFUVJCMklnUkIvd0Z4SWdWUEJFQWdBeUlJSUFNZ0FrOE5BUm9MSUFRZ0JDQUhJQUlnQTBrYklBSWdCVWtiUWY4QmNRc2hDQUpBSUFNZ0FrMEVRQ0FESUFWTkRRRUxJQVFnQnlBRUlBTWdBazhiSUFJZ0JVc2JRZjhCY1NFREN5QUFRUVJxSVFBZ0FTQURJQWhxUVlFQ2JFRUJkanNCQUNBQlFRSnFJUUVnQmtFQmFpSUdEUUFMQ3d2VEJnRUtmd0pBSUFhelF3QUFnRVdVUXdBQXlFS1Z1MFFBQUFBQUFBRGdQNkNxSVEwZ0JTQUViQ0lMQkVBZ0IwR0JBbXdoRGdOQVFRQWdBaThCQUNBREx3RUFheUlHUVFGMElnZHJJQWNnQmtFQVNCc2dEazhFUUNBQVFRSnFMUUFBSVFVQ2Z5QUFMUUFBSWdZZ0FFRUJhaTBBQUNJRVNTSUpSUVJBSUFZaUNDQUdJQVZQRFFFYUN5QUZJQVVnQkNBRUlBVkpHeUFHSUFSTEd3c2hDQUovSUFZZ0JFMEVRQ0FHSWdvZ0JpQUZUUTBCR2dzZ0JTQUZJQVFnQkNBRlN4c2dDUnNMSWdvZ0NHb2lEMEdCQW13aUVFRUJkaUVSUVFBaERBSi9RUUFpQ1NBSUlBcEdEUUFhSUFnZ0Ntc2lDVUgvSDJ3Z0QwSCtBeUFJYXlBS2F5QVFRWUNBQkVrYmJTRU1JQVlnQ0VZRVFDQUVJQVZyUWYvL0Eyd2dDVUVHYkcwTUFRc2dCU0FHYXlBR0lBUnJJQVFnQ0VZaUJodEIvLzhEYkNBSlFRWnNiVUhWcWdGQnF0VUNJQVliYWdzaENTQVJJQWNnRFd4QmdCQnFRUXgxYWlJR1FRQWdCa0VBU2hzaUJrSC8vd01nQmtILy93TklHeUVHQWtBQ2Z3SkFJQXhCLy84RGNTSUZCRUFnQmtILy93RktEUUVnQlVHQUlHb2dCbXhCZ0JCcVFReDJEQUlMSUFaQkNIWWlCaUVGSUFZaEJBd0NDeUFGSUFaQi8vOERjMnhCZ0JCcVFReDJJQVpxQ3lJRlFRaDJJUWNnQmtFQmRDQUZhMEVJZGlJR0lRUUNRQ0FKUWRXcUFXcEIvLzhEY1NJRlFhblZBa3NOQUNBRlFmLy9BVThFUUVHcTFRSWdCV3NnQnlBR2EyeEJCbXhCZ0lBQ2FrRVFkaUFHYWlFRURBRUxJQWNoQkNBRlFhblZBRXNOQUNBRklBY2dCbXRzUVFac1FZQ0FBbXBCRUhZZ0Jtb2hCQXNDZnlBR0lnVWdDVUgvL3dOeElnaEJxZFVDU3cwQUdrR3ExUUlnQ0dzZ0J5QUdhMnhCQm14QmdJQUNha0VRZGlBR2FpQUlRZi8vQVU4TkFCb2dCeUlGSUFoQnFkVUFTdzBBR2lBSUlBY2dCbXRzUVFac1FZQ0FBbXBCRUhZZ0Jtb0xJUVVnQ1VHcjFRSnFRZi8vQTNFaUNFR3AxUUpMRFFBZ0NFSC8vd0ZQQkVCQnF0VUNJQWhySUFjZ0JtdHNRUVpzUVlDQUFtcEJFSFlnQm1vaEJnd0JDeUFJUWFuVkFFc0VRQ0FISVFZTUFRc2dDQ0FISUFacmJFRUdiRUdBZ0FKcVFSQjJJQVpxSVFZTElBRWdCRG9BQUNBQlFRRnFJQVU2QUFBZ0FVRUNhaUFHT2dBQUN5QURRUUpxSVFNZ0FrRUNhaUVDSUFCQkJHb2hBQ0FCUVFScUlRRWdDMEYvYWlJTERRQUxDd3NMJztcblxufSx7fV0sMjM6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gRGV0ZWN0IFdlYkFzc2VtYmx5IHN1cHBvcnQuXG4vLyAtIENoZWNrIGdsb2JhbCBXZWJBc3NlbWJseSBvYmplY3Rcbi8vIC0gVHJ5IHRvIGxvYWQgc2ltcGxlIG1vZHVsZSAoY2FuIGJlIGRpc2FibGVkIHZpYSBDU1ApXG4vL1xuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciB3YTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGhhc1dlYkFzc2VtYmx5KCkge1xuICAvLyB1c2UgY2FjaGUgaWYgY2FsbGVkIGJlZm9yZTtcbiAgaWYgKHR5cGVvZiB3YSAhPT0gJ3VuZGVmaW5lZCcpIHJldHVybiB3YTtcblxuICB3YSA9IGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgV2ViQXNzZW1ibHkgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gd2E7XG5cbiAgLy8gSWYgV2ViQXNzZW5ibHkgaXMgZGlzYWJsZWQsIGNvZGUgY2FuIHRocm93IG9uIGNvbXBpbGVcbiAgdHJ5IHtcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYnJpb24vbWluLXdhc20tZmFpbC9ibG9iL21hc3Rlci9taW4td2FzbS1mYWlsLmluLmpzXG4gICAgLy8gQWRkaXRpb25hbCBjaGVjayB0aGF0IFdBIGludGVybmFscyBhcmUgY29ycmVjdFxuXG4gICAgLyogZXNsaW50LWRpc2FibGUgY29tbWEtc3BhY2luZywgbWF4LWxlbiAqL1xuICAgIHZhciBiaW4gICAgICA9IG5ldyBVaW50OEFycmF5KFsgMCw5NywxMTUsMTA5LDEsMCwwLDAsMSw2LDEsOTYsMSwxMjcsMSwxMjcsMywyLDEsMCw1LDMsMSwwLDEsNyw4LDEsNCwxMTYsMTAxLDExNSwxMTYsMCwwLDEwLDE2LDEsMTQsMCwzMiwwLDY1LDEsNTQsMiwwLDMyLDAsNDAsMiwwLDExIF0pO1xuICAgIHZhciBtb2R1bGUgICA9IG5ldyBXZWJBc3NlbWJseS5Nb2R1bGUoYmluKTtcbiAgICB2YXIgaW5zdGFuY2UgPSBuZXcgV2ViQXNzZW1ibHkuSW5zdGFuY2UobW9kdWxlLCB7fSk7XG5cbiAgICAvLyB0ZXN0IHN0b3JpbmcgdG8gYW5kIGxvYWRpbmcgZnJvbSBhIG5vbi16ZXJvIGxvY2F0aW9uIHZpYSBhIHBhcmFtZXRlci5cbiAgICAvLyBTYWZhcmkgb24gaU9TIDExLjIuNSByZXR1cm5zIDAgdW5leHBlY3RlZGx5IGF0IG5vbi16ZXJvIGxvY2F0aW9uc1xuICAgIGlmIChpbnN0YW5jZS5leHBvcnRzLnRlc3QoNCkgIT09IDApIHdhID0gdHJ1ZTtcblxuICAgIHJldHVybiB3YTtcbiAgfSBjYXRjaCAoX18pIHt9XG5cbiAgcmV0dXJuIHdhO1xufTtcblxufSx7fV0sMjQ6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLypcbm9iamVjdC1hc3NpZ25cbihjKSBTaW5kcmUgU29yaHVzXG5AbGljZW5zZSBNSVRcbiovXG5cbid1c2Ugc3RyaWN0Jztcbi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG52YXIgZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxuZnVuY3Rpb24gc2hvdWxkVXNlTmF0aXZlKCkge1xuXHR0cnkge1xuXHRcdGlmICghT2JqZWN0LmFzc2lnbikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIERldGVjdCBidWdneSBwcm9wZXJ0eSBlbnVtZXJhdGlvbiBvcmRlciBpbiBvbGRlciBWOCB2ZXJzaW9ucy5cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTQxMThcblx0XHR2YXIgdGVzdDEgPSBuZXcgU3RyaW5nKCdhYmMnKTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tbmV3LXdyYXBwZXJzXG5cdFx0dGVzdDFbNV0gPSAnZGUnO1xuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0ZXN0MSlbMF0gPT09ICc1Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDIgPSB7fTtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IDEwOyBpKyspIHtcblx0XHRcdHRlc3QyWydfJyArIFN0cmluZy5mcm9tQ2hhckNvZGUoaSldID0gaTtcblx0XHR9XG5cdFx0dmFyIG9yZGVyMiA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QyKS5tYXAoZnVuY3Rpb24gKG4pIHtcblx0XHRcdHJldHVybiB0ZXN0MltuXTtcblx0XHR9KTtcblx0XHRpZiAob3JkZXIyLmpvaW4oJycpICE9PSAnMDEyMzQ1Njc4OScpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0zMDU2XG5cdFx0dmFyIHRlc3QzID0ge307XG5cdFx0J2FiY2RlZmdoaWprbG1ub3BxcnN0Jy5zcGxpdCgnJykuZm9yRWFjaChmdW5jdGlvbiAobGV0dGVyKSB7XG5cdFx0XHR0ZXN0M1tsZXR0ZXJdID0gbGV0dGVyO1xuXHRcdH0pO1xuXHRcdGlmIChPYmplY3Qua2V5cyhPYmplY3QuYXNzaWduKHt9LCB0ZXN0MykpLmpvaW4oJycpICE9PVxuXHRcdFx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdC8vIFdlIGRvbid0IGV4cGVjdCBhbnkgb2YgdGhlIGFib3ZlIHRvIHRocm93LCBidXQgYmV0dGVyIHRvIGJlIHNhZmUuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2hvdWxkVXNlTmF0aXZlKCkgPyBPYmplY3QuYXNzaWduIDogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBmcm9tO1xuXHR2YXIgdG8gPSB0b09iamVjdCh0YXJnZXQpO1xuXHR2YXIgc3ltYm9scztcblxuXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuXHRcdGZyb20gPSBPYmplY3QoYXJndW1lbnRzW3NdKTtcblxuXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG5cdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG5cdFx0XHRcdHRvW2tleV0gPSBmcm9tW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGdldE93blByb3BlcnR5U3ltYm9scykge1xuXHRcdFx0c3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcblxufSx7fV0sMjU6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xudmFyIGJ1bmRsZUZuID0gYXJndW1lbnRzWzNdO1xudmFyIHNvdXJjZXMgPSBhcmd1bWVudHNbNF07XG52YXIgY2FjaGUgPSBhcmd1bWVudHNbNV07XG5cbnZhciBzdHJpbmdpZnkgPSBKU09OLnN0cmluZ2lmeTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4sIG9wdGlvbnMpIHtcbiAgICB2YXIgd2tleTtcbiAgICB2YXIgY2FjaGVLZXlzID0gT2JqZWN0LmtleXMoY2FjaGUpO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjYWNoZUtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBrZXkgPSBjYWNoZUtleXNbaV07XG4gICAgICAgIHZhciBleHAgPSBjYWNoZVtrZXldLmV4cG9ydHM7XG4gICAgICAgIC8vIFVzaW5nIGJhYmVsIGFzIGEgdHJhbnNwaWxlciB0byB1c2UgZXNtb2R1bGUsIHRoZSBleHBvcnQgd2lsbCBhbHdheXNcbiAgICAgICAgLy8gYmUgYW4gb2JqZWN0IHdpdGggdGhlIGRlZmF1bHQgZXhwb3J0IGFzIGEgcHJvcGVydHkgb2YgaXQuIFRvIGVuc3VyZVxuICAgICAgICAvLyB0aGUgZXhpc3RpbmcgYXBpIGFuZCBiYWJlbCBlc21vZHVsZSBleHBvcnRzIGFyZSBib3RoIHN1cHBvcnRlZCB3ZVxuICAgICAgICAvLyBjaGVjayBmb3IgYm90aFxuICAgICAgICBpZiAoZXhwID09PSBmbiB8fCBleHAgJiYgZXhwLmRlZmF1bHQgPT09IGZuKSB7XG4gICAgICAgICAgICB3a2V5ID0ga2V5O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXdrZXkpIHtcbiAgICAgICAgd2tleSA9IE1hdGguZmxvb3IoTWF0aC5wb3coMTYsIDgpICogTWF0aC5yYW5kb20oKSkudG9TdHJpbmcoMTYpO1xuICAgICAgICB2YXIgd2NhY2hlID0ge307XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gY2FjaGVLZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGNhY2hlS2V5c1tpXTtcbiAgICAgICAgICAgIHdjYWNoZVtrZXldID0ga2V5O1xuICAgICAgICB9XG4gICAgICAgIHNvdXJjZXNbd2tleV0gPSBbXG4gICAgICAgICAgICAnZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7JyArIGZuICsgJyhzZWxmKTsgfScsXG4gICAgICAgICAgICB3Y2FjaGVcbiAgICAgICAgXTtcbiAgICB9XG4gICAgdmFyIHNrZXkgPSBNYXRoLmZsb29yKE1hdGgucG93KDE2LCA4KSAqIE1hdGgucmFuZG9tKCkpLnRvU3RyaW5nKDE2KTtcblxuICAgIHZhciBzY2FjaGUgPSB7fTsgc2NhY2hlW3drZXldID0gd2tleTtcbiAgICBzb3VyY2VzW3NrZXldID0gW1xuICAgICAgICAnZnVuY3Rpb24ocmVxdWlyZSxtb2R1bGUsZXhwb3J0cyl7JyArXG4gICAgICAgICAgICAvLyB0cnkgdG8gY2FsbCBkZWZhdWx0IGlmIGRlZmluZWQgdG8gYWxzbyBzdXBwb3J0IGJhYmVsIGVzbW9kdWxlIGV4cG9ydHNcbiAgICAgICAgICAgICd2YXIgZiA9IHJlcXVpcmUoJyArIHN0cmluZ2lmeSh3a2V5KSArICcpOycgK1xuICAgICAgICAgICAgJyhmLmRlZmF1bHQgPyBmLmRlZmF1bHQgOiBmKShzZWxmKTsnICtcbiAgICAgICAgJ30nLFxuICAgICAgICBzY2FjaGVcbiAgICBdO1xuXG4gICAgdmFyIHdvcmtlclNvdXJjZXMgPSB7fTtcbiAgICByZXNvbHZlU291cmNlcyhza2V5KTtcblxuICAgIGZ1bmN0aW9uIHJlc29sdmVTb3VyY2VzKGtleSkge1xuICAgICAgICB3b3JrZXJTb3VyY2VzW2tleV0gPSB0cnVlO1xuXG4gICAgICAgIGZvciAodmFyIGRlcFBhdGggaW4gc291cmNlc1trZXldWzFdKSB7XG4gICAgICAgICAgICB2YXIgZGVwS2V5ID0gc291cmNlc1trZXldWzFdW2RlcFBhdGhdO1xuICAgICAgICAgICAgaWYgKCF3b3JrZXJTb3VyY2VzW2RlcEtleV0pIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlU291cmNlcyhkZXBLZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHNyYyA9ICcoJyArIGJ1bmRsZUZuICsgJykoeydcbiAgICAgICAgKyBPYmplY3Qua2V5cyh3b3JrZXJTb3VyY2VzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZ2lmeShrZXkpICsgJzpbJ1xuICAgICAgICAgICAgICAgICsgc291cmNlc1trZXldWzBdXG4gICAgICAgICAgICAgICAgKyAnLCcgKyBzdHJpbmdpZnkoc291cmNlc1trZXldWzFdKSArICddJ1xuICAgICAgICAgICAgO1xuICAgICAgICB9KS5qb2luKCcsJylcbiAgICAgICAgKyAnfSx7fSxbJyArIHN0cmluZ2lmeShza2V5KSArICddKSdcbiAgICA7XG5cbiAgICB2YXIgVVJMID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMIHx8IHdpbmRvdy5tb3pVUkwgfHwgd2luZG93Lm1zVVJMO1xuXG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYihbc3JjXSwgeyB0eXBlOiAndGV4dC9qYXZhc2NyaXB0JyB9KTtcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmJhcmUpIHsgcmV0dXJuIGJsb2I7IH1cbiAgICB2YXIgd29ya2VyVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICB2YXIgd29ya2VyID0gbmV3IFdvcmtlcih3b3JrZXJVcmwpO1xuICAgIHdvcmtlci5vYmplY3RVUkwgPSB3b3JrZXJVcmw7XG4gICAgcmV0dXJuIHdvcmtlcjtcbn07XG5cbn0se31dLFwiL2luZGV4LmpzXCI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfc2xpY2VkVG9BcnJheShhcnIsIGkpIHsgcmV0dXJuIF9hcnJheVdpdGhIb2xlcyhhcnIpIHx8IF9pdGVyYWJsZVRvQXJyYXlMaW1pdChhcnIsIGkpIHx8IF91bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheShhcnIsIGkpIHx8IF9ub25JdGVyYWJsZVJlc3QoKTsgfVxuXG5mdW5jdGlvbiBfbm9uSXRlcmFibGVSZXN0KCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBhdHRlbXB0IHRvIGRlc3RydWN0dXJlIG5vbi1pdGVyYWJsZSBpbnN0YW5jZS5cXG5JbiBvcmRlciB0byBiZSBpdGVyYWJsZSwgbm9uLWFycmF5IG9iamVjdHMgbXVzdCBoYXZlIGEgW1N5bWJvbC5pdGVyYXRvcl0oKSBtZXRob2QuXCIpOyB9XG5cbmZ1bmN0aW9uIF91bnN1cHBvcnRlZEl0ZXJhYmxlVG9BcnJheShvLCBtaW5MZW4pIHsgaWYgKCFvKSByZXR1cm47IGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIF9hcnJheUxpa2VUb0FycmF5KG8sIG1pbkxlbik7IHZhciBuID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsIC0xKTsgaWYgKG4gPT09IFwiT2JqZWN0XCIgJiYgby5jb25zdHJ1Y3RvcikgbiA9IG8uY29uc3RydWN0b3IubmFtZTsgaWYgKG4gPT09IFwiTWFwXCIgfHwgbiA9PT0gXCJTZXRcIikgcmV0dXJuIEFycmF5LmZyb20obyk7IGlmIChuID09PSBcIkFyZ3VtZW50c1wiIHx8IC9eKD86VWl8SSludCg/Ojh8MTZ8MzIpKD86Q2xhbXBlZCk/QXJyYXkkLy50ZXN0KG4pKSByZXR1cm4gX2FycmF5TGlrZVRvQXJyYXkobywgbWluTGVuKTsgfVxuXG5mdW5jdGlvbiBfYXJyYXlMaWtlVG9BcnJheShhcnIsIGxlbikgeyBpZiAobGVuID09IG51bGwgfHwgbGVuID4gYXJyLmxlbmd0aCkgbGVuID0gYXJyLmxlbmd0aDsgZm9yICh2YXIgaSA9IDAsIGFycjIgPSBuZXcgQXJyYXkobGVuKTsgaSA8IGxlbjsgaSsrKSB7IGFycjJbaV0gPSBhcnJbaV07IH0gcmV0dXJuIGFycjI7IH1cblxuZnVuY3Rpb24gX2l0ZXJhYmxlVG9BcnJheUxpbWl0KGFyciwgaSkgeyBpZiAodHlwZW9mIFN5bWJvbCA9PT0gXCJ1bmRlZmluZWRcIiB8fCAhKFN5bWJvbC5pdGVyYXRvciBpbiBPYmplY3QoYXJyKSkpIHJldHVybjsgdmFyIF9hcnIgPSBbXTsgdmFyIF9uID0gdHJ1ZTsgdmFyIF9kID0gZmFsc2U7IHZhciBfZSA9IHVuZGVmaW5lZDsgdHJ5IHsgZm9yICh2YXIgX2kgPSBhcnJbU3ltYm9sLml0ZXJhdG9yXSgpLCBfczsgIShfbiA9IChfcyA9IF9pLm5leHQoKSkuZG9uZSk7IF9uID0gdHJ1ZSkgeyBfYXJyLnB1c2goX3MudmFsdWUpOyBpZiAoaSAmJiBfYXJyLmxlbmd0aCA9PT0gaSkgYnJlYWs7IH0gfSBjYXRjaCAoZXJyKSB7IF9kID0gdHJ1ZTsgX2UgPSBlcnI7IH0gZmluYWxseSB7IHRyeSB7IGlmICghX24gJiYgX2lbXCJyZXR1cm5cIl0gIT0gbnVsbCkgX2lbXCJyZXR1cm5cIl0oKTsgfSBmaW5hbGx5IHsgaWYgKF9kKSB0aHJvdyBfZTsgfSB9IHJldHVybiBfYXJyOyB9XG5cbmZ1bmN0aW9uIF9hcnJheVdpdGhIb2xlcyhhcnIpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgcmV0dXJuIGFycjsgfVxuXG52YXIgYXNzaWduID0gX2RlcmVxXygnb2JqZWN0LWFzc2lnbicpO1xuXG52YXIgd2Vid29ya2lmeSA9IF9kZXJlcV8oJ3dlYndvcmtpZnknKTtcblxudmFyIE1hdGhMaWIgPSBfZGVyZXFfKCcuL2xpYi9tYXRobGliJyk7XG5cbnZhciBQb29sID0gX2RlcmVxXygnLi9saWIvcG9vbCcpO1xuXG52YXIgdXRpbHMgPSBfZGVyZXFfKCcuL2xpYi91dGlscycpO1xuXG52YXIgd29ya2VyID0gX2RlcmVxXygnLi9saWIvd29ya2VyJyk7XG5cbnZhciBjcmVhdGVTdGFnZXMgPSBfZGVyZXFfKCcuL2xpYi9zdGVwcGVyJyk7XG5cbnZhciBjcmVhdGVSZWdpb25zID0gX2RlcmVxXygnLi9saWIvdGlsZXInKTsgLy8gRGVkdXBsaWNhdGUgcG9vbHMgJiBsaW1pdGVycyB3aXRoIHRoZSBzYW1lIGNvbmZpZ3Ncbi8vIHdoZW4gdXNlciBjcmVhdGVzIG11bHRpcGxlIHBpY2EgaW5zdGFuY2VzLlxuXG5cbnZhciBzaW5nbGV0b25lcyA9IHt9O1xudmFyIE5FRURfU0FGQVJJX0ZJWCA9IGZhbHNlO1xuXG50cnkge1xuICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgbmF2aWdhdG9yLnVzZXJBZ2VudCkge1xuICAgIE5FRURfU0FGQVJJX0ZJWCA9IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignU2FmYXJpJykgPj0gMDtcbiAgfVxufSBjYXRjaCAoZSkge31cblxudmFyIGNvbmN1cnJlbmN5ID0gMTtcblxuaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gIGNvbmN1cnJlbmN5ID0gTWF0aC5taW4obmF2aWdhdG9yLmhhcmR3YXJlQ29uY3VycmVuY3kgfHwgMSwgNCk7XG59XG5cbnZhciBERUZBVUxUX1BJQ0FfT1BUUyA9IHtcbiAgdGlsZTogMTAyNCxcbiAgY29uY3VycmVuY3k6IGNvbmN1cnJlbmN5LFxuICBmZWF0dXJlczogWydqcycsICd3YXNtJywgJ3d3J10sXG4gIGlkbGU6IDIwMDAsXG4gIGNyZWF0ZUNhbnZhczogZnVuY3Rpb24gY3JlYXRlQ2FudmFzKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgdG1wQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdG1wQ2FudmFzLndpZHRoID0gd2lkdGg7XG4gICAgdG1wQ2FudmFzLmhlaWdodCA9IGhlaWdodDtcbiAgICByZXR1cm4gdG1wQ2FudmFzO1xuICB9XG59O1xudmFyIERFRkFVTFRfUkVTSVpFX09QVFMgPSB7XG4gIHF1YWxpdHk6IDMsXG4gIGFscGhhOiBmYWxzZSxcbiAgdW5zaGFycEFtb3VudDogMCxcbiAgdW5zaGFycFJhZGl1czogMC4wLFxuICB1bnNoYXJwVGhyZXNob2xkOiAwXG59O1xudmFyIENBTl9ORVdfSU1BR0VfREFUQTtcbnZhciBDQU5fQ1JFQVRFX0lNQUdFX0JJVE1BUDtcblxuZnVuY3Rpb24gd29ya2VyRmFicmljKCkge1xuICByZXR1cm4ge1xuICAgIHZhbHVlOiB3ZWJ3b3JraWZ5KHdvcmtlciksXG4gICAgZGVzdHJveTogZnVuY3Rpb24gZGVzdHJveSgpIHtcbiAgICAgIHRoaXMudmFsdWUudGVybWluYXRlKCk7XG5cbiAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgdXJsID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMIHx8IHdpbmRvdy5tb3pVUkwgfHwgd2luZG93Lm1zVVJMO1xuXG4gICAgICAgIGlmICh1cmwgJiYgdXJsLnJldm9rZU9iamVjdFVSTCAmJiB0aGlzLnZhbHVlLm9iamVjdFVSTCkge1xuICAgICAgICAgIHVybC5yZXZva2VPYmplY3RVUkwodGhpcy52YWx1ZS5vYmplY3RVUkwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xufSAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gQVBJIG1ldGhvZHNcblxuXG5mdW5jdGlvbiBQaWNhKG9wdGlvbnMpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBpY2EpKSByZXR1cm4gbmV3IFBpY2Eob3B0aW9ucyk7XG4gIHRoaXMub3B0aW9ucyA9IGFzc2lnbih7fSwgREVGQVVMVF9QSUNBX09QVFMsIG9wdGlvbnMgfHwge30pO1xuICB2YXIgbGltaXRlcl9rZXkgPSBcImxrX1wiLmNvbmNhdCh0aGlzLm9wdGlvbnMuY29uY3VycmVuY3kpOyAvLyBTaGFyZSBsaW1pdGVycyB0byBhdm9pZCBtdWx0aXBsZSBwYXJhbGxlbCB3b3JrZXJzIHdoZW4gdXNlciBjcmVhdGVzXG4gIC8vIG11bHRpcGxlIHBpY2EgaW5zdGFuY2VzLlxuXG4gIHRoaXMuX19saW1pdCA9IHNpbmdsZXRvbmVzW2xpbWl0ZXJfa2V5XSB8fCB1dGlscy5saW1pdGVyKHRoaXMub3B0aW9ucy5jb25jdXJyZW5jeSk7XG4gIGlmICghc2luZ2xldG9uZXNbbGltaXRlcl9rZXldKSBzaW5nbGV0b25lc1tsaW1pdGVyX2tleV0gPSB0aGlzLl9fbGltaXQ7IC8vIExpc3Qgb2Ygc3VwcG9ydGVkIGZlYXR1cmVzLCBhY2NvcmRpbmcgdG8gb3B0aW9ucyAmIGJyb3dzZXIvbm9kZS5qc1xuXG4gIHRoaXMuZmVhdHVyZXMgPSB7XG4gICAganM6IGZhbHNlLFxuICAgIC8vIHB1cmUgSlMgaW1wbGVtZW50YXRpb24sIGNhbiBiZSBkaXNhYmxlZCBmb3IgdGVzdGluZ1xuICAgIHdhc206IGZhbHNlLFxuICAgIC8vIHdlYmFzc2VtYmx5IGltcGxlbWVudGF0aW9uIGZvciBoZWF2eSBmdW5jdGlvbnNcbiAgICBjaWI6IGZhbHNlLFxuICAgIC8vIHJlc2l6ZSB2aWEgY3JlYXRlSW1hZ2VCaXRtYXAgKG9ubHkgRkYgYXQgdGhpcyBtb21lbnQpXG4gICAgd3c6IGZhbHNlIC8vIHdlYndvcmtlcnNcblxuICB9O1xuICB0aGlzLl9fd29ya2Vyc1Bvb2wgPSBudWxsOyAvLyBTdG9yZSByZXF1ZXN0ZWQgZmVhdHVyZXMgZm9yIHdlYndvcmtlcnNcblxuICB0aGlzLl9fcmVxdWVzdGVkX2ZlYXR1cmVzID0gW107XG4gIHRoaXMuX19tYXRobGliID0gbnVsbDtcbn1cblxuUGljYS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIF90aGlzID0gdGhpcztcblxuICBpZiAodGhpcy5fX2luaXRQcm9taXNlKSByZXR1cm4gdGhpcy5fX2luaXRQcm9taXNlOyAvLyBUZXN0IGlmIHdlIGNhbiBjcmVhdGUgSW1hZ2VEYXRhIHdpdGhvdXQgY2FudmFzIGFuZCBtZW1vcnkgY29weVxuXG4gIGlmIChDQU5fTkVXX0lNQUdFX0RBVEEgIT09IGZhbHNlICYmIENBTl9ORVdfSU1BR0VfREFUQSAhPT0gdHJ1ZSkge1xuICAgIENBTl9ORVdfSU1BR0VfREFUQSA9IGZhbHNlO1xuXG4gICAgaWYgKHR5cGVvZiBJbWFnZURhdGEgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLW5ldyAqL1xuICAgICAgICBuZXcgSW1hZ2VEYXRhKG5ldyBVaW50OENsYW1wZWRBcnJheSg0MDApLCAxMCwgMTApO1xuICAgICAgICBDQU5fTkVXX0lNQUdFX0RBVEEgPSB0cnVlO1xuICAgICAgfSBjYXRjaCAoX18pIHt9XG4gICAgfVxuICB9IC8vIEltYWdlQml0bWFwIGNhbiBiZSBlZmZlY3RpdmUgaW4gMiBwbGFjZXM6XG4gIC8vXG4gIC8vIDEuIFRocmVhZGVkIGpwZWcgdW5wYWNrIChiYXNpYylcbiAgLy8gMi4gQnVpbHQtaW4gcmVzaXplIChibG9ja2VkIGR1ZSBwcm9ibGVtIGluIGNocm9tZSwgc2VlIGlzc3VlICM4OSlcbiAgLy9cbiAgLy8gRm9yIGJhc2ljIHVzZSB3ZSBhbHNvIG5lZWQgSW1hZ2VCaXRtYXAgd28gc3VwcG9ydCAuY2xvc2UoKSBtZXRob2QsXG4gIC8vIHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9ydS9kb2NzL1dlYi9BUEkvSW1hZ2VCaXRtYXBcblxuXG4gIGlmIChDQU5fQ1JFQVRFX0lNQUdFX0JJVE1BUCAhPT0gZmFsc2UgJiYgQ0FOX0NSRUFURV9JTUFHRV9CSVRNQVAgIT09IHRydWUpIHtcbiAgICBDQU5fQ1JFQVRFX0lNQUdFX0JJVE1BUCA9IGZhbHNlO1xuXG4gICAgaWYgKHR5cGVvZiBJbWFnZUJpdG1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIGlmIChJbWFnZUJpdG1hcC5wcm90b3R5cGUgJiYgSW1hZ2VCaXRtYXAucHJvdG90eXBlLmNsb3NlKSB7XG4gICAgICAgIENBTl9DUkVBVEVfSU1BR0VfQklUTUFQID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZGVidWcoJ0ltYWdlQml0bWFwIGRvZXMgbm90IHN1cHBvcnQgLmNsb3NlKCksIGRpc2FibGVkJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIGZlYXR1cmVzID0gdGhpcy5vcHRpb25zLmZlYXR1cmVzLnNsaWNlKCk7XG5cbiAgaWYgKGZlYXR1cmVzLmluZGV4T2YoJ2FsbCcpID49IDApIHtcbiAgICBmZWF0dXJlcyA9IFsnY2liJywgJ3dhc20nLCAnanMnLCAnd3cnXTtcbiAgfVxuXG4gIHRoaXMuX19yZXF1ZXN0ZWRfZmVhdHVyZXMgPSBmZWF0dXJlcztcbiAgdGhpcy5fX21hdGhsaWIgPSBuZXcgTWF0aExpYihmZWF0dXJlcyk7IC8vIENoZWNrIFdlYldvcmtlciBzdXBwb3J0IGlmIHJlcXVlc3RlZFxuXG4gIGlmIChmZWF0dXJlcy5pbmRleE9mKCd3dycpID49IDApIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgJ1dvcmtlcicgaW4gd2luZG93KSB7XG4gICAgICAvLyBJRSA8PSAxMSBkb24ndCBhbGxvdyB0byBjcmVhdGUgd2Vid29ya2VycyBmcm9tIHN0cmluZy4gV2Ugc2hvdWxkIGNoZWNrIGl0LlxuICAgICAgLy8gaHR0cHM6Ly9jb25uZWN0Lm1pY3Jvc29mdC5jb20vSUUvZmVlZGJhY2svZGV0YWlscy84MDE4MTAvd2ViLXdvcmtlcnMtZnJvbS1ibG9iLXVybHMtaW4taWUtMTAtYW5kLTExXG4gICAgICB0cnkge1xuICAgICAgICB2YXIgd2tyID0gX2RlcmVxXygnd2Vid29ya2lmeScpKGZ1bmN0aW9uICgpIHt9KTtcblxuICAgICAgICB3a3IudGVybWluYXRlKCk7XG4gICAgICAgIHRoaXMuZmVhdHVyZXMud3cgPSB0cnVlOyAvLyBwb29sIHVuaXF1ZW5lc3MgZGVwZW5kcyBvbiBwb29sIGNvbmZpZyArIHdlYndvcmtlciBjb25maWdcblxuICAgICAgICB2YXIgd3Bvb2xfa2V5ID0gXCJ3cF9cIi5jb25jYXQoSlNPTi5zdHJpbmdpZnkodGhpcy5vcHRpb25zKSk7XG5cbiAgICAgICAgaWYgKHNpbmdsZXRvbmVzW3dwb29sX2tleV0pIHtcbiAgICAgICAgICB0aGlzLl9fd29ya2Vyc1Bvb2wgPSBzaW5nbGV0b25lc1t3cG9vbF9rZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX193b3JrZXJzUG9vbCA9IG5ldyBQb29sKHdvcmtlckZhYnJpYywgdGhpcy5vcHRpb25zLmlkbGUpO1xuICAgICAgICAgIHNpbmdsZXRvbmVzW3dwb29sX2tleV0gPSB0aGlzLl9fd29ya2Vyc1Bvb2w7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKF9fKSB7fVxuICAgIH1cbiAgfVxuXG4gIHZhciBpbml0TWF0aCA9IHRoaXMuX19tYXRobGliLmluaXQoKS50aGVuKGZ1bmN0aW9uIChtYXRobGliKSB7XG4gICAgLy8gQ29weSBkZXRlY3RlZCBmZWF0dXJlc1xuICAgIGFzc2lnbihfdGhpcy5mZWF0dXJlcywgbWF0aGxpYi5mZWF0dXJlcyk7XG4gIH0pO1xuXG4gIHZhciBjaGVja0NpYlJlc2l6ZTtcblxuICBpZiAoIUNBTl9DUkVBVEVfSU1BR0VfQklUTUFQKSB7XG4gICAgY2hlY2tDaWJSZXNpemUgPSBQcm9taXNlLnJlc29sdmUoZmFsc2UpO1xuICB9IGVsc2Uge1xuICAgIGNoZWNrQ2liUmVzaXplID0gdXRpbHMuY2liX3N1cHBvcnQodGhpcy5vcHRpb25zLmNyZWF0ZUNhbnZhcykudGhlbihmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgICBpZiAoX3RoaXMuZmVhdHVyZXMuY2liICYmIGZlYXR1cmVzLmluZGV4T2YoJ2NpYicpIDwgMCkge1xuICAgICAgICBfdGhpcy5kZWJ1ZygnY3JlYXRlSW1hZ2VCaXRtYXAoKSByZXNpemUgc3VwcG9ydGVkLCBidXQgZGlzYWJsZWQgYnkgY29uZmlnJyk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAoZmVhdHVyZXMuaW5kZXhPZignY2liJykgPj0gMCkgX3RoaXMuZmVhdHVyZXMuY2liID0gc3RhdHVzO1xuICAgIH0pO1xuICB9IC8vIEluaXQgbWF0aCBsaWIuIFRoYXQncyBhc3luYyBiZWNhdXNlIGNhbiBsb2FkIHNvbWVcblxuXG4gIHRoaXMuX19pbml0UHJvbWlzZSA9IFByb21pc2UuYWxsKFtpbml0TWF0aCwgY2hlY2tDaWJSZXNpemVdKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX3RoaXM7XG4gIH0pO1xuICByZXR1cm4gdGhpcy5fX2luaXRQcm9taXNlO1xufTtcblxuUGljYS5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24gKGZyb20sIHRvLCBvcHRpb25zKSB7XG4gIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gIHRoaXMuZGVidWcoJ1N0YXJ0IHJlc2l6ZS4uLicpO1xuICB2YXIgb3B0cyA9IGFzc2lnbih7fSwgREVGQVVMVF9SRVNJWkVfT1BUUyk7XG5cbiAgaWYgKCFpc05hTihvcHRpb25zKSkge1xuICAgIG9wdHMgPSBhc3NpZ24ob3B0cywge1xuICAgICAgcXVhbGl0eTogb3B0aW9uc1xuICAgIH0pO1xuICB9IGVsc2UgaWYgKG9wdGlvbnMpIHtcbiAgICBvcHRzID0gYXNzaWduKG9wdHMsIG9wdGlvbnMpO1xuICB9XG5cbiAgb3B0cy50b1dpZHRoID0gdG8ud2lkdGg7XG4gIG9wdHMudG9IZWlnaHQgPSB0by5oZWlnaHQ7XG4gIG9wdHMud2lkdGggPSBmcm9tLm5hdHVyYWxXaWR0aCB8fCBmcm9tLndpZHRoO1xuICBvcHRzLmhlaWdodCA9IGZyb20ubmF0dXJhbEhlaWdodCB8fCBmcm9tLmhlaWdodDsgLy8gUHJldmVudCBzdGVwcGVyIGZyb20gaW5maW5pdGUgbG9vcFxuXG4gIGlmICh0by53aWR0aCA9PT0gMCB8fCB0by5oZWlnaHQgPT09IDApIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwiSW52YWxpZCBvdXRwdXQgc2l6ZTogXCIuY29uY2F0KHRvLndpZHRoLCBcInhcIikuY29uY2F0KHRvLmhlaWdodCkpKTtcbiAgfVxuXG4gIGlmIChvcHRzLnVuc2hhcnBSYWRpdXMgPiAyKSBvcHRzLnVuc2hhcnBSYWRpdXMgPSAyO1xuICB2YXIgY2FuY2VsZWQgPSBmYWxzZTtcbiAgdmFyIGNhbmNlbFRva2VuID0gbnVsbDtcblxuICBpZiAob3B0cy5jYW5jZWxUb2tlbikge1xuICAgIC8vIFdyYXAgY2FuY2VsVG9rZW4gdG8gYXZvaWQgc3VjY2Vzc2l2ZSByZXNvbHZlICYgc2V0IGZsYWdcbiAgICBjYW5jZWxUb2tlbiA9IG9wdHMuY2FuY2VsVG9rZW4udGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgY2FuY2VsZWQgPSB0cnVlO1xuICAgICAgdGhyb3cgZGF0YTtcbiAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBjYW5jZWxlZCA9IHRydWU7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgREVTVF9USUxFX0JPUkRFUiA9IDM7IC8vIE1heCBwb3NzaWJsZSBmaWx0ZXIgd2luZG93IHNpemVcblxuICB2YXIgZGVzdFRpbGVCb3JkZXIgPSBNYXRoLmNlaWwoTWF0aC5tYXgoREVTVF9USUxFX0JPUkRFUiwgMi41ICogb3B0cy51bnNoYXJwUmFkaXVzIHwgMCkpO1xuICByZXR1cm4gdGhpcy5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgaWYgKGNhbmNlbGVkKSByZXR1cm4gY2FuY2VsVG9rZW47IC8vIGlmIGNyZWF0ZUltYWdlQml0bWFwIHN1cHBvcnRzIHJlc2l6ZSwganVzdCBkbyBpdCBhbmQgcmV0dXJuXG5cbiAgICBpZiAoX3RoaXMyLmZlYXR1cmVzLmNpYikge1xuICAgICAgdmFyIHRvQ3R4ID0gdG8uZ2V0Q29udGV4dCgnMmQnLCB7XG4gICAgICAgIGFscGhhOiBCb29sZWFuKG9wdHMuYWxwaGEpXG4gICAgICB9KTtcblxuICAgICAgX3RoaXMyLmRlYnVnKCdSZXNpemUgdmlhIGNyZWF0ZUltYWdlQml0bWFwKCknKTtcblxuICAgICAgcmV0dXJuIGNyZWF0ZUltYWdlQml0bWFwKGZyb20sIHtcbiAgICAgICAgcmVzaXplV2lkdGg6IG9wdHMudG9XaWR0aCxcbiAgICAgICAgcmVzaXplSGVpZ2h0OiBvcHRzLnRvSGVpZ2h0LFxuICAgICAgICByZXNpemVRdWFsaXR5OiB1dGlscy5jaWJfcXVhbGl0eV9uYW1lKG9wdHMucXVhbGl0eSlcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGltYWdlQml0bWFwKSB7XG4gICAgICAgIGlmIChjYW5jZWxlZCkgcmV0dXJuIGNhbmNlbFRva2VuOyAvLyBpZiBubyB1bnNoYXJwIC0gZHJhdyBkaXJlY3RseSB0byBvdXRwdXQgY2FudmFzXG5cbiAgICAgICAgaWYgKCFvcHRzLnVuc2hhcnBBbW91bnQpIHtcbiAgICAgICAgICB0b0N0eC5kcmF3SW1hZ2UoaW1hZ2VCaXRtYXAsIDAsIDApO1xuICAgICAgICAgIGltYWdlQml0bWFwLmNsb3NlKCk7XG4gICAgICAgICAgdG9DdHggPSBudWxsO1xuXG4gICAgICAgICAgX3RoaXMyLmRlYnVnKCdGaW5pc2hlZCEnKTtcblxuICAgICAgICAgIHJldHVybiB0bztcbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMi5kZWJ1ZygnVW5zaGFycCByZXN1bHQnKTtcblxuICAgICAgICB2YXIgdG1wQ2FudmFzID0gX3RoaXMyLm9wdGlvbnMuY3JlYXRlQ2FudmFzKG9wdHMudG9XaWR0aCwgb3B0cy50b0hlaWdodCk7XG5cbiAgICAgICAgdmFyIHRtcEN0eCA9IHRtcENhbnZhcy5nZXRDb250ZXh0KCcyZCcsIHtcbiAgICAgICAgICBhbHBoYTogQm9vbGVhbihvcHRzLmFscGhhKVxuICAgICAgICB9KTtcbiAgICAgICAgdG1wQ3R4LmRyYXdJbWFnZShpbWFnZUJpdG1hcCwgMCwgMCk7XG4gICAgICAgIGltYWdlQml0bWFwLmNsb3NlKCk7XG4gICAgICAgIHZhciBpRGF0YSA9IHRtcEN0eC5nZXRJbWFnZURhdGEoMCwgMCwgb3B0cy50b1dpZHRoLCBvcHRzLnRvSGVpZ2h0KTtcblxuICAgICAgICBfdGhpczIuX19tYXRobGliLnVuc2hhcnBfbWFzayhpRGF0YS5kYXRhLCBvcHRzLnRvV2lkdGgsIG9wdHMudG9IZWlnaHQsIG9wdHMudW5zaGFycEFtb3VudCwgb3B0cy51bnNoYXJwUmFkaXVzLCBvcHRzLnVuc2hhcnBUaHJlc2hvbGQpO1xuXG4gICAgICAgIHRvQ3R4LnB1dEltYWdlRGF0YShpRGF0YSwgMCwgMCk7XG4gICAgICAgIGlEYXRhID0gdG1wQ3R4ID0gdG1wQ2FudmFzID0gdG9DdHggPSBudWxsO1xuXG4gICAgICAgIF90aGlzMi5kZWJ1ZygnRmluaXNoZWQhJyk7XG5cbiAgICAgICAgcmV0dXJuIHRvO1xuICAgICAgfSk7XG4gICAgfSAvL1xuICAgIC8vIE5vIGVhc3kgd2F5LCBsZXQncyByZXNpemUgbWFudWFsbHkgdmlhIGFycmF5c1xuICAgIC8vXG4gICAgLy8gU2hhcmUgY2FjaGUgYmV0d2VlbiBjYWxsczpcbiAgICAvL1xuICAgIC8vIC0gd2FzbSBpbnN0YW5jZVxuICAgIC8vIC0gd2FzbSBtZW1vcnkgb2JqZWN0XG4gICAgLy9cblxuXG4gICAgdmFyIGNhY2hlID0ge307IC8vIENhbGwgcmVzaXplciBpbiB3ZWJ3b3JrZXIgb3IgbG9jYWxseSwgZGVwZW5kaW5nIG9uIGNvbmZpZ1xuXG4gICAgdmFyIGludm9rZVJlc2l6ZSA9IGZ1bmN0aW9uIGludm9rZVJlc2l6ZShvcHRzKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghX3RoaXMyLmZlYXR1cmVzLnd3KSByZXR1cm4gX3RoaXMyLl9fbWF0aGxpYi5yZXNpemVBbmRVbnNoYXJwKG9wdHMsIGNhY2hlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICB2YXIgdyA9IF90aGlzMi5fX3dvcmtlcnNQb29sLmFjcXVpcmUoKTtcblxuICAgICAgICAgIGlmIChjYW5jZWxUb2tlbikgY2FuY2VsVG9rZW5bXCJjYXRjaFwiXShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB3LnZhbHVlLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdy5yZWxlYXNlKCk7XG4gICAgICAgICAgICBpZiAoZXYuZGF0YS5lcnIpIHJlamVjdChldi5kYXRhLmVycik7ZWxzZSByZXNvbHZlKGV2LmRhdGEucmVzdWx0KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgdy52YWx1ZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICBvcHRzOiBvcHRzLFxuICAgICAgICAgICAgZmVhdHVyZXM6IF90aGlzMi5fX3JlcXVlc3RlZF9mZWF0dXJlcyxcbiAgICAgICAgICAgIHByZWxvYWQ6IHtcbiAgICAgICAgICAgICAgd2FzbV9ub2R1bGU6IF90aGlzMi5fX21hdGhsaWIuX19cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCBbb3B0cy5zcmMuYnVmZmVyXSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciB0aWxlQW5kUmVzaXplID0gZnVuY3Rpb24gdGlsZUFuZFJlc2l6ZShmcm9tLCB0bywgb3B0cykge1xuICAgICAgdmFyIHNyY0N0eDtcbiAgICAgIHZhciBzcmNJbWFnZUJpdG1hcDtcbiAgICAgIHZhciBpc0ltYWdlQml0bWFwUmV1c2VkID0gZmFsc2U7XG4gICAgICB2YXIgdG9DdHg7XG5cbiAgICAgIHZhciBwcm9jZXNzVGlsZSA9IGZ1bmN0aW9uIHByb2Nlc3NUaWxlKHRpbGUpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzMi5fX2xpbWl0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoY2FuY2VsZWQpIHJldHVybiBjYW5jZWxUb2tlbjtcbiAgICAgICAgICB2YXIgc3JjSW1hZ2VEYXRhOyAvLyBFeHRyYWN0IHRpbGUgUkdCQSBidWZmZXIsIGRlcGVuZGluZyBvbiBpbnB1dCB0eXBlXG5cbiAgICAgICAgICBpZiAodXRpbHMuaXNDYW52YXMoZnJvbSkpIHtcbiAgICAgICAgICAgIF90aGlzMi5kZWJ1ZygnR2V0IHRpbGUgcGl4ZWwgZGF0YScpOyAvLyBJZiBpbnB1dCBpcyBDYW52YXMgLSBleHRyYWN0IHJlZ2lvbiBkYXRhIGRpcmVjdGx5XG5cblxuICAgICAgICAgICAgc3JjSW1hZ2VEYXRhID0gc3JjQ3R4LmdldEltYWdlRGF0YSh0aWxlLngsIHRpbGUueSwgdGlsZS53aWR0aCwgdGlsZS5oZWlnaHQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJZiBpbnB1dCBpcyBJbWFnZSBvciBkZWNvZGVkIHRvIEltYWdlQml0bWFwLFxuICAgICAgICAgICAgLy8gZHJhdyByZWdpb24gdG8gdGVtcG9yYXJ5IGNhbnZhcyBhbmQgZXh0cmFjdCBkYXRhIGZyb20gaXRcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBOb3RlISBBdHRlbXB0IHRvIHJldXNlIHRoaXMgY2FudmFzIGNhdXNlcyBzaWduaWZpY2FudCBzbG93ZG93biBpbiBjaHJvbWVcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICBfdGhpczIuZGVidWcoJ0RyYXcgdGlsZSBpbWFnZUJpdG1hcC9pbWFnZSB0byB0ZW1wb3JhcnkgY2FudmFzJyk7XG5cbiAgICAgICAgICAgIHZhciB0bXBDYW52YXMgPSBfdGhpczIub3B0aW9ucy5jcmVhdGVDYW52YXModGlsZS53aWR0aCwgdGlsZS5oZWlnaHQpO1xuXG4gICAgICAgICAgICB2YXIgdG1wQ3R4ID0gdG1wQ2FudmFzLmdldENvbnRleHQoJzJkJywge1xuICAgICAgICAgICAgICBhbHBoYTogQm9vbGVhbihvcHRzLmFscGhhKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0bXBDdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gJ2NvcHknO1xuICAgICAgICAgICAgdG1wQ3R4LmRyYXdJbWFnZShzcmNJbWFnZUJpdG1hcCB8fCBmcm9tLCB0aWxlLngsIHRpbGUueSwgdGlsZS53aWR0aCwgdGlsZS5oZWlnaHQsIDAsIDAsIHRpbGUud2lkdGgsIHRpbGUuaGVpZ2h0KTtcblxuICAgICAgICAgICAgX3RoaXMyLmRlYnVnKCdHZXQgdGlsZSBwaXhlbCBkYXRhJyk7XG5cbiAgICAgICAgICAgIHNyY0ltYWdlRGF0YSA9IHRtcEN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGlsZS53aWR0aCwgdGlsZS5oZWlnaHQpO1xuICAgICAgICAgICAgdG1wQ3R4ID0gdG1wQ2FudmFzID0gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgbyA9IHtcbiAgICAgICAgICAgIHNyYzogc3JjSW1hZ2VEYXRhLmRhdGEsXG4gICAgICAgICAgICB3aWR0aDogdGlsZS53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodDogdGlsZS5oZWlnaHQsXG4gICAgICAgICAgICB0b1dpZHRoOiB0aWxlLnRvV2lkdGgsXG4gICAgICAgICAgICB0b0hlaWdodDogdGlsZS50b0hlaWdodCxcbiAgICAgICAgICAgIHNjYWxlWDogdGlsZS5zY2FsZVgsXG4gICAgICAgICAgICBzY2FsZVk6IHRpbGUuc2NhbGVZLFxuICAgICAgICAgICAgb2Zmc2V0WDogdGlsZS5vZmZzZXRYLFxuICAgICAgICAgICAgb2Zmc2V0WTogdGlsZS5vZmZzZXRZLFxuICAgICAgICAgICAgcXVhbGl0eTogb3B0cy5xdWFsaXR5LFxuICAgICAgICAgICAgYWxwaGE6IG9wdHMuYWxwaGEsXG4gICAgICAgICAgICB1bnNoYXJwQW1vdW50OiBvcHRzLnVuc2hhcnBBbW91bnQsXG4gICAgICAgICAgICB1bnNoYXJwUmFkaXVzOiBvcHRzLnVuc2hhcnBSYWRpdXMsXG4gICAgICAgICAgICB1bnNoYXJwVGhyZXNob2xkOiBvcHRzLnVuc2hhcnBUaHJlc2hvbGRcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgX3RoaXMyLmRlYnVnKCdJbnZva2UgcmVzaXplIG1hdGgnKTtcblxuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBpbnZva2VSZXNpemUobyk7XG4gICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAoY2FuY2VsZWQpIHJldHVybiBjYW5jZWxUb2tlbjtcbiAgICAgICAgICAgIHNyY0ltYWdlRGF0YSA9IG51bGw7XG4gICAgICAgICAgICB2YXIgdG9JbWFnZURhdGE7XG5cbiAgICAgICAgICAgIF90aGlzMi5kZWJ1ZygnQ29udmVydCByYXcgcmdiYSB0aWxlIHJlc3VsdCB0byBJbWFnZURhdGEnKTtcblxuICAgICAgICAgICAgaWYgKENBTl9ORVdfSU1BR0VfREFUQSkge1xuICAgICAgICAgICAgICAvLyB0aGlzIGJyYW5jaCBpcyBmb3IgbW9kZXJuIGJyb3dzZXJzXG4gICAgICAgICAgICAgIC8vIElmIGBuZXcgSW1hZ2VEYXRhKClgICYgVWludDhDbGFtcGVkQXJyYXkgc3Vwb3J0ZWRcbiAgICAgICAgICAgICAgdG9JbWFnZURhdGEgPSBuZXcgSW1hZ2VEYXRhKG5ldyBVaW50OENsYW1wZWRBcnJheShyZXN1bHQpLCB0aWxlLnRvV2lkdGgsIHRpbGUudG9IZWlnaHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gZmFsbGJhY2sgZm9yIGBub2RlLWNhbnZhc2AgYW5kIG9sZCBicm93c2Vyc1xuICAgICAgICAgICAgICAvLyAoSUUxMSBoYXMgSW1hZ2VEYXRhIGJ1dCBkb2VzIG5vdCBzdXBwb3J0IGBuZXcgSW1hZ2VEYXRhKClgKVxuICAgICAgICAgICAgICB0b0ltYWdlRGF0YSA9IHRvQ3R4LmNyZWF0ZUltYWdlRGF0YSh0aWxlLnRvV2lkdGgsIHRpbGUudG9IZWlnaHQpO1xuXG4gICAgICAgICAgICAgIGlmICh0b0ltYWdlRGF0YS5kYXRhLnNldCkge1xuICAgICAgICAgICAgICAgIHRvSW1hZ2VEYXRhLmRhdGEuc2V0KHJlc3VsdCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSUU5IGRvbid0IGhhdmUgYC5zZXQoKWBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gdG9JbWFnZURhdGEuZGF0YS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgICAgICAgdG9JbWFnZURhdGEuZGF0YVtpXSA9IHJlc3VsdFtpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgX3RoaXMyLmRlYnVnKCdEcmF3IHRpbGUnKTtcblxuICAgICAgICAgICAgaWYgKE5FRURfU0FGQVJJX0ZJWCkge1xuICAgICAgICAgICAgICAvLyBTYWZhcmkgZHJhd3MgdGhpbiB3aGl0ZSBzdHJpcGVzIGJldHdlZW4gdGlsZXMgd2l0aG91dCB0aGlzIGZpeFxuICAgICAgICAgICAgICB0b0N0eC5wdXRJbWFnZURhdGEodG9JbWFnZURhdGEsIHRpbGUudG9YLCB0aWxlLnRvWSwgdGlsZS50b0lubmVyWCAtIHRpbGUudG9YLCB0aWxlLnRvSW5uZXJZIC0gdGlsZS50b1ksIHRpbGUudG9Jbm5lcldpZHRoICsgMWUtNSwgdGlsZS50b0lubmVySGVpZ2h0ICsgMWUtNSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0b0N0eC5wdXRJbWFnZURhdGEodG9JbWFnZURhdGEsIHRpbGUudG9YLCB0aWxlLnRvWSwgdGlsZS50b0lubmVyWCAtIHRpbGUudG9YLCB0aWxlLnRvSW5uZXJZIC0gdGlsZS50b1ksIHRpbGUudG9Jbm5lcldpZHRoLCB0aWxlLnRvSW5uZXJIZWlnaHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9OyAvLyBOZWVkIHRvIG5vcm1hbGl6ZSBkYXRhIHNvdXJjZSBmaXJzdC4gSXQgY2FuIGJlIGNhbnZhcyBvciBpbWFnZS5cbiAgICAgIC8vIElmIGltYWdlIC0gdHJ5IHRvIGRlY29kZSBpbiBiYWNrZ3JvdW5kIGlmIHBvc3NpYmxlXG5cblxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICB0b0N0eCA9IHRvLmdldENvbnRleHQoJzJkJywge1xuICAgICAgICAgIGFscGhhOiBCb29sZWFuKG9wdHMuYWxwaGEpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh1dGlscy5pc0NhbnZhcyhmcm9tKSkge1xuICAgICAgICAgIHNyY0N0eCA9IGZyb20uZ2V0Q29udGV4dCgnMmQnLCB7XG4gICAgICAgICAgICBhbHBoYTogQm9vbGVhbihvcHRzLmFscGhhKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzSW1hZ2VCaXRtYXAoZnJvbSkpIHtcbiAgICAgICAgICBzcmNJbWFnZUJpdG1hcCA9IGZyb207XG4gICAgICAgICAgaXNJbWFnZUJpdG1hcFJldXNlZCA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXRpbHMuaXNJbWFnZShmcm9tKSkge1xuICAgICAgICAgIC8vIHRyeSBkbyBkZWNvZGUgaW1hZ2UgaW4gYmFja2dyb3VuZCBmb3IgZmFzdGVyIG5leHQgb3BlcmF0aW9uc1xuICAgICAgICAgIGlmICghQ0FOX0NSRUFURV9JTUFHRV9CSVRNQVApIHJldHVybiBudWxsO1xuXG4gICAgICAgICAgX3RoaXMyLmRlYnVnKCdEZWNvZGUgaW1hZ2UgdmlhIGNyZWF0ZUltYWdlQml0bWFwJyk7XG5cbiAgICAgICAgICByZXR1cm4gY3JlYXRlSW1hZ2VCaXRtYXAoZnJvbSkudGhlbihmdW5jdGlvbiAoaW1hZ2VCaXRtYXApIHtcbiAgICAgICAgICAgIHNyY0ltYWdlQml0bWFwID0gaW1hZ2VCaXRtYXA7XG4gICAgICAgICAgfSkgLy8gU3VwcHJlc3MgZXJyb3IgdG8gdXNlIGZhbGxiYWNrLCBpZiBtZXRob2QgZmFpbHNcbiAgICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWNhL3BpY2EvaXNzdWVzLzE5MFxuXG4gICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbiAgICAgICAgICBbXCJjYXRjaFwiXShmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BpY2E6IFwiLmZyb21cIiBzaG91bGQgYmUgSW1hZ2UsIENhbnZhcyBvciBJbWFnZUJpdG1hcCcpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjYW5jZWxlZCkgcmV0dXJuIGNhbmNlbFRva2VuO1xuXG4gICAgICAgIF90aGlzMi5kZWJ1ZygnQ2FsY3VsYXRlIHRpbGVzJyk7IC8vXG4gICAgICAgIC8vIEhlcmUgd2UgYXJlIHdpdGggXCJub3JtYWxpemVkXCIgc291cmNlLFxuICAgICAgICAvLyBmb2xsb3cgdG8gdGlsaW5nXG4gICAgICAgIC8vXG5cblxuICAgICAgICB2YXIgcmVnaW9ucyA9IGNyZWF0ZVJlZ2lvbnMoe1xuICAgICAgICAgIHdpZHRoOiBvcHRzLndpZHRoLFxuICAgICAgICAgIGhlaWdodDogb3B0cy5oZWlnaHQsXG4gICAgICAgICAgc3JjVGlsZVNpemU6IF90aGlzMi5vcHRpb25zLnRpbGUsXG4gICAgICAgICAgdG9XaWR0aDogb3B0cy50b1dpZHRoLFxuICAgICAgICAgIHRvSGVpZ2h0OiBvcHRzLnRvSGVpZ2h0LFxuICAgICAgICAgIGRlc3RUaWxlQm9yZGVyOiBkZXN0VGlsZUJvcmRlclxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGpvYnMgPSByZWdpb25zLm1hcChmdW5jdGlvbiAodGlsZSkge1xuICAgICAgICAgIHJldHVybiBwcm9jZXNzVGlsZSh0aWxlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICAgICAgICBpZiAoc3JjSW1hZ2VCaXRtYXApIHtcbiAgICAgICAgICAgIGlmICghaXNJbWFnZUJpdG1hcFJldXNlZCkgc3JjSW1hZ2VCaXRtYXAuY2xvc2UoKTtcbiAgICAgICAgICAgIHNyY0ltYWdlQml0bWFwID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczIuZGVidWcoJ1Byb2Nlc3MgdGlsZXMnKTtcblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoam9icykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgX3RoaXMyLmRlYnVnKCdGaW5pc2hlZCEnKTtcblxuICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICByZXR1cm4gdG87XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgcHJvY2Vzc1N0YWdlcyA9IGZ1bmN0aW9uIHByb2Nlc3NTdGFnZXMoc3RhZ2VzLCBmcm9tLCB0bywgb3B0cykge1xuICAgICAgaWYgKGNhbmNlbGVkKSByZXR1cm4gY2FuY2VsVG9rZW47XG5cbiAgICAgIHZhciBfc3RhZ2VzJHNoaWZ0ID0gc3RhZ2VzLnNoaWZ0KCksXG4gICAgICAgICAgX3N0YWdlcyRzaGlmdDIgPSBfc2xpY2VkVG9BcnJheShfc3RhZ2VzJHNoaWZ0LCAyKSxcbiAgICAgICAgICB0b1dpZHRoID0gX3N0YWdlcyRzaGlmdDJbMF0sXG4gICAgICAgICAgdG9IZWlnaHQgPSBfc3RhZ2VzJHNoaWZ0MlsxXTtcblxuICAgICAgdmFyIGlzTGFzdFN0YWdlID0gc3RhZ2VzLmxlbmd0aCA9PT0gMDtcbiAgICAgIG9wdHMgPSBhc3NpZ24oe30sIG9wdHMsIHtcbiAgICAgICAgdG9XaWR0aDogdG9XaWR0aCxcbiAgICAgICAgdG9IZWlnaHQ6IHRvSGVpZ2h0LFxuICAgICAgICAvLyBvbmx5IHVzZSB1c2VyLWRlZmluZWQgcXVhbGl0eSBmb3IgdGhlIGxhc3Qgc3RhZ2UsXG4gICAgICAgIC8vIHVzZSBzaW1wbGVyIChIYW1taW5nKSBmaWx0ZXIgZm9yIHRoZSBmaXJzdCBzdGFnZXMgd2hlcmVcbiAgICAgICAgLy8gc2NhbGUgZmFjdG9yIGlzIGxhcmdlIGVub3VnaCAobW9yZSB0aGFuIDItMylcbiAgICAgICAgcXVhbGl0eTogaXNMYXN0U3RhZ2UgPyBvcHRzLnF1YWxpdHkgOiBNYXRoLm1pbigxLCBvcHRzLnF1YWxpdHkpXG4gICAgICB9KTtcbiAgICAgIHZhciB0bXBDYW52YXM7XG5cbiAgICAgIGlmICghaXNMYXN0U3RhZ2UpIHtcbiAgICAgICAgLy8gY3JlYXRlIHRlbXBvcmFyeSBjYW52YXNcbiAgICAgICAgdG1wQ2FudmFzID0gX3RoaXMyLm9wdGlvbnMuY3JlYXRlQ2FudmFzKHRvV2lkdGgsIHRvSGVpZ2h0KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpbGVBbmRSZXNpemUoZnJvbSwgaXNMYXN0U3RhZ2UgPyB0byA6IHRtcENhbnZhcywgb3B0cykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChpc0xhc3RTdGFnZSkgcmV0dXJuIHRvO1xuICAgICAgICBvcHRzLndpZHRoID0gdG9XaWR0aDtcbiAgICAgICAgb3B0cy5oZWlnaHQgPSB0b0hlaWdodDtcbiAgICAgICAgcmV0dXJuIHByb2Nlc3NTdGFnZXMoc3RhZ2VzLCB0bXBDYW52YXMsIHRvLCBvcHRzKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgc3RhZ2VzID0gY3JlYXRlU3RhZ2VzKG9wdHMud2lkdGgsIG9wdHMuaGVpZ2h0LCBvcHRzLnRvV2lkdGgsIG9wdHMudG9IZWlnaHQsIF90aGlzMi5vcHRpb25zLnRpbGUsIGRlc3RUaWxlQm9yZGVyKTtcbiAgICByZXR1cm4gcHJvY2Vzc1N0YWdlcyhzdGFnZXMsIGZyb20sIHRvLCBvcHRzKTtcbiAgfSk7XG59OyAvLyBSR0JBIGJ1ZmZlciByZXNpemVcbi8vXG5cblxuUGljYS5wcm90b3R5cGUucmVzaXplQnVmZmVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgdmFyIG9wdHMgPSBhc3NpZ24oe30sIERFRkFVTFRfUkVTSVpFX09QVFMsIG9wdGlvbnMpO1xuICByZXR1cm4gdGhpcy5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIF90aGlzMy5fX21hdGhsaWIucmVzaXplQW5kVW5zaGFycChvcHRzKTtcbiAgfSk7XG59O1xuXG5QaWNhLnByb3RvdHlwZS50b0Jsb2IgPSBmdW5jdGlvbiAoY2FudmFzLCBtaW1lVHlwZSwgcXVhbGl0eSkge1xuICBtaW1lVHlwZSA9IG1pbWVUeXBlIHx8ICdpbWFnZS9wbmcnO1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICBpZiAoY2FudmFzLnRvQmxvYikge1xuICAgICAgY2FudmFzLnRvQmxvYihmdW5jdGlvbiAoYmxvYikge1xuICAgICAgICByZXR1cm4gcmVzb2x2ZShibG9iKTtcbiAgICAgIH0sIG1pbWVUeXBlLCBxdWFsaXR5KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY2FudmFzLmNvbnZlcnRUb0Jsb2IpIHtcbiAgICAgIHJlc29sdmUoY2FudmFzLmNvbnZlcnRUb0Jsb2Ioe1xuICAgICAgICB0eXBlOiBtaW1lVHlwZSxcbiAgICAgICAgcXVhbGl0eTogcXVhbGl0eVxuICAgICAgfSkpO1xuICAgICAgcmV0dXJuO1xuICAgIH0gLy8gRmFsbGJhY2sgZm9yIG9sZCBicm93c2Vyc1xuXG5cbiAgICB2YXIgYXNTdHJpbmcgPSBhdG9iKGNhbnZhcy50b0RhdGFVUkwobWltZVR5cGUsIHF1YWxpdHkpLnNwbGl0KCcsJylbMV0pO1xuICAgIHZhciBsZW4gPSBhc1N0cmluZy5sZW5ndGg7XG4gICAgdmFyIGFzQnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkobGVuKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFzQnVmZmVyW2ldID0gYXNTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICB9XG5cbiAgICByZXNvbHZlKG5ldyBCbG9iKFthc0J1ZmZlcl0sIHtcbiAgICAgIHR5cGU6IG1pbWVUeXBlXG4gICAgfSkpO1xuICB9KTtcbn07XG5cblBpY2EucHJvdG90eXBlLmRlYnVnID0gZnVuY3Rpb24gKCkge307XG5cbm1vZHVsZS5leHBvcnRzID0gUGljYTtcblxufSx7XCIuL2xpYi9tYXRobGliXCI6MSxcIi4vbGliL3Bvb2xcIjo5LFwiLi9saWIvc3RlcHBlclwiOjEwLFwiLi9saWIvdGlsZXJcIjoxMSxcIi4vbGliL3V0aWxzXCI6MTIsXCIuL2xpYi93b3JrZXJcIjoxMyxcIm9iamVjdC1hc3NpZ25cIjoyNCxcIndlYndvcmtpZnlcIjoyNX1dfSx7fSxbXSkoXCIvaW5kZXguanNcIilcbn0pO1xuIiwgImV4cG9ydCBlbnVtIFNUQUdFUyB7XG4gIENIT09TRV9GUkFNRVMsXG4gIFBSRVZJRVdfT1VUUFVULFxuICBSRVNQT05TSVZFX1BSRVZJRVcsXG4gIFNBVkVfT1VUUFVULFxufVxuXG5leHBvcnQgZW51bSBNU0dfRVZFTlRTIHtcbiAgRk9VTkRfRlJBTUVTLFxuICBOT19GUkFNRVMsXG4gIFJFTkRFUixcbiAgQ0xPU0UsXG4gIEVSUk9SLFxuICBVUERBVEVfSEVBRExJTkVTLFxuICBDT01QUkVTU19JTUFHRSxcbiAgR0VUX1JPT1RfRlJBTUVTLFxufVxuXG5leHBvcnQgZW51bSBPVVRQVVRfRk9STUFUUyB7XG4gIElOTElORSxcbiAgSUZSQU1FLFxufVxuXG5leHBvcnQgY29uc3QgVUlfVEVYVCA9IHtcbiAgRVJST1JfVU5FWFBFQ1RFRDogXCJVbmV4cGVjdGVkIGVycm9yXCIsXG4gIEVSUk9SX01JU1NJTkdfRlJBTUVTOiBcIk5vIGZyYW1lcyBmb3VuZC4gUGxlYXNlIGFkZCBzb21lIGZyYW1lcyB0byB0aGUgcGFnZS5cIixcbiAgV0FSTl9OT19UQVJHRVRTOiBcIlN0YW5kYXJkIGZyYW1lcyBub3QgZm91bmQuIFBsZWFzZSBzZWxlY3QgdGFyZ2V0IGZyYW1lcy5cIixcbiAgV0FSTl9UT09fTUFOWV9UQVJHRVRTOiBcIlBsZWFzZSBzZWxlY3QgdGhyZWUgdGFyZ2V0IGZyYW1lc1wiLFxuICBJTkZPX1BSRVZJRVc6IFwiUHJldmlldyBlYWNoIGZyYW1lIG91dHB1dFwiLFxuICBUSVRMRV9DSE9PU0VfRlJBTUU6IFwiQ2hvb3NlIHdoaWNoIGZyYW1lcyB0byBleHBvcnRcIixcbiAgVElUTEVfUFJFVklFVzogXCJQcmV2aWV3XCIsXG4gIFRJVExFX1JFU1BPTlNJVkVfUFJFVklFVzogXCJSZXNwb25zaXZlIHByZXZpZXdcIixcbiAgVElMRV9PVVRQVVQ6IFwiRXhwb3J0XCIsXG4gIEJVVFRPTl9ORVhUOiBcIk5leHRcIixcbiAgQlVUVE9OX0RPV05MT0FEOiBcIkRvd25sb2FkXCIsXG4gIEJVVFRPTl9QUkVWSU9VUzogXCJCYWNrXCIsXG59O1xuXG5leHBvcnQgY29uc3QgSU5JVElBTF9VSV9TSVpFID0ge1xuICB3aWR0aDogNDgwLFxuICBoZWlnaHQ6IDUwMCxcbiAgbWF4V2lkdGg6IDEyMDAsXG4gIG1heEhlaWdodDogOTAwLFxuICBtaW5XaWR0aDogNDIwLFxuICBtaW5IZWlnaHQ6IDQ4MCxcbn07XG5cbmV4cG9ydCBjb25zdCBGUkFNRV9XQVJOSU5HX1NJWkUgPSAzMDA7XG5cbmV4cG9ydCBlbnVtIEhFQURMSU5FX05PREVfTkFNRVMge1xuICBIRUFETElORSA9IFwiaGVhZGxpbmVcIixcbiAgU1VCSEVBRCA9IFwic3ViaGVhZFwiLFxuICBTT1VSQ0UgPSBcInNvdXJjZVwiLFxufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi4vY29uc3RhbnRzXCI7XG5cbmludGVyZmFjZSBJUG9zdG1hbk1lc3NhZ2Uge1xuICBuYW1lOiBzdHJpbmc7XG4gIHVpZDogc3RyaW5nO1xuICB3b3JrbG9hZDogTVNHX0VWRU5UUztcbiAgZGF0YTogYW55O1xuICByZXR1cm5pbmc/OiBib29sZWFuO1xuICBlcnI/OiBzdHJpbmc7XG59XG5cbmNsYXNzIFBvc3RtYW4ge1xuICBwcml2YXRlIG5hbWU6IHN0cmluZztcbiAgcHJpdmF0ZSBpbkZpZ21hU2FuZGJveDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBjYWxsYmFja1N0b3JlOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcbiAgcHJpdmF0ZSB3b3JrZXJzOiB7IFtpZDogc3RyaW5nXTogRnVuY3Rpb24gfTtcblxuICBwcml2YXRlIFRJTUVPVVQgPSAzMDAwMDtcblxuICBjb25zdHJ1Y3Rvcihwcm9wcz86IHsgbWVzc2FnZU5hbWU/OiBzdHJpbmc7IHNjb3BlOiBudWxsIH0pIHtcbiAgICB0aGlzLm5hbWUgPSBwcm9wcz8ubWVzc2FnZU5hbWUgfHwgXCJQT1NUTUFOXCI7XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveCA9IHR5cGVvZiBmaWdtYSA9PT0gXCJvYmplY3RcIjtcbiAgICB0aGlzLmNhbGxiYWNrU3RvcmUgPSB7fTtcbiAgICB0aGlzLndvcmtlcnMgPSB7fTtcblxuICAgIC8vIEFkZCBtZXNzYWdlIGV2ZW50IGxpc3RlbmVyXG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5vbihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKVxuICAgICAgOiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgdGhpcy5yZWNlaXZlKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjZWl2ZSA9IGFzeW5jIChldmVudDogTWVzc2FnZUV2ZW50PElQb3N0bWFuTWVzc2FnZT4pID0+IHtcbiAgICBjb25zdCBtc2dCb2R5ID0gdGhpcy5pbkZpZ21hU2FuZGJveCA/IGV2ZW50IDogZXZlbnQ/LmRhdGE/LnBsdWdpbk1lc3NhZ2U7XG4gICAgY29uc3QgeyBkYXRhLCB3b3JrbG9hZCwgbmFtZSwgdWlkLCByZXR1cm5pbmcsIGVyciB9ID0gbXNnQm9keSB8fCB7fTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBEbyBub3RoaW5nIGlkIHBvc3QgbWVzc2FnZSBpc24ndCBmb3IgdXNcbiAgICAgIGlmICh0aGlzLm5hbWUgIT09IG5hbWUpIHJldHVybjtcblxuICAgICAgaWYgKHJldHVybmluZyAmJiAhdGhpcy5jYWxsYmFja1N0b3JlW3VpZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGNhbGxiYWNrOiAke3VpZH1gKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFyZXR1cm5pbmcgJiYgIXRoaXMud29ya2Vyc1t3b3JrbG9hZF0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyB3b3JrbG9hZCByZWdpc3RlcmVkOiAke3dvcmtsb2FkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAocmV0dXJuaW5nKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2tTdG9yZVt1aWRdKGRhdGEsIGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB3b3JrbG9hZFJlc3VsdCA9IGF3YWl0IHRoaXMud29ya2Vyc1t3b3JrbG9hZF0oZGF0YSk7XG4gICAgICAgIHRoaXMucG9zdEJhY2soeyBkYXRhOiB3b3JrbG9hZFJlc3VsdCwgdWlkIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgdGhpcy5wb3N0QmFjayh7IHVpZCwgZXJyOiBcIlBvc3RtYW4gZmFpbGVkXCIgfSk7XG4gICAgICBjb25zb2xlLmVycm9yKFwiUG9zdG1hbiBmYWlsZWRcIiwgZXJyKTtcbiAgICB9XG4gIH07XG5cbiAgcHVibGljIHJlZ2lzdGVyV29ya2VyID0gKGV2ZW50VHlwZTogTVNHX0VWRU5UUywgZm46IEZ1bmN0aW9uKSA9PiB7XG4gICAgdGhpcy53b3JrZXJzW2V2ZW50VHlwZV0gPSBmbjtcbiAgfTtcblxuICBwcml2YXRlIHBvc3RCYWNrID0gKHByb3BzOiB7IHVpZDogc3RyaW5nOyBkYXRhPzogYW55OyBlcnI/OiBzdHJpbmcgfSkgPT5cbiAgICB0aGlzLnBvc3RNZXNzYWdlKHtcbiAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgIHVpZDogcHJvcHMudWlkLFxuICAgICAgZGF0YTogcHJvcHMuZGF0YSxcbiAgICAgIHJldHVybmluZzogdHJ1ZSxcbiAgICAgIGVycjogcHJvcHMuZXJyLFxuICAgIH0pO1xuXG4gIHByaXZhdGUgcG9zdE1lc3NhZ2UgPSAobWVzc2FnZUJvZHkpID0+XG4gICAgdGhpcy5pbkZpZ21hU2FuZGJveFxuICAgICAgPyBmaWdtYS51aS5wb3N0TWVzc2FnZShtZXNzYWdlQm9keSlcbiAgICAgIDogcGFyZW50LnBvc3RNZXNzYWdlKHsgcGx1Z2luTWVzc2FnZTogbWVzc2FnZUJvZHkgfSwgXCIqXCIpO1xuXG4gIHB1YmxpYyBzZW5kID0gKHByb3BzOiB7IHdvcmtsb2FkOiBNU0dfRVZFTlRTOyBkYXRhPzogYW55IH0pOiBQcm9taXNlPGFueT4gPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB7IHdvcmtsb2FkLCBkYXRhIH0gPSBwcm9wcztcblxuICAgICAgY29uc3QgcmFuZG9tSWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoNSk7XG5cbiAgICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIHVpZDogcmFuZG9tSWQsXG4gICAgICAgIHdvcmtsb2FkLFxuICAgICAgICBkYXRhLFxuICAgICAgfSBhcyBJUG9zdG1hbk1lc3NhZ2UpO1xuXG4gICAgICB0aGlzLmNhbGxiYWNrU3RvcmVbcmFuZG9tSWRdID0gKHJlc3VsdDogYW55LCBlcnI/OiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKFwiVGltZWQgb3V0XCIpKSwgdGhpcy5USU1FT1VUKTtcbiAgICB9KTtcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IHBvc3RNYW4gPSBuZXcgUG9zdG1hbigpO1xuIiwgImltcG9ydCB7IHRleHREYXRhIH0gZnJvbSBcInR5cGVzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2RlVGV4dChcbiAgcm9vdE5vZGU6IFBhZ2VOb2RlLFxuICBub2RlTmFtZTogc3RyaW5nXG4pOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCBmb3VuZE5vZGUgPSByb290Tm9kZS5maW5kQ2hpbGQoKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbm9kZU5hbWUpO1xuICByZXR1cm4gZm91bmROb2RlICYmIGZvdW5kTm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgID8gZm91bmROb2RlLmNoYXJhY3RlcnNcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gY2FsY3VsYXRlTGV0dGVyU3BhY2luZyhcbiAgZm9udEZhbWlseTogc3RyaW5nLFxuICBsZXR0ZXJTcGFjaW5nOiBMZXR0ZXJTcGFjaW5nXG4pIHtcbiAgY29uc3QgeyB1bml0OiBsZXR0ZXJVbml0LCB2YWx1ZTogbGV0dGVyVmFsIH0gPSBsZXR0ZXJTcGFjaW5nO1xuICBsZXQgbGV0dGVyU3BhY2VWYWx1ZSA9IFwiMFwiO1xuICBjb25zb2xlLmxvZyhsZXR0ZXJVbml0LCBsZXR0ZXJTcGFjaW5nLCBmb250RmFtaWx5KTtcbiAgc3dpdGNoIChsZXR0ZXJVbml0KSB7XG4gICAgY2FzZSBcIlBJWEVMU1wiOlxuICAgICAgLy8gVE9ETzogRklYIE1FXG4gICAgICBpZiAoZm9udEZhbWlseSA9PT0gXCJUZWxlc2FucyBUZXh0XCIpIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMzN9cHhgO1xuICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAtIDAuMTl9cHhgO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbH1weGA7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwiUEVSQ0VOVFwiOlxuICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMH1lbWA7XG5cbiAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYCR7bGV0dGVyVmFsIC8gMTAwIC0gMC4wMjJ9ZW1gO1xuICAgICAgfSBlbHNlIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIEFnYXRlXCIpIHtcbiAgICAgICAgbGV0dGVyU3BhY2VWYWx1ZSA9IGAke2xldHRlclZhbCAvIDEwMCAtIDAuMDE1fWVtYDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxldHRlclNwYWNlVmFsdWUgPSBgJHtsZXR0ZXJWYWwgLyAxMDB9ZW1gO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmIChmb250RmFtaWx5ID09PSBcIlRlbGVzYW5zIFRleHRcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4zN3B4XCI7XG4gICAgICB9IGVsc2UgaWYgKGZvbnRGYW1pbHkgPT09IFwiVGVsZXNhbnMgQWdhdGVcIikge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gXCItMC4xOXB4XCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsZXR0ZXJTcGFjZVZhbHVlID0gYDBgO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gbGV0dGVyU3BhY2VWYWx1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRleHROb2RlcyhmcmFtZTogRnJhbWVOb2RlKTogdGV4dERhdGFbXSB7XG4gIGNvbnN0IHRleHROb2RlcyA9IGZyYW1lLmZpbmRBbGwoKHsgdHlwZSB9KSA9PiB0eXBlID09PSBcIlRFWFRcIikgYXMgVGV4dE5vZGVbXTtcbiAgY29uc3QgeyBhYnNvbHV0ZVRyYW5zZm9ybSB9ID0gZnJhbWU7XG4gIGNvbnN0IHJvb3RYID0gYWJzb2x1dGVUcmFuc2Zvcm1bMF1bMl07XG4gIGNvbnN0IHJvb3RZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG5cbiAgcmV0dXJuIHRleHROb2Rlcy5tYXAoXG4gICAgKG5vZGUpOiB0ZXh0RGF0YSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGFic29sdXRlVHJhbnNmb3JtLFxuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICBmb250U2l6ZTogZm9udFNpemVEYXRhLFxuICAgICAgICBmb250TmFtZSxcbiAgICAgICAgZmlsbHMsXG4gICAgICAgIGNoYXJhY3RlcnMsXG4gICAgICAgIGxpbmVIZWlnaHQsXG4gICAgICAgIGxldHRlclNwYWNpbmcsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgfSA9IG5vZGU7XG5cbiAgICAgIC8vIE5PVEU6IEZpZ21hIG5vZGUgeCwgeSBhcmUgcmVsYXRpdmUgdG8gZmlyc3QgcGFyZW50LCB3ZSB3YW50IHRoZW1cbiAgICAgIC8vIHJlbGF0aXZlIHRvIHRoZSByb290IGZyYW1lXG4gICAgICBjb25zdCB0ZXh0WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICAgICAgY29uc3QgdGV4dFkgPSBhYnNvbHV0ZVRyYW5zZm9ybVsxXVsyXTtcbiAgICAgIGNvbnN0IHggPSB0ZXh0WCAtIHJvb3RYO1xuICAgICAgY29uc3QgeSA9IHRleHRZIC0gcm9vdFk7XG5cbiAgICAgIC8vIEV4dHJhY3QgYmFzaWMgZmlsbCBjb2xvdXJcbiAgICAgIGxldCBjb2xvdXIgPSB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDEgfTtcblxuICAgICAgaW50ZXJmYWNlIElUZXh0UHJvcFJhbmdlIHtcbiAgICAgICAgc3RhcnQ6IG51bWJlcjtcbiAgICAgICAgZW5kOiBudW1iZXI7XG4gICAgICAgIHZhbHVlOiBudW1iZXI7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGdldFRleHRSYW5nZVZhbHVlcyh0ZXh0Tm9kZTogVGV4dE5vZGUpIHtcbiAgICAgICAgY29uc3QgeyBjaGFyYWN0ZXJzIH0gPSBub2RlO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGNoYXJhY3RlcnMpKTtcbiAgICAgICAgY29uc29sZS5sb2coY2hhcmFjdGVycy5sZW5ndGgpO1xuXG4gICAgICAgIC8vIExldHRlciBzcGFjaW5nXG4gICAgICAgIGNvbnN0IGxldHRlclNwYWNpbmc6IElUZXh0UHJvcFJhbmdlW10gPSBbXTtcbiAgICAgICAgbGV0IHN0YXJ0UmFuZ2UgPSAwO1xuICAgICAgICBsZXQgcHJvcHM6IElUZXh0UHJvcFJhbmdlID0geyBzdGFydDogMCwgZW5kOiAwLCB2YWx1ZTogMCB9O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgY2hhcmFjdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHNpemVWYWx1ZSA9IHRleHROb2RlLmdldFJhbmdlTGV0dGVyU3BhY2luZyhzdGFydFJhbmdlLCBpKTtcblxuICAgICAgICAgIGlmIChpID09PSBjaGFyYWN0ZXJzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGNoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICAgICAgbGV0dGVyU3BhY2luZy5wdXNoKHsgLi4ucHJvcHMgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc2l6ZVZhbHVlID09PSBmaWdtYS5taXhlZCkge1xuICAgICAgICAgICAgcHJvcHMuZW5kID0gaSAtIDE7XG4gICAgICAgICAgICBsZXR0ZXJTcGFjaW5nLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIHN0YXJ0UmFuZ2UgPSBpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9wcyA9IHtcbiAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0UmFuZ2UsXG4gICAgICAgICAgICAgIGVuZDogaSxcbiAgICAgICAgICAgICAgdmFsdWU6IHNpemVWYWx1ZSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coXCJsZXR0ZXIgc3BhY2luZ1wiLCBsZXR0ZXJTcGFjaW5nKTtcblxuICAgICAgICAvLyBMaW5lIGhlaWdodHNcbiAgICAgICAgY29uc3QgbGluZUhlaWdodHMgPSBbXTtcbiAgICAgICAgc3RhcnRSYW5nZSA9IDA7XG4gICAgICAgIHByb3BzID0geyBzdGFydDogMCwgZW5kOiAwLCB2YWx1ZTogMTYgfTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGNoYXJhY3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB0ZXh0Tm9kZS5nZXRSYW5nZUxpbmVIZWlnaHQoc3RhcnRSYW5nZSwgaSk7XG5cbiAgICAgICAgICBpZiAoaSA9PT0gY2hhcmFjdGVycy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBwcm9wcy5lbmQgPSBjaGFyYWN0ZXJzLmxlbmd0aDtcbiAgICAgICAgICAgIGxpbmVIZWlnaHRzLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChzaXplVmFsdWUgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgICBwcm9wcy5lbmQgPSBpIC0gMTtcbiAgICAgICAgICAgIGxpbmVIZWlnaHRzLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIHN0YXJ0UmFuZ2UgPSBpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgdmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAoc2l6ZVZhbHVlLnVuaXQgIT09IFwiQVVUT1wiKSB7XG4gICAgICAgICAgICAgIHZhbHVlID1cbiAgICAgICAgICAgICAgICBzaXplVmFsdWUudW5pdCA9PT0gXCJQSVhFTFNcIlxuICAgICAgICAgICAgICAgICAgPyBgJHtzaXplVmFsdWUudmFsdWV9cHhgXG4gICAgICAgICAgICAgICAgICA6IGAke3NpemVWYWx1ZS52YWx1ZSAvIDEwMH1yZW1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wcyA9IHsgc3RhcnQ6IHN0YXJ0UmFuZ2UsIGVuZDogaSwgdmFsdWUgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhsaW5lSGVpZ2h0cyk7XG5cbiAgICAgICAgLy8gRm9udCBzaXplc1xuICAgICAgICBjb25zdCBmb250U2l6ZXM6IElUZXh0UHJvcFJhbmdlW10gPSBbXTtcbiAgICAgICAgc3RhcnRSYW5nZSA9IDA7XG4gICAgICAgIHByb3BzID0geyBzdGFydDogMCwgZW5kOiAwLCB2YWx1ZTogMTYgfTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IGNoYXJhY3RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB0ZXh0Tm9kZS5nZXRSYW5nZUZvbnRTaXplKHN0YXJ0UmFuZ2UsIGkpO1xuXG4gICAgICAgICAgaWYgKGkgPT09IGNoYXJhY3RlcnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgcHJvcHMuZW5kID0gY2hhcmFjdGVycy5sZW5ndGg7XG4gICAgICAgICAgICBmb250U2l6ZXMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHNpemVWYWx1ZSA9PT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGkgLSAxO1xuICAgICAgICAgICAgZm9udFNpemVzLnB1c2goeyAuLi5wcm9wcyB9KTtcbiAgICAgICAgICAgIHN0YXJ0UmFuZ2UgPSBpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwcm9wcyA9IHsgc3RhcnQ6IHN0YXJ0UmFuZ2UsIGVuZDogaSwgdmFsdWU6IHNpemVWYWx1ZSB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKGZvbnRTaXplcyk7XG5cbiAgICAgICAgY29uc3QgcGFpbnRzOiBhbnlbXSA9IFtdO1xuICAgICAgICBzdGFydFJhbmdlID0gMDtcbiAgICAgICAgcHJvcHMgPSB7IHN0YXJ0OiAwLCBlbmQ6IDAsIHZhbHVlOiAxNiB9O1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgY2hhcmFjdGVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHBhaW50VmFsdWUgPSB0ZXh0Tm9kZS5nZXRSYW5nZUZpbGxzKHN0YXJ0UmFuZ2UsIGkpO1xuXG4gICAgICAgICAgaWYgKGkgPT09IGNoYXJhY3RlcnMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgcHJvcHMuZW5kID0gY2hhcmFjdGVycy5sZW5ndGg7XG4gICAgICAgICAgICBwYWludHMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHBhaW50VmFsdWUgPT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgICBwcm9wcy5lbmQgPSBpIC0gMTtcbiAgICAgICAgICAgIHBhaW50cy5wdXNoKHsgLi4ucHJvcHMgfSk7XG4gICAgICAgICAgICBzdGFydFJhbmdlID0gaTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCB9O1xuICAgICAgICAgICAgaWYgKHBhaW50VmFsdWVbMF0udHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgICAgICAgIGNvbG91ciA9IHsgLi4ucGFpbnRWYWx1ZVswXS5jb2xvciB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwcm9wcyA9IHtcbiAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0UmFuZ2UsXG4gICAgICAgICAgICAgIGVuZDogaSAtIDEsXG4gICAgICAgICAgICAgIHZhbHVlOiBjb2xvdXIsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKHBhaW50cyk7XG5cbiAgICAgICAgY29uc3QgZm9udHM6IGFueVtdID0gW107XG4gICAgICAgIHN0YXJ0UmFuZ2UgPSAwO1xuICAgICAgICBwcm9wcyA9IHsgc3RhcnQ6IDAsIGVuZDogMCwgdmFsdWU6IDE2IH07XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBjaGFyYWN0ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgZm9udFZhbHVlID0gdGV4dE5vZGUuZ2V0UmFuZ2VGb250TmFtZShzdGFydFJhbmdlLCBpKTtcblxuICAgICAgICAgIGlmIChpID09PSBjaGFyYWN0ZXJzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGNoYXJhY3RlcnMubGVuZ3RoO1xuICAgICAgICAgICAgZm9udHMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJFTkRJTkcgRk9OVFNcIiwgaSwgcHJvcHMpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGZvbnRWYWx1ZSA9PT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgICAgIHByb3BzLmVuZCA9IGkgLSAxO1xuICAgICAgICAgICAgZm9udHMucHVzaCh7IC4uLnByb3BzIH0pO1xuICAgICAgICAgICAgc3RhcnRSYW5nZSA9IGk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHByb3BzID0geyBzdGFydDogc3RhcnRSYW5nZSwgZW5kOiBpLCB2YWx1ZTogZm9udFZhbHVlIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coZm9udHMpO1xuXG4gICAgICAgIC8vIENvbGxlY3QgYWxsIGVuZCBpbmRleGVkLCBzb3J0IGFjY2VuZGluZyBhbmQgcmVtb3ZlIGR1cGxpY2F0ZXNcbiAgICAgICAgY29uc3QgZW5kcyA9IFtcbiAgICAgICAgICAuLi5mb250cy5tYXAoKGYpID0+IGYuZW5kKSxcbiAgICAgICAgICAuLi5wYWludHMubWFwKChmKSA9PiBmLmVuZCksXG4gICAgICAgICAgLi4uZm9udFNpemVzLm1hcCgoZikgPT4gZi5lbmQpLFxuICAgICAgICAgIC4uLmxldHRlclNwYWNpbmcubWFwKChmKSA9PiBmLmVuZCksXG4gICAgICAgICAgLi4ubGluZUhlaWdodHMubWFwKChmKSA9PiBmLmVuZCksXG4gICAgICAgIF1cbiAgICAgICAgICAuc29ydCgoYSwgYikgPT4gKGEgPiBiID8gMSA6IC0xKSlcbiAgICAgICAgICAuZmlsdGVyKChuLCBpLCBzZWxmKSA9PiBzZWxmLmluZGV4T2YobikgPT09IGkpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZW5kc1wiLCBlbmRzKTtcbiAgICAgICAgY29uc3Qgc3R5bGVzID0gW107XG4gICAgICAgIGxldCBzdGFydEluZGV4ID0gMDtcbiAgICAgICAgZm9yIChsZXQgZW5kIG9mIGVuZHMpIHtcbiAgICAgICAgICBpZiAoc3RhcnRJbmRleCA9PT0gZW5kKSB7XG4gICAgICAgICAgICBlbmQrKztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgIGBTdGFydDogJHtzdGFydEluZGV4fSwgRW5kOiAke2VuZH0sIGNoYXJzOiAke0pTT04uc3RyaW5naWZ5KFxuICAgICAgICAgICAgICBjaGFyYWN0ZXJzLnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmQpXG4gICAgICAgICAgICApfWBcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGNvbG91ciA9IHBhaW50cy5maW5kKFxuICAgICAgICAgICAgKGYpID0+IHN0YXJ0SW5kZXggKyAxID49IGYuc3RhcnQgJiYgZW5kIDw9IGYuZW5kXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnN0IGZvbnQgPSBmb250cy5maW5kKFxuICAgICAgICAgICAgKGYpID0+IHN0YXJ0SW5kZXggKyAxID49IGYuc3RhcnQgJiYgZW5kIDw9IGYuZW5kXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGNvbnN0IGZvbnRTaXplID0gZm9udFNpemVzLmZpbmQoXG4gICAgICAgICAgICAoZikgPT4gc3RhcnRJbmRleCArIDEgPj0gZi5zdGFydCAmJiBlbmQgPD0gZi5lbmRcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29uc3QgbGV0dGVyU3BhY2UgPSBsZXR0ZXJTcGFjaW5nLmZpbmQoXG4gICAgICAgICAgICAoZikgPT4gc3RhcnRJbmRleCArIDEgPj0gZi5zdGFydCAmJiBlbmQgPD0gZi5lbmRcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgY29uc3QgbGluZUhlaWdodCA9IGxpbmVIZWlnaHRzLmZpbmQoXG4gICAgICAgICAgICAoZikgPT4gc3RhcnRJbmRleCArIDEgPj0gZi5zdGFydCAmJiBlbmQgPD0gZi5lbmRcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKCFmb250U2l6ZSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIFwiTWlzc2luZyBmb250IHNpemVcIixcbiAgICAgICAgICAgICAgc3RhcnRJbmRleCxcbiAgICAgICAgICAgICAgZW5kLFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShjaGFyYWN0ZXJzLnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmQpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIWZvbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICBcIm1pc3NpbmcgZm9udFwiLFxuICAgICAgICAgICAgICBzdGFydEluZGV4LFxuICAgICAgICAgICAgICBlbmQsXG4gICAgICAgICAgICAgIGZvbnQsXG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGNoYXJhY3RlcnMuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZCkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IHN0eWxlID0ge1xuICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0SW5kZXgsXG4gICAgICAgICAgICBlbmQ6IGVuZCxcbiAgICAgICAgICAgIGNoYXJzOiBjaGFyYWN0ZXJzLnN1YnN0cmluZyhzdGFydEluZGV4LCBlbmQpLFxuICAgICAgICAgICAgZm9udDogZm9udC52YWx1ZSxcbiAgICAgICAgICAgIGNvbG91cjogY29sb3VyLnZhbHVlLFxuICAgICAgICAgICAgc2l6ZTogZm9udFNpemU/LnZhbHVlLFxuICAgICAgICAgICAgbGV0dGVyU3BhY2U6IGNhbGN1bGF0ZUxldHRlclNwYWNpbmcoXG4gICAgICAgICAgICAgIGZvbnQudmFsdWUuZmFtaWx5LFxuICAgICAgICAgICAgICBsZXR0ZXJTcGFjZT8udmFsdWVcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBsaW5lSGVpZ2h0OiBsaW5lSGVpZ2h0Py52YWx1ZSxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgc3R5bGVzLnB1c2goc3R5bGUpO1xuICAgICAgICAgIHN0YXJ0SW5kZXggPSBlbmQ7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgICAgfVxuXG4gICAgICAvLyBHZXQgZm9udCBzaXplcyByYW5nZXNcbiAgICAgIGNvbnN0IHN0eWxlcyA9IGdldFRleHRSYW5nZVZhbHVlcyhub2RlKTtcblxuICAgICAgY29uc29sZS5sb2coc3R5bGVzKTtcblxuICAgICAgLy8gRXh0cmFjdCBmb250IGluZm9cbiAgICAgIC8vIFRPRE86IENvbmZpcm0gZmFsbGJhY2sgZm9udHNcbiAgICAgIC8vIGNvbnN0IGZvbnRTaXplID0gZm9udFNpemVEYXRhICE9PSBmaWdtYS5taXhlZCA/IGZvbnRTaXplRGF0YSA6IDE2O1xuICAgICAgY29uc3QgZm9udEZhbWlseSA9IGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IGZvbnROYW1lLmZhbWlseSA6IFwiQXJpYWxcIjtcbiAgICAgIGNvbnN0IGZvbnRTdHlsZSA9IGZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IGZvbnROYW1lLnN0eWxlIDogXCJSZWd1bGFyXCI7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIHdpZHRoLFxuICAgICAgICBoZWlnaHQsXG4gICAgICAgIGZvbnRTaXplOiAxMixcbiAgICAgICAgZm9udEZhbWlseSxcbiAgICAgICAgZm9udFN0eWxlLFxuICAgICAgICBjb2xvdXI6IHsgcjogMCwgZzogMCwgYjogMCB9LFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgICBsaW5lSGVpZ2h0OiBcIkFVVE9cIixcbiAgICAgICAgbGV0dGVyU3BhY2luZzogXCJhdXRvXCIsXG4gICAgICAgIHRleHRBbGlnbkhvcml6b250YWwsXG4gICAgICAgIHRleHRBbGlnblZlcnRpY2FsLFxuICAgICAgICBzdHlsZXMsXG4gICAgICB9O1xuICAgIH1cbiAgKTtcbn1cbiIsICJpbXBvcnQgeyBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcywgSUZyYW1lRGF0YSB9IGZyb20gXCJ0eXBlc1wiO1xuaW1wb3J0IHsgZ2V0Tm9kZVRleHQsIGdldFRleHROb2RlcyB9IGZyb20gXCJoZWxwZXJzL2ZpZ21hVGV4dFwiO1xuaW1wb3J0IHsgSEVBRExJTkVfTk9ERV9OQU1FUywgTVNHX0VWRU5UUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgcG9zdE1hbiB9IGZyb20gXCJ1dGlscy9tZXNzYWdlc1wiO1xuaW1wb3J0IFVQTkcgZnJvbSBcInVwbmctanNcIjtcbmltcG9ydCBQaWNhIGZyb20gXCJwaWNhXCI7XG5cbmNvbnN0IEpQRUdfTUFHSUNfQllURVMgPSBbXG4gIFsweGZmLCAweGQ4LCAweGZmLCAweGRiXSxcbiAgWzB4ZmYsIDB4ZDgsIDB4ZmYsIDB4ZWVdLFxuICBbMHhmZiwgMHhkOCwgMHhmZiwgMHhlMV0sXG4gIFsweGZmLCAweGQ4LCAweGZmLCAweGUwLCAweDAwLCAweDEwLCAweDRhLCAweDQ2LCAweDQ5LCAweDQ2LCAweDAwLCAweDAxXSxcbl07XG5jb25zdCBQTkdfTUFHSUNfQllURVMgPSBbMHg4OSwgMHg1MCwgMHg0ZSwgMHg0NywgMHgwZCwgMHgwYSwgMHgxYSwgMHgwYV07XG5jb25zdCBHSUZfTUFHSUNfQllURVMgPSBbXG4gIFsweDQ3LCAweDQ5LCAweDQ2LCAweDM4LCAweDM3LCAweDYxXSxcbiAgWzB4NDcsIDB4NDksIDB4NDYsIDB4MzgsIDB4MzksIDB4NjFdLFxuXTtcbmVudW0gSU1BR0VfRk9STUFUUyB7XG4gIFBORyxcbiAgSlBFRyxcbiAgR0lGLFxuICBVTktOT1dOLFxufVxuXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpZnlJbWFnZUZvcm1hdChpbWFnZURhdGE6IFVpbnQ4QXJyYXkpOiBJTUFHRV9GT1JNQVRTIHtcbiAgY29uc3QgaXNQbmcgPSBQTkdfTUFHSUNfQllURVMuZXZlcnkoKHZhbCwgaSkgPT4gdmFsID09PSBpbWFnZURhdGFbaV0pO1xuICBpZiAoaXNQbmcpIHtcbiAgICByZXR1cm4gSU1BR0VfRk9STUFUUy5QTkc7XG4gIH1cblxuICBjb25zdCBpc0pwZWcgPSBKUEVHX01BR0lDX0JZVEVTLnNvbWUoKGJ5dGVzKSA9PlxuICAgIGJ5dGVzLmV2ZXJ5KCh2YWwsIGkpID0+IHZhbCA9PT0gaW1hZ2VEYXRhW2ldKVxuICApO1xuICBpZiAoaXNKcGVnKSB7XG4gICAgcmV0dXJuIElNQUdFX0ZPUk1BVFMuSlBFRztcbiAgfVxuXG4gIGNvbnN0IGlzR2lmID0gR0lGX01BR0lDX0JZVEVTLnNvbWUoKGJ5dGVzKSA9PlxuICAgIGJ5dGVzLmV2ZXJ5KCh2YWwsIGkpID0+IHZhbCA9PT0gaW1hZ2VEYXRhW2ldKVxuICApO1xuICBpZiAoaXNHaWYpIHtcbiAgICByZXR1cm4gSU1BR0VfRk9STUFUUy5HSUY7XG4gIH1cblxuICByZXR1cm4gSU1BR0VfRk9STUFUUy5VTktOT1dOO1xufVxuXG5pbnRlcmZhY2UgSXJlc2l6ZUltYWdlIHtcbiAgaW1nOiBIVE1MSW1hZ2VFbGVtZW50O1xuICBpbWdEYXRhOiBVaW50OEFycmF5O1xuICBub2RlRGltZW5zaW9uczogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9W107XG4gIHJlc29sdmU6IChkYXRhOiBVaW50OEFycmF5KSA9PiB2b2lkO1xuICByZWplY3Q6IChlOiBFcnJvcikgPT4gdm9pZDtcbn1cblxuLy8gVWludDhBcnJheVxuXG5hc3luYyBmdW5jdGlvbiByZXNpemVJbWFnZShwcm9wczogSXJlc2l6ZUltYWdlKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgaW1nLCBpbWdEYXRhLCBub2RlRGltZW5zaW9ucywgcmVzb2x2ZSwgcmVqZWN0IH0gPSBwcm9wcztcbiAgLy8gU2NhbGUgdG8gbGFyZ2VzdCBkaW1lbnNpb25cbiAgY29uc3QgYXNwZWN0UmF0aW8gPSBpbWcud2lkdGggLyBpbWcuaGVpZ2h0O1xuXG4gIC8vIFdPUksgT1VUIE1BWCBOT0RFIFNJWkVcbiAgbGV0IHdpZHRoID0gMjAwO1xuICBsZXQgaGVpZ2h0ID0gMjAwO1xuXG4gIGlmIChhc3BlY3RSYXRpbyA8IDEpIHtcbiAgICAvLyAyMDB4MzAwIHBvcnRyYWl0ICA9IDIvMyA9IDAuNjZcbiAgICBjb25zdCBtYXhBc3BlY3RIZWlnaHQgPSBNYXRoLm1heChcbiAgICAgIC4uLm5vZGVEaW1lbnNpb25zLmZsYXRNYXAoKGQpID0+IGQud2lkdGggLyBhc3BlY3RSYXRpbylcbiAgICApO1xuICAgIGNvbnN0IG1heE5vZGVIZWlnaHQgPSBNYXRoLm1heCguLi5ub2RlRGltZW5zaW9ucy5mbGF0TWFwKChkKSA9PiBkLmhlaWdodCkpO1xuXG4gICAgaGVpZ2h0ID0gTWF0aC5tYXgobWF4Tm9kZUhlaWdodCwgbWF4QXNwZWN0SGVpZ2h0KTtcbiAgICB3aWR0aCA9IGhlaWdodCAqIGFzcGVjdFJhdGlvO1xuXG4gICAgLy8gd2lkdGggPSBNYXRoLm1heCguLi5ub2RlRGltZW5zaW9ucy5mbGF0TWFwKChkKSA9PiBkLndpZHRoKSk7XG4gICAgLy8gaGVpZ2h0ID0gd2lkdGggLyBhc3BlY3RSYXRpbztcbiAgfSBlbHNlIHtcbiAgICAvLyAzMDB4MjAwIHBvcnRyYWl0ICA9IDMvMiA9IDEuNVxuICAgIC8vIExhbmRzY2FwZSBvciBzcXVhcmVcbiAgICBjb25zdCBtYXhBc3BlY3RXaWR0aCA9IE1hdGgubWF4KFxuICAgICAgLi4ubm9kZURpbWVuc2lvbnMuZmxhdE1hcCgoZCkgPT4gZC5oZWlnaHQgKiBhc3BlY3RSYXRpbylcbiAgICApO1xuICAgIGNvbnN0IG1heE5vZGVXaWR0aCA9IE1hdGgubWF4KC4uLm5vZGVEaW1lbnNpb25zLmZsYXRNYXAoKGQpID0+IGQud2lkdGgpKTtcblxuICAgIHdpZHRoID0gTWF0aC5tYXgobWF4Tm9kZVdpZHRoLCBtYXhBc3BlY3RXaWR0aCk7XG4gICAgaGVpZ2h0ID0gd2lkdGggLyBhc3BlY3RSYXRpbztcbiAgfVxuXG4gIGxldCB0YXJnZXRXaWR0aCA9IDA7XG4gIGxldCB0YXJnZXRIZWlnaHQgPSAwO1xuXG4gIC8vIERvbid0IHNjYWxlIGltYWdlIHVwIGlmIG5vZGUgaXMgbGFyZ2VyIHRoYW4gaW1hZ2VcbiAgaWYgKHdpZHRoID4gaW1nLndpZHRoIHx8IGhlaWdodCA+IGltZy5oZWlnaHQpIHtcbiAgICB0YXJnZXRXaWR0aCA9IGltZy53aWR0aDtcbiAgICB0YXJnZXRIZWlnaHQgPSBpbWcuaGVpZ2h0O1xuICB9IGVsc2Uge1xuICAgIHRhcmdldFdpZHRoID0gTWF0aC5yb3VuZCh3aWR0aCk7XG4gICAgdGFyZ2V0SGVpZ2h0ID0gTWF0aC5yb3VuZChoZWlnaHQpO1xuICB9XG5cbiAgY29uc3QgY2FudmFzID0gbmV3IE9mZnNjcmVlbkNhbnZhcyh0YXJnZXRXaWR0aCwgdGFyZ2V0SGVpZ2h0KTtcbiAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcblxuICBpZiAoIWN0eCkge1xuICAgIHJlamVjdChuZXcgRXJyb3IoXCJVbmFibGUgdG8gZ2V0IDJkIGNvbnRleHRcIikpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEVuYWJsZSBoaWdoLXF1YWxpdHkgc2NhbGluZ1xuICBjdHguaW1hZ2VTbW9vdGhpbmdRdWFsaXR5ID0gXCJoaWdoXCI7XG5cbiAgLy8gVXNlIGltYWdlIHJlc2l6aW5nIGxpYnJhcnkgdG8gY3JlYXRlIGEgc2hhcnBlciBkb3duc2NhbGVkIGltYWdlXG4gIGNvbnN0IHBpY2EgPSBuZXcgUGljYSgpO1xuICBhd2FpdCBwaWNhLnJlc2l6ZShpbWcsIChjYW52YXMgYXMgdW5rbm93bikgYXMgSFRNTENhbnZhc0VsZW1lbnQsIHtcbiAgICB1bnNoYXJwQW1vdW50OiA1MCxcbiAgICBhbHBoYTogdHJ1ZSxcbiAgfSk7XG5cbiAgLy8gT3JpZ2luYWwgaW1hZ2UgZm9ybWF0XG4gIGNvbnN0IGltYWdlRm9ybWF0ID0gaWRlbnRpZnlJbWFnZUZvcm1hdChpbWdEYXRhKTtcblxuICBpZiAoaW1hZ2VGb3JtYXQgPT09IElNQUdFX0ZPUk1BVFMuUE5HIHx8IGltYWdlRm9ybWF0ID09PSBJTUFHRV9GT1JNQVRTLkdJRikge1xuICAgIC8vIFJlc2l6ZSAmIGNvbnZlcnQgdG8gYmxvYlxuICAgIGNvbnN0IGRhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHRhcmdldFdpZHRoLCB0YXJnZXRIZWlnaHQpLmRhdGE7XG5cbiAgICBjb25zdCB0aW55UG5nID0gVVBORy5lbmNvZGUoW2RhdGEuYnVmZmVyXSwgdGFyZ2V0V2lkdGgsIHRhcmdldEhlaWdodCwgNjQpO1xuICAgIHJlc29sdmUobmV3IFVpbnQ4QXJyYXkodGlueVBuZykpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChcbiAgICBpbWFnZUZvcm1hdCA9PT0gSU1BR0VfRk9STUFUUy5KUEVHIHx8XG4gICAgaW1hZ2VGb3JtYXQgPT09IElNQUdFX0ZPUk1BVFMuVU5LTk9XTlxuICApIHtcbiAgICBjb25zdCBibG9iID0gYXdhaXQgY2FudmFzLmNvbnZlcnRUb0Jsb2Ioe1xuICAgICAgdHlwZTogXCJpbWFnZS9qcGVnXCIsXG4gICAgICBxdWFsaXR5OiAwLjg1LFxuICAgIH0pO1xuICAgIGNvbnN0IGJ1ZmYgPSBhd2FpdCBibG9iLmFycmF5QnVmZmVyKCk7XG4gICAgcmVzb2x2ZShuZXcgVWludDhBcnJheShidWZmKSk7XG4gICAgcmV0dXJuO1xuICB9XG59XG5cbi8vIENvbnRleHQ6IFVJXG5leHBvcnQgZnVuY3Rpb24gY29tcHJlc3NJbWFnZShwcm9wczoge1xuICBpbWdEYXRhOiBVaW50OEFycmF5O1xuICBub2RlRGltZW5zaW9uczogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9W107XG59KTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgY29uc3QgeyBpbWdEYXRhLCBub2RlRGltZW5zaW9ucyB9ID0gcHJvcHM7XG5cbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xuICAgICAgcmVzaXplSW1hZ2Uoe1xuICAgICAgICBpbWcsXG4gICAgICAgIGltZ0RhdGEsXG4gICAgICAgIG5vZGVEaW1lbnNpb25zLFxuICAgICAgICByZXNvbHZlLFxuICAgICAgICByZWplY3QsXG4gICAgICB9KS5jYXRjaCgoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgfSk7XG5cbiAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIChlcnIpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBsb2FkaW5nIGNvbXByZXNzZWQgaW1hZ2VcIik7XG4gICAgICByZWplY3QoZXJyKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbaW1nRGF0YV0sIHsgdHlwZTogXCJpbWFnZS9wbmdcIiB9KTtcbiAgICBjb25zdCBpbWdVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIGltZy5zcmMgPSBpbWdVcmw7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzdXBwb3J0c0ZpbGxzKFxuICBub2RlOiBTY2VuZU5vZGVcbik6IG5vZGUgaXMgRXhjbHVkZTxTY2VuZU5vZGUsIFNsaWNlTm9kZSB8IEdyb3VwTm9kZT4ge1xuICByZXR1cm4gbm9kZS50eXBlICE9PSBcIlNMSUNFXCIgJiYgbm9kZS50eXBlICE9PSBcIkdST1VQXCI7XG59XG5cbi8qKlxuICogUmVuZGVyIGFsbCBzcGVjaWZpZWQgZnJhbWVzIG91dCBhcyBTVkcgZWxlbWVudC5cbiAqIEltYWdlcyBhcmUgb3B0aW1pc2VkIGZvciBzaXplIGFuZCBpbWFnZSB0eXBlIGNvbXByZXNzaW9uIHZpYSB0aGUgZnJvbnRlbmQgVUlcbiAqXG4gKiBAY29udGV4dCBmaWdtYVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVuZGVyRnJhbWVzKGZyYW1lSWRzOiBzdHJpbmdbXSk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICBjb25zdCBvdXRwdXROb2RlID0gZmlnbWEuY3JlYXRlRnJhbWUoKTtcbiAgb3V0cHV0Tm9kZS5uYW1lID0gXCJvdXRwdXRcIjtcblxuICB0cnkge1xuICAgIC8vIENsb25lIGVhY2ggc2VsZWN0ZWQgZnJhbWUgYWRkaW5nIHRoZW0gdG8gdGhlIHRlbXBvcmFyeSBjb250YWluZXIgZnJhbWVcbiAgICBjb25zdCBmcmFtZXMgPSBmaWdtYS5jdXJyZW50UGFnZS5jaGlsZHJlbi5maWx0ZXIoKHsgaWQgfSkgPT5cbiAgICAgIGZyYW1lSWRzLmluY2x1ZGVzKGlkKVxuICAgICk7XG5cbiAgICAvLyBDYWxjdWxhdGUgdGhlIG1heCBkaW1lbnNpb25zIGZvciBvdXRwdXQgY29udGFpbmVyIGZyYW1lXG4gICAgY29uc3QgbWF4V2lkdGggPSBNYXRoLm1heCguLi5mcmFtZXMubWFwKChmKSA9PiBmLndpZHRoKSk7XG4gICAgY29uc3QgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoLi4uZnJhbWVzLm1hcCgoZikgPT4gZi5oZWlnaHQpKTtcbiAgICBvdXRwdXROb2RlLnJlc2l6ZVdpdGhvdXRDb25zdHJhaW50cyhtYXhXaWR0aCwgbWF4SGVpZ2h0KTtcblxuICAgIGZvciAoY29uc3QgZnJhbWUgb2YgZnJhbWVzKSB7XG4gICAgICBjb25zdCBjbG9uZSA9IGZyYW1lPy5jbG9uZSgpIGFzIEZyYW1lTm9kZTtcblxuICAgICAgLy8gRmluZCBhbmQgcmVtb3ZlIGFsbCB0ZXh0IG5vZGVzXG4gICAgICBjbG9uZS5maW5kQWxsKChuKSA9PiBuLnR5cGUgPT09IFwiVEVYVFwiKS5mb3JFYWNoKChuKSA9PiBuLnJlbW92ZSgpKTtcblxuICAgICAgLy8gQXBwZW5kIGNsb25lZCBmcmFtZSB0byB0ZW1wIG91dHB1dCBmcmFtZSBhbmQgcG9zaXRpb24gaW4gdG9wIGxlZnRcbiAgICAgIG91dHB1dE5vZGUuYXBwZW5kQ2hpbGQoY2xvbmUpO1xuICAgICAgY2xvbmUueCA9IDA7XG4gICAgICBjbG9uZS55ID0gMDtcblxuICAgICAgLy8gU3RvcmUgdGhlIGZyYW1lIElEIGFzIG5vZGUgbmFtZSAoZXhwb3J0ZWQgaW4gU1ZHIHByb3BzKVxuICAgICAgY2xvbmUubmFtZSA9IGZyYW1lLmlkO1xuICAgIH1cblxuICAgIC8vIEZpbmQgYWxsIG5vZGVzIHdpdGggaW1hZ2UgZmlsbHNcbiAgICBjb25zdCBub2Rlc1dpdGhJbWFnZXMgPSBvdXRwdXROb2RlLmZpbmRBbGwoXG4gICAgICAobm9kZSkgPT5cbiAgICAgICAgc3VwcG9ydHNGaWxscyhub2RlKSAmJlxuICAgICAgICBub2RlLmZpbGxzICE9PSBmaWdtYS5taXhlZCAmJlxuICAgICAgICBub2RlLmZpbGxzLnNvbWUoKGZpbGwpID0+IGZpbGwudHlwZSA9PT0gXCJJTUFHRVwiKVxuICAgICk7XG5cbiAgICAvLyBBIHNpbmdsZSBpbWFnZSBjYW4gYmUgdXNlZCBtdWx0aXBsZSB0aW1lcyBvbiBkaWZmZXJlbnQgbm9kZXMgaW4gZGlmZmVyZW50XG4gICAgLy8gZnJhbWVzLiBUbyBlbnN1cmUgaW1hZ2VzIGFyZSBvbmx5IG9wdGltaXNlZCBvbmNlIGEgY2FjaGUgaXMgY3JlYXRlZFxuICAgIC8vIG9mIHVuaXF1ZSBpbWFnZXMgYW5kIHVzZWQgdG8gcmVwbGFjZSBvcmlnaW5hbCBhZnRlciB0aGUgYXN5bmMgcHJvY2Vzc2luZ1xuICAgIC8vIGlzIGNvbXBsZXRlZC5cbiAgICBjb25zdCBpbWFnZUNhY2hlOiB7XG4gICAgICBbaWQ6IHN0cmluZ106IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXI7IGlkOiBzdHJpbmcgfVtdO1xuICAgIH0gPSB7fTtcblxuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlc1dpdGhJbWFnZXMpIHtcbiAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgIC8vIFRoZSBmcm9udGVuZCBVSSB3aGljaCBoYW5kbGVzIHRoZSBpbWFnZSBvcHRpbWlzYXRpb24gbmVlZHMgdG8ga25vd1xuICAgICAgICAvLyB0aGUgc2l6ZXMgb2YgZWFjaCBub2RlIHRoYXQgdXNlcyB0aGUgaW1hZ2UuIFRoZSBkaW1lbnNpb25zIGFyZSBzdG9yZWRcbiAgICAgICAgLy8gd2l0aCB0aGUgaW1hZ2UgaGFzaCBJRCBpbiB0aGUgY2FjaGUgZm9yIGxhdGVyIHVzZS5cbiAgICAgICAgY29uc3QgZGltZW5zaW9ucyA9IHtcbiAgICAgICAgICB3aWR0aDogbm9kZS53aWR0aCxcbiAgICAgICAgICBoZWlnaHQ6IG5vZGUuaGVpZ2h0LFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBpbWdQYWludCA9IFsuLi5ub2RlLmZpbGxzXS5maW5kKChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIik7XG5cbiAgICAgICAgaWYgKGltZ1BhaW50Py50eXBlID09PSBcIklNQUdFXCIgJiYgaW1nUGFpbnQuaW1hZ2VIYXNoKSB7XG4gICAgICAgICAgLy8gQWRkIHRoZSBpbWFnZSBkaW1lbnNpb25zIHRvIHRoZSBjYWNoZSwgb3IgdXBkYXRlIGFuZCBleGlzdGluZyBjYWNoZVxuICAgICAgICAgIC8vIGl0ZW0gd2l0aCBhbm90aGVyIG5vZGVzIGRpbWVuc2lvbnNcbiAgICAgICAgICBpZiAoaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdKSB7XG4gICAgICAgICAgICBpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0ucHVzaChkaW1lbnNpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW1hZ2VDYWNoZVtpbWdQYWludC5pbWFnZUhhc2hdID0gW2RpbWVuc2lvbnNdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNlbmQgZWFjaCBpbWFnZSBmcm9tIHRoZSBpbWFnZUNhY2hlIHRvIHRoZSBmcm9udGVuZCBmb3Igb3B0aW1pc2F0aW9uLlxuICAgIC8vIFRoZSBvcGVyYXRpb24gaXMgYXN5bmMgYW5kIGNhbiB0YWtlIHNvbWUgdGltZSBpZiB0aGUgaW1hZ2VzIGFyZSBsYXJnZS5cbiAgICBmb3IgKGNvbnN0IGltYWdlSGFzaCBpbiBpbWFnZUNhY2hlKSB7XG4gICAgICBjb25zdCBieXRlcyA9IGF3YWl0IGZpZ21hLmdldEltYWdlQnlIYXNoKGltYWdlSGFzaCkuZ2V0Qnl0ZXNBc3luYygpO1xuICAgICAgY29uc3QgY29tcHJlc3NlZEltYWdlOiBVaW50OEFycmF5ID0gYXdhaXQgcG9zdE1hbi5zZW5kKHtcbiAgICAgICAgd29ya2xvYWQ6IE1TR19FVkVOVFMuQ09NUFJFU1NfSU1BR0UsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBpbWdEYXRhOiBieXRlcyxcbiAgICAgICAgICBub2RlRGltZW5zaW9uczogaW1hZ2VDYWNoZVtpbWFnZUhhc2hdLFxuICAgICAgICB9LFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFN0b3JlIHRoZSBuZXcgaW1hZ2UgaW4gZmlnbWEgYW5kIGdldCB0aGUgbmV3IGltYWdlIGhhc2hcbiAgICAgIGNvbnN0IG5ld0ltYWdlSGFzaCA9IGZpZ21hLmNyZWF0ZUltYWdlKGNvbXByZXNzZWRJbWFnZSkuaGFzaDtcblxuICAgICAgLy8gVXBkYXRlIG5vZGVzIHdpbGwgbmV3IGltYWdlIHBhaW50IGZpbGxcbiAgICAgIG5vZGVzV2l0aEltYWdlcy5mb3JFYWNoKChub2RlKSA9PiB7XG4gICAgICAgIGlmIChzdXBwb3J0c0ZpbGxzKG5vZGUpICYmIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkKSB7XG4gICAgICAgICAgY29uc3QgaW1nUGFpbnQgPSBbLi4ubm9kZS5maWxsc10uZmluZChcbiAgICAgICAgICAgIChwKSA9PiBwLnR5cGUgPT09IFwiSU1BR0VcIiAmJiBwLmltYWdlSGFzaCA9PT0gaW1hZ2VIYXNoXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChpbWdQYWludCkge1xuICAgICAgICAgICAgY29uc3QgbmV3UGFpbnQgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGltZ1BhaW50KSk7XG4gICAgICAgICAgICBuZXdQYWludC5pbWFnZUhhc2ggPSBuZXdJbWFnZUhhc2g7XG4gICAgICAgICAgICBub2RlLmZpbGxzID0gW25ld1BhaW50XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEhBQ0shIEZpZ21hIHRha2VzIHNvbWUgdGltZSB0byB1cGRhdGUgdGhlIGltYWdlIGZpbGxzLiBXYWl0aW5nIHNvbWVcbiAgICAvLyBhbW91bnQgaXMgcmVxdWlyZWQgb3RoZXJ3aXNlIHRoZSBpbWFnZXMgYXBwZWFyIGJsYW5rLlxuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDMwMCkpO1xuXG4gICAgLy8gUmVuZGVyIG91dHB1dCBjb250YWluZXIgZnJhbWVzIHRvIFNWRyBtYXJrLXVwIChpbiBhIHVpbnQ4IGJ5dGUgYXJyYXkpXG4gICAgY29uc3Qgc3ZnID0gYXdhaXQgb3V0cHV0Tm9kZS5leHBvcnRBc3luYyh7XG4gICAgICBmb3JtYXQ6IFwiU1ZHXCIsXG4gICAgICBzdmdTaW1wbGlmeVN0cm9rZTogdHJ1ZSxcbiAgICAgIHN2Z091dGxpbmVUZXh0OiBmYWxzZSxcbiAgICAgIHN2Z0lkQXR0cmlidXRlOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHN2ZztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGVycik7XG4gIH0gZmluYWxseSB7XG4gICAgLy8gUmVtb3ZlIHRoZSBvdXRwdXQgZnJhbWUgd2hhdGV2ZXIgaGFwcGVuc1xuICAgIG91dHB1dE5vZGUucmVtb3ZlKCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEhlYWRsaW5lc0FuZFNvdXJjZShwcm9wczogc2V0SGVhZGxpbmVzQW5kU291cmNlUHJvcHMpOiB2b2lkIHtcbiAgY29uc3QgcGFnZU5vZGUgPSBmaWdtYS5jdXJyZW50UGFnZTtcbiAgY29uc3QgZnJhbWVzID0gcGFnZU5vZGUuZmluZENoaWxkcmVuKChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIik7XG4gIGNvbnN0IG1vc3RMZWZ0UG9zID0gTWF0aC5taW4oLi4uZnJhbWVzLm1hcCgobm9kZSkgPT4gbm9kZS54KSk7XG4gIGNvbnN0IG1vc3RUb3BQb3MgPSBNYXRoLm1pbiguLi5mcmFtZXMubWFwKChub2RlKSA9PiBub2RlLnkpKTtcblxuICAvLyBMb29wIHRocm91Z2ggZWFjaCBoZWFkbGluZSBub2RlIG5hbWVzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBPYmplY3QudmFsdWVzKEhFQURMSU5FX05PREVfTkFNRVMpKSB7XG4gICAgbGV0IG5vZGUgPVxuICAgICAgKHBhZ2VOb2RlLmZpbmRDaGlsZChcbiAgICAgICAgKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbmFtZSAmJiBub2RlLnR5cGUgPT09IFwiVEVYVFwiXG4gICAgICApIGFzIFRleHROb2RlKSB8fCBudWxsO1xuICAgIGNvbnN0IHRleHRDb250ZW50ID0gcHJvcHNbbmFtZV07XG5cbiAgICAvLyBSZW1vdmUgbm9kZSBpZiB0aGVyZSdzIG5vIHRleHQgY29udGVudFxuICAgIGlmIChub2RlICYmICF0ZXh0Q29udGVudCkge1xuICAgICAgbm9kZS5yZW1vdmUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIXRleHRDb250ZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gQ3JlYXRlIG5vZGUgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgIGlmICghbm9kZSkge1xuICAgICAgbm9kZSA9IGZpZ21hLmNyZWF0ZVRleHQoKTtcbiAgICAgIG5vZGUubmFtZSA9IG5hbWU7XG5cbiAgICAgIGxldCB5ID0gbW9zdFRvcFBvcyAtIDYwO1xuICAgICAgaWYgKG5hbWUgPT09IEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpIHtcbiAgICAgICAgeSAtPSA2MDtcbiAgICAgIH0gZWxzZSBpZiAobmFtZSA9PT0gSEVBRExJTkVfTk9ERV9OQU1FUy5TVUJIRUFEKSB7XG4gICAgICAgIHkgLT0gMzA7XG4gICAgICB9XG5cbiAgICAgIG5vZGUucmVsYXRpdmVUcmFuc2Zvcm0gPSBbXG4gICAgICAgIFsxLCAwLCBtb3N0TGVmdFBvc10sXG4gICAgICAgIFswLCAxLCB5XSxcbiAgICAgIF07XG4gICAgfVxuXG4gICAgLy8gRW5zdXJlIHRleHQgbm9kZSBpcyBsb2NrZWRcbiAgICBub2RlLmxvY2tlZCA9IHRydWU7XG5cbiAgICAvLyBMb2FkIGZvbnRcbiAgICBjb25zdCBmb250TmFtZSA9XG4gICAgICBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuZmFtaWx5IDogXCJSb2JvdG9cIjtcbiAgICBjb25zdCBmb250U3R5bGUgPVxuICAgICAgbm9kZS5mb250TmFtZSAhPT0gZmlnbWEubWl4ZWQgPyBub2RlLmZvbnROYW1lLnN0eWxlIDogXCJSZWd1bGFyXCI7XG4gICAgZmlnbWFcbiAgICAgIC5sb2FkRm9udEFzeW5jKHsgZmFtaWx5OiBmb250TmFtZSwgc3R5bGU6IGZvbnRTdHlsZSB9KVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBTZXQgdGV4dCBub2RlIGNvbnRlbnRcbiAgICAgICAgbm9kZS5jaGFyYWN0ZXJzID0gcHJvcHNbbmFtZV0gfHwgXCJcIjtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGxvYWQgZm9udFwiLCBlcnIpO1xuICAgICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKTogSUZyYW1lRGF0YSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKFxuICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIlxuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGNvbnN0IGZyYW1lc0RhdGEgPSByb290RnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIGhlYWRsaW5lOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gICAgc3ViaGVhZDogZ2V0Tm9kZVRleHQoY3VycmVudFBhZ2UsIEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpLFxuICAgIHNvdXJjZTogZ2V0Tm9kZVRleHQoY3VycmVudFBhZ2UsIEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpLFxuICB9O1xufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB7IHBvc3RNYW4gfSBmcm9tIFwiLi91dGlscy9tZXNzYWdlc1wiO1xuaW1wb3J0IHsgZ2V0Um9vdEZyYW1lcywgcmVuZGVyRnJhbWVzLCBzZXRIZWFkbGluZXNBbmRTb3VyY2UgfSBmcm9tIFwiLi9oZWxwZXJzXCI7XG5cbi8vIFJlZ2lzdGVyIG1lc3NlbmdlciBldmVudCBmdW5jdGlvbnNcbnBvc3RNYW4ucmVnaXN0ZXJXb3JrZXIoTVNHX0VWRU5UUy5HRVRfUk9PVF9GUkFNRVMsIGdldFJvb3RGcmFtZXMpO1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLlJFTkRFUiwgcmVuZGVyRnJhbWVzKTtcbnBvc3RNYW4ucmVnaXN0ZXJXb3JrZXIoTVNHX0VWRU5UUy5VUERBVEVfSEVBRExJTkVTLCBzZXRIZWFkbGluZXNBbmRTb3VyY2UpO1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcblxuLy8gUmVzaXplIFVJIHRvIG1heCB2aWV3cG9ydCBkaW1lbnNpb25zXG5jb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGZpZ21hLnZpZXdwb3J0LmJvdW5kcztcbmNvbnN0IHsgem9vbSB9ID0gZmlnbWEudmlld3BvcnQ7XG5jb25zdCBpbml0aWFsV2luZG93V2lkdGggPSBNYXRoLnJvdW5kKHdpZHRoICogem9vbSk7XG5jb25zdCBpbml0aWFsV2luZG93SGVpZ2h0ID0gTWF0aC5yb3VuZChoZWlnaHQgKiB6b29tKTtcbmZpZ21hLnVpLnJlc2l6ZShpbml0aWFsV2luZG93V2lkdGgsIGluaXRpYWxXaW5kb3dIZWlnaHQpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUdBLFFBQUksV0FBYSxPQUFPLGVBQWUsZUFDdEIsT0FBTyxnQkFBZ0IsZUFDdkIsT0FBTyxlQUFlO0FBRXZDLGtCQUFjLEtBQUs7QUFDakIsYUFBTyxPQUFPLFVBQVUsZUFBZSxLQUFLLEtBQUs7QUFBQTtBQUduRCxZQUFRLFNBQVMsU0FBVTtBQUN6QixVQUFJLFVBQVUsTUFBTSxVQUFVLE1BQU0sS0FBSyxXQUFXO0FBQ3BELGFBQU8sUUFBUTtBQUNiLFlBQUksU0FBUyxRQUFRO0FBQ3JCLFlBQUksQ0FBQztBQUFVO0FBQUE7QUFFZixZQUFJLE9BQU8sV0FBVztBQUNwQixnQkFBTSxJQUFJLFVBQVUsU0FBUztBQUFBO0FBRy9CLGlCQUFTLEtBQUs7QUFDWixjQUFJLEtBQUssUUFBUTtBQUNmLGdCQUFJLEtBQUssT0FBTztBQUFBO0FBQUE7QUFBQTtBQUt0QixhQUFPO0FBQUE7QUFLVCxZQUFRLFlBQVksU0FBVSxLQUFLO0FBQ2pDLFVBQUksSUFBSSxXQUFXO0FBQVEsZUFBTztBQUFBO0FBQ2xDLFVBQUksSUFBSTtBQUFZLGVBQU8sSUFBSSxTQUFTLEdBQUc7QUFBQTtBQUMzQyxVQUFJLFNBQVM7QUFDYixhQUFPO0FBQUE7QUFJVCxRQUFJLFVBQVU7QUFBQSxNQUNaLFVBQVUsU0FBVSxNQUFNLEtBQUssVUFBVSxLQUFLO0FBQzVDLFlBQUksSUFBSSxZQUFZLEtBQUs7QUFDdkIsZUFBSyxJQUFJLElBQUksU0FBUyxVQUFVLFdBQVcsTUFBTTtBQUNqRDtBQUFBO0FBR0YsaUJBQVMsSUFBSSxHQUFHLElBQUksS0FBSztBQUN2QixlQUFLLFlBQVksS0FBSyxJQUFJLFdBQVc7QUFBQTtBQUFBO0FB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QUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFHO0FBQUE7QUFHL0QsUUFBSSxPQUFPO0FBQUEsTUFDVDtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQzVEO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQTtBQUcxRCxRQUFJLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFLO0FBQUEsTUFDdEQ7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUNsRDtBQUFBLE1BQU07QUFBQSxNQUFPO0FBQUEsTUFBTztBQUFBLE1BQU87QUFBQSxNQUFHO0FBQUE7QUFHaEMsUUFBSSxPQUFPO0FBQUEsTUFDVDtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7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U0FBTztBQUNkLGdCQUFJLEtBQUcsSUFBSSxLQUFLLFNBQVMsS0FBRyxJQUFJLEtBQUcsSUFBSSxLQUFHO0FBQzFDLGdCQUFHO0FBQU8sbUJBQUcsR0FBRztBQUFLLG1CQUFHLEdBQUc7QUFBSyxtQkFBRyxHQUFHO0FBQUE7QUFDdEMsZ0JBQUcsU0FBUTtBQUFHLHVCQUFRLElBQUUsR0FBRyxJQUFFLE1BQU07QUFBUSxvQkFBSSxLQUFHLEtBQUcsR0FBRyxLQUFHLElBQUU7QUFBSSxtQkFBRyxNQUFNLEtBQUs7QUFBTSxtQkFBRyxLQUFHLEtBQUssS0FBSyxLQUFHO0FBQUssbUJBQUcsS0FBRyxLQUFLLEtBQUssS0FBRztBQUFLLG1CQUFHLEtBQUcsS0FBSztBQUMvSSxvQkFBRyxNQUFJLE1BQU0sS0FBSyxPQUFRLE1BQU0sS0FBSyxLQUFHLE1BQU8sTUFBTSxLQUFLLEtBQUcsTUFBTztBQUFJLHFCQUFHLEtBQUcsS0FBSztBQUFBO0FBQ3BGLGdCQUFHLFNBQU87QUFBSSx1QkFBUSxJQUFFLEdBQUcsSUFBRSxNQUFNO0FBQVEsb0JBQUksS0FBRyxLQUFHLEdBQUcsS0FBRyxJQUFFO0FBQUksbUJBQUcsTUFBTSxLQUFLO0FBQU0sbUJBQUcsS0FBRyxLQUFLLEtBQUssS0FBRztBQUFLLG1CQUFHLEtBQUcsS0FBSyxLQUFLLEtBQUc7QUFBSyxtQkFBRyxLQUFHLEtBQUs7QUFDL0ksb0JBQUcsTUFBSSxNQUFNLEdBQUcsTUFBSyxPQUFLLE1BQU0sR0FBRyxNQUFLLEtBQUcsTUFBSSxNQUFNLEdBQUcsTUFBSyxLQUFHLE1BQUk7QUFBSSxxQkFBRyxLQUFHLEtBQUs7QUFBQTtBQUFBLHFCQUU3RSxTQUFPO0FBQ2QsZ0JBQUksSUFBRSxJQUFJLEtBQUssU0FBUyxLQUFHLElBQUksS0FBSyxTQUFTLEtBQUcsS0FBRyxHQUFHLFNBQU87QUFFN0QsZ0JBQUcsU0FBTztBQUFHLHVCQUFRLElBQUUsR0FBRyxJQUFFLEdBQUc7QUFBUSxvQkFBSSxLQUFLLElBQUUsS0FBSyxLQUFLLElBQUU7QUFDN0QseUJBQVEsSUFBRSxHQUFHLElBQUUsR0FBRztBQUFPLHNCQUFJLEtBQUksS0FBRyxLQUFJLEdBQUcsSUFBSSxLQUFLLEtBQUksTUFBRyxPQUFNLElBQUksTUFBRSxNQUFJLEtBQU0sR0FBSSxLQUFHLElBQUU7QUFBSSxxQkFBRyxNQUFJLEVBQUU7QUFBTSxxQkFBRyxLQUFHLEtBQUcsRUFBRSxLQUFHO0FBQUsscUJBQUcsS0FBRyxLQUFHLEVBQUUsS0FBRztBQUFLLHFCQUFHLEtBQUcsS0FBSSxJQUFFLEtBQUksR0FBRyxLQUFHO0FBQUE7QUFBQTtBQUUxSyxnQkFBRyxTQUFPO0FBQUcsdUJBQVEsSUFBRSxHQUFHLElBQUUsR0FBRztBQUFRLG9CQUFJLEtBQUssSUFBRSxLQUFLLEtBQUssSUFBRTtBQUM3RCx5QkFBUSxJQUFFLEdBQUcsSUFBRSxHQUFHO0FBQU8sc0JBQUksS0FBSSxLQUFHLEtBQUksR0FBRyxJQUFJLEtBQUssS0FBSSxNQUFHLE9BQU0sSUFBSSxNQUFFLE1BQUksS0FBTSxHQUFJLEtBQUcsSUFBRTtBQUFJLHFCQUFHLE1BQUksRUFBRTtBQUFNLHFCQUFHLEtBQUcsS0FBRyxFQUFFLEtBQUc7QUFBSyxxQkFBRyxLQUFHLEtBQUcsRUFBRSxLQUFHO0FBQUsscUJBQUcsS0FBRyxLQUFJLElBQUUsS0FBSSxHQUFHLEtBQUc7QUFBQTtBQUFBO0FBRTFLLGdCQUFHLFNBQU87QUFBRyx1QkFBUSxJQUFFLEdBQUcsSUFBRSxHQUFHO0FBQVEsb0JBQUksS0FBSyxJQUFFLEtBQUssS0FBSyxJQUFFO0FBQzdELHlCQUFRLElBQUUsR0FBRyxJQUFFLEdBQUc7QUFBTyxzQkFBSSxLQUFJLEtBQUcsS0FBSSxHQUFHLElBQUksS0FBSyxLQUFJLE1BQUcsT0FBTSxJQUFJLE1BQUUsTUFBSSxLQUFLLElBQUssS0FBRyxJQUFFO0FBQUkscUJBQUcsTUFBSSxFQUFFO0FBQU0scUJBQUcsS0FBRyxLQUFHLEVBQUUsS0FBRztBQUFLLHFCQUFHLEtBQUcsS0FBRyxFQUFFLEtBQUc7QUFBSyxxQkFBRyxLQUFHLEtBQUksSUFBRSxL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
