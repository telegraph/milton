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
      const [fill] = fills === figma.mixed ? [] : fills;
      let colour = {r: 0, g: 0, b: 0, a: 1};
      if (fill.type === "SOLID") {
        colour = __assign(__assign({}, colour), {a: fill.opacity || 1});
      }
      const fontSize = fontSizeData !== figma.mixed ? fontSizeData : 16;
      const fontFamily = fontName !== figma.mixed ? fontName.family : "Arial";
      const fontStyle = fontName !== figma.mixed ? fontName.style : "Regular";
      return {
        x,
        y,
        width: width2,
        height: height2,
        fontSize,
        fontFamily,
        fontStyle,
        colour,
        characters,
        lineHeight,
        letterSpacing,
        textAlignHorizontal,
        textAlignVertical
      };
    });
  }
  function getNodeText(rootNode, nodeName) {
    const foundNode = rootNode.findChild((node) => node.name === nodeName);
    return foundNode && foundNode.type === "TEXT" ? foundNode.characters : void 0;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibm9kZV9tb2R1bGVzL3Bha28vbGliL3V0aWxzL2NvbW1vbi5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvemxpYi90cmVlcy5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvemxpYi9hZGxlcjMyLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2NyYzMyLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL21lc3NhZ2VzLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2RlZmxhdGUuanMiLCAibm9kZV9tb2R1bGVzL3Bha28vbGliL3V0aWxzL3N0cmluZ3MuanMiLCAibm9kZV9tb2R1bGVzL3Bha28vbGliL3psaWIvenN0cmVhbS5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvZGVmbGF0ZS5qcyIsICJub2RlX21vZHVsZXMvcGFrby9saWIvemxpYi9pbmZmYXN0LmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2luZnRyZWVzLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2luZmxhdGUuanMiLCAibm9kZV9tb2R1bGVzL3Bha28vbGliL3psaWIvY29uc3RhbnRzLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi96bGliL2d6aGVhZGVyLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2xpYi9pbmZsYXRlLmpzIiwgIm5vZGVfbW9kdWxlcy9wYWtvL2luZGV4LmpzIiwgIm5vZGVfbW9kdWxlcy91cG5nLWpzL1VQTkcuanMiLCAibm9kZV9tb2R1bGVzL3BpY2EvZGlzdC9waWNhLmpzIiwgInNyYy9jb25zdGFudHMudHMiLCAic3JjL3V0aWxzL21lc3NhZ2VzLnRzIiwgInNyYy9oZWxwZXJzLnRzIiwgInNyYy9pbmRleC50c3giXSwKICAic291cmNlc0NvbnRlbnQiOiBbIid1c2Ugc3RyaWN0JztcblxuXG52YXIgVFlQRURfT0sgPSAgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykgJiZcbiAgICAgICAgICAgICAgICAodHlwZW9mIFVpbnQxNkFycmF5ICE9PSAndW5kZWZpbmVkJykgJiZcbiAgICAgICAgICAgICAgICAodHlwZW9mIEludDMyQXJyYXkgIT09ICd1bmRlZmluZWQnKTtcblxuZnVuY3Rpb24gX2hhcyhvYmosIGtleSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbn1cblxuZXhwb3J0cy5hc3NpZ24gPSBmdW5jdGlvbiAob2JqIC8qZnJvbTEsIGZyb20yLCBmcm9tMywgLi4uKi8pIHtcbiAgdmFyIHNvdXJjZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICB3aGlsZSAoc291cmNlcy5sZW5ndGgpIHtcbiAgICB2YXIgc291cmNlID0gc291cmNlcy5zaGlmdCgpO1xuICAgIGlmICghc291cmNlKSB7IGNvbnRpbnVlOyB9XG5cbiAgICBpZiAodHlwZW9mIHNvdXJjZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3Ioc291cmNlICsgJ211c3QgYmUgbm9uLW9iamVjdCcpO1xuICAgIH1cblxuICAgIGZvciAodmFyIHAgaW4gc291cmNlKSB7XG4gICAgICBpZiAoX2hhcyhzb3VyY2UsIHApKSB7XG4gICAgICAgIG9ialtwXSA9IHNvdXJjZVtwXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxuXG4vLyByZWR1Y2UgYnVmZmVyIHNpemUsIGF2b2lkaW5nIG1lbSBjb3B5XG5leHBvcnRzLnNocmlua0J1ZiA9IGZ1bmN0aW9uIChidWYsIHNpemUpIHtcbiAgaWYgKGJ1Zi5sZW5ndGggPT09IHNpemUpIHsgcmV0dXJuIGJ1ZjsgfVxuICBpZiAoYnVmLnN1YmFycmF5KSB7IHJldHVybiBidWYuc3ViYXJyYXkoMCwgc2l6ZSk7IH1cbiAgYnVmLmxlbmd0aCA9IHNpemU7XG4gIHJldHVybiBidWY7XG59O1xuXG5cbnZhciBmblR5cGVkID0ge1xuICBhcnJheVNldDogZnVuY3Rpb24gKGRlc3QsIHNyYywgc3JjX29mZnMsIGxlbiwgZGVzdF9vZmZzKSB7XG4gICAgaWYgKHNyYy5zdWJhcnJheSAmJiBkZXN0LnN1YmFycmF5KSB7XG4gICAgICBkZXN0LnNldChzcmMuc3ViYXJyYXkoc3JjX29mZnMsIHNyY19vZmZzICsgbGVuKSwgZGVzdF9vZmZzKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gRmFsbGJhY2sgdG8gb3JkaW5hcnkgYXJyYXlcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBkZXN0W2Rlc3Rfb2ZmcyArIGldID0gc3JjW3NyY19vZmZzICsgaV07XG4gICAgfVxuICB9LFxuICAvLyBKb2luIGFycmF5IG9mIGNodW5rcyB0byBzaW5nbGUgYXJyYXkuXG4gIGZsYXR0ZW5DaHVua3M6IGZ1bmN0aW9uIChjaHVua3MpIHtcbiAgICB2YXIgaSwgbCwgbGVuLCBwb3MsIGNodW5rLCByZXN1bHQ7XG5cbiAgICAvLyBjYWxjdWxhdGUgZGF0YSBsZW5ndGhcbiAgICBsZW4gPSAwO1xuICAgIGZvciAoaSA9IDAsIGwgPSBjaHVua3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBsZW4gKz0gY2h1bmtzW2ldLmxlbmd0aDtcbiAgICB9XG5cbiAgICAvLyBqb2luIGNodW5rc1xuICAgIHJlc3VsdCA9IG5ldyBVaW50OEFycmF5KGxlbik7XG4gICAgcG9zID0gMDtcbiAgICBmb3IgKGkgPSAwLCBsID0gY2h1bmtzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgY2h1bmsgPSBjaHVua3NbaV07XG4gICAgICByZXN1bHQuc2V0KGNodW5rLCBwb3MpO1xuICAgICAgcG9zICs9IGNodW5rLmxlbmd0aDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59O1xuXG52YXIgZm5VbnR5cGVkID0ge1xuICBhcnJheVNldDogZnVuY3Rpb24gKGRlc3QsIHNyYywgc3JjX29mZnMsIGxlbiwgZGVzdF9vZmZzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgZGVzdFtkZXN0X29mZnMgKyBpXSA9IHNyY1tzcmNfb2ZmcyArIGldO1xuICAgIH1cbiAgfSxcbiAgLy8gSm9pbiBhcnJheSBvZiBjaHVua3MgdG8gc2luZ2xlIGFycmF5LlxuICBmbGF0dGVuQ2h1bmtzOiBmdW5jdGlvbiAoY2h1bmtzKSB7XG4gICAgcmV0dXJuIFtdLmNvbmNhdC5hcHBseShbXSwgY2h1bmtzKTtcbiAgfVxufTtcblxuXG4vLyBFbmFibGUvRGlzYWJsZSB0eXBlZCBhcnJheXMgdXNlLCBmb3IgdGVzdGluZ1xuLy9cbmV4cG9ydHMuc2V0VHlwZWQgPSBmdW5jdGlvbiAob24pIHtcbiAgaWYgKG9uKSB7XG4gICAgZXhwb3J0cy5CdWY4ICA9IFVpbnQ4QXJyYXk7XG4gICAgZXhwb3J0cy5CdWYxNiA9IFVpbnQxNkFycmF5O1xuICAgIGV4cG9ydHMuQnVmMzIgPSBJbnQzMkFycmF5O1xuICAgIGV4cG9ydHMuYXNzaWduKGV4cG9ydHMsIGZuVHlwZWQpO1xuICB9IGVsc2Uge1xuICAgIGV4cG9ydHMuQnVmOCAgPSBBcnJheTtcbiAgICBleHBvcnRzLkJ1ZjE2ID0gQXJyYXk7XG4gICAgZXhwb3J0cy5CdWYzMiA9IEFycmF5O1xuICAgIGV4cG9ydHMuYXNzaWduKGV4cG9ydHMsIGZuVW50eXBlZCk7XG4gIH1cbn07XG5cbmV4cG9ydHMuc2V0VHlwZWQoVFlQRURfT0spO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLy8gKEMpIDE5OTUtMjAxMyBKZWFuLWxvdXAgR2FpbGx5IGFuZCBNYXJrIEFkbGVyXG4vLyAoQykgMjAxNC0yMDE3IFZpdGFseSBQdXpyaW4gYW5kIEFuZHJleSBUdXBpdHNpblxuLy9cbi8vIFRoaXMgc29mdHdhcmUgaXMgcHJvdmlkZWQgJ2FzLWlzJywgd2l0aG91dCBhbnkgZXhwcmVzcyBvciBpbXBsaWVkXG4vLyB3YXJyYW50eS4gSW4gbm8gZXZlbnQgd2lsbCB0aGUgYXV0aG9ycyBiZSBoZWxkIGxpYWJsZSBmb3IgYW55IGRhbWFnZXNcbi8vIGFyaXNpbmcgZnJvbSB0aGUgdXNlIG9mIHRoaXMgc29mdHdhcmUuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBncmFudGVkIHRvIGFueW9uZSB0byB1c2UgdGhpcyBzb2Z0d2FyZSBmb3IgYW55IHB1cnBvc2UsXG4vLyBpbmNsdWRpbmcgY29tbWVyY2lhbCBhcHBsaWNhdGlvbnMsIGFuZCB0byBhbHRlciBpdCBhbmQgcmVkaXN0cmlidXRlIGl0XG4vLyBmcmVlbHksIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyByZXN0cmljdGlvbnM6XG4vL1xuLy8gMS4gVGhlIG9yaWdpbiBvZiB0aGlzIHNvZnR3YXJlIG11c3Qgbm90IGJlIG1pc3JlcHJlc2VudGVkOyB5b3UgbXVzdCBub3Rcbi8vICAgY2xhaW0gdGhhdCB5b3Ugd3JvdGUgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLiBJZiB5b3UgdXNlIHRoaXMgc29mdHdhcmVcbi8vICAgaW4gYSBwcm9kdWN0LCBhbiBhY2tub3dsZWRnbWVudCBpbiB0aGUgcHJvZHVjdCBkb2N1bWVudGF0aW9uIHdvdWxkIGJlXG4vLyAgIGFwcHJlY2lhdGVkIGJ1dCBpcyBub3QgcmVxdWlyZWQuXG4vLyAyLiBBbHRlcmVkIHNvdXJjZSB2ZXJzaW9ucyBtdXN0IGJlIHBsYWlubHkgbWFya2VkIGFzIHN1Y2gsIGFuZCBtdXN0IG5vdCBiZVxuLy8gICBtaXNyZXByZXNlbnRlZCBhcyBiZWluZyB0aGUgb3JpZ2luYWwgc29mdHdhcmUuXG4vLyAzLiBUaGlzIG5vdGljZSBtYXkgbm90IGJlIHJlbW92ZWQgb3IgYWx0ZXJlZCBmcm9tIGFueSBzb3VyY2UgZGlzdHJpYnV0aW9uLlxuXG4vKiBlc2xpbnQtZGlzYWJsZSBzcGFjZS11bmFyeS1vcHMgKi9cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvY29tbW9uJyk7XG5cbi8qIFB1YmxpYyBjb25zdGFudHMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG5cbi8vdmFyIFpfRklMVEVSRUQgICAgICAgICAgPSAxO1xuLy92YXIgWl9IVUZGTUFOX09OTFkgICAgICA9IDI7XG4vL3ZhciBaX1JMRSAgICAgICAgICAgICAgID0gMztcbnZhciBaX0ZJWEVEICAgICAgICAgICAgICAgPSA0O1xuLy92YXIgWl9ERUZBVUxUX1NUUkFURUdZICA9IDA7XG5cbi8qIFBvc3NpYmxlIHZhbHVlcyBvZiB0aGUgZGF0YV90eXBlIGZpZWxkICh0aG91Z2ggc2VlIGluZmxhdGUoKSkgKi9cbnZhciBaX0JJTkFSWSAgICAgICAgICAgICAgPSAwO1xudmFyIFpfVEVYVCAgICAgICAgICAgICAgICA9IDE7XG4vL3ZhciBaX0FTQ0lJICAgICAgICAgICAgID0gMTsgLy8gPSBaX1RFWFRcbnZhciBaX1VOS05PV04gICAgICAgICAgICAgPSAyO1xuXG4vKj09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG5cbmZ1bmN0aW9uIHplcm8oYnVmKSB7IHZhciBsZW4gPSBidWYubGVuZ3RoOyB3aGlsZSAoLS1sZW4gPj0gMCkgeyBidWZbbGVuXSA9IDA7IH0gfVxuXG4vLyBGcm9tIHp1dGlsLmhcblxudmFyIFNUT1JFRF9CTE9DSyA9IDA7XG52YXIgU1RBVElDX1RSRUVTID0gMTtcbnZhciBEWU5fVFJFRVMgICAgPSAyO1xuLyogVGhlIHRocmVlIGtpbmRzIG9mIGJsb2NrIHR5cGUgKi9cblxudmFyIE1JTl9NQVRDSCAgICA9IDM7XG52YXIgTUFYX01BVENIICAgID0gMjU4O1xuLyogVGhlIG1pbmltdW0gYW5kIG1heGltdW0gbWF0Y2ggbGVuZ3RocyAqL1xuXG4vLyBGcm9tIGRlZmxhdGUuaFxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBJbnRlcm5hbCBjb21wcmVzc2lvbiBzdGF0ZS5cbiAqL1xuXG52YXIgTEVOR1RIX0NPREVTICA9IDI5O1xuLyogbnVtYmVyIG9mIGxlbmd0aCBjb2Rlcywgbm90IGNvdW50aW5nIHRoZSBzcGVjaWFsIEVORF9CTE9DSyBjb2RlICovXG5cbnZhciBMSVRFUkFMUyAgICAgID0gMjU2O1xuLyogbnVtYmVyIG9mIGxpdGVyYWwgYnl0ZXMgMC4uMjU1ICovXG5cbnZhciBMX0NPREVTICAgICAgID0gTElURVJBTFMgKyAxICsgTEVOR1RIX0NPREVTO1xuLyogbnVtYmVyIG9mIExpdGVyYWwgb3IgTGVuZ3RoIGNvZGVzLCBpbmNsdWRpbmcgdGhlIEVORF9CTE9DSyBjb2RlICovXG5cbnZhciBEX0NPREVTICAgICAgID0gMzA7XG4vKiBudW1iZXIgb2YgZGlzdGFuY2UgY29kZXMgKi9cblxudmFyIEJMX0NPREVTICAgICAgPSAxOTtcbi8qIG51bWJlciBvZiBjb2RlcyB1c2VkIHRvIHRyYW5zZmVyIHRoZSBiaXQgbGVuZ3RocyAqL1xuXG52YXIgSEVBUF9TSVpFICAgICA9IDIgKiBMX0NPREVTICsgMTtcbi8qIG1heGltdW0gaGVhcCBzaXplICovXG5cbnZhciBNQVhfQklUUyAgICAgID0gMTU7XG4vKiBBbGwgY29kZXMgbXVzdCBub3QgZXhjZWVkIE1BWF9CSVRTIGJpdHMgKi9cblxudmFyIEJ1Zl9zaXplICAgICAgPSAxNjtcbi8qIHNpemUgb2YgYml0IGJ1ZmZlciBpbiBiaV9idWYgKi9cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvbnN0YW50c1xuICovXG5cbnZhciBNQVhfQkxfQklUUyA9IDc7XG4vKiBCaXQgbGVuZ3RoIGNvZGVzIG11c3Qgbm90IGV4Y2VlZCBNQVhfQkxfQklUUyBiaXRzICovXG5cbnZhciBFTkRfQkxPQ0sgICA9IDI1Njtcbi8qIGVuZCBvZiBibG9jayBsaXRlcmFsIGNvZGUgKi9cblxudmFyIFJFUF8zXzYgICAgID0gMTY7XG4vKiByZXBlYXQgcHJldmlvdXMgYml0IGxlbmd0aCAzLTYgdGltZXMgKDIgYml0cyBvZiByZXBlYXQgY291bnQpICovXG5cbnZhciBSRVBaXzNfMTAgICA9IDE3O1xuLyogcmVwZWF0IGEgemVybyBsZW5ndGggMy0xMCB0aW1lcyAgKDMgYml0cyBvZiByZXBlYXQgY291bnQpICovXG5cbnZhciBSRVBaXzExXzEzOCA9IDE4O1xuLyogcmVwZWF0IGEgemVybyBsZW5ndGggMTEtMTM4IHRpbWVzICAoNyBiaXRzIG9mIHJlcGVhdCBjb3VudCkgKi9cblxuLyogZXNsaW50LWRpc2FibGUgY29tbWEtc3BhY2luZyxhcnJheS1icmFja2V0LXNwYWNpbmcgKi9cbnZhciBleHRyYV9sYml0cyA9ICAgLyogZXh0cmEgYml0cyBmb3IgZWFjaCBsZW5ndGggY29kZSAqL1xuICBbMCwwLDAsMCwwLDAsMCwwLDEsMSwxLDEsMiwyLDIsMiwzLDMsMywzLDQsNCw0LDQsNSw1LDUsNSwwXTtcblxudmFyIGV4dHJhX2RiaXRzID0gICAvKiBleHRyYSBiaXRzIGZvciBlYWNoIGRpc3RhbmNlIGNvZGUgKi9cbiAgWzAsMCwwLDAsMSwxLDIsMiwzLDMsNCw0LDUsNSw2LDYsNyw3LDgsOCw5LDksMTAsMTAsMTEsMTEsMTIsMTIsMTMsMTNdO1xuXG52YXIgZXh0cmFfYmxiaXRzID0gIC8qIGV4dHJhIGJpdHMgZm9yIGVhY2ggYml0IGxlbmd0aCBjb2RlICovXG4gIFswLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCwwLDIsMyw3XTtcblxudmFyIGJsX29yZGVyID1cbiAgWzE2LDE3LDE4LDAsOCw3LDksNiwxMCw1LDExLDQsMTIsMywxMywyLDE0LDEsMTVdO1xuLyogZXNsaW50LWVuYWJsZSBjb21tYS1zcGFjaW5nLGFycmF5LWJyYWNrZXQtc3BhY2luZyAqL1xuXG4vKiBUaGUgbGVuZ3RocyBvZiB0aGUgYml0IGxlbmd0aCBjb2RlcyBhcmUgc2VudCBpbiBvcmRlciBvZiBkZWNyZWFzaW5nXG4gKiBwcm9iYWJpbGl0eSwgdG8gYXZvaWQgdHJhbnNtaXR0aW5nIHRoZSBsZW5ndGhzIGZvciB1bnVzZWQgYml0IGxlbmd0aCBjb2Rlcy5cbiAqL1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIExvY2FsIGRhdGEuIFRoZXNlIGFyZSBpbml0aWFsaXplZCBvbmx5IG9uY2UuXG4gKi9cblxuLy8gV2UgcHJlLWZpbGwgYXJyYXlzIHdpdGggMCB0byBhdm9pZCB1bmluaXRpYWxpemVkIGdhcHNcblxudmFyIERJU1RfQ09ERV9MRU4gPSA1MTI7IC8qIHNlZSBkZWZpbml0aW9uIG9mIGFycmF5IGRpc3RfY29kZSBiZWxvdyAqL1xuXG4vLyAhISEhIFVzZSBmbGF0IGFycmF5IGluc3RlYWQgb2Ygc3RydWN0dXJlLCBGcmVxID0gaSoyLCBMZW4gPSBpKjIrMVxudmFyIHN0YXRpY19sdHJlZSAgPSBuZXcgQXJyYXkoKExfQ09ERVMgKyAyKSAqIDIpO1xuemVybyhzdGF0aWNfbHRyZWUpO1xuLyogVGhlIHN0YXRpYyBsaXRlcmFsIHRyZWUuIFNpbmNlIHRoZSBiaXQgbGVuZ3RocyBhcmUgaW1wb3NlZCwgdGhlcmUgaXMgbm9cbiAqIG5lZWQgZm9yIHRoZSBMX0NPREVTIGV4dHJhIGNvZGVzIHVzZWQgZHVyaW5nIGhlYXAgY29uc3RydWN0aW9uLiBIb3dldmVyXG4gKiBUaGUgY29kZXMgMjg2IGFuZCAyODcgYXJlIG5lZWRlZCB0byBidWlsZCBhIGNhbm9uaWNhbCB0cmVlIChzZWUgX3RyX2luaXRcbiAqIGJlbG93KS5cbiAqL1xuXG52YXIgc3RhdGljX2R0cmVlICA9IG5ldyBBcnJheShEX0NPREVTICogMik7XG56ZXJvKHN0YXRpY19kdHJlZSk7XG4vKiBUaGUgc3RhdGljIGRpc3RhbmNlIHRyZWUuIChBY3R1YWxseSBhIHRyaXZpYWwgdHJlZSBzaW5jZSBhbGwgY29kZXMgdXNlXG4gKiA1IGJpdHMuKVxuICovXG5cbnZhciBfZGlzdF9jb2RlICAgID0gbmV3IEFycmF5KERJU1RfQ09ERV9MRU4pO1xuemVybyhfZGlzdF9jb2RlKTtcbi8qIERpc3RhbmNlIGNvZGVzLiBUaGUgZmlyc3QgMjU2IHZhbHVlcyBjb3JyZXNwb25kIHRvIHRoZSBkaXN0YW5jZXNcbiAqIDMgLi4gMjU4LCB0aGUgbGFzdCAyNTYgdmFsdWVzIGNvcnJlc3BvbmQgdG8gdGhlIHRvcCA4IGJpdHMgb2ZcbiAqIHRoZSAxNSBiaXQgZGlzdGFuY2VzLlxuICovXG5cbnZhciBfbGVuZ3RoX2NvZGUgID0gbmV3IEFycmF5KE1BWF9NQVRDSCAtIE1JTl9NQVRDSCArIDEpO1xuemVybyhfbGVuZ3RoX2NvZGUpO1xuLyogbGVuZ3RoIGNvZGUgZm9yIGVhY2ggbm9ybWFsaXplZCBtYXRjaCBsZW5ndGggKDAgPT0gTUlOX01BVENIKSAqL1xuXG52YXIgYmFzZV9sZW5ndGggICA9IG5ldyBBcnJheShMRU5HVEhfQ09ERVMpO1xuemVybyhiYXNlX2xlbmd0aCk7XG4vKiBGaXJzdCBub3JtYWxpemVkIGxlbmd0aCBmb3IgZWFjaCBjb2RlICgwID0gTUlOX01BVENIKSAqL1xuXG52YXIgYmFzZV9kaXN0ICAgICA9IG5ldyBBcnJheShEX0NPREVTKTtcbnplcm8oYmFzZV9kaXN0KTtcbi8qIEZpcnN0IG5vcm1hbGl6ZWQgZGlzdGFuY2UgZm9yIGVhY2ggY29kZSAoMCA9IGRpc3RhbmNlIG9mIDEpICovXG5cblxuZnVuY3Rpb24gU3RhdGljVHJlZURlc2Moc3RhdGljX3RyZWUsIGV4dHJhX2JpdHMsIGV4dHJhX2Jhc2UsIGVsZW1zLCBtYXhfbGVuZ3RoKSB7XG5cbiAgdGhpcy5zdGF0aWNfdHJlZSAgPSBzdGF0aWNfdHJlZTsgIC8qIHN0YXRpYyB0cmVlIG9yIE5VTEwgKi9cbiAgdGhpcy5leHRyYV9iaXRzICAgPSBleHRyYV9iaXRzOyAgIC8qIGV4dHJhIGJpdHMgZm9yIGVhY2ggY29kZSBvciBOVUxMICovXG4gIHRoaXMuZXh0cmFfYmFzZSAgID0gZXh0cmFfYmFzZTsgICAvKiBiYXNlIGluZGV4IGZvciBleHRyYV9iaXRzICovXG4gIHRoaXMuZWxlbXMgICAgICAgID0gZWxlbXM7ICAgICAgICAvKiBtYXggbnVtYmVyIG9mIGVsZW1lbnRzIGluIHRoZSB0cmVlICovXG4gIHRoaXMubWF4X2xlbmd0aCAgID0gbWF4X2xlbmd0aDsgICAvKiBtYXggYml0IGxlbmd0aCBmb3IgdGhlIGNvZGVzICovXG5cbiAgLy8gc2hvdyBpZiBgc3RhdGljX3RyZWVgIGhhcyBkYXRhIG9yIGR1bW15IC0gbmVlZGVkIGZvciBtb25vbW9ycGhpYyBvYmplY3RzXG4gIHRoaXMuaGFzX3N0cmVlICAgID0gc3RhdGljX3RyZWUgJiYgc3RhdGljX3RyZWUubGVuZ3RoO1xufVxuXG5cbnZhciBzdGF0aWNfbF9kZXNjO1xudmFyIHN0YXRpY19kX2Rlc2M7XG52YXIgc3RhdGljX2JsX2Rlc2M7XG5cblxuZnVuY3Rpb24gVHJlZURlc2MoZHluX3RyZWUsIHN0YXRfZGVzYykge1xuICB0aGlzLmR5bl90cmVlID0gZHluX3RyZWU7ICAgICAvKiB0aGUgZHluYW1pYyB0cmVlICovXG4gIHRoaXMubWF4X2NvZGUgPSAwOyAgICAgICAgICAgIC8qIGxhcmdlc3QgY29kZSB3aXRoIG5vbiB6ZXJvIGZyZXF1ZW5jeSAqL1xuICB0aGlzLnN0YXRfZGVzYyA9IHN0YXRfZGVzYzsgICAvKiB0aGUgY29ycmVzcG9uZGluZyBzdGF0aWMgdHJlZSAqL1xufVxuXG5cblxuZnVuY3Rpb24gZF9jb2RlKGRpc3QpIHtcbiAgcmV0dXJuIGRpc3QgPCAyNTYgPyBfZGlzdF9jb2RlW2Rpc3RdIDogX2Rpc3RfY29kZVsyNTYgKyAoZGlzdCA+Pj4gNyldO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogT3V0cHV0IGEgc2hvcnQgTFNCIGZpcnN0IG9uIHRoZSBzdHJlYW0uXG4gKiBJTiBhc3NlcnRpb246IHRoZXJlIGlzIGVub3VnaCByb29tIGluIHBlbmRpbmdCdWYuXG4gKi9cbmZ1bmN0aW9uIHB1dF9zaG9ydChzLCB3KSB7XG4vLyAgICBwdXRfYnl0ZShzLCAodWNoKSgodykgJiAweGZmKSk7XG4vLyAgICBwdXRfYnl0ZShzLCAodWNoKSgodXNoKSh3KSA+PiA4KSk7XG4gIHMucGVuZGluZ19idWZbcy5wZW5kaW5nKytdID0gKHcpICYgMHhmZjtcbiAgcy5wZW5kaW5nX2J1ZltzLnBlbmRpbmcrK10gPSAodyA+Pj4gOCkgJiAweGZmO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogU2VuZCBhIHZhbHVlIG9uIGEgZ2l2ZW4gbnVtYmVyIG9mIGJpdHMuXG4gKiBJTiBhc3NlcnRpb246IGxlbmd0aCA8PSAxNiBhbmQgdmFsdWUgZml0cyBpbiBsZW5ndGggYml0cy5cbiAqL1xuZnVuY3Rpb24gc2VuZF9iaXRzKHMsIHZhbHVlLCBsZW5ndGgpIHtcbiAgaWYgKHMuYmlfdmFsaWQgPiAoQnVmX3NpemUgLSBsZW5ndGgpKSB7XG4gICAgcy5iaV9idWYgfD0gKHZhbHVlIDw8IHMuYmlfdmFsaWQpICYgMHhmZmZmO1xuICAgIHB1dF9zaG9ydChzLCBzLmJpX2J1Zik7XG4gICAgcy5iaV9idWYgPSB2YWx1ZSA+PiAoQnVmX3NpemUgLSBzLmJpX3ZhbGlkKTtcbiAgICBzLmJpX3ZhbGlkICs9IGxlbmd0aCAtIEJ1Zl9zaXplO1xuICB9IGVsc2Uge1xuICAgIHMuYmlfYnVmIHw9ICh2YWx1ZSA8PCBzLmJpX3ZhbGlkKSAmIDB4ZmZmZjtcbiAgICBzLmJpX3ZhbGlkICs9IGxlbmd0aDtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHNlbmRfY29kZShzLCBjLCB0cmVlKSB7XG4gIHNlbmRfYml0cyhzLCB0cmVlW2MgKiAyXS8qLkNvZGUqLywgdHJlZVtjICogMiArIDFdLyouTGVuKi8pO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogUmV2ZXJzZSB0aGUgZmlyc3QgbGVuIGJpdHMgb2YgYSBjb2RlLCB1c2luZyBzdHJhaWdodGZvcndhcmQgY29kZSAoYSBmYXN0ZXJcbiAqIG1ldGhvZCB3b3VsZCB1c2UgYSB0YWJsZSlcbiAqIElOIGFzc2VydGlvbjogMSA8PSBsZW4gPD0gMTVcbiAqL1xuZnVuY3Rpb24gYmlfcmV2ZXJzZShjb2RlLCBsZW4pIHtcbiAgdmFyIHJlcyA9IDA7XG4gIGRvIHtcbiAgICByZXMgfD0gY29kZSAmIDE7XG4gICAgY29kZSA+Pj49IDE7XG4gICAgcmVzIDw8PSAxO1xuICB9IHdoaWxlICgtLWxlbiA+IDApO1xuICByZXR1cm4gcmVzID4+PiAxO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogRmx1c2ggdGhlIGJpdCBidWZmZXIsIGtlZXBpbmcgYXQgbW9zdCA3IGJpdHMgaW4gaXQuXG4gKi9cbmZ1bmN0aW9uIGJpX2ZsdXNoKHMpIHtcbiAgaWYgKHMuYmlfdmFsaWQgPT09IDE2KSB7XG4gICAgcHV0X3Nob3J0KHMsIHMuYmlfYnVmKTtcbiAgICBzLmJpX2J1ZiA9IDA7XG4gICAgcy5iaV92YWxpZCA9IDA7XG5cbiAgfSBlbHNlIGlmIChzLmJpX3ZhbGlkID49IDgpIHtcbiAgICBzLnBlbmRpbmdfYnVmW3MucGVuZGluZysrXSA9IHMuYmlfYnVmICYgMHhmZjtcbiAgICBzLmJpX2J1ZiA+Pj0gODtcbiAgICBzLmJpX3ZhbGlkIC09IDg7XG4gIH1cbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvbXB1dGUgdGhlIG9wdGltYWwgYml0IGxlbmd0aHMgZm9yIGEgdHJlZSBhbmQgdXBkYXRlIHRoZSB0b3RhbCBiaXQgbGVuZ3RoXG4gKiBmb3IgdGhlIGN1cnJlbnQgYmxvY2suXG4gKiBJTiBhc3NlcnRpb246IHRoZSBmaWVsZHMgZnJlcSBhbmQgZGFkIGFyZSBzZXQsIGhlYXBbaGVhcF9tYXhdIGFuZFxuICogICAgYWJvdmUgYXJlIHRoZSB0cmVlIG5vZGVzIHNvcnRlZCBieSBpbmNyZWFzaW5nIGZyZXF1ZW5jeS5cbiAqIE9VVCBhc3NlcnRpb25zOiB0aGUgZmllbGQgbGVuIGlzIHNldCB0byB0aGUgb3B0aW1hbCBiaXQgbGVuZ3RoLCB0aGVcbiAqICAgICBhcnJheSBibF9jb3VudCBjb250YWlucyB0aGUgZnJlcXVlbmNpZXMgZm9yIGVhY2ggYml0IGxlbmd0aC5cbiAqICAgICBUaGUgbGVuZ3RoIG9wdF9sZW4gaXMgdXBkYXRlZDsgc3RhdGljX2xlbiBpcyBhbHNvIHVwZGF0ZWQgaWYgc3RyZWUgaXNcbiAqICAgICBub3QgbnVsbC5cbiAqL1xuZnVuY3Rpb24gZ2VuX2JpdGxlbihzLCBkZXNjKVxuLy8gICAgZGVmbGF0ZV9zdGF0ZSAqcztcbi8vICAgIHRyZWVfZGVzYyAqZGVzYzsgICAgLyogdGhlIHRyZWUgZGVzY3JpcHRvciAqL1xue1xuICB2YXIgdHJlZSAgICAgICAgICAgID0gZGVzYy5keW5fdHJlZTtcbiAgdmFyIG1heF9jb2RlICAgICAgICA9IGRlc2MubWF4X2NvZGU7XG4gIHZhciBzdHJlZSAgICAgICAgICAgPSBkZXNjLnN0YXRfZGVzYy5zdGF0aWNfdHJlZTtcbiAgdmFyIGhhc19zdHJlZSAgICAgICA9IGRlc2Muc3RhdF9kZXNjLmhhc19zdHJlZTtcbiAgdmFyIGV4dHJhICAgICAgICAgICA9IGRlc2Muc3RhdF9kZXNjLmV4dHJhX2JpdHM7XG4gIHZhciBiYXNlICAgICAgICAgICAgPSBkZXNjLnN0YXRfZGVzYy5leHRyYV9iYXNlO1xuICB2YXIgbWF4X2xlbmd0aCAgICAgID0gZGVzYy5zdGF0X2Rlc2MubWF4X2xlbmd0aDtcbiAgdmFyIGg7ICAgICAgICAgICAgICAvKiBoZWFwIGluZGV4ICovXG4gIHZhciBuLCBtOyAgICAgICAgICAgLyogaXRlcmF0ZSBvdmVyIHRoZSB0cmVlIGVsZW1lbnRzICovXG4gIHZhciBiaXRzOyAgICAgICAgICAgLyogYml0IGxlbmd0aCAqL1xuICB2YXIgeGJpdHM7ICAgICAgICAgIC8qIGV4dHJhIGJpdHMgKi9cbiAgdmFyIGY7ICAgICAgICAgICAgICAvKiBmcmVxdWVuY3kgKi9cbiAgdmFyIG92ZXJmbG93ID0gMDsgICAvKiBudW1iZXIgb2YgZWxlbWVudHMgd2l0aCBiaXQgbGVuZ3RoIHRvbyBsYXJnZSAqL1xuXG4gIGZvciAoYml0cyA9IDA7IGJpdHMgPD0gTUFYX0JJVFM7IGJpdHMrKykge1xuICAgIHMuYmxfY291bnRbYml0c10gPSAwO1xuICB9XG5cbiAgLyogSW4gYSBmaXJzdCBwYXNzLCBjb21wdXRlIHRoZSBvcHRpbWFsIGJpdCBsZW5ndGhzICh3aGljaCBtYXlcbiAgICogb3ZlcmZsb3cgaW4gdGhlIGNhc2Ugb2YgdGhlIGJpdCBsZW5ndGggdHJlZSkuXG4gICAqL1xuICB0cmVlW3MuaGVhcFtzLmhlYXBfbWF4XSAqIDIgKyAxXS8qLkxlbiovID0gMDsgLyogcm9vdCBvZiB0aGUgaGVhcCAqL1xuXG4gIGZvciAoaCA9IHMuaGVhcF9tYXggKyAxOyBoIDwgSEVBUF9TSVpFOyBoKyspIHtcbiAgICBuID0gcy5oZWFwW2hdO1xuICAgIGJpdHMgPSB0cmVlW3RyZWVbbiAqIDIgKyAxXS8qLkRhZCovICogMiArIDFdLyouTGVuKi8gKyAxO1xuICAgIGlmIChiaXRzID4gbWF4X2xlbmd0aCkge1xuICAgICAgYml0cyA9IG1heF9sZW5ndGg7XG4gICAgICBvdmVyZmxvdysrO1xuICAgIH1cbiAgICB0cmVlW24gKiAyICsgMV0vKi5MZW4qLyA9IGJpdHM7XG4gICAgLyogV2Ugb3ZlcndyaXRlIHRyZWVbbl0uRGFkIHdoaWNoIGlzIG5vIGxvbmdlciBuZWVkZWQgKi9cblxuICAgIGlmIChuID4gbWF4X2NvZGUpIHsgY29udGludWU7IH0gLyogbm90IGEgbGVhZiBub2RlICovXG5cbiAgICBzLmJsX2NvdW50W2JpdHNdKys7XG4gICAgeGJpdHMgPSAwO1xuICAgIGlmIChuID49IGJhc2UpIHtcbiAgICAgIHhiaXRzID0gZXh0cmFbbiAtIGJhc2VdO1xuICAgIH1cbiAgICBmID0gdHJlZVtuICogMl0vKi5GcmVxKi87XG4gICAgcy5vcHRfbGVuICs9IGYgKiAoYml0cyArIHhiaXRzKTtcbiAgICBpZiAoaGFzX3N0cmVlKSB7XG4gICAgICBzLnN0YXRpY19sZW4gKz0gZiAqIChzdHJlZVtuICogMiArIDFdLyouTGVuKi8gKyB4Yml0cyk7XG4gICAgfVxuICB9XG4gIGlmIChvdmVyZmxvdyA9PT0gMCkgeyByZXR1cm47IH1cblxuICAvLyBUcmFjZSgoc3RkZXJyLFwiXFxuYml0IGxlbmd0aCBvdmVyZmxvd1xcblwiKSk7XG4gIC8qIFRoaXMgaGFwcGVucyBmb3IgZXhhbXBsZSBvbiBvYmoyIGFuZCBwaWMgb2YgdGhlIENhbGdhcnkgY29ycHVzICovXG5cbiAgLyogRmluZCB0aGUgZmlyc3QgYml0IGxlbmd0aCB3aGljaCBjb3VsZCBpbmNyZWFzZTogKi9cbiAgZG8ge1xuICAgIGJpdHMgPSBtYXhfbGVuZ3RoIC0gMTtcbiAgICB3aGlsZSAocy5ibF9jb3VudFtiaXRzXSA9PT0gMCkgeyBiaXRzLS07IH1cbiAgICBzLmJsX2NvdW50W2JpdHNdLS07ICAgICAgLyogbW92ZSBvbmUgbGVhZiBkb3duIHRoZSB0cmVlICovXG4gICAgcy5ibF9jb3VudFtiaXRzICsgMV0gKz0gMjsgLyogbW92ZSBvbmUgb3ZlcmZsb3cgaXRlbSBhcyBpdHMgYnJvdGhlciAqL1xuICAgIHMuYmxfY291bnRbbWF4X2xlbmd0aF0tLTtcbiAgICAvKiBUaGUgYnJvdGhlciBvZiB0aGUgb3ZlcmZsb3cgaXRlbSBhbHNvIG1vdmVzIG9uZSBzdGVwIHVwLFxuICAgICAqIGJ1dCB0aGlzIGRvZXMgbm90IGFmZmVjdCBibF9jb3VudFttYXhfbGVuZ3RoXVxuICAgICAqL1xuICAgIG92ZXJmbG93IC09IDI7XG4gIH0gd2hpbGUgKG92ZXJmbG93ID4gMCk7XG5cbiAgLyogTm93IHJlY29tcHV0ZSBhbGwgYml0IGxlbmd0aHMsIHNjYW5uaW5nIGluIGluY3JlYXNpbmcgZnJlcXVlbmN5LlxuICAgKiBoIGlzIHN0aWxsIGVxdWFsIHRvIEhFQVBfU0laRS4gKEl0IGlzIHNpbXBsZXIgdG8gcmVjb25zdHJ1Y3QgYWxsXG4gICAqIGxlbmd0aHMgaW5zdGVhZCBvZiBmaXhpbmcgb25seSB0aGUgd3Jvbmcgb25lcy4gVGhpcyBpZGVhIGlzIHRha2VuXG4gICAqIGZyb20gJ2FyJyB3cml0dGVuIGJ5IEhhcnVoaWtvIE9rdW11cmEuKVxuICAgKi9cbiAgZm9yIChiaXRzID0gbWF4X2xlbmd0aDsgYml0cyAhPT0gMDsgYml0cy0tKSB7XG4gICAgbiA9IHMuYmxfY291bnRbYml0c107XG4gICAgd2hpbGUgKG4gIT09IDApIHtcbiAgICAgIG0gPSBzLmhlYXBbLS1oXTtcbiAgICAgIGlmIChtID4gbWF4X2NvZGUpIHsgY29udGludWU7IH1cbiAgICAgIGlmICh0cmVlW20gKiAyICsgMV0vKi5MZW4qLyAhPT0gYml0cykge1xuICAgICAgICAvLyBUcmFjZSgoc3RkZXJyLFwiY29kZSAlZCBiaXRzICVkLT4lZFxcblwiLCBtLCB0cmVlW21dLkxlbiwgYml0cykpO1xuICAgICAgICBzLm9wdF9sZW4gKz0gKGJpdHMgLSB0cmVlW20gKiAyICsgMV0vKi5MZW4qLykgKiB0cmVlW20gKiAyXS8qLkZyZXEqLztcbiAgICAgICAgdHJlZVttICogMiArIDFdLyouTGVuKi8gPSBiaXRzO1xuICAgICAgfVxuICAgICAgbi0tO1xuICAgIH1cbiAgfVxufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogR2VuZXJhdGUgdGhlIGNvZGVzIGZvciBhIGdpdmVuIHRyZWUgYW5kIGJpdCBjb3VudHMgKHdoaWNoIG5lZWQgbm90IGJlXG4gKiBvcHRpbWFsKS5cbiAqIElOIGFzc2VydGlvbjogdGhlIGFycmF5IGJsX2NvdW50IGNvbnRhaW5zIHRoZSBiaXQgbGVuZ3RoIHN0YXRpc3RpY3MgZm9yXG4gKiB0aGUgZ2l2ZW4gdHJlZSBhbmQgdGhlIGZpZWxkIGxlbiBpcyBzZXQgZm9yIGFsbCB0cmVlIGVsZW1lbnRzLlxuICogT1VUIGFzc2VydGlvbjogdGhlIGZpZWxkIGNvZGUgaXMgc2V0IGZvciBhbGwgdHJlZSBlbGVtZW50cyBvZiBub25cbiAqICAgICB6ZXJvIGNvZGUgbGVuZ3RoLlxuICovXG5mdW5jdGlvbiBnZW5fY29kZXModHJlZSwgbWF4X2NvZGUsIGJsX2NvdW50KVxuLy8gICAgY3RfZGF0YSAqdHJlZTsgICAgICAgICAgICAgLyogdGhlIHRyZWUgdG8gZGVjb3JhdGUgKi9cbi8vICAgIGludCBtYXhfY29kZTsgICAgICAgICAgICAgIC8qIGxhcmdlc3QgY29kZSB3aXRoIG5vbiB6ZXJvIGZyZXF1ZW5jeSAqL1xuLy8gICAgdXNoZiAqYmxfY291bnQ7ICAgICAgICAgICAgLyogbnVtYmVyIG9mIGNvZGVzIGF0IGVhY2ggYml0IGxlbmd0aCAqL1xue1xuICB2YXIgbmV4dF9jb2RlID0gbmV3IEFycmF5KE1BWF9CSVRTICsgMSk7IC8qIG5leHQgY29kZSB2YWx1ZSBmb3IgZWFjaCBiaXQgbGVuZ3RoICovXG4gIHZhciBjb2RlID0gMDsgICAgICAgICAgICAgIC8qIHJ1bm5pbmcgY29kZSB2YWx1ZSAqL1xuICB2YXIgYml0czsgICAgICAgICAgICAgICAgICAvKiBiaXQgaW5kZXggKi9cbiAgdmFyIG47ICAgICAgICAgICAgICAgICAgICAgLyogY29kZSBpbmRleCAqL1xuXG4gIC8qIFRoZSBkaXN0cmlidXRpb24gY291bnRzIGFyZSBmaXJzdCB1c2VkIHRvIGdlbmVyYXRlIHRoZSBjb2RlIHZhbHVlc1xuICAgKiB3aXRob3V0IGJpdCByZXZlcnNhbC5cbiAgICovXG4gIGZvciAoYml0cyA9IDE7IGJpdHMgPD0gTUFYX0JJVFM7IGJpdHMrKykge1xuICAgIG5leHRfY29kZVtiaXRzXSA9IGNvZGUgPSAoY29kZSArIGJsX2NvdW50W2JpdHMgLSAxXSkgPDwgMTtcbiAgfVxuICAvKiBDaGVjayB0aGF0IHRoZSBiaXQgY291bnRzIGluIGJsX2NvdW50IGFyZSBjb25zaXN0ZW50LiBUaGUgbGFzdCBjb2RlXG4gICAqIG11c3QgYmUgYWxsIG9uZXMuXG4gICAqL1xuICAvL0Fzc2VydCAoY29kZSArIGJsX2NvdW50W01BWF9CSVRTXS0xID09ICgxPDxNQVhfQklUUyktMSxcbiAgLy8gICAgICAgIFwiaW5jb25zaXN0ZW50IGJpdCBjb3VudHNcIik7XG4gIC8vVHJhY2V2KChzdGRlcnIsXCJcXG5nZW5fY29kZXM6IG1heF9jb2RlICVkIFwiLCBtYXhfY29kZSkpO1xuXG4gIGZvciAobiA9IDA7ICBuIDw9IG1heF9jb2RlOyBuKyspIHtcbiAgICB2YXIgbGVuID0gdHJlZVtuICogMiArIDFdLyouTGVuKi87XG4gICAgaWYgKGxlbiA9PT0gMCkgeyBjb250aW51ZTsgfVxuICAgIC8qIE5vdyByZXZlcnNlIHRoZSBiaXRzICovXG4gICAgdHJlZVtuICogMl0vKi5Db2RlKi8gPSBiaV9yZXZlcnNlKG5leHRfY29kZVtsZW5dKyssIGxlbik7XG5cbiAgICAvL1RyYWNlY3YodHJlZSAhPSBzdGF0aWNfbHRyZWUsIChzdGRlcnIsXCJcXG5uICUzZCAlYyBsICUyZCBjICU0eCAoJXgpIFwiLFxuICAgIC8vICAgICBuLCAoaXNncmFwaChuKSA/IG4gOiAnICcpLCBsZW4sIHRyZWVbbl0uQ29kZSwgbmV4dF9jb2RlW2xlbl0tMSkpO1xuICB9XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBJbml0aWFsaXplIHRoZSB2YXJpb3VzICdjb25zdGFudCcgdGFibGVzLlxuICovXG5mdW5jdGlvbiB0cl9zdGF0aWNfaW5pdCgpIHtcbiAgdmFyIG47ICAgICAgICAvKiBpdGVyYXRlcyBvdmVyIHRyZWUgZWxlbWVudHMgKi9cbiAgdmFyIGJpdHM7ICAgICAvKiBiaXQgY291bnRlciAqL1xuICB2YXIgbGVuZ3RoOyAgIC8qIGxlbmd0aCB2YWx1ZSAqL1xuICB2YXIgY29kZTsgICAgIC8qIGNvZGUgdmFsdWUgKi9cbiAgdmFyIGRpc3Q7ICAgICAvKiBkaXN0YW5jZSBpbmRleCAqL1xuICB2YXIgYmxfY291bnQgPSBuZXcgQXJyYXkoTUFYX0JJVFMgKyAxKTtcbiAgLyogbnVtYmVyIG9mIGNvZGVzIGF0IGVhY2ggYml0IGxlbmd0aCBmb3IgYW4gb3B0aW1hbCB0cmVlICovXG5cbiAgLy8gZG8gY2hlY2sgaW4gX3RyX2luaXQoKVxuICAvL2lmIChzdGF0aWNfaW5pdF9kb25lKSByZXR1cm47XG5cbiAgLyogRm9yIHNvbWUgZW1iZWRkZWQgdGFyZ2V0cywgZ2xvYmFsIHZhcmlhYmxlcyBhcmUgbm90IGluaXRpYWxpemVkOiAqL1xuLyojaWZkZWYgTk9fSU5JVF9HTE9CQUxfUE9JTlRFUlNcbiAgc3RhdGljX2xfZGVzYy5zdGF0aWNfdHJlZSA9IHN0YXRpY19sdHJlZTtcbiAgc3RhdGljX2xfZGVzYy5leHRyYV9iaXRzID0gZXh0cmFfbGJpdHM7XG4gIHN0YXRpY19kX2Rlc2Muc3RhdGljX3RyZWUgPSBzdGF0aWNfZHRyZWU7XG4gIHN0YXRpY19kX2Rlc2MuZXh0cmFfYml0cyA9IGV4dHJhX2RiaXRzO1xuICBzdGF0aWNfYmxfZGVzYy5leHRyYV9iaXRzID0gZXh0cmFfYmxiaXRzO1xuI2VuZGlmKi9cblxuICAvKiBJbml0aWFsaXplIHRoZSBtYXBwaW5nIGxlbmd0aCAoMC4uMjU1KSAtPiBsZW5ndGggY29kZSAoMC4uMjgpICovXG4gIGxlbmd0aCA9IDA7XG4gIGZvciAoY29kZSA9IDA7IGNvZGUgPCBMRU5HVEhfQ09ERVMgLSAxOyBjb2RlKyspIHtcbiAgICBiYXNlX2xlbmd0aFtjb2RlXSA9IGxlbmd0aDtcbiAgICBmb3IgKG4gPSAwOyBuIDwgKDEgPDwgZXh0cmFfbGJpdHNbY29kZV0pOyBuKyspIHtcbiAgICAgIF9sZW5ndGhfY29kZVtsZW5ndGgrK10gPSBjb2RlO1xuICAgIH1cbiAgfVxuICAvL0Fzc2VydCAobGVuZ3RoID09IDI1NiwgXCJ0cl9zdGF0aWNfaW5pdDogbGVuZ3RoICE9IDI1NlwiKTtcbiAgLyogTm90ZSB0aGF0IHRoZSBsZW5ndGggMjU1IChtYXRjaCBsZW5ndGggMjU4KSBjYW4gYmUgcmVwcmVzZW50ZWRcbiAgICogaW4gdHdvIGRpZmZlcmVudCB3YXlzOiBjb2RlIDI4NCArIDUgYml0cyBvciBjb2RlIDI4NSwgc28gd2VcbiAgICogb3ZlcndyaXRlIGxlbmd0aF9jb2RlWzI1NV0gdG8gdXNlIHRoZSBiZXN0IGVuY29kaW5nOlxuICAgKi9cbiAgX2xlbmd0aF9jb2RlW2xlbmd0aCAtIDFdID0gY29kZTtcblxuICAvKiBJbml0aWFsaXplIHRoZSBtYXBwaW5nIGRpc3QgKDAuLjMySykgLT4gZGlzdCBjb2RlICgwLi4yOSkgKi9cbiAgZGlzdCA9IDA7XG4gIGZvciAoY29kZSA9IDA7IGNvZGUgPCAxNjsgY29kZSsrKSB7XG4gICAgYmFzZV9kaXN0W2NvZGVdID0gZGlzdDtcbiAgICBmb3IgKG4gPSAwOyBuIDwgKDEgPDwgZXh0cmFfZGJpdHNbY29kZV0pOyBuKyspIHtcbiAgICAgIF9kaXN0X2NvZGVbZGlzdCsrXSA9IGNvZGU7XG4gICAgfVxuICB9XG4gIC8vQXNzZXJ0IChkaXN0ID09IDI1NiwgXCJ0cl9zdGF0aWNfaW5pdDogZGlzdCAhPSAyNTZcIik7XG4gIGRpc3QgPj49IDc7IC8qIGZyb20gbm93IG9uLCBhbGwgZGlzdGFuY2VzIGFyZSBkaXZpZGVkIGJ5IDEyOCAqL1xuICBmb3IgKDsgY29kZSA8IERfQ09ERVM7IGNvZGUrKykge1xuICAgIGJhc2VfZGlzdFtjb2RlXSA9IGRpc3QgPDwgNztcbiAgICBmb3IgKG4gPSAwOyBuIDwgKDEgPDwgKGV4dHJhX2RiaXRzW2NvZGVdIC0gNykpOyBuKyspIHtcbiAgICAgIF9kaXN0X2NvZGVbMjU2ICsgZGlzdCsrXSA9IGNvZGU7XG4gICAgfVxuICB9XG4gIC8vQXNzZXJ0IChkaXN0ID09IDI1NiwgXCJ0cl9zdGF0aWNfaW5pdDogMjU2K2Rpc3QgIT0gNTEyXCIpO1xuXG4gIC8qIENvbnN0cnVjdCB0aGUgY29kZXMgb2YgdGhlIHN0YXRpYyBsaXRlcmFsIHRyZWUgKi9cbiAgZm9yIChiaXRzID0gMDsgYml0cyA8PSBNQVhfQklUUzsgYml0cysrKSB7XG4gICAgYmxfY291bnRbYml0c10gPSAwO1xuICB9XG5cbiAgbiA9IDA7XG4gIHdoaWxlIChuIDw9IDE0Mykge1xuICAgIHN0YXRpY19sdHJlZVtuICogMiArIDFdLyouTGVuKi8gPSA4O1xuICAgIG4rKztcbiAgICBibF9jb3VudFs4XSsrO1xuICB9XG4gIHdoaWxlIChuIDw9IDI1NSkge1xuICAgIHN0YXRpY19sdHJlZVtuICogMiArIDFdLyouTGVuKi8gPSA5O1xuICAgIG4rKztcbiAgICBibF9jb3VudFs5XSsrO1xuICB9XG4gIHdoaWxlIChuIDw9IDI3OSkge1xuICAgIHN0YXRpY19sdHJlZVtuICogMiArIDFdLyouTGVuKi8gPSA3O1xuICAgIG4rKztcbiAgICBibF9jb3VudFs3XSsrO1xuICB9XG4gIHdoaWxlIChuIDw9IDI4Nykge1xuICAgIHN0YXRpY19sdHJlZVtuICogMiArIDFdLyouTGVuKi8gPSA4O1xuICAgIG4rKztcbiAgICBibF9jb3VudFs4XSsrO1xuICB9XG4gIC8qIENvZGVzIDI4NiBhbmQgMjg3IGRvIG5vdCBleGlzdCwgYnV0IHdlIG11c3QgaW5jbHVkZSB0aGVtIGluIHRoZVxuICAgKiB0cmVlIGNvbnN0cnVjdGlvbiB0byBnZXQgYSBjYW5vbmljYWwgSHVmZm1hbiB0cmVlIChsb25nZXN0IGNvZGVcbiAgICogYWxsIG9uZXMpXG4gICAqL1xuICBnZW5fY29kZXMoc3RhdGljX2x0cmVlLCBMX0NPREVTICsgMSwgYmxfY291bnQpO1xuXG4gIC8qIFRoZSBzdGF0aWMgZGlzdGFuY2UgdHJlZSBpcyB0cml2aWFsOiAqL1xuICBmb3IgKG4gPSAwOyBuIDwgRF9DT0RFUzsgbisrKSB7XG4gICAgc3RhdGljX2R0cmVlW24gKiAyICsgMV0vKi5MZW4qLyA9IDU7XG4gICAgc3RhdGljX2R0cmVlW24gKiAyXS8qLkNvZGUqLyA9IGJpX3JldmVyc2UobiwgNSk7XG4gIH1cblxuICAvLyBOb3cgZGF0YSByZWFkeSBhbmQgd2UgY2FuIGluaXQgc3RhdGljIHRyZWVzXG4gIHN0YXRpY19sX2Rlc2MgPSBuZXcgU3RhdGljVHJlZURlc2Moc3RhdGljX2x0cmVlLCBleHRyYV9sYml0cywgTElURVJBTFMgKyAxLCBMX0NPREVTLCBNQVhfQklUUyk7XG4gIHN0YXRpY19kX2Rlc2MgPSBuZXcgU3RhdGljVHJlZURlc2Moc3RhdGljX2R0cmVlLCBleHRyYV9kYml0cywgMCwgICAgICAgICAgRF9DT0RFUywgTUFYX0JJVFMpO1xuICBzdGF0aWNfYmxfZGVzYyA9IG5ldyBTdGF0aWNUcmVlRGVzYyhuZXcgQXJyYXkoMCksIGV4dHJhX2JsYml0cywgMCwgICAgICAgICBCTF9DT0RFUywgTUFYX0JMX0JJVFMpO1xuXG4gIC8vc3RhdGljX2luaXRfZG9uZSA9IHRydWU7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBJbml0aWFsaXplIGEgbmV3IGJsb2NrLlxuICovXG5mdW5jdGlvbiBpbml0X2Jsb2NrKHMpIHtcbiAgdmFyIG47IC8qIGl0ZXJhdGVzIG92ZXIgdHJlZSBlbGVtZW50cyAqL1xuXG4gIC8qIEluaXRpYWxpemUgdGhlIHRyZWVzLiAqL1xuICBmb3IgKG4gPSAwOyBuIDwgTF9DT0RFUzsgIG4rKykgeyBzLmR5bl9sdHJlZVtuICogMl0vKi5GcmVxKi8gPSAwOyB9XG4gIGZvciAobiA9IDA7IG4gPCBEX0NPREVTOyAgbisrKSB7IHMuZHluX2R0cmVlW24gKiAyXS8qLkZyZXEqLyA9IDA7IH1cbiAgZm9yIChuID0gMDsgbiA8IEJMX0NPREVTOyBuKyspIHsgcy5ibF90cmVlW24gKiAyXS8qLkZyZXEqLyA9IDA7IH1cblxuICBzLmR5bl9sdHJlZVtFTkRfQkxPQ0sgKiAyXS8qLkZyZXEqLyA9IDE7XG4gIHMub3B0X2xlbiA9IHMuc3RhdGljX2xlbiA9IDA7XG4gIHMubGFzdF9saXQgPSBzLm1hdGNoZXMgPSAwO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogRmx1c2ggdGhlIGJpdCBidWZmZXIgYW5kIGFsaWduIHRoZSBvdXRwdXQgb24gYSBieXRlIGJvdW5kYXJ5XG4gKi9cbmZ1bmN0aW9uIGJpX3dpbmR1cChzKVxue1xuICBpZiAocy5iaV92YWxpZCA+IDgpIHtcbiAgICBwdXRfc2hvcnQocywgcy5iaV9idWYpO1xuICB9IGVsc2UgaWYgKHMuYmlfdmFsaWQgPiAwKSB7XG4gICAgLy9wdXRfYnl0ZShzLCAoQnl0ZSlzLT5iaV9idWYpO1xuICAgIHMucGVuZGluZ19idWZbcy5wZW5kaW5nKytdID0gcy5iaV9idWY7XG4gIH1cbiAgcy5iaV9idWYgPSAwO1xuICBzLmJpX3ZhbGlkID0gMDtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb3B5IGEgc3RvcmVkIGJsb2NrLCBzdG9yaW5nIGZpcnN0IHRoZSBsZW5ndGggYW5kIGl0c1xuICogb25lJ3MgY29tcGxlbWVudCBpZiByZXF1ZXN0ZWQuXG4gKi9cbmZ1bmN0aW9uIGNvcHlfYmxvY2socywgYnVmLCBsZW4sIGhlYWRlcilcbi8vRGVmbGF0ZVN0YXRlICpzO1xuLy9jaGFyZiAgICAqYnVmOyAgICAvKiB0aGUgaW5wdXQgZGF0YSAqL1xuLy91bnNpZ25lZCBsZW47ICAgICAvKiBpdHMgbGVuZ3RoICovXG4vL2ludCAgICAgIGhlYWRlcjsgIC8qIHRydWUgaWYgYmxvY2sgaGVhZGVyIG11c3QgYmUgd3JpdHRlbiAqL1xue1xuICBiaV93aW5kdXAocyk7ICAgICAgICAvKiBhbGlnbiBvbiBieXRlIGJvdW5kYXJ5ICovXG5cbiAgaWYgKGhlYWRlcikge1xuICAgIHB1dF9zaG9ydChzLCBsZW4pO1xuICAgIHB1dF9zaG9ydChzLCB+bGVuKTtcbiAgfVxuLy8gIHdoaWxlIChsZW4tLSkge1xuLy8gICAgcHV0X2J5dGUocywgKmJ1ZisrKTtcbi8vICB9XG4gIHV0aWxzLmFycmF5U2V0KHMucGVuZGluZ19idWYsIHMud2luZG93LCBidWYsIGxlbiwgcy5wZW5kaW5nKTtcbiAgcy5wZW5kaW5nICs9IGxlbjtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb21wYXJlcyB0byBzdWJ0cmVlcywgdXNpbmcgdGhlIHRyZWUgZGVwdGggYXMgdGllIGJyZWFrZXIgd2hlblxuICogdGhlIHN1YnRyZWVzIGhhdmUgZXF1YWwgZnJlcXVlbmN5LiBUaGlzIG1pbmltaXplcyB0aGUgd29yc3QgY2FzZSBsZW5ndGguXG4gKi9cbmZ1bmN0aW9uIHNtYWxsZXIodHJlZSwgbiwgbSwgZGVwdGgpIHtcbiAgdmFyIF9uMiA9IG4gKiAyO1xuICB2YXIgX20yID0gbSAqIDI7XG4gIHJldHVybiAodHJlZVtfbjJdLyouRnJlcSovIDwgdHJlZVtfbTJdLyouRnJlcSovIHx8XG4gICAgICAgICAodHJlZVtfbjJdLyouRnJlcSovID09PSB0cmVlW19tMl0vKi5GcmVxKi8gJiYgZGVwdGhbbl0gPD0gZGVwdGhbbV0pKTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBSZXN0b3JlIHRoZSBoZWFwIHByb3BlcnR5IGJ5IG1vdmluZyBkb3duIHRoZSB0cmVlIHN0YXJ0aW5nIGF0IG5vZGUgayxcbiAqIGV4Y2hhbmdpbmcgYSBub2RlIHdpdGggdGhlIHNtYWxsZXN0IG9mIGl0cyB0d28gc29ucyBpZiBuZWNlc3NhcnksIHN0b3BwaW5nXG4gKiB3aGVuIHRoZSBoZWFwIHByb3BlcnR5IGlzIHJlLWVzdGFibGlzaGVkIChlYWNoIGZhdGhlciBzbWFsbGVyIHRoYW4gaXRzXG4gKiB0d28gc29ucykuXG4gKi9cbmZ1bmN0aW9uIHBxZG93bmhlYXAocywgdHJlZSwgaylcbi8vICAgIGRlZmxhdGVfc3RhdGUgKnM7XG4vLyAgICBjdF9kYXRhICp0cmVlOyAgLyogdGhlIHRyZWUgdG8gcmVzdG9yZSAqL1xuLy8gICAgaW50IGs7ICAgICAgICAgICAgICAgLyogbm9kZSB0byBtb3ZlIGRvd24gKi9cbntcbiAgdmFyIHYgPSBzLmhlYXBba107XG4gIHZhciBqID0gayA8PCAxOyAgLyogbGVmdCBzb24gb2YgayAqL1xuICB3aGlsZSAoaiA8PSBzLmhlYXBfbGVuKSB7XG4gICAgLyogU2V0IGogdG8gdGhlIHNtYWxsZXN0IG9mIHRoZSB0d28gc29uczogKi9cbiAgICBpZiAoaiA8IHMuaGVhcF9sZW4gJiZcbiAgICAgIHNtYWxsZXIodHJlZSwgcy5oZWFwW2ogKyAxXSwgcy5oZWFwW2pdLCBzLmRlcHRoKSkge1xuICAgICAgaisrO1xuICAgIH1cbiAgICAvKiBFeGl0IGlmIHYgaXMgc21hbGxlciB0aGFuIGJvdGggc29ucyAqL1xuICAgIGlmIChzbWFsbGVyKHRyZWUsIHYsIHMuaGVhcFtqXSwgcy5kZXB0aCkpIHsgYnJlYWs7IH1cblxuICAgIC8qIEV4Y2hhbmdlIHYgd2l0aCB0aGUgc21hbGxlc3Qgc29uICovXG4gICAgcy5oZWFwW2tdID0gcy5oZWFwW2pdO1xuICAgIGsgPSBqO1xuXG4gICAgLyogQW5kIGNvbnRpbnVlIGRvd24gdGhlIHRyZWUsIHNldHRpbmcgaiB0byB0aGUgbGVmdCBzb24gb2YgayAqL1xuICAgIGogPDw9IDE7XG4gIH1cbiAgcy5oZWFwW2tdID0gdjtcbn1cblxuXG4vLyBpbmxpbmVkIG1hbnVhbGx5XG4vLyB2YXIgU01BTExFU1QgPSAxO1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFNlbmQgdGhlIGJsb2NrIGRhdGEgY29tcHJlc3NlZCB1c2luZyB0aGUgZ2l2ZW4gSHVmZm1hbiB0cmVlc1xuICovXG5mdW5jdGlvbiBjb21wcmVzc19ibG9jayhzLCBsdHJlZSwgZHRyZWUpXG4vLyAgICBkZWZsYXRlX3N0YXRlICpzO1xuLy8gICAgY29uc3QgY3RfZGF0YSAqbHRyZWU7IC8qIGxpdGVyYWwgdHJlZSAqL1xuLy8gICAgY29uc3QgY3RfZGF0YSAqZHRyZWU7IC8qIGRpc3RhbmNlIHRyZWUgKi9cbntcbiAgdmFyIGRpc3Q7ICAgICAgICAgICAvKiBkaXN0YW5jZSBvZiBtYXRjaGVkIHN0cmluZyAqL1xuICB2YXIgbGM7ICAgICAgICAgICAgIC8qIG1hdGNoIGxlbmd0aCBvciB1bm1hdGNoZWQgY2hhciAoaWYgZGlzdCA9PSAwKSAqL1xuICB2YXIgbHggPSAwOyAgICAgICAgIC8qIHJ1bm5pbmcgaW5kZXggaW4gbF9idWYgKi9cbiAgdmFyIGNvZGU7ICAgICAgICAgICAvKiB0aGUgY29kZSB0byBzZW5kICovXG4gIHZhciBleHRyYTsgICAgICAgICAgLyogbnVtYmVyIG9mIGV4dHJhIGJpdHMgdG8gc2VuZCAqL1xuXG4gIGlmIChzLmxhc3RfbGl0ICE9PSAwKSB7XG4gICAgZG8ge1xuICAgICAgZGlzdCA9IChzLnBlbmRpbmdfYnVmW3MuZF9idWYgKyBseCAqIDJdIDw8IDgpIHwgKHMucGVuZGluZ19idWZbcy5kX2J1ZiArIGx4ICogMiArIDFdKTtcbiAgICAgIGxjID0gcy5wZW5kaW5nX2J1ZltzLmxfYnVmICsgbHhdO1xuICAgICAgbHgrKztcblxuICAgICAgaWYgKGRpc3QgPT09IDApIHtcbiAgICAgICAgc2VuZF9jb2RlKHMsIGxjLCBsdHJlZSk7IC8qIHNlbmQgYSBsaXRlcmFsIGJ5dGUgKi9cbiAgICAgICAgLy9UcmFjZWN2KGlzZ3JhcGgobGMpLCAoc3RkZXJyLFwiICclYycgXCIsIGxjKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvKiBIZXJlLCBsYyBpcyB0aGUgbWF0Y2ggbGVuZ3RoIC0gTUlOX01BVENIICovXG4gICAgICAgIGNvZGUgPSBfbGVuZ3RoX2NvZGVbbGNdO1xuICAgICAgICBzZW5kX2NvZGUocywgY29kZSArIExJVEVSQUxTICsgMSwgbHRyZWUpOyAvKiBzZW5kIHRoZSBsZW5ndGggY29kZSAqL1xuICAgICAgICBleHRyYSA9IGV4dHJhX2xiaXRzW2NvZGVdO1xuICAgICAgICBpZiAoZXh0cmEgIT09IDApIHtcbiAgICAgICAgICBsYyAtPSBiYXNlX2xlbmd0aFtjb2RlXTtcbiAgICAgICAgICBzZW5kX2JpdHMocywgbGMsIGV4dHJhKTsgICAgICAgLyogc2VuZCB0aGUgZXh0cmEgbGVuZ3RoIGJpdHMgKi9cbiAgICAgICAgfVxuICAgICAgICBkaXN0LS07IC8qIGRpc3QgaXMgbm93IHRoZSBtYXRjaCBkaXN0YW5jZSAtIDEgKi9cbiAgICAgICAgY29kZSA9IGRfY29kZShkaXN0KTtcbiAgICAgICAgLy9Bc3NlcnQgKGNvZGUgPCBEX0NPREVTLCBcImJhZCBkX2NvZGVcIik7XG5cbiAgICAgICAgc2VuZF9jb2RlKHMsIGNvZGUsIGR0cmVlKTsgICAgICAgLyogc2VuZCB0aGUgZGlzdGFuY2UgY29kZSAqL1xuICAgICAgICBleHRyYSA9IGV4dHJhX2RiaXRzW2NvZGVdO1xuICAgICAgICBpZiAoZXh0cmEgIT09IDApIHtcbiAgICAgICAgICBkaXN0IC09IGJhc2VfZGlzdFtjb2RlXTtcbiAgICAgICAgICBzZW5kX2JpdHMocywgZGlzdCwgZXh0cmEpOyAgIC8qIHNlbmQgdGhlIGV4dHJhIGRpc3RhbmNlIGJpdHMgKi9cbiAgICAgICAgfVxuICAgICAgfSAvKiBsaXRlcmFsIG9yIG1hdGNoIHBhaXIgPyAqL1xuXG4gICAgICAvKiBDaGVjayB0aGF0IHRoZSBvdmVybGF5IGJldHdlZW4gcGVuZGluZ19idWYgYW5kIGRfYnVmK2xfYnVmIGlzIG9rOiAqL1xuICAgICAgLy9Bc3NlcnQoKHVJbnQpKHMtPnBlbmRpbmcpIDwgcy0+bGl0X2J1ZnNpemUgKyAyKmx4LFxuICAgICAgLy8gICAgICAgXCJwZW5kaW5nQnVmIG92ZXJmbG93XCIpO1xuXG4gICAgfSB3aGlsZSAobHggPCBzLmxhc3RfbGl0KTtcbiAgfVxuXG4gIHNlbmRfY29kZShzLCBFTkRfQkxPQ0ssIGx0cmVlKTtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvbnN0cnVjdCBvbmUgSHVmZm1hbiB0cmVlIGFuZCBhc3NpZ25zIHRoZSBjb2RlIGJpdCBzdHJpbmdzIGFuZCBsZW5ndGhzLlxuICogVXBkYXRlIHRoZSB0b3RhbCBiaXQgbGVuZ3RoIGZvciB0aGUgY3VycmVudCBibG9jay5cbiAqIElOIGFzc2VydGlvbjogdGhlIGZpZWxkIGZyZXEgaXMgc2V0IGZvciBhbGwgdHJlZSBlbGVtZW50cy5cbiAqIE9VVCBhc3NlcnRpb25zOiB0aGUgZmllbGRzIGxlbiBhbmQgY29kZSBhcmUgc2V0IHRvIHRoZSBvcHRpbWFsIGJpdCBsZW5ndGhcbiAqICAgICBhbmQgY29ycmVzcG9uZGluZyBjb2RlLiBUaGUgbGVuZ3RoIG9wdF9sZW4gaXMgdXBkYXRlZDsgc3RhdGljX2xlbiBpc1xuICogICAgIGFsc28gdXBkYXRlZCBpZiBzdHJlZSBpcyBub3QgbnVsbC4gVGhlIGZpZWxkIG1heF9jb2RlIGlzIHNldC5cbiAqL1xuZnVuY3Rpb24gYnVpbGRfdHJlZShzLCBkZXNjKVxuLy8gICAgZGVmbGF0ZV9zdGF0ZSAqcztcbi8vICAgIHRyZWVfZGVzYyAqZGVzYzsgLyogdGhlIHRyZWUgZGVzY3JpcHRvciAqL1xue1xuICB2YXIgdHJlZSAgICAgPSBkZXNjLmR5bl90cmVlO1xuICB2YXIgc3RyZWUgICAgPSBkZXNjLnN0YXRfZGVzYy5zdGF0aWNfdHJlZTtcbiAgdmFyIGhhc19zdHJlZSA9IGRlc2Muc3RhdF9kZXNjLmhhc19zdHJlZTtcbiAgdmFyIGVsZW1zICAgID0gZGVzYy5zdGF0X2Rlc2MuZWxlbXM7XG4gIHZhciBuLCBtOyAgICAgICAgICAvKiBpdGVyYXRlIG92ZXIgaGVhcCBlbGVtZW50cyAqL1xuICB2YXIgbWF4X2NvZGUgPSAtMTsgLyogbGFyZ2VzdCBjb2RlIHdpdGggbm9uIHplcm8gZnJlcXVlbmN5ICovXG4gIHZhciBub2RlOyAgICAgICAgICAvKiBuZXcgbm9kZSBiZWluZyBjcmVhdGVkICovXG5cbiAgLyogQ29uc3RydWN0IHRoZSBpbml0aWFsIGhlYXAsIHdpdGggbGVhc3QgZnJlcXVlbnQgZWxlbWVudCBpblxuICAgKiBoZWFwW1NNQUxMRVNUXS4gVGhlIHNvbnMgb2YgaGVhcFtuXSBhcmUgaGVhcFsyKm5dIGFuZCBoZWFwWzIqbisxXS5cbiAgICogaGVhcFswXSBpcyBub3QgdXNlZC5cbiAgICovXG4gIHMuaGVhcF9sZW4gPSAwO1xuICBzLmhlYXBfbWF4ID0gSEVBUF9TSVpFO1xuXG4gIGZvciAobiA9IDA7IG4gPCBlbGVtczsgbisrKSB7XG4gICAgaWYgKHRyZWVbbiAqIDJdLyouRnJlcSovICE9PSAwKSB7XG4gICAgICBzLmhlYXBbKytzLmhlYXBfbGVuXSA9IG1heF9jb2RlID0gbjtcbiAgICAgIHMuZGVwdGhbbl0gPSAwO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRyZWVbbiAqIDIgKyAxXS8qLkxlbiovID0gMDtcbiAgICB9XG4gIH1cblxuICAvKiBUaGUgcGt6aXAgZm9ybWF0IHJlcXVpcmVzIHRoYXQgYXQgbGVhc3Qgb25lIGRpc3RhbmNlIGNvZGUgZXhpc3RzLFxuICAgKiBhbmQgdGhhdCBhdCBsZWFzdCBvbmUgYml0IHNob3VsZCBiZSBzZW50IGV2ZW4gaWYgdGhlcmUgaXMgb25seSBvbmVcbiAgICogcG9zc2libGUgY29kZS4gU28gdG8gYXZvaWQgc3BlY2lhbCBjaGVja3MgbGF0ZXIgb24gd2UgZm9yY2UgYXQgbGVhc3RcbiAgICogdHdvIGNvZGVzIG9mIG5vbiB6ZXJvIGZyZXF1ZW5jeS5cbiAgICovXG4gIHdoaWxlIChzLmhlYXBfbGVuIDwgMikge1xuICAgIG5vZGUgPSBzLmhlYXBbKytzLmhlYXBfbGVuXSA9IChtYXhfY29kZSA8IDIgPyArK21heF9jb2RlIDogMCk7XG4gICAgdHJlZVtub2RlICogMl0vKi5GcmVxKi8gPSAxO1xuICAgIHMuZGVwdGhbbm9kZV0gPSAwO1xuICAgIHMub3B0X2xlbi0tO1xuXG4gICAgaWYgKGhhc19zdHJlZSkge1xuICAgICAgcy5zdGF0aWNfbGVuIC09IHN0cmVlW25vZGUgKiAyICsgMV0vKi5MZW4qLztcbiAgICB9XG4gICAgLyogbm9kZSBpcyAwIG9yIDEgc28gaXQgZG9lcyBub3QgaGF2ZSBleHRyYSBiaXRzICovXG4gIH1cbiAgZGVzYy5tYXhfY29kZSA9IG1heF9jb2RlO1xuXG4gIC8qIFRoZSBlbGVtZW50cyBoZWFwW2hlYXBfbGVuLzIrMSAuLiBoZWFwX2xlbl0gYXJlIGxlYXZlcyBvZiB0aGUgdHJlZSxcbiAgICogZXN0YWJsaXNoIHN1Yi1oZWFwcyBvZiBpbmNyZWFzaW5nIGxlbmd0aHM6XG4gICAqL1xuICBmb3IgKG4gPSAocy5oZWFwX2xlbiA+PiAxLyppbnQgLzIqLyk7IG4gPj0gMTsgbi0tKSB7IHBxZG93bmhlYXAocywgdHJlZSwgbik7IH1cblxuICAvKiBDb25zdHJ1Y3QgdGhlIEh1ZmZtYW4gdHJlZSBieSByZXBlYXRlZGx5IGNvbWJpbmluZyB0aGUgbGVhc3QgdHdvXG4gICAqIGZyZXF1ZW50IG5vZGVzLlxuICAgKi9cbiAgbm9kZSA9IGVsZW1zOyAgICAgICAgICAgICAgLyogbmV4dCBpbnRlcm5hbCBub2RlIG9mIHRoZSB0cmVlICovXG4gIGRvIHtcbiAgICAvL3BxcmVtb3ZlKHMsIHRyZWUsIG4pOyAgLyogbiA9IG5vZGUgb2YgbGVhc3QgZnJlcXVlbmN5ICovXG4gICAgLyoqKiBwcXJlbW92ZSAqKiovXG4gICAgbiA9IHMuaGVhcFsxLypTTUFMTEVTVCovXTtcbiAgICBzLmhlYXBbMS8qU01BTExFU1QqL10gPSBzLmhlYXBbcy5oZWFwX2xlbi0tXTtcbiAgICBwcWRvd25oZWFwKHMsIHRyZWUsIDEvKlNNQUxMRVNUKi8pO1xuICAgIC8qKiovXG5cbiAgICBtID0gcy5oZWFwWzEvKlNNQUxMRVNUKi9dOyAvKiBtID0gbm9kZSBvZiBuZXh0IGxlYXN0IGZyZXF1ZW5jeSAqL1xuXG4gICAgcy5oZWFwWy0tcy5oZWFwX21heF0gPSBuOyAvKiBrZWVwIHRoZSBub2RlcyBzb3J0ZWQgYnkgZnJlcXVlbmN5ICovXG4gICAgcy5oZWFwWy0tcy5oZWFwX21heF0gPSBtO1xuXG4gICAgLyogQ3JlYXRlIGEgbmV3IG5vZGUgZmF0aGVyIG9mIG4gYW5kIG0gKi9cbiAgICB0cmVlW25vZGUgKiAyXS8qLkZyZXEqLyA9IHRyZWVbbiAqIDJdLyouRnJlcSovICsgdHJlZVttICogMl0vKi5GcmVxKi87XG4gICAgcy5kZXB0aFtub2RlXSA9IChzLmRlcHRoW25dID49IHMuZGVwdGhbbV0gPyBzLmRlcHRoW25dIDogcy5kZXB0aFttXSkgKyAxO1xuICAgIHRyZWVbbiAqIDIgKyAxXS8qLkRhZCovID0gdHJlZVttICogMiArIDFdLyouRGFkKi8gPSBub2RlO1xuXG4gICAgLyogYW5kIGluc2VydCB0aGUgbmV3IG5vZGUgaW4gdGhlIGhlYXAgKi9cbiAgICBzLmhlYXBbMS8qU01BTExFU1QqL10gPSBub2RlKys7XG4gICAgcHFkb3duaGVhcChzLCB0cmVlLCAxLypTTUFMTEVTVCovKTtcblxuICB9IHdoaWxlIChzLmhlYXBfbGVuID49IDIpO1xuXG4gIHMuaGVhcFstLXMuaGVhcF9tYXhdID0gcy5oZWFwWzEvKlNNQUxMRVNUKi9dO1xuXG4gIC8qIEF0IHRoaXMgcG9pbnQsIHRoZSBmaWVsZHMgZnJlcSBhbmQgZGFkIGFyZSBzZXQuIFdlIGNhbiBub3dcbiAgICogZ2VuZXJhdGUgdGhlIGJpdCBsZW5ndGhzLlxuICAgKi9cbiAgZ2VuX2JpdGxlbihzLCBkZXNjKTtcblxuICAvKiBUaGUgZmllbGQgbGVuIGlzIG5vdyBzZXQsIHdlIGNhbiBnZW5lcmF0ZSB0aGUgYml0IGNvZGVzICovXG4gIGdlbl9jb2Rlcyh0cmVlLCBtYXhfY29kZSwgcy5ibF9jb3VudCk7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBTY2FuIGEgbGl0ZXJhbCBvciBkaXN0YW5jZSB0cmVlIHRvIGRldGVybWluZSB0aGUgZnJlcXVlbmNpZXMgb2YgdGhlIGNvZGVzXG4gKiBpbiB0aGUgYml0IGxlbmd0aCB0cmVlLlxuICovXG5mdW5jdGlvbiBzY2FuX3RyZWUocywgdHJlZSwgbWF4X2NvZGUpXG4vLyAgICBkZWZsYXRlX3N0YXRlICpzO1xuLy8gICAgY3RfZGF0YSAqdHJlZTsgICAvKiB0aGUgdHJlZSB0byBiZSBzY2FubmVkICovXG4vLyAgICBpbnQgbWF4X2NvZGU7ICAgIC8qIGFuZCBpdHMgbGFyZ2VzdCBjb2RlIG9mIG5vbiB6ZXJvIGZyZXF1ZW5jeSAqL1xue1xuICB2YXIgbjsgICAgICAgICAgICAgICAgICAgICAvKiBpdGVyYXRlcyBvdmVyIGFsbCB0cmVlIGVsZW1lbnRzICovXG4gIHZhciBwcmV2bGVuID0gLTE7ICAgICAgICAgIC8qIGxhc3QgZW1pdHRlZCBsZW5ndGggKi9cbiAgdmFyIGN1cmxlbjsgICAgICAgICAgICAgICAgLyogbGVuZ3RoIG9mIGN1cnJlbnQgY29kZSAqL1xuXG4gIHZhciBuZXh0bGVuID0gdHJlZVswICogMiArIDFdLyouTGVuKi87IC8qIGxlbmd0aCBvZiBuZXh0IGNvZGUgKi9cblxuICB2YXIgY291bnQgPSAwOyAgICAgICAgICAgICAvKiByZXBlYXQgY291bnQgb2YgdGhlIGN1cnJlbnQgY29kZSAqL1xuICB2YXIgbWF4X2NvdW50ID0gNzsgICAgICAgICAvKiBtYXggcmVwZWF0IGNvdW50ICovXG4gIHZhciBtaW5fY291bnQgPSA0OyAgICAgICAgIC8qIG1pbiByZXBlYXQgY291bnQgKi9cblxuICBpZiAobmV4dGxlbiA9PT0gMCkge1xuICAgIG1heF9jb3VudCA9IDEzODtcbiAgICBtaW5fY291bnQgPSAzO1xuICB9XG4gIHRyZWVbKG1heF9jb2RlICsgMSkgKiAyICsgMV0vKi5MZW4qLyA9IDB4ZmZmZjsgLyogZ3VhcmQgKi9cblxuICBmb3IgKG4gPSAwOyBuIDw9IG1heF9jb2RlOyBuKyspIHtcbiAgICBjdXJsZW4gPSBuZXh0bGVuO1xuICAgIG5leHRsZW4gPSB0cmVlWyhuICsgMSkgKiAyICsgMV0vKi5MZW4qLztcblxuICAgIGlmICgrK2NvdW50IDwgbWF4X2NvdW50ICYmIGN1cmxlbiA9PT0gbmV4dGxlbikge1xuICAgICAgY29udGludWU7XG5cbiAgICB9IGVsc2UgaWYgKGNvdW50IDwgbWluX2NvdW50KSB7XG4gICAgICBzLmJsX3RyZWVbY3VybGVuICogMl0vKi5GcmVxKi8gKz0gY291bnQ7XG5cbiAgICB9IGVsc2UgaWYgKGN1cmxlbiAhPT0gMCkge1xuXG4gICAgICBpZiAoY3VybGVuICE9PSBwcmV2bGVuKSB7IHMuYmxfdHJlZVtjdXJsZW4gKiAyXS8qLkZyZXEqLysrOyB9XG4gICAgICBzLmJsX3RyZWVbUkVQXzNfNiAqIDJdLyouRnJlcSovKys7XG5cbiAgICB9IGVsc2UgaWYgKGNvdW50IDw9IDEwKSB7XG4gICAgICBzLmJsX3RyZWVbUkVQWl8zXzEwICogMl0vKi5GcmVxKi8rKztcblxuICAgIH0gZWxzZSB7XG4gICAgICBzLmJsX3RyZWVbUkVQWl8xMV8xMzggKiAyXS8qLkZyZXEqLysrO1xuICAgIH1cblxuICAgIGNvdW50ID0gMDtcbiAgICBwcmV2bGVuID0gY3VybGVuO1xuXG4gICAgaWYgKG5leHRsZW4gPT09IDApIHtcbiAgICAgIG1heF9jb3VudCA9IDEzODtcbiAgICAgIG1pbl9jb3VudCA9IDM7XG5cbiAgICB9IGVsc2UgaWYgKGN1cmxlbiA9PT0gbmV4dGxlbikge1xuICAgICAgbWF4X2NvdW50ID0gNjtcbiAgICAgIG1pbl9jb3VudCA9IDM7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgbWF4X2NvdW50ID0gNztcbiAgICAgIG1pbl9jb3VudCA9IDQ7XG4gICAgfVxuICB9XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBTZW5kIGEgbGl0ZXJhbCBvciBkaXN0YW5jZSB0cmVlIGluIGNvbXByZXNzZWQgZm9ybSwgdXNpbmcgdGhlIGNvZGVzIGluXG4gKiBibF90cmVlLlxuICovXG5mdW5jdGlvbiBzZW5kX3RyZWUocywgdHJlZSwgbWF4X2NvZGUpXG4vLyAgICBkZWZsYXRlX3N0YXRlICpzO1xuLy8gICAgY3RfZGF0YSAqdHJlZTsgLyogdGhlIHRyZWUgdG8gYmUgc2Nhbm5lZCAqL1xuLy8gICAgaW50IG1heF9jb2RlOyAgICAgICAvKiBhbmQgaXRzIGxhcmdlc3QgY29kZSBvZiBub24gemVybyBmcmVxdWVuY3kgKi9cbntcbiAgdmFyIG47ICAgICAgICAgICAgICAgICAgICAgLyogaXRlcmF0ZXMgb3ZlciBhbGwgdHJlZSBlbGVtZW50cyAqL1xuICB2YXIgcHJldmxlbiA9IC0xOyAgICAgICAgICAvKiBsYXN0IGVtaXR0ZWQgbGVuZ3RoICovXG4gIHZhciBjdXJsZW47ICAgICAgICAgICAgICAgIC8qIGxlbmd0aCBvZiBjdXJyZW50IGNvZGUgKi9cblxuICB2YXIgbmV4dGxlbiA9IHRyZWVbMCAqIDIgKyAxXS8qLkxlbiovOyAvKiBsZW5ndGggb2YgbmV4dCBjb2RlICovXG5cbiAgdmFyIGNvdW50ID0gMDsgICAgICAgICAgICAgLyogcmVwZWF0IGNvdW50IG9mIHRoZSBjdXJyZW50IGNvZGUgKi9cbiAgdmFyIG1heF9jb3VudCA9IDc7ICAgICAgICAgLyogbWF4IHJlcGVhdCBjb3VudCAqL1xuICB2YXIgbWluX2NvdW50ID0gNDsgICAgICAgICAvKiBtaW4gcmVwZWF0IGNvdW50ICovXG5cbiAgLyogdHJlZVttYXhfY29kZSsxXS5MZW4gPSAtMTsgKi8gIC8qIGd1YXJkIGFscmVhZHkgc2V0ICovXG4gIGlmIChuZXh0bGVuID09PSAwKSB7XG4gICAgbWF4X2NvdW50ID0gMTM4O1xuICAgIG1pbl9jb3VudCA9IDM7XG4gIH1cblxuICBmb3IgKG4gPSAwOyBuIDw9IG1heF9jb2RlOyBuKyspIHtcbiAgICBjdXJsZW4gPSBuZXh0bGVuO1xuICAgIG5leHRsZW4gPSB0cmVlWyhuICsgMSkgKiAyICsgMV0vKi5MZW4qLztcblxuICAgIGlmICgrK2NvdW50IDwgbWF4X2NvdW50ICYmIGN1cmxlbiA9PT0gbmV4dGxlbikge1xuICAgICAgY29udGludWU7XG5cbiAgICB9IGVsc2UgaWYgKGNvdW50IDwgbWluX2NvdW50KSB7XG4gICAgICBkbyB7IHNlbmRfY29kZShzLCBjdXJsZW4sIHMuYmxfdHJlZSk7IH0gd2hpbGUgKC0tY291bnQgIT09IDApO1xuXG4gICAgfSBlbHNlIGlmIChjdXJsZW4gIT09IDApIHtcbiAgICAgIGlmIChjdXJsZW4gIT09IHByZXZsZW4pIHtcbiAgICAgICAgc2VuZF9jb2RlKHMsIGN1cmxlbiwgcy5ibF90cmVlKTtcbiAgICAgICAgY291bnQtLTtcbiAgICAgIH1cbiAgICAgIC8vQXNzZXJ0KGNvdW50ID49IDMgJiYgY291bnQgPD0gNiwgXCIgM182P1wiKTtcbiAgICAgIHNlbmRfY29kZShzLCBSRVBfM182LCBzLmJsX3RyZWUpO1xuICAgICAgc2VuZF9iaXRzKHMsIGNvdW50IC0gMywgMik7XG5cbiAgICB9IGVsc2UgaWYgKGNvdW50IDw9IDEwKSB7XG4gICAgICBzZW5kX2NvZGUocywgUkVQWl8zXzEwLCBzLmJsX3RyZWUpO1xuICAgICAgc2VuZF9iaXRzKHMsIGNvdW50IC0gMywgMyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgc2VuZF9jb2RlKHMsIFJFUFpfMTFfMTM4LCBzLmJsX3RyZWUpO1xuICAgICAgc2VuZF9iaXRzKHMsIGNvdW50IC0gMTEsIDcpO1xuICAgIH1cblxuICAgIGNvdW50ID0gMDtcbiAgICBwcmV2bGVuID0gY3VybGVuO1xuICAgIGlmIChuZXh0bGVuID09PSAwKSB7XG4gICAgICBtYXhfY291bnQgPSAxMzg7XG4gICAgICBtaW5fY291bnQgPSAzO1xuXG4gICAgfSBlbHNlIGlmIChjdXJsZW4gPT09IG5leHRsZW4pIHtcbiAgICAgIG1heF9jb3VudCA9IDY7XG4gICAgICBtaW5fY291bnQgPSAzO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIG1heF9jb3VudCA9IDc7XG4gICAgICBtaW5fY291bnQgPSA0O1xuICAgIH1cbiAgfVxufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ29uc3RydWN0IHRoZSBIdWZmbWFuIHRyZWUgZm9yIHRoZSBiaXQgbGVuZ3RocyBhbmQgcmV0dXJuIHRoZSBpbmRleCBpblxuICogYmxfb3JkZXIgb2YgdGhlIGxhc3QgYml0IGxlbmd0aCBjb2RlIHRvIHNlbmQuXG4gKi9cbmZ1bmN0aW9uIGJ1aWxkX2JsX3RyZWUocykge1xuICB2YXIgbWF4X2JsaW5kZXg7ICAvKiBpbmRleCBvZiBsYXN0IGJpdCBsZW5ndGggY29kZSBvZiBub24gemVybyBmcmVxICovXG5cbiAgLyogRGV0ZXJtaW5lIHRoZSBiaXQgbGVuZ3RoIGZyZXF1ZW5jaWVzIGZvciBsaXRlcmFsIGFuZCBkaXN0YW5jZSB0cmVlcyAqL1xuICBzY2FuX3RyZWUocywgcy5keW5fbHRyZWUsIHMubF9kZXNjLm1heF9jb2RlKTtcbiAgc2Nhbl90cmVlKHMsIHMuZHluX2R0cmVlLCBzLmRfZGVzYy5tYXhfY29kZSk7XG5cbiAgLyogQnVpbGQgdGhlIGJpdCBsZW5ndGggdHJlZTogKi9cbiAgYnVpbGRfdHJlZShzLCBzLmJsX2Rlc2MpO1xuICAvKiBvcHRfbGVuIG5vdyBpbmNsdWRlcyB0aGUgbGVuZ3RoIG9mIHRoZSB0cmVlIHJlcHJlc2VudGF0aW9ucywgZXhjZXB0XG4gICAqIHRoZSBsZW5ndGhzIG9mIHRoZSBiaXQgbGVuZ3RocyBjb2RlcyBhbmQgdGhlIDUrNSs0IGJpdHMgZm9yIHRoZSBjb3VudHMuXG4gICAqL1xuXG4gIC8qIERldGVybWluZSB0aGUgbnVtYmVyIG9mIGJpdCBsZW5ndGggY29kZXMgdG8gc2VuZC4gVGhlIHBremlwIGZvcm1hdFxuICAgKiByZXF1aXJlcyB0aGF0IGF0IGxlYXN0IDQgYml0IGxlbmd0aCBjb2RlcyBiZSBzZW50LiAoYXBwbm90ZS50eHQgc2F5c1xuICAgKiAzIGJ1dCB0aGUgYWN0dWFsIHZhbHVlIHVzZWQgaXMgNC4pXG4gICAqL1xuICBmb3IgKG1heF9ibGluZGV4ID0gQkxfQ09ERVMgLSAxOyBtYXhfYmxpbmRleCA+PSAzOyBtYXhfYmxpbmRleC0tKSB7XG4gICAgaWYgKHMuYmxfdHJlZVtibF9vcmRlclttYXhfYmxpbmRleF0gKiAyICsgMV0vKi5MZW4qLyAhPT0gMCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIC8qIFVwZGF0ZSBvcHRfbGVuIHRvIGluY2x1ZGUgdGhlIGJpdCBsZW5ndGggdHJlZSBhbmQgY291bnRzICovXG4gIHMub3B0X2xlbiArPSAzICogKG1heF9ibGluZGV4ICsgMSkgKyA1ICsgNSArIDQ7XG4gIC8vVHJhY2V2KChzdGRlcnIsIFwiXFxuZHluIHRyZWVzOiBkeW4gJWxkLCBzdGF0ICVsZFwiLFxuICAvLyAgICAgICAgcy0+b3B0X2xlbiwgcy0+c3RhdGljX2xlbikpO1xuXG4gIHJldHVybiBtYXhfYmxpbmRleDtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFNlbmQgdGhlIGhlYWRlciBmb3IgYSBibG9jayB1c2luZyBkeW5hbWljIEh1ZmZtYW4gdHJlZXM6IHRoZSBjb3VudHMsIHRoZVxuICogbGVuZ3RocyBvZiB0aGUgYml0IGxlbmd0aCBjb2RlcywgdGhlIGxpdGVyYWwgdHJlZSBhbmQgdGhlIGRpc3RhbmNlIHRyZWUuXG4gKiBJTiBhc3NlcnRpb246IGxjb2RlcyA+PSAyNTcsIGRjb2RlcyA+PSAxLCBibGNvZGVzID49IDQuXG4gKi9cbmZ1bmN0aW9uIHNlbmRfYWxsX3RyZWVzKHMsIGxjb2RlcywgZGNvZGVzLCBibGNvZGVzKVxuLy8gICAgZGVmbGF0ZV9zdGF0ZSAqcztcbi8vICAgIGludCBsY29kZXMsIGRjb2RlcywgYmxjb2RlczsgLyogbnVtYmVyIG9mIGNvZGVzIGZvciBlYWNoIHRyZWUgKi9cbntcbiAgdmFyIHJhbms7ICAgICAgICAgICAgICAgICAgICAvKiBpbmRleCBpbiBibF9vcmRlciAqL1xuXG4gIC8vQXNzZXJ0IChsY29kZXMgPj0gMjU3ICYmIGRjb2RlcyA+PSAxICYmIGJsY29kZXMgPj0gNCwgXCJub3QgZW5vdWdoIGNvZGVzXCIpO1xuICAvL0Fzc2VydCAobGNvZGVzIDw9IExfQ09ERVMgJiYgZGNvZGVzIDw9IERfQ09ERVMgJiYgYmxjb2RlcyA8PSBCTF9DT0RFUyxcbiAgLy8gICAgICAgIFwidG9vIG1hbnkgY29kZXNcIik7XG4gIC8vVHJhY2V2KChzdGRlcnIsIFwiXFxuYmwgY291bnRzOiBcIikpO1xuICBzZW5kX2JpdHMocywgbGNvZGVzIC0gMjU3LCA1KTsgLyogbm90ICsyNTUgYXMgc3RhdGVkIGluIGFwcG5vdGUudHh0ICovXG4gIHNlbmRfYml0cyhzLCBkY29kZXMgLSAxLCAgIDUpO1xuICBzZW5kX2JpdHMocywgYmxjb2RlcyAtIDQsICA0KTsgLyogbm90IC0zIGFzIHN0YXRlZCBpbiBhcHBub3RlLnR4dCAqL1xuICBmb3IgKHJhbmsgPSAwOyByYW5rIDwgYmxjb2RlczsgcmFuaysrKSB7XG4gICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJcXG5ibCBjb2RlICUyZCBcIiwgYmxfb3JkZXJbcmFua10pKTtcbiAgICBzZW5kX2JpdHMocywgcy5ibF90cmVlW2JsX29yZGVyW3JhbmtdICogMiArIDFdLyouTGVuKi8sIDMpO1xuICB9XG4gIC8vVHJhY2V2KChzdGRlcnIsIFwiXFxuYmwgdHJlZTogc2VudCAlbGRcIiwgcy0+Yml0c19zZW50KSk7XG5cbiAgc2VuZF90cmVlKHMsIHMuZHluX2x0cmVlLCBsY29kZXMgLSAxKTsgLyogbGl0ZXJhbCB0cmVlICovXG4gIC8vVHJhY2V2KChzdGRlcnIsIFwiXFxubGl0IHRyZWU6IHNlbnQgJWxkXCIsIHMtPmJpdHNfc2VudCkpO1xuXG4gIHNlbmRfdHJlZShzLCBzLmR5bl9kdHJlZSwgZGNvZGVzIC0gMSk7IC8qIGRpc3RhbmNlIHRyZWUgKi9cbiAgLy9UcmFjZXYoKHN0ZGVyciwgXCJcXG5kaXN0IHRyZWU6IHNlbnQgJWxkXCIsIHMtPmJpdHNfc2VudCkpO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogQ2hlY2sgaWYgdGhlIGRhdGEgdHlwZSBpcyBURVhUIG9yIEJJTkFSWSwgdXNpbmcgdGhlIGZvbGxvd2luZyBhbGdvcml0aG06XG4gKiAtIFRFWFQgaWYgdGhlIHR3byBjb25kaXRpb25zIGJlbG93IGFyZSBzYXRpc2ZpZWQ6XG4gKiAgICBhKSBUaGVyZSBhcmUgbm8gbm9uLXBvcnRhYmxlIGNvbnRyb2wgY2hhcmFjdGVycyBiZWxvbmdpbmcgdG8gdGhlXG4gKiAgICAgICBcImJsYWNrIGxpc3RcIiAoMC4uNiwgMTQuLjI1LCAyOC4uMzEpLlxuICogICAgYikgVGhlcmUgaXMgYXQgbGVhc3Qgb25lIHByaW50YWJsZSBjaGFyYWN0ZXIgYmVsb25naW5nIHRvIHRoZVxuICogICAgICAgXCJ3aGl0ZSBsaXN0XCIgKDkge1RBQn0sIDEwIHtMRn0sIDEzIHtDUn0sIDMyLi4yNTUpLlxuICogLSBCSU5BUlkgb3RoZXJ3aXNlLlxuICogLSBUaGUgZm9sbG93aW5nIHBhcnRpYWxseS1wb3J0YWJsZSBjb250cm9sIGNoYXJhY3RlcnMgZm9ybSBhXG4gKiAgIFwiZ3JheSBsaXN0XCIgdGhhdCBpcyBpZ25vcmVkIGluIHRoaXMgZGV0ZWN0aW9uIGFsZ29yaXRobTpcbiAqICAgKDcge0JFTH0sIDgge0JTfSwgMTEge1ZUfSwgMTIge0ZGfSwgMjYge1NVQn0sIDI3IHtFU0N9KS5cbiAqIElOIGFzc2VydGlvbjogdGhlIGZpZWxkcyBGcmVxIG9mIGR5bl9sdHJlZSBhcmUgc2V0LlxuICovXG5mdW5jdGlvbiBkZXRlY3RfZGF0YV90eXBlKHMpIHtcbiAgLyogYmxhY2tfbWFzayBpcyB0aGUgYml0IG1hc2sgb2YgYmxhY2stbGlzdGVkIGJ5dGVzXG4gICAqIHNldCBiaXRzIDAuLjYsIDE0Li4yNSwgYW5kIDI4Li4zMVxuICAgKiAweGYzZmZjMDdmID0gYmluYXJ5IDExMTEwMDExMTExMTExMTExMTAwMDAwMDAxMTExMTExXG4gICAqL1xuICB2YXIgYmxhY2tfbWFzayA9IDB4ZjNmZmMwN2Y7XG4gIHZhciBuO1xuXG4gIC8qIENoZWNrIGZvciBub24tdGV4dHVhbCAoXCJibGFjay1saXN0ZWRcIikgYnl0ZXMuICovXG4gIGZvciAobiA9IDA7IG4gPD0gMzE7IG4rKywgYmxhY2tfbWFzayA+Pj49IDEpIHtcbiAgICBpZiAoKGJsYWNrX21hc2sgJiAxKSAmJiAocy5keW5fbHRyZWVbbiAqIDJdLyouRnJlcSovICE9PSAwKSkge1xuICAgICAgcmV0dXJuIFpfQklOQVJZO1xuICAgIH1cbiAgfVxuXG4gIC8qIENoZWNrIGZvciB0ZXh0dWFsIChcIndoaXRlLWxpc3RlZFwiKSBieXRlcy4gKi9cbiAgaWYgKHMuZHluX2x0cmVlWzkgKiAyXS8qLkZyZXEqLyAhPT0gMCB8fCBzLmR5bl9sdHJlZVsxMCAqIDJdLyouRnJlcSovICE9PSAwIHx8XG4gICAgICBzLmR5bl9sdHJlZVsxMyAqIDJdLyouRnJlcSovICE9PSAwKSB7XG4gICAgcmV0dXJuIFpfVEVYVDtcbiAgfVxuICBmb3IgKG4gPSAzMjsgbiA8IExJVEVSQUxTOyBuKyspIHtcbiAgICBpZiAocy5keW5fbHRyZWVbbiAqIDJdLyouRnJlcSovICE9PSAwKSB7XG4gICAgICByZXR1cm4gWl9URVhUO1xuICAgIH1cbiAgfVxuXG4gIC8qIFRoZXJlIGFyZSBubyBcImJsYWNrLWxpc3RlZFwiIG9yIFwid2hpdGUtbGlzdGVkXCIgYnl0ZXM6XG4gICAqIHRoaXMgc3RyZWFtIGVpdGhlciBpcyBlbXB0eSBvciBoYXMgdG9sZXJhdGVkIChcImdyYXktbGlzdGVkXCIpIGJ5dGVzIG9ubHkuXG4gICAqL1xuICByZXR1cm4gWl9CSU5BUlk7XG59XG5cblxudmFyIHN0YXRpY19pbml0X2RvbmUgPSBmYWxzZTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBJbml0aWFsaXplIHRoZSB0cmVlIGRhdGEgc3RydWN0dXJlcyBmb3IgYSBuZXcgemxpYiBzdHJlYW0uXG4gKi9cbmZ1bmN0aW9uIF90cl9pbml0KHMpXG57XG5cbiAgaWYgKCFzdGF0aWNfaW5pdF9kb25lKSB7XG4gICAgdHJfc3RhdGljX2luaXQoKTtcbiAgICBzdGF0aWNfaW5pdF9kb25lID0gdHJ1ZTtcbiAgfVxuXG4gIHMubF9kZXNjICA9IG5ldyBUcmVlRGVzYyhzLmR5bl9sdHJlZSwgc3RhdGljX2xfZGVzYyk7XG4gIHMuZF9kZXNjICA9IG5ldyBUcmVlRGVzYyhzLmR5bl9kdHJlZSwgc3RhdGljX2RfZGVzYyk7XG4gIHMuYmxfZGVzYyA9IG5ldyBUcmVlRGVzYyhzLmJsX3RyZWUsIHN0YXRpY19ibF9kZXNjKTtcblxuICBzLmJpX2J1ZiA9IDA7XG4gIHMuYmlfdmFsaWQgPSAwO1xuXG4gIC8qIEluaXRpYWxpemUgdGhlIGZpcnN0IGJsb2NrIG9mIHRoZSBmaXJzdCBmaWxlOiAqL1xuICBpbml0X2Jsb2NrKHMpO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogU2VuZCBhIHN0b3JlZCBibG9ja1xuICovXG5mdW5jdGlvbiBfdHJfc3RvcmVkX2Jsb2NrKHMsIGJ1Ziwgc3RvcmVkX2xlbiwgbGFzdClcbi8vRGVmbGF0ZVN0YXRlICpzO1xuLy9jaGFyZiAqYnVmOyAgICAgICAvKiBpbnB1dCBibG9jayAqL1xuLy91bGcgc3RvcmVkX2xlbjsgICAvKiBsZW5ndGggb2YgaW5wdXQgYmxvY2sgKi9cbi8vaW50IGxhc3Q7ICAgICAgICAgLyogb25lIGlmIHRoaXMgaXMgdGhlIGxhc3QgYmxvY2sgZm9yIGEgZmlsZSAqL1xue1xuICBzZW5kX2JpdHMocywgKFNUT1JFRF9CTE9DSyA8PCAxKSArIChsYXN0ID8gMSA6IDApLCAzKTsgICAgLyogc2VuZCBibG9jayB0eXBlICovXG4gIGNvcHlfYmxvY2socywgYnVmLCBzdG9yZWRfbGVuLCB0cnVlKTsgLyogd2l0aCBoZWFkZXIgKi9cbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFNlbmQgb25lIGVtcHR5IHN0YXRpYyBibG9jayB0byBnaXZlIGVub3VnaCBsb29rYWhlYWQgZm9yIGluZmxhdGUuXG4gKiBUaGlzIHRha2VzIDEwIGJpdHMsIG9mIHdoaWNoIDcgbWF5IHJlbWFpbiBpbiB0aGUgYml0IGJ1ZmZlci5cbiAqL1xuZnVuY3Rpb24gX3RyX2FsaWduKHMpIHtcbiAgc2VuZF9iaXRzKHMsIFNUQVRJQ19UUkVFUyA8PCAxLCAzKTtcbiAgc2VuZF9jb2RlKHMsIEVORF9CTE9DSywgc3RhdGljX2x0cmVlKTtcbiAgYmlfZmx1c2gocyk7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBEZXRlcm1pbmUgdGhlIGJlc3QgZW5jb2RpbmcgZm9yIHRoZSBjdXJyZW50IGJsb2NrOiBkeW5hbWljIHRyZWVzLCBzdGF0aWNcbiAqIHRyZWVzIG9yIHN0b3JlLCBhbmQgb3V0cHV0IHRoZSBlbmNvZGVkIGJsb2NrIHRvIHRoZSB6aXAgZmlsZS5cbiAqL1xuZnVuY3Rpb24gX3RyX2ZsdXNoX2Jsb2NrKHMsIGJ1Ziwgc3RvcmVkX2xlbiwgbGFzdClcbi8vRGVmbGF0ZVN0YXRlICpzO1xuLy9jaGFyZiAqYnVmOyAgICAgICAvKiBpbnB1dCBibG9jaywgb3IgTlVMTCBpZiB0b28gb2xkICovXG4vL3VsZyBzdG9yZWRfbGVuOyAgIC8qIGxlbmd0aCBvZiBpbnB1dCBibG9jayAqL1xuLy9pbnQgbGFzdDsgICAgICAgICAvKiBvbmUgaWYgdGhpcyBpcyB0aGUgbGFzdCBibG9jayBmb3IgYSBmaWxlICovXG57XG4gIHZhciBvcHRfbGVuYiwgc3RhdGljX2xlbmI7ICAvKiBvcHRfbGVuIGFuZCBzdGF0aWNfbGVuIGluIGJ5dGVzICovXG4gIHZhciBtYXhfYmxpbmRleCA9IDA7ICAgICAgICAvKiBpbmRleCBvZiBsYXN0IGJpdCBsZW5ndGggY29kZSBvZiBub24gemVybyBmcmVxICovXG5cbiAgLyogQnVpbGQgdGhlIEh1ZmZtYW4gdHJlZXMgdW5sZXNzIGEgc3RvcmVkIGJsb2NrIGlzIGZvcmNlZCAqL1xuICBpZiAocy5sZXZlbCA+IDApIHtcblxuICAgIC8qIENoZWNrIGlmIHRoZSBmaWxlIGlzIGJpbmFyeSBvciB0ZXh0ICovXG4gICAgaWYgKHMuc3RybS5kYXRhX3R5cGUgPT09IFpfVU5LTk9XTikge1xuICAgICAgcy5zdHJtLmRhdGFfdHlwZSA9IGRldGVjdF9kYXRhX3R5cGUocyk7XG4gICAgfVxuXG4gICAgLyogQ29uc3RydWN0IHRoZSBsaXRlcmFsIGFuZCBkaXN0YW5jZSB0cmVlcyAqL1xuICAgIGJ1aWxkX3RyZWUocywgcy5sX2Rlc2MpO1xuICAgIC8vIFRyYWNldigoc3RkZXJyLCBcIlxcbmxpdCBkYXRhOiBkeW4gJWxkLCBzdGF0ICVsZFwiLCBzLT5vcHRfbGVuLFxuICAgIC8vICAgICAgICBzLT5zdGF0aWNfbGVuKSk7XG5cbiAgICBidWlsZF90cmVlKHMsIHMuZF9kZXNjKTtcbiAgICAvLyBUcmFjZXYoKHN0ZGVyciwgXCJcXG5kaXN0IGRhdGE6IGR5biAlbGQsIHN0YXQgJWxkXCIsIHMtPm9wdF9sZW4sXG4gICAgLy8gICAgICAgIHMtPnN0YXRpY19sZW4pKTtcbiAgICAvKiBBdCB0aGlzIHBvaW50LCBvcHRfbGVuIGFuZCBzdGF0aWNfbGVuIGFyZSB0aGUgdG90YWwgYml0IGxlbmd0aHMgb2ZcbiAgICAgKiB0aGUgY29tcHJlc3NlZCBibG9jayBkYXRhLCBleGNsdWRpbmcgdGhlIHRyZWUgcmVwcmVzZW50YXRpb25zLlxuICAgICAqL1xuXG4gICAgLyogQnVpbGQgdGhlIGJpdCBsZW5ndGggdHJlZSBmb3IgdGhlIGFib3ZlIHR3byB0cmVlcywgYW5kIGdldCB0aGUgaW5kZXhcbiAgICAgKiBpbiBibF9vcmRlciBvZiB0aGUgbGFzdCBiaXQgbGVuZ3RoIGNvZGUgdG8gc2VuZC5cbiAgICAgKi9cbiAgICBtYXhfYmxpbmRleCA9IGJ1aWxkX2JsX3RyZWUocyk7XG5cbiAgICAvKiBEZXRlcm1pbmUgdGhlIGJlc3QgZW5jb2RpbmcuIENvbXB1dGUgdGhlIGJsb2NrIGxlbmd0aHMgaW4gYnl0ZXMuICovXG4gICAgb3B0X2xlbmIgPSAocy5vcHRfbGVuICsgMyArIDcpID4+PiAzO1xuICAgIHN0YXRpY19sZW5iID0gKHMuc3RhdGljX2xlbiArIDMgKyA3KSA+Pj4gMztcblxuICAgIC8vIFRyYWNldigoc3RkZXJyLCBcIlxcbm9wdCAlbHUoJWx1KSBzdGF0ICVsdSglbHUpIHN0b3JlZCAlbHUgbGl0ICV1IFwiLFxuICAgIC8vICAgICAgICBvcHRfbGVuYiwgcy0+b3B0X2xlbiwgc3RhdGljX2xlbmIsIHMtPnN0YXRpY19sZW4sIHN0b3JlZF9sZW4sXG4gICAgLy8gICAgICAgIHMtPmxhc3RfbGl0KSk7XG5cbiAgICBpZiAoc3RhdGljX2xlbmIgPD0gb3B0X2xlbmIpIHsgb3B0X2xlbmIgPSBzdGF0aWNfbGVuYjsgfVxuXG4gIH0gZWxzZSB7XG4gICAgLy8gQXNzZXJ0KGJ1ZiAhPSAoY2hhciopMCwgXCJsb3N0IGJ1ZlwiKTtcbiAgICBvcHRfbGVuYiA9IHN0YXRpY19sZW5iID0gc3RvcmVkX2xlbiArIDU7IC8qIGZvcmNlIGEgc3RvcmVkIGJsb2NrICovXG4gIH1cblxuICBpZiAoKHN0b3JlZF9sZW4gKyA0IDw9IG9wdF9sZW5iKSAmJiAoYnVmICE9PSAtMSkpIHtcbiAgICAvKiA0OiB0d28gd29yZHMgZm9yIHRoZSBsZW5ndGhzICovXG5cbiAgICAvKiBUaGUgdGVzdCBidWYgIT0gTlVMTCBpcyBvbmx5IG5lY2Vzc2FyeSBpZiBMSVRfQlVGU0laRSA+IFdTSVpFLlxuICAgICAqIE90aGVyd2lzZSB3ZSBjYW4ndCBoYXZlIHByb2Nlc3NlZCBtb3JlIHRoYW4gV1NJWkUgaW5wdXQgYnl0ZXMgc2luY2VcbiAgICAgKiB0aGUgbGFzdCBibG9jayBmbHVzaCwgYmVjYXVzZSBjb21wcmVzc2lvbiB3b3VsZCBoYXZlIGJlZW5cbiAgICAgKiBzdWNjZXNzZnVsLiBJZiBMSVRfQlVGU0laRSA8PSBXU0laRSwgaXQgaXMgbmV2ZXIgdG9vIGxhdGUgdG9cbiAgICAgKiB0cmFuc2Zvcm0gYSBibG9jayBpbnRvIGEgc3RvcmVkIGJsb2NrLlxuICAgICAqL1xuICAgIF90cl9zdG9yZWRfYmxvY2socywgYnVmLCBzdG9yZWRfbGVuLCBsYXN0KTtcblxuICB9IGVsc2UgaWYgKHMuc3RyYXRlZ3kgPT09IFpfRklYRUQgfHwgc3RhdGljX2xlbmIgPT09IG9wdF9sZW5iKSB7XG5cbiAgICBzZW5kX2JpdHMocywgKFNUQVRJQ19UUkVFUyA8PCAxKSArIChsYXN0ID8gMSA6IDApLCAzKTtcbiAgICBjb21wcmVzc19ibG9jayhzLCBzdGF0aWNfbHRyZWUsIHN0YXRpY19kdHJlZSk7XG5cbiAgfSBlbHNlIHtcbiAgICBzZW5kX2JpdHMocywgKERZTl9UUkVFUyA8PCAxKSArIChsYXN0ID8gMSA6IDApLCAzKTtcbiAgICBzZW5kX2FsbF90cmVlcyhzLCBzLmxfZGVzYy5tYXhfY29kZSArIDEsIHMuZF9kZXNjLm1heF9jb2RlICsgMSwgbWF4X2JsaW5kZXggKyAxKTtcbiAgICBjb21wcmVzc19ibG9jayhzLCBzLmR5bl9sdHJlZSwgcy5keW5fZHRyZWUpO1xuICB9XG4gIC8vIEFzc2VydCAocy0+Y29tcHJlc3NlZF9sZW4gPT0gcy0+Yml0c19zZW50LCBcImJhZCBjb21wcmVzc2VkIHNpemVcIik7XG4gIC8qIFRoZSBhYm92ZSBjaGVjayBpcyBtYWRlIG1vZCAyXjMyLCBmb3IgZmlsZXMgbGFyZ2VyIHRoYW4gNTEyIE1CXG4gICAqIGFuZCB1TG9uZyBpbXBsZW1lbnRlZCBvbiAzMiBiaXRzLlxuICAgKi9cbiAgaW5pdF9ibG9jayhzKTtcblxuICBpZiAobGFzdCkge1xuICAgIGJpX3dpbmR1cChzKTtcbiAgfVxuICAvLyBUcmFjZXYoKHN0ZGVycixcIlxcbmNvbXBybGVuICVsdSglbHUpIFwiLCBzLT5jb21wcmVzc2VkX2xlbj4+MyxcbiAgLy8gICAgICAgcy0+Y29tcHJlc3NlZF9sZW4tNypsYXN0KSk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogU2F2ZSB0aGUgbWF0Y2ggaW5mbyBhbmQgdGFsbHkgdGhlIGZyZXF1ZW5jeSBjb3VudHMuIFJldHVybiB0cnVlIGlmXG4gKiB0aGUgY3VycmVudCBibG9jayBtdXN0IGJlIGZsdXNoZWQuXG4gKi9cbmZ1bmN0aW9uIF90cl90YWxseShzLCBkaXN0LCBsYylcbi8vICAgIGRlZmxhdGVfc3RhdGUgKnM7XG4vLyAgICB1bnNpZ25lZCBkaXN0OyAgLyogZGlzdGFuY2Ugb2YgbWF0Y2hlZCBzdHJpbmcgKi9cbi8vICAgIHVuc2lnbmVkIGxjOyAgICAvKiBtYXRjaCBsZW5ndGgtTUlOX01BVENIIG9yIHVubWF0Y2hlZCBjaGFyIChpZiBkaXN0PT0wKSAqL1xue1xuICAvL3ZhciBvdXRfbGVuZ3RoLCBpbl9sZW5ndGgsIGRjb2RlO1xuXG4gIHMucGVuZGluZ19idWZbcy5kX2J1ZiArIHMubGFzdF9saXQgKiAyXSAgICAgPSAoZGlzdCA+Pj4gOCkgJiAweGZmO1xuICBzLnBlbmRpbmdfYnVmW3MuZF9idWYgKyBzLmxhc3RfbGl0ICogMiArIDFdID0gZGlzdCAmIDB4ZmY7XG5cbiAgcy5wZW5kaW5nX2J1ZltzLmxfYnVmICsgcy5sYXN0X2xpdF0gPSBsYyAmIDB4ZmY7XG4gIHMubGFzdF9saXQrKztcblxuICBpZiAoZGlzdCA9PT0gMCkge1xuICAgIC8qIGxjIGlzIHRoZSB1bm1hdGNoZWQgY2hhciAqL1xuICAgIHMuZHluX2x0cmVlW2xjICogMl0vKi5GcmVxKi8rKztcbiAgfSBlbHNlIHtcbiAgICBzLm1hdGNoZXMrKztcbiAgICAvKiBIZXJlLCBsYyBpcyB0aGUgbWF0Y2ggbGVuZ3RoIC0gTUlOX01BVENIICovXG4gICAgZGlzdC0tOyAgICAgICAgICAgICAvKiBkaXN0ID0gbWF0Y2ggZGlzdGFuY2UgLSAxICovXG4gICAgLy9Bc3NlcnQoKHVzaClkaXN0IDwgKHVzaClNQVhfRElTVChzKSAmJlxuICAgIC8vICAgICAgICh1c2gpbGMgPD0gKHVzaCkoTUFYX01BVENILU1JTl9NQVRDSCkgJiZcbiAgICAvLyAgICAgICAodXNoKWRfY29kZShkaXN0KSA8ICh1c2gpRF9DT0RFUywgIFwiX3RyX3RhbGx5OiBiYWQgbWF0Y2hcIik7XG5cbiAgICBzLmR5bl9sdHJlZVsoX2xlbmd0aF9jb2RlW2xjXSArIExJVEVSQUxTICsgMSkgKiAyXS8qLkZyZXEqLysrO1xuICAgIHMuZHluX2R0cmVlW2RfY29kZShkaXN0KSAqIDJdLyouRnJlcSovKys7XG4gIH1cblxuLy8gKCEpIFRoaXMgYmxvY2sgaXMgZGlzYWJsZWQgaW4gemxpYiBkZWZhdWx0cyxcbi8vIGRvbid0IGVuYWJsZSBpdCBmb3IgYmluYXJ5IGNvbXBhdGliaWxpdHlcblxuLy8jaWZkZWYgVFJVTkNBVEVfQkxPQ0tcbi8vICAvKiBUcnkgdG8gZ3Vlc3MgaWYgaXQgaXMgcHJvZml0YWJsZSB0byBzdG9wIHRoZSBjdXJyZW50IGJsb2NrIGhlcmUgKi9cbi8vICBpZiAoKHMubGFzdF9saXQgJiAweDFmZmYpID09PSAwICYmIHMubGV2ZWwgPiAyKSB7XG4vLyAgICAvKiBDb21wdXRlIGFuIHVwcGVyIGJvdW5kIGZvciB0aGUgY29tcHJlc3NlZCBsZW5ndGggKi9cbi8vICAgIG91dF9sZW5ndGggPSBzLmxhc3RfbGl0Kjg7XG4vLyAgICBpbl9sZW5ndGggPSBzLnN0cnN0YXJ0IC0gcy5ibG9ja19zdGFydDtcbi8vXG4vLyAgICBmb3IgKGRjb2RlID0gMDsgZGNvZGUgPCBEX0NPREVTOyBkY29kZSsrKSB7XG4vLyAgICAgIG91dF9sZW5ndGggKz0gcy5keW5fZHRyZWVbZGNvZGUqMl0vKi5GcmVxKi8gKiAoNSArIGV4dHJhX2RiaXRzW2Rjb2RlXSk7XG4vLyAgICB9XG4vLyAgICBvdXRfbGVuZ3RoID4+Pj0gMztcbi8vICAgIC8vVHJhY2V2KChzdGRlcnIsXCJcXG5sYXN0X2xpdCAldSwgaW4gJWxkLCBvdXQgfiVsZCglbGQlJSkgXCIsXG4vLyAgICAvLyAgICAgICBzLT5sYXN0X2xpdCwgaW5fbGVuZ3RoLCBvdXRfbGVuZ3RoLFxuLy8gICAgLy8gICAgICAgMTAwTCAtIG91dF9sZW5ndGgqMTAwTC9pbl9sZW5ndGgpKTtcbi8vICAgIGlmIChzLm1hdGNoZXMgPCAocy5sYXN0X2xpdD4+MSkvKmludCAvMiovICYmIG91dF9sZW5ndGggPCAoaW5fbGVuZ3RoPj4xKS8qaW50IC8yKi8pIHtcbi8vICAgICAgcmV0dXJuIHRydWU7XG4vLyAgICB9XG4vLyAgfVxuLy8jZW5kaWZcblxuICByZXR1cm4gKHMubGFzdF9saXQgPT09IHMubGl0X2J1ZnNpemUgLSAxKTtcbiAgLyogV2UgYXZvaWQgZXF1YWxpdHkgd2l0aCBsaXRfYnVmc2l6ZSBiZWNhdXNlIG9mIHdyYXBhcm91bmQgYXQgNjRLXG4gICAqIG9uIDE2IGJpdCBtYWNoaW5lcyBhbmQgYmVjYXVzZSBzdG9yZWQgYmxvY2tzIGFyZSByZXN0cmljdGVkIHRvXG4gICAqIDY0Sy0xIGJ5dGVzLlxuICAgKi9cbn1cblxuZXhwb3J0cy5fdHJfaW5pdCAgPSBfdHJfaW5pdDtcbmV4cG9ydHMuX3RyX3N0b3JlZF9ibG9jayA9IF90cl9zdG9yZWRfYmxvY2s7XG5leHBvcnRzLl90cl9mbHVzaF9ibG9jayAgPSBfdHJfZmx1c2hfYmxvY2s7XG5leHBvcnRzLl90cl90YWxseSA9IF90cl90YWxseTtcbmV4cG9ydHMuX3RyX2FsaWduID0gX3RyX2FsaWduO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLy8gTm90ZTogYWRsZXIzMiB0YWtlcyAxMiUgZm9yIGxldmVsIDAgYW5kIDIlIGZvciBsZXZlbCA2LlxuLy8gSXQgaXNuJ3Qgd29ydGggaXQgdG8gbWFrZSBhZGRpdGlvbmFsIG9wdGltaXphdGlvbnMgYXMgaW4gb3JpZ2luYWwuXG4vLyBTbWFsbCBzaXplIGlzIHByZWZlcmFibGUuXG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxuZnVuY3Rpb24gYWRsZXIzMihhZGxlciwgYnVmLCBsZW4sIHBvcykge1xuICB2YXIgczEgPSAoYWRsZXIgJiAweGZmZmYpIHwwLFxuICAgICAgczIgPSAoKGFkbGVyID4+PiAxNikgJiAweGZmZmYpIHwwLFxuICAgICAgbiA9IDA7XG5cbiAgd2hpbGUgKGxlbiAhPT0gMCkge1xuICAgIC8vIFNldCBsaW1pdCB+IHR3aWNlIGxlc3MgdGhhbiA1NTUyLCB0byBrZWVwXG4gICAgLy8gczIgaW4gMzEtYml0cywgYmVjYXVzZSB3ZSBmb3JjZSBzaWduZWQgaW50cy5cbiAgICAvLyBpbiBvdGhlciBjYXNlICU9IHdpbGwgZmFpbC5cbiAgICBuID0gbGVuID4gMjAwMCA/IDIwMDAgOiBsZW47XG4gICAgbGVuIC09IG47XG5cbiAgICBkbyB7XG4gICAgICBzMSA9IChzMSArIGJ1Zltwb3MrK10pIHwwO1xuICAgICAgczIgPSAoczIgKyBzMSkgfDA7XG4gICAgfSB3aGlsZSAoLS1uKTtcblxuICAgIHMxICU9IDY1NTIxO1xuICAgIHMyICU9IDY1NTIxO1xuICB9XG5cbiAgcmV0dXJuIChzMSB8IChzMiA8PCAxNikpIHwwO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gYWRsZXIzMjtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIE5vdGU6IHdlIGNhbid0IGdldCBzaWduaWZpY2FudCBzcGVlZCBib29zdCBoZXJlLlxuLy8gU28gd3JpdGUgY29kZSB0byBtaW5pbWl6ZSBzaXplIC0gbm8gcHJlZ2VuZXJhdGVkIHRhYmxlc1xuLy8gYW5kIGFycmF5IHRvb2xzIGRlcGVuZGVuY2llcy5cblxuLy8gKEMpIDE5OTUtMjAxMyBKZWFuLWxvdXAgR2FpbGx5IGFuZCBNYXJrIEFkbGVyXG4vLyAoQykgMjAxNC0yMDE3IFZpdGFseSBQdXpyaW4gYW5kIEFuZHJleSBUdXBpdHNpblxuLy9cbi8vIFRoaXMgc29mdHdhcmUgaXMgcHJvdmlkZWQgJ2FzLWlzJywgd2l0aG91dCBhbnkgZXhwcmVzcyBvciBpbXBsaWVkXG4vLyB3YXJyYW50eS4gSW4gbm8gZXZlbnQgd2lsbCB0aGUgYXV0aG9ycyBiZSBoZWxkIGxpYWJsZSBmb3IgYW55IGRhbWFnZXNcbi8vIGFyaXNpbmcgZnJvbSB0aGUgdXNlIG9mIHRoaXMgc29mdHdhcmUuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBncmFudGVkIHRvIGFueW9uZSB0byB1c2UgdGhpcyBzb2Z0d2FyZSBmb3IgYW55IHB1cnBvc2UsXG4vLyBpbmNsdWRpbmcgY29tbWVyY2lhbCBhcHBsaWNhdGlvbnMsIGFuZCB0byBhbHRlciBpdCBhbmQgcmVkaXN0cmlidXRlIGl0XG4vLyBmcmVlbHksIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyByZXN0cmljdGlvbnM6XG4vL1xuLy8gMS4gVGhlIG9yaWdpbiBvZiB0aGlzIHNvZnR3YXJlIG11c3Qgbm90IGJlIG1pc3JlcHJlc2VudGVkOyB5b3UgbXVzdCBub3Rcbi8vICAgY2xhaW0gdGhhdCB5b3Ugd3JvdGUgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLiBJZiB5b3UgdXNlIHRoaXMgc29mdHdhcmVcbi8vICAgaW4gYSBwcm9kdWN0LCBhbiBhY2tub3dsZWRnbWVudCBpbiB0aGUgcHJvZHVjdCBkb2N1bWVudGF0aW9uIHdvdWxkIGJlXG4vLyAgIGFwcHJlY2lhdGVkIGJ1dCBpcyBub3QgcmVxdWlyZWQuXG4vLyAyLiBBbHRlcmVkIHNvdXJjZSB2ZXJzaW9ucyBtdXN0IGJlIHBsYWlubHkgbWFya2VkIGFzIHN1Y2gsIGFuZCBtdXN0IG5vdCBiZVxuLy8gICBtaXNyZXByZXNlbnRlZCBhcyBiZWluZyB0aGUgb3JpZ2luYWwgc29mdHdhcmUuXG4vLyAzLiBUaGlzIG5vdGljZSBtYXkgbm90IGJlIHJlbW92ZWQgb3IgYWx0ZXJlZCBmcm9tIGFueSBzb3VyY2UgZGlzdHJpYnV0aW9uLlxuXG4vLyBVc2Ugb3JkaW5hcnkgYXJyYXksIHNpbmNlIHVudHlwZWQgbWFrZXMgbm8gYm9vc3QgaGVyZVxuZnVuY3Rpb24gbWFrZVRhYmxlKCkge1xuICB2YXIgYywgdGFibGUgPSBbXTtcblxuICBmb3IgKHZhciBuID0gMDsgbiA8IDI1NjsgbisrKSB7XG4gICAgYyA9IG47XG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCA4OyBrKyspIHtcbiAgICAgIGMgPSAoKGMgJiAxKSA/ICgweEVEQjg4MzIwIF4gKGMgPj4+IDEpKSA6IChjID4+PiAxKSk7XG4gICAgfVxuICAgIHRhYmxlW25dID0gYztcbiAgfVxuXG4gIHJldHVybiB0YWJsZTtcbn1cblxuLy8gQ3JlYXRlIHRhYmxlIG9uIGxvYWQuIEp1c3QgMjU1IHNpZ25lZCBsb25ncy4gTm90IGEgcHJvYmxlbS5cbnZhciBjcmNUYWJsZSA9IG1ha2VUYWJsZSgpO1xuXG5cbmZ1bmN0aW9uIGNyYzMyKGNyYywgYnVmLCBsZW4sIHBvcykge1xuICB2YXIgdCA9IGNyY1RhYmxlLFxuICAgICAgZW5kID0gcG9zICsgbGVuO1xuXG4gIGNyYyBePSAtMTtcblxuICBmb3IgKHZhciBpID0gcG9zOyBpIDwgZW5kOyBpKyspIHtcbiAgICBjcmMgPSAoY3JjID4+PiA4KSBeIHRbKGNyYyBeIGJ1ZltpXSkgJiAweEZGXTtcbiAgfVxuXG4gIHJldHVybiAoY3JjIF4gKC0xKSk7IC8vID4+PiAwO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY3JjMzI7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vLyAoQykgMTk5NS0yMDEzIEplYW4tbG91cCBHYWlsbHkgYW5kIE1hcmsgQWRsZXJcbi8vIChDKSAyMDE0LTIwMTcgVml0YWx5IFB1enJpbiBhbmQgQW5kcmV5IFR1cGl0c2luXG4vL1xuLy8gVGhpcyBzb2Z0d2FyZSBpcyBwcm92aWRlZCAnYXMtaXMnLCB3aXRob3V0IGFueSBleHByZXNzIG9yIGltcGxpZWRcbi8vIHdhcnJhbnR5LiBJbiBubyBldmVudCB3aWxsIHRoZSBhdXRob3JzIGJlIGhlbGQgbGlhYmxlIGZvciBhbnkgZGFtYWdlc1xuLy8gYXJpc2luZyBmcm9tIHRoZSB1c2Ugb2YgdGhpcyBzb2Z0d2FyZS5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGdyYW50ZWQgdG8gYW55b25lIHRvIHVzZSB0aGlzIHNvZnR3YXJlIGZvciBhbnkgcHVycG9zZSxcbi8vIGluY2x1ZGluZyBjb21tZXJjaWFsIGFwcGxpY2F0aW9ucywgYW5kIHRvIGFsdGVyIGl0IGFuZCByZWRpc3RyaWJ1dGUgaXRcbi8vIGZyZWVseSwgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIHJlc3RyaWN0aW9uczpcbi8vXG4vLyAxLiBUaGUgb3JpZ2luIG9mIHRoaXMgc29mdHdhcmUgbXVzdCBub3QgYmUgbWlzcmVwcmVzZW50ZWQ7IHlvdSBtdXN0IG5vdFxuLy8gICBjbGFpbSB0aGF0IHlvdSB3cm90ZSB0aGUgb3JpZ2luYWwgc29mdHdhcmUuIElmIHlvdSB1c2UgdGhpcyBzb2Z0d2FyZVxuLy8gICBpbiBhIHByb2R1Y3QsIGFuIGFja25vd2xlZGdtZW50IGluIHRoZSBwcm9kdWN0IGRvY3VtZW50YXRpb24gd291bGQgYmVcbi8vICAgYXBwcmVjaWF0ZWQgYnV0IGlzIG5vdCByZXF1aXJlZC5cbi8vIDIuIEFsdGVyZWQgc291cmNlIHZlcnNpb25zIG11c3QgYmUgcGxhaW5seSBtYXJrZWQgYXMgc3VjaCwgYW5kIG11c3Qgbm90IGJlXG4vLyAgIG1pc3JlcHJlc2VudGVkIGFzIGJlaW5nIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS5cbi8vIDMuIFRoaXMgbm90aWNlIG1heSBub3QgYmUgcmVtb3ZlZCBvciBhbHRlcmVkIGZyb20gYW55IHNvdXJjZSBkaXN0cmlidXRpb24uXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAyOiAgICAgICduZWVkIGRpY3Rpb25hcnknLCAgICAgLyogWl9ORUVEX0RJQ1QgICAgICAgMiAgKi9cbiAgMTogICAgICAnc3RyZWFtIGVuZCcsICAgICAgICAgIC8qIFpfU1RSRUFNX0VORCAgICAgIDEgICovXG4gIDA6ICAgICAgJycsICAgICAgICAgICAgICAgICAgICAvKiBaX09LICAgICAgICAgICAgICAwICAqL1xuICAnLTEnOiAgICdmaWxlIGVycm9yJywgICAgICAgICAgLyogWl9FUlJOTyAgICAgICAgICgtMSkgKi9cbiAgJy0yJzogICAnc3RyZWFtIGVycm9yJywgICAgICAgIC8qIFpfU1RSRUFNX0VSUk9SICAoLTIpICovXG4gICctMyc6ICAgJ2RhdGEgZXJyb3InLCAgICAgICAgICAvKiBaX0RBVEFfRVJST1IgICAgKC0zKSAqL1xuICAnLTQnOiAgICdpbnN1ZmZpY2llbnQgbWVtb3J5JywgLyogWl9NRU1fRVJST1IgICAgICgtNCkgKi9cbiAgJy01JzogICAnYnVmZmVyIGVycm9yJywgICAgICAgIC8qIFpfQlVGX0VSUk9SICAgICAoLTUpICovXG4gICctNic6ICAgJ2luY29tcGF0aWJsZSB2ZXJzaW9uJyAvKiBaX1ZFUlNJT05fRVJST1IgKC02KSAqL1xufTtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxudmFyIHV0aWxzICAgPSByZXF1aXJlKCcuLi91dGlscy9jb21tb24nKTtcbnZhciB0cmVlcyAgID0gcmVxdWlyZSgnLi90cmVlcycpO1xudmFyIGFkbGVyMzIgPSByZXF1aXJlKCcuL2FkbGVyMzInKTtcbnZhciBjcmMzMiAgID0gcmVxdWlyZSgnLi9jcmMzMicpO1xudmFyIG1zZyAgICAgPSByZXF1aXJlKCcuL21lc3NhZ2VzJyk7XG5cbi8qIFB1YmxpYyBjb25zdGFudHMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG5cbi8qIEFsbG93ZWQgZmx1c2ggdmFsdWVzOyBzZWUgZGVmbGF0ZSgpIGFuZCBpbmZsYXRlKCkgYmVsb3cgZm9yIGRldGFpbHMgKi9cbnZhciBaX05PX0ZMVVNIICAgICAgPSAwO1xudmFyIFpfUEFSVElBTF9GTFVTSCA9IDE7XG4vL3ZhciBaX1NZTkNfRkxVU0ggICAgPSAyO1xudmFyIFpfRlVMTF9GTFVTSCAgICA9IDM7XG52YXIgWl9GSU5JU0ggICAgICAgID0gNDtcbnZhciBaX0JMT0NLICAgICAgICAgPSA1O1xuLy92YXIgWl9UUkVFUyAgICAgICAgID0gNjtcblxuXG4vKiBSZXR1cm4gY29kZXMgZm9yIHRoZSBjb21wcmVzc2lvbi9kZWNvbXByZXNzaW9uIGZ1bmN0aW9ucy4gTmVnYXRpdmUgdmFsdWVzXG4gKiBhcmUgZXJyb3JzLCBwb3NpdGl2ZSB2YWx1ZXMgYXJlIHVzZWQgZm9yIHNwZWNpYWwgYnV0IG5vcm1hbCBldmVudHMuXG4gKi9cbnZhciBaX09LICAgICAgICAgICAgPSAwO1xudmFyIFpfU1RSRUFNX0VORCAgICA9IDE7XG4vL3ZhciBaX05FRURfRElDVCAgICAgPSAyO1xuLy92YXIgWl9FUlJOTyAgICAgICAgID0gLTE7XG52YXIgWl9TVFJFQU1fRVJST1IgID0gLTI7XG52YXIgWl9EQVRBX0VSUk9SICAgID0gLTM7XG4vL3ZhciBaX01FTV9FUlJPUiAgICAgPSAtNDtcbnZhciBaX0JVRl9FUlJPUiAgICAgPSAtNTtcbi8vdmFyIFpfVkVSU0lPTl9FUlJPUiA9IC02O1xuXG5cbi8qIGNvbXByZXNzaW9uIGxldmVscyAqL1xuLy92YXIgWl9OT19DT01QUkVTU0lPTiAgICAgID0gMDtcbi8vdmFyIFpfQkVTVF9TUEVFRCAgICAgICAgICA9IDE7XG4vL3ZhciBaX0JFU1RfQ09NUFJFU1NJT04gICAgPSA5O1xudmFyIFpfREVGQVVMVF9DT01QUkVTU0lPTiA9IC0xO1xuXG5cbnZhciBaX0ZJTFRFUkVEICAgICAgICAgICAgPSAxO1xudmFyIFpfSFVGRk1BTl9PTkxZICAgICAgICA9IDI7XG52YXIgWl9STEUgICAgICAgICAgICAgICAgID0gMztcbnZhciBaX0ZJWEVEICAgICAgICAgICAgICAgPSA0O1xudmFyIFpfREVGQVVMVF9TVFJBVEVHWSAgICA9IDA7XG5cbi8qIFBvc3NpYmxlIHZhbHVlcyBvZiB0aGUgZGF0YV90eXBlIGZpZWxkICh0aG91Z2ggc2VlIGluZmxhdGUoKSkgKi9cbi8vdmFyIFpfQklOQVJZICAgICAgICAgICAgICA9IDA7XG4vL3ZhciBaX1RFWFQgICAgICAgICAgICAgICAgPSAxO1xuLy92YXIgWl9BU0NJSSAgICAgICAgICAgICAgID0gMTsgLy8gPSBaX1RFWFRcbnZhciBaX1VOS05PV04gICAgICAgICAgICAgPSAyO1xuXG5cbi8qIFRoZSBkZWZsYXRlIGNvbXByZXNzaW9uIG1ldGhvZCAqL1xudmFyIFpfREVGTEFURUQgID0gODtcblxuLyo9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxuXG52YXIgTUFYX01FTV9MRVZFTCA9IDk7XG4vKiBNYXhpbXVtIHZhbHVlIGZvciBtZW1MZXZlbCBpbiBkZWZsYXRlSW5pdDIgKi9cbnZhciBNQVhfV0JJVFMgPSAxNTtcbi8qIDMySyBMWjc3IHdpbmRvdyAqL1xudmFyIERFRl9NRU1fTEVWRUwgPSA4O1xuXG5cbnZhciBMRU5HVEhfQ09ERVMgID0gMjk7XG4vKiBudW1iZXIgb2YgbGVuZ3RoIGNvZGVzLCBub3QgY291bnRpbmcgdGhlIHNwZWNpYWwgRU5EX0JMT0NLIGNvZGUgKi9cbnZhciBMSVRFUkFMUyAgICAgID0gMjU2O1xuLyogbnVtYmVyIG9mIGxpdGVyYWwgYnl0ZXMgMC4uMjU1ICovXG52YXIgTF9DT0RFUyAgICAgICA9IExJVEVSQUxTICsgMSArIExFTkdUSF9DT0RFUztcbi8qIG51bWJlciBvZiBMaXRlcmFsIG9yIExlbmd0aCBjb2RlcywgaW5jbHVkaW5nIHRoZSBFTkRfQkxPQ0sgY29kZSAqL1xudmFyIERfQ09ERVMgICAgICAgPSAzMDtcbi8qIG51bWJlciBvZiBkaXN0YW5jZSBjb2RlcyAqL1xudmFyIEJMX0NPREVTICAgICAgPSAxOTtcbi8qIG51bWJlciBvZiBjb2RlcyB1c2VkIHRvIHRyYW5zZmVyIHRoZSBiaXQgbGVuZ3RocyAqL1xudmFyIEhFQVBfU0laRSAgICAgPSAyICogTF9DT0RFUyArIDE7XG4vKiBtYXhpbXVtIGhlYXAgc2l6ZSAqL1xudmFyIE1BWF9CSVRTICA9IDE1O1xuLyogQWxsIGNvZGVzIG11c3Qgbm90IGV4Y2VlZCBNQVhfQklUUyBiaXRzICovXG5cbnZhciBNSU5fTUFUQ0ggPSAzO1xudmFyIE1BWF9NQVRDSCA9IDI1ODtcbnZhciBNSU5fTE9PS0FIRUFEID0gKE1BWF9NQVRDSCArIE1JTl9NQVRDSCArIDEpO1xuXG52YXIgUFJFU0VUX0RJQ1QgPSAweDIwO1xuXG52YXIgSU5JVF9TVEFURSA9IDQyO1xudmFyIEVYVFJBX1NUQVRFID0gNjk7XG52YXIgTkFNRV9TVEFURSA9IDczO1xudmFyIENPTU1FTlRfU1RBVEUgPSA5MTtcbnZhciBIQ1JDX1NUQVRFID0gMTAzO1xudmFyIEJVU1lfU1RBVEUgPSAxMTM7XG52YXIgRklOSVNIX1NUQVRFID0gNjY2O1xuXG52YXIgQlNfTkVFRF9NT1JFICAgICAgPSAxOyAvKiBibG9jayBub3QgY29tcGxldGVkLCBuZWVkIG1vcmUgaW5wdXQgb3IgbW9yZSBvdXRwdXQgKi9cbnZhciBCU19CTE9DS19ET05FICAgICA9IDI7IC8qIGJsb2NrIGZsdXNoIHBlcmZvcm1lZCAqL1xudmFyIEJTX0ZJTklTSF9TVEFSVEVEID0gMzsgLyogZmluaXNoIHN0YXJ0ZWQsIG5lZWQgb25seSBtb3JlIG91dHB1dCBhdCBuZXh0IGRlZmxhdGUgKi9cbnZhciBCU19GSU5JU0hfRE9ORSAgICA9IDQ7IC8qIGZpbmlzaCBkb25lLCBhY2NlcHQgbm8gbW9yZSBpbnB1dCBvciBvdXRwdXQgKi9cblxudmFyIE9TX0NPREUgPSAweDAzOyAvLyBVbml4IDopIC4gRG9uJ3QgZGV0ZWN0LCB1c2UgdGhpcyBkZWZhdWx0LlxuXG5mdW5jdGlvbiBlcnIoc3RybSwgZXJyb3JDb2RlKSB7XG4gIHN0cm0ubXNnID0gbXNnW2Vycm9yQ29kZV07XG4gIHJldHVybiBlcnJvckNvZGU7XG59XG5cbmZ1bmN0aW9uIHJhbmsoZikge1xuICByZXR1cm4gKChmKSA8PCAxKSAtICgoZikgPiA0ID8gOSA6IDApO1xufVxuXG5mdW5jdGlvbiB6ZXJvKGJ1ZikgeyB2YXIgbGVuID0gYnVmLmxlbmd0aDsgd2hpbGUgKC0tbGVuID49IDApIHsgYnVmW2xlbl0gPSAwOyB9IH1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBGbHVzaCBhcyBtdWNoIHBlbmRpbmcgb3V0cHV0IGFzIHBvc3NpYmxlLiBBbGwgZGVmbGF0ZSgpIG91dHB1dCBnb2VzXG4gKiB0aHJvdWdoIHRoaXMgZnVuY3Rpb24gc28gc29tZSBhcHBsaWNhdGlvbnMgbWF5IHdpc2ggdG8gbW9kaWZ5IGl0XG4gKiB0byBhdm9pZCBhbGxvY2F0aW5nIGEgbGFyZ2Ugc3RybS0+b3V0cHV0IGJ1ZmZlciBhbmQgY29weWluZyBpbnRvIGl0LlxuICogKFNlZSBhbHNvIHJlYWRfYnVmKCkpLlxuICovXG5mdW5jdGlvbiBmbHVzaF9wZW5kaW5nKHN0cm0pIHtcbiAgdmFyIHMgPSBzdHJtLnN0YXRlO1xuXG4gIC8vX3RyX2ZsdXNoX2JpdHMocyk7XG4gIHZhciBsZW4gPSBzLnBlbmRpbmc7XG4gIGlmIChsZW4gPiBzdHJtLmF2YWlsX291dCkge1xuICAgIGxlbiA9IHN0cm0uYXZhaWxfb3V0O1xuICB9XG4gIGlmIChsZW4gPT09IDApIHsgcmV0dXJuOyB9XG5cbiAgdXRpbHMuYXJyYXlTZXQoc3RybS5vdXRwdXQsIHMucGVuZGluZ19idWYsIHMucGVuZGluZ19vdXQsIGxlbiwgc3RybS5uZXh0X291dCk7XG4gIHN0cm0ubmV4dF9vdXQgKz0gbGVuO1xuICBzLnBlbmRpbmdfb3V0ICs9IGxlbjtcbiAgc3RybS50b3RhbF9vdXQgKz0gbGVuO1xuICBzdHJtLmF2YWlsX291dCAtPSBsZW47XG4gIHMucGVuZGluZyAtPSBsZW47XG4gIGlmIChzLnBlbmRpbmcgPT09IDApIHtcbiAgICBzLnBlbmRpbmdfb3V0ID0gMDtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGZsdXNoX2Jsb2NrX29ubHkocywgbGFzdCkge1xuICB0cmVlcy5fdHJfZmx1c2hfYmxvY2socywgKHMuYmxvY2tfc3RhcnQgPj0gMCA/IHMuYmxvY2tfc3RhcnQgOiAtMSksIHMuc3Ryc3RhcnQgLSBzLmJsb2NrX3N0YXJ0LCBsYXN0KTtcbiAgcy5ibG9ja19zdGFydCA9IHMuc3Ryc3RhcnQ7XG4gIGZsdXNoX3BlbmRpbmcocy5zdHJtKTtcbn1cblxuXG5mdW5jdGlvbiBwdXRfYnl0ZShzLCBiKSB7XG4gIHMucGVuZGluZ19idWZbcy5wZW5kaW5nKytdID0gYjtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBQdXQgYSBzaG9ydCBpbiB0aGUgcGVuZGluZyBidWZmZXIuIFRoZSAxNi1iaXQgdmFsdWUgaXMgcHV0IGluIE1TQiBvcmRlci5cbiAqIElOIGFzc2VydGlvbjogdGhlIHN0cmVhbSBzdGF0ZSBpcyBjb3JyZWN0IGFuZCB0aGVyZSBpcyBlbm91Z2ggcm9vbSBpblxuICogcGVuZGluZ19idWYuXG4gKi9cbmZ1bmN0aW9uIHB1dFNob3J0TVNCKHMsIGIpIHtcbi8vICBwdXRfYnl0ZShzLCAoQnl0ZSkoYiA+PiA4KSk7XG4vLyAgcHV0X2J5dGUocywgKEJ5dGUpKGIgJiAweGZmKSk7XG4gIHMucGVuZGluZ19idWZbcy5wZW5kaW5nKytdID0gKGIgPj4+IDgpICYgMHhmZjtcbiAgcy5wZW5kaW5nX2J1ZltzLnBlbmRpbmcrK10gPSBiICYgMHhmZjtcbn1cblxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFJlYWQgYSBuZXcgYnVmZmVyIGZyb20gdGhlIGN1cnJlbnQgaW5wdXQgc3RyZWFtLCB1cGRhdGUgdGhlIGFkbGVyMzJcbiAqIGFuZCB0b3RhbCBudW1iZXIgb2YgYnl0ZXMgcmVhZC4gIEFsbCBkZWZsYXRlKCkgaW5wdXQgZ29lcyB0aHJvdWdoXG4gKiB0aGlzIGZ1bmN0aW9uIHNvIHNvbWUgYXBwbGljYXRpb25zIG1heSB3aXNoIHRvIG1vZGlmeSBpdCB0byBhdm9pZFxuICogYWxsb2NhdGluZyBhIGxhcmdlIHN0cm0tPmlucHV0IGJ1ZmZlciBhbmQgY29weWluZyBmcm9tIGl0LlxuICogKFNlZSBhbHNvIGZsdXNoX3BlbmRpbmcoKSkuXG4gKi9cbmZ1bmN0aW9uIHJlYWRfYnVmKHN0cm0sIGJ1Ziwgc3RhcnQsIHNpemUpIHtcbiAgdmFyIGxlbiA9IHN0cm0uYXZhaWxfaW47XG5cbiAgaWYgKGxlbiA+IHNpemUpIHsgbGVuID0gc2l6ZTsgfVxuICBpZiAobGVuID09PSAwKSB7IHJldHVybiAwOyB9XG5cbiAgc3RybS5hdmFpbF9pbiAtPSBsZW47XG5cbiAgLy8gem1lbWNweShidWYsIHN0cm0tPm5leHRfaW4sIGxlbik7XG4gIHV0aWxzLmFycmF5U2V0KGJ1Ziwgc3RybS5pbnB1dCwgc3RybS5uZXh0X2luLCBsZW4sIHN0YXJ0KTtcbiAgaWYgKHN0cm0uc3RhdGUud3JhcCA9PT0gMSkge1xuICAgIHN0cm0uYWRsZXIgPSBhZGxlcjMyKHN0cm0uYWRsZXIsIGJ1ZiwgbGVuLCBzdGFydCk7XG4gIH1cblxuICBlbHNlIGlmIChzdHJtLnN0YXRlLndyYXAgPT09IDIpIHtcbiAgICBzdHJtLmFkbGVyID0gY3JjMzIoc3RybS5hZGxlciwgYnVmLCBsZW4sIHN0YXJ0KTtcbiAgfVxuXG4gIHN0cm0ubmV4dF9pbiArPSBsZW47XG4gIHN0cm0udG90YWxfaW4gKz0gbGVuO1xuXG4gIHJldHVybiBsZW47XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBTZXQgbWF0Y2hfc3RhcnQgdG8gdGhlIGxvbmdlc3QgbWF0Y2ggc3RhcnRpbmcgYXQgdGhlIGdpdmVuIHN0cmluZyBhbmRcbiAqIHJldHVybiBpdHMgbGVuZ3RoLiBNYXRjaGVzIHNob3J0ZXIgb3IgZXF1YWwgdG8gcHJldl9sZW5ndGggYXJlIGRpc2NhcmRlZCxcbiAqIGluIHdoaWNoIGNhc2UgdGhlIHJlc3VsdCBpcyBlcXVhbCB0byBwcmV2X2xlbmd0aCBhbmQgbWF0Y2hfc3RhcnQgaXNcbiAqIGdhcmJhZ2UuXG4gKiBJTiBhc3NlcnRpb25zOiBjdXJfbWF0Y2ggaXMgdGhlIGhlYWQgb2YgdGhlIGhhc2ggY2hhaW4gZm9yIHRoZSBjdXJyZW50XG4gKiAgIHN0cmluZyAoc3Ryc3RhcnQpIGFuZCBpdHMgZGlzdGFuY2UgaXMgPD0gTUFYX0RJU1QsIGFuZCBwcmV2X2xlbmd0aCA+PSAxXG4gKiBPVVQgYXNzZXJ0aW9uOiB0aGUgbWF0Y2ggbGVuZ3RoIGlzIG5vdCBncmVhdGVyIHRoYW4gcy0+bG9va2FoZWFkLlxuICovXG5mdW5jdGlvbiBsb25nZXN0X21hdGNoKHMsIGN1cl9tYXRjaCkge1xuICB2YXIgY2hhaW5fbGVuZ3RoID0gcy5tYXhfY2hhaW5fbGVuZ3RoOyAgICAgIC8qIG1heCBoYXNoIGNoYWluIGxlbmd0aCAqL1xuICB2YXIgc2NhbiA9IHMuc3Ryc3RhcnQ7IC8qIGN1cnJlbnQgc3RyaW5nICovXG4gIHZhciBtYXRjaDsgICAgICAgICAgICAgICAgICAgICAgIC8qIG1hdGNoZWQgc3RyaW5nICovXG4gIHZhciBsZW47ICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbGVuZ3RoIG9mIGN1cnJlbnQgbWF0Y2ggKi9cbiAgdmFyIGJlc3RfbGVuID0gcy5wcmV2X2xlbmd0aDsgICAgICAgICAgICAgIC8qIGJlc3QgbWF0Y2ggbGVuZ3RoIHNvIGZhciAqL1xuICB2YXIgbmljZV9tYXRjaCA9IHMubmljZV9tYXRjaDsgICAgICAgICAgICAgLyogc3RvcCBpZiBtYXRjaCBsb25nIGVub3VnaCAqL1xuICB2YXIgbGltaXQgPSAocy5zdHJzdGFydCA+IChzLndfc2l6ZSAtIE1JTl9MT09LQUhFQUQpKSA/XG4gICAgICBzLnN0cnN0YXJ0IC0gKHMud19zaXplIC0gTUlOX0xPT0tBSEVBRCkgOiAwLypOSUwqLztcblxuICB2YXIgX3dpbiA9IHMud2luZG93OyAvLyBzaG9ydGN1dFxuXG4gIHZhciB3bWFzayA9IHMud19tYXNrO1xuICB2YXIgcHJldiAgPSBzLnByZXY7XG5cbiAgLyogU3RvcCB3aGVuIGN1cl9tYXRjaCBiZWNvbWVzIDw9IGxpbWl0LiBUbyBzaW1wbGlmeSB0aGUgY29kZSxcbiAgICogd2UgcHJldmVudCBtYXRjaGVzIHdpdGggdGhlIHN0cmluZyBvZiB3aW5kb3cgaW5kZXggMC5cbiAgICovXG5cbiAgdmFyIHN0cmVuZCA9IHMuc3Ryc3RhcnQgKyBNQVhfTUFUQ0g7XG4gIHZhciBzY2FuX2VuZDEgID0gX3dpbltzY2FuICsgYmVzdF9sZW4gLSAxXTtcbiAgdmFyIHNjYW5fZW5kICAgPSBfd2luW3NjYW4gKyBiZXN0X2xlbl07XG5cbiAgLyogVGhlIGNvZGUgaXMgb3B0aW1pemVkIGZvciBIQVNIX0JJVFMgPj0gOCBhbmQgTUFYX01BVENILTIgbXVsdGlwbGUgb2YgMTYuXG4gICAqIEl0IGlzIGVhc3kgdG8gZ2V0IHJpZCBvZiB0aGlzIG9wdGltaXphdGlvbiBpZiBuZWNlc3NhcnkuXG4gICAqL1xuICAvLyBBc3NlcnQocy0+aGFzaF9iaXRzID49IDggJiYgTUFYX01BVENIID09IDI1OCwgXCJDb2RlIHRvbyBjbGV2ZXJcIik7XG5cbiAgLyogRG8gbm90IHdhc3RlIHRvbyBtdWNoIHRpbWUgaWYgd2UgYWxyZWFkeSBoYXZlIGEgZ29vZCBtYXRjaDogKi9cbiAgaWYgKHMucHJldl9sZW5ndGggPj0gcy5nb29kX21hdGNoKSB7XG4gICAgY2hhaW5fbGVuZ3RoID4+PSAyO1xuICB9XG4gIC8qIERvIG5vdCBsb29rIGZvciBtYXRjaGVzIGJleW9uZCB0aGUgZW5kIG9mIHRoZSBpbnB1dC4gVGhpcyBpcyBuZWNlc3NhcnlcbiAgICogdG8gbWFrZSBkZWZsYXRlIGRldGVybWluaXN0aWMuXG4gICAqL1xuICBpZiAobmljZV9tYXRjaCA+IHMubG9va2FoZWFkKSB7IG5pY2VfbWF0Y2ggPSBzLmxvb2thaGVhZDsgfVxuXG4gIC8vIEFzc2VydCgodWxnKXMtPnN0cnN0YXJ0IDw9IHMtPndpbmRvd19zaXplLU1JTl9MT09LQUhFQUQsIFwibmVlZCBsb29rYWhlYWRcIik7XG5cbiAgZG8ge1xuICAgIC8vIEFzc2VydChjdXJfbWF0Y2ggPCBzLT5zdHJzdGFydCwgXCJubyBmdXR1cmVcIik7XG4gICAgbWF0Y2ggPSBjdXJfbWF0Y2g7XG5cbiAgICAvKiBTa2lwIHRvIG5leHQgbWF0Y2ggaWYgdGhlIG1hdGNoIGxlbmd0aCBjYW5ub3QgaW5jcmVhc2VcbiAgICAgKiBvciBpZiB0aGUgbWF0Y2ggbGVuZ3RoIGlzIGxlc3MgdGhhbiAyLiAgTm90ZSB0aGF0IHRoZSBjaGVja3MgYmVsb3dcbiAgICAgKiBmb3IgaW5zdWZmaWNpZW50IGxvb2thaGVhZCBvbmx5IG9jY3VyIG9jY2FzaW9uYWxseSBmb3IgcGVyZm9ybWFuY2VcbiAgICAgKiByZWFzb25zLiAgVGhlcmVmb3JlIHVuaW5pdGlhbGl6ZWQgbWVtb3J5IHdpbGwgYmUgYWNjZXNzZWQsIGFuZFxuICAgICAqIGNvbmRpdGlvbmFsIGp1bXBzIHdpbGwgYmUgbWFkZSB0aGF0IGRlcGVuZCBvbiB0aG9zZSB2YWx1ZXMuXG4gICAgICogSG93ZXZlciB0aGUgbGVuZ3RoIG9mIHRoZSBtYXRjaCBpcyBsaW1pdGVkIHRvIHRoZSBsb29rYWhlYWQsIHNvXG4gICAgICogdGhlIG91dHB1dCBvZiBkZWZsYXRlIGlzIG5vdCBhZmZlY3RlZCBieSB0aGUgdW5pbml0aWFsaXplZCB2YWx1ZXMuXG4gICAgICovXG5cbiAgICBpZiAoX3dpblttYXRjaCArIGJlc3RfbGVuXSAgICAgIT09IHNjYW5fZW5kICB8fFxuICAgICAgICBfd2luW21hdGNoICsgYmVzdF9sZW4gLSAxXSAhPT0gc2Nhbl9lbmQxIHx8XG4gICAgICAgIF93aW5bbWF0Y2hdICAgICAgICAgICAgICAgICE9PSBfd2luW3NjYW5dIHx8XG4gICAgICAgIF93aW5bKyttYXRjaF0gICAgICAgICAgICAgICE9PSBfd2luW3NjYW4gKyAxXSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLyogVGhlIGNoZWNrIGF0IGJlc3RfbGVuLTEgY2FuIGJlIHJlbW92ZWQgYmVjYXVzZSBpdCB3aWxsIGJlIG1hZGVcbiAgICAgKiBhZ2FpbiBsYXRlci4gKFRoaXMgaGV1cmlzdGljIGlzIG5vdCBhbHdheXMgYSB3aW4uKVxuICAgICAqIEl0IGlzIG5vdCBuZWNlc3NhcnkgdG8gY29tcGFyZSBzY2FuWzJdIGFuZCBtYXRjaFsyXSBzaW5jZSB0aGV5XG4gICAgICogYXJlIGFsd2F5cyBlcXVhbCB3aGVuIHRoZSBvdGhlciBieXRlcyBtYXRjaCwgZ2l2ZW4gdGhhdFxuICAgICAqIHRoZSBoYXNoIGtleXMgYXJlIGVxdWFsIGFuZCB0aGF0IEhBU0hfQklUUyA+PSA4LlxuICAgICAqL1xuICAgIHNjYW4gKz0gMjtcbiAgICBtYXRjaCsrO1xuICAgIC8vIEFzc2VydCgqc2NhbiA9PSAqbWF0Y2gsIFwibWF0Y2hbMl0/XCIpO1xuXG4gICAgLyogV2UgY2hlY2sgZm9yIGluc3VmZmljaWVudCBsb29rYWhlYWQgb25seSBldmVyeSA4dGggY29tcGFyaXNvbjtcbiAgICAgKiB0aGUgMjU2dGggY2hlY2sgd2lsbCBiZSBtYWRlIGF0IHN0cnN0YXJ0KzI1OC5cbiAgICAgKi9cbiAgICBkbyB7XG4gICAgICAvKmpzaGludCBub2VtcHR5OmZhbHNlKi9cbiAgICB9IHdoaWxlIChfd2luWysrc2Nhbl0gPT09IF93aW5bKyttYXRjaF0gJiYgX3dpblsrK3NjYW5dID09PSBfd2luWysrbWF0Y2hdICYmXG4gICAgICAgICAgICAgX3dpblsrK3NjYW5dID09PSBfd2luWysrbWF0Y2hdICYmIF93aW5bKytzY2FuXSA9PT0gX3dpblsrK21hdGNoXSAmJlxuICAgICAgICAgICAgIF93aW5bKytzY2FuXSA9PT0gX3dpblsrK21hdGNoXSAmJiBfd2luWysrc2Nhbl0gPT09IF93aW5bKyttYXRjaF0gJiZcbiAgICAgICAgICAgICBfd2luWysrc2Nhbl0gPT09IF93aW5bKyttYXRjaF0gJiYgX3dpblsrK3NjYW5dID09PSBfd2luWysrbWF0Y2hdICYmXG4gICAgICAgICAgICAgc2NhbiA8IHN0cmVuZCk7XG5cbiAgICAvLyBBc3NlcnQoc2NhbiA8PSBzLT53aW5kb3crKHVuc2lnbmVkKShzLT53aW5kb3dfc2l6ZS0xKSwgXCJ3aWxkIHNjYW5cIik7XG5cbiAgICBsZW4gPSBNQVhfTUFUQ0ggLSAoc3RyZW5kIC0gc2Nhbik7XG4gICAgc2NhbiA9IHN0cmVuZCAtIE1BWF9NQVRDSDtcblxuICAgIGlmIChsZW4gPiBiZXN0X2xlbikge1xuICAgICAgcy5tYXRjaF9zdGFydCA9IGN1cl9tYXRjaDtcbiAgICAgIGJlc3RfbGVuID0gbGVuO1xuICAgICAgaWYgKGxlbiA+PSBuaWNlX21hdGNoKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgc2Nhbl9lbmQxICA9IF93aW5bc2NhbiArIGJlc3RfbGVuIC0gMV07XG4gICAgICBzY2FuX2VuZCAgID0gX3dpbltzY2FuICsgYmVzdF9sZW5dO1xuICAgIH1cbiAgfSB3aGlsZSAoKGN1cl9tYXRjaCA9IHByZXZbY3VyX21hdGNoICYgd21hc2tdKSA+IGxpbWl0ICYmIC0tY2hhaW5fbGVuZ3RoICE9PSAwKTtcblxuICBpZiAoYmVzdF9sZW4gPD0gcy5sb29rYWhlYWQpIHtcbiAgICByZXR1cm4gYmVzdF9sZW47XG4gIH1cbiAgcmV0dXJuIHMubG9va2FoZWFkO1xufVxuXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogRmlsbCB0aGUgd2luZG93IHdoZW4gdGhlIGxvb2thaGVhZCBiZWNvbWVzIGluc3VmZmljaWVudC5cbiAqIFVwZGF0ZXMgc3Ryc3RhcnQgYW5kIGxvb2thaGVhZC5cbiAqXG4gKiBJTiBhc3NlcnRpb246IGxvb2thaGVhZCA8IE1JTl9MT09LQUhFQURcbiAqIE9VVCBhc3NlcnRpb25zOiBzdHJzdGFydCA8PSB3aW5kb3dfc2l6ZS1NSU5fTE9PS0FIRUFEXG4gKiAgICBBdCBsZWFzdCBvbmUgYnl0ZSBoYXMgYmVlbiByZWFkLCBvciBhdmFpbF9pbiA9PSAwOyByZWFkcyBhcmVcbiAqICAgIHBlcmZvcm1lZCBmb3IgYXQgbGVhc3QgdHdvIGJ5dGVzIChyZXF1aXJlZCBmb3IgdGhlIHppcCB0cmFuc2xhdGVfZW9sXG4gKiAgICBvcHRpb24gLS0gbm90IHN1cHBvcnRlZCBoZXJlKS5cbiAqL1xuZnVuY3Rpb24gZmlsbF93aW5kb3cocykge1xuICB2YXIgX3dfc2l6ZSA9IHMud19zaXplO1xuICB2YXIgcCwgbiwgbSwgbW9yZSwgc3RyO1xuXG4gIC8vQXNzZXJ0KHMtPmxvb2thaGVhZCA8IE1JTl9MT09LQUhFQUQsIFwiYWxyZWFkeSBlbm91Z2ggbG9va2FoZWFkXCIpO1xuXG4gIGRvIHtcbiAgICBtb3JlID0gcy53aW5kb3dfc2l6ZSAtIHMubG9va2FoZWFkIC0gcy5zdHJzdGFydDtcblxuICAgIC8vIEpTIGludHMgaGF2ZSAzMiBiaXQsIGJsb2NrIGJlbG93IG5vdCBuZWVkZWRcbiAgICAvKiBEZWFsIHdpdGggIUAjJCUgNjRLIGxpbWl0OiAqL1xuICAgIC8vaWYgKHNpemVvZihpbnQpIDw9IDIpIHtcbiAgICAvLyAgICBpZiAobW9yZSA9PSAwICYmIHMtPnN0cnN0YXJ0ID09IDAgJiYgcy0+bG9va2FoZWFkID09IDApIHtcbiAgICAvLyAgICAgICAgbW9yZSA9IHdzaXplO1xuICAgIC8vXG4gICAgLy8gIH0gZWxzZSBpZiAobW9yZSA9PSAodW5zaWduZWQpKC0xKSkge1xuICAgIC8vICAgICAgICAvKiBWZXJ5IHVubGlrZWx5LCBidXQgcG9zc2libGUgb24gMTYgYml0IG1hY2hpbmUgaWZcbiAgICAvLyAgICAgICAgICogc3Ryc3RhcnQgPT0gMCAmJiBsb29rYWhlYWQgPT0gMSAoaW5wdXQgZG9uZSBhIGJ5dGUgYXQgdGltZSlcbiAgICAvLyAgICAgICAgICovXG4gICAgLy8gICAgICAgIG1vcmUtLTtcbiAgICAvLyAgICB9XG4gICAgLy99XG5cblxuICAgIC8qIElmIHRoZSB3aW5kb3cgaXMgYWxtb3N0IGZ1bGwgYW5kIHRoZXJlIGlzIGluc3VmZmljaWVudCBsb29rYWhlYWQsXG4gICAgICogbW92ZSB0aGUgdXBwZXIgaGFsZiB0byB0aGUgbG93ZXIgb25lIHRvIG1ha2Ugcm9vbSBpbiB0aGUgdXBwZXIgaGFsZi5cbiAgICAgKi9cbiAgICBpZiAocy5zdHJzdGFydCA+PSBfd19zaXplICsgKF93X3NpemUgLSBNSU5fTE9PS0FIRUFEKSkge1xuXG4gICAgICB1dGlscy5hcnJheVNldChzLndpbmRvdywgcy53aW5kb3csIF93X3NpemUsIF93X3NpemUsIDApO1xuICAgICAgcy5tYXRjaF9zdGFydCAtPSBfd19zaXplO1xuICAgICAgcy5zdHJzdGFydCAtPSBfd19zaXplO1xuICAgICAgLyogd2Ugbm93IGhhdmUgc3Ryc3RhcnQgPj0gTUFYX0RJU1QgKi9cbiAgICAgIHMuYmxvY2tfc3RhcnQgLT0gX3dfc2l6ZTtcblxuICAgICAgLyogU2xpZGUgdGhlIGhhc2ggdGFibGUgKGNvdWxkIGJlIGF2b2lkZWQgd2l0aCAzMiBiaXQgdmFsdWVzXG4gICAgICAgYXQgdGhlIGV4cGVuc2Ugb2YgbWVtb3J5IHVzYWdlKS4gV2Ugc2xpZGUgZXZlbiB3aGVuIGxldmVsID09IDBcbiAgICAgICB0byBrZWVwIHRoZSBoYXNoIHRhYmxlIGNvbnNpc3RlbnQgaWYgd2Ugc3dpdGNoIGJhY2sgdG8gbGV2ZWwgPiAwXG4gICAgICAgbGF0ZXIuIChVc2luZyBsZXZlbCAwIHBlcm1hbmVudGx5IGlzIG5vdCBhbiBvcHRpbWFsIHVzYWdlIG9mXG4gICAgICAgemxpYiwgc28gd2UgZG9uJ3QgY2FyZSBhYm91dCB0aGlzIHBhdGhvbG9naWNhbCBjYXNlLilcbiAgICAgICAqL1xuXG4gICAgICBuID0gcy5oYXNoX3NpemU7XG4gICAgICBwID0gbjtcbiAgICAgIGRvIHtcbiAgICAgICAgbSA9IHMuaGVhZFstLXBdO1xuICAgICAgICBzLmhlYWRbcF0gPSAobSA+PSBfd19zaXplID8gbSAtIF93X3NpemUgOiAwKTtcbiAgICAgIH0gd2hpbGUgKC0tbik7XG5cbiAgICAgIG4gPSBfd19zaXplO1xuICAgICAgcCA9IG47XG4gICAgICBkbyB7XG4gICAgICAgIG0gPSBzLnByZXZbLS1wXTtcbiAgICAgICAgcy5wcmV2W3BdID0gKG0gPj0gX3dfc2l6ZSA/IG0gLSBfd19zaXplIDogMCk7XG4gICAgICAgIC8qIElmIG4gaXMgbm90IG9uIGFueSBoYXNoIGNoYWluLCBwcmV2W25dIGlzIGdhcmJhZ2UgYnV0XG4gICAgICAgICAqIGl0cyB2YWx1ZSB3aWxsIG5ldmVyIGJlIHVzZWQuXG4gICAgICAgICAqL1xuICAgICAgfSB3aGlsZSAoLS1uKTtcblxuICAgICAgbW9yZSArPSBfd19zaXplO1xuICAgIH1cbiAgICBpZiAocy5zdHJtLmF2YWlsX2luID09PSAwKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvKiBJZiB0aGVyZSB3YXMgbm8gc2xpZGluZzpcbiAgICAgKiAgICBzdHJzdGFydCA8PSBXU0laRStNQVhfRElTVC0xICYmIGxvb2thaGVhZCA8PSBNSU5fTE9PS0FIRUFEIC0gMSAmJlxuICAgICAqICAgIG1vcmUgPT0gd2luZG93X3NpemUgLSBsb29rYWhlYWQgLSBzdHJzdGFydFxuICAgICAqID0+IG1vcmUgPj0gd2luZG93X3NpemUgLSAoTUlOX0xPT0tBSEVBRC0xICsgV1NJWkUgKyBNQVhfRElTVC0xKVxuICAgICAqID0+IG1vcmUgPj0gd2luZG93X3NpemUgLSAyKldTSVpFICsgMlxuICAgICAqIEluIHRoZSBCSUdfTUVNIG9yIE1NQVAgY2FzZSAobm90IHlldCBzdXBwb3J0ZWQpLFxuICAgICAqICAgd2luZG93X3NpemUgPT0gaW5wdXRfc2l6ZSArIE1JTl9MT09LQUhFQUQgICYmXG4gICAgICogICBzdHJzdGFydCArIHMtPmxvb2thaGVhZCA8PSBpbnB1dF9zaXplID0+IG1vcmUgPj0gTUlOX0xPT0tBSEVBRC5cbiAgICAgKiBPdGhlcndpc2UsIHdpbmRvd19zaXplID09IDIqV1NJWkUgc28gbW9yZSA+PSAyLlxuICAgICAqIElmIHRoZXJlIHdhcyBzbGlkaW5nLCBtb3JlID49IFdTSVpFLiBTbyBpbiBhbGwgY2FzZXMsIG1vcmUgPj0gMi5cbiAgICAgKi9cbiAgICAvL0Fzc2VydChtb3JlID49IDIsIFwibW9yZSA8IDJcIik7XG4gICAgbiA9IHJlYWRfYnVmKHMuc3RybSwgcy53aW5kb3csIHMuc3Ryc3RhcnQgKyBzLmxvb2thaGVhZCwgbW9yZSk7XG4gICAgcy5sb29rYWhlYWQgKz0gbjtcblxuICAgIC8qIEluaXRpYWxpemUgdGhlIGhhc2ggdmFsdWUgbm93IHRoYXQgd2UgaGF2ZSBzb21lIGlucHV0OiAqL1xuICAgIGlmIChzLmxvb2thaGVhZCArIHMuaW5zZXJ0ID49IE1JTl9NQVRDSCkge1xuICAgICAgc3RyID0gcy5zdHJzdGFydCAtIHMuaW5zZXJ0O1xuICAgICAgcy5pbnNfaCA9IHMud2luZG93W3N0cl07XG5cbiAgICAgIC8qIFVQREFURV9IQVNIKHMsIHMtPmluc19oLCBzLT53aW5kb3dbc3RyICsgMV0pOyAqL1xuICAgICAgcy5pbnNfaCA9ICgocy5pbnNfaCA8PCBzLmhhc2hfc2hpZnQpIF4gcy53aW5kb3dbc3RyICsgMV0pICYgcy5oYXNoX21hc2s7XG4vLyNpZiBNSU5fTUFUQ0ggIT0gM1xuLy8gICAgICAgIENhbGwgdXBkYXRlX2hhc2goKSBNSU5fTUFUQ0gtMyBtb3JlIHRpbWVzXG4vLyNlbmRpZlxuICAgICAgd2hpbGUgKHMuaW5zZXJ0KSB7XG4gICAgICAgIC8qIFVQREFURV9IQVNIKHMsIHMtPmluc19oLCBzLT53aW5kb3dbc3RyICsgTUlOX01BVENILTFdKTsgKi9cbiAgICAgICAgcy5pbnNfaCA9ICgocy5pbnNfaCA8PCBzLmhhc2hfc2hpZnQpIF4gcy53aW5kb3dbc3RyICsgTUlOX01BVENIIC0gMV0pICYgcy5oYXNoX21hc2s7XG5cbiAgICAgICAgcy5wcmV2W3N0ciAmIHMud19tYXNrXSA9IHMuaGVhZFtzLmluc19oXTtcbiAgICAgICAgcy5oZWFkW3MuaW5zX2hdID0gc3RyO1xuICAgICAgICBzdHIrKztcbiAgICAgICAgcy5pbnNlcnQtLTtcbiAgICAgICAgaWYgKHMubG9va2FoZWFkICsgcy5pbnNlcnQgPCBNSU5fTUFUQ0gpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvKiBJZiB0aGUgd2hvbGUgaW5wdXQgaGFzIGxlc3MgdGhhbiBNSU5fTUFUQ0ggYnl0ZXMsIGluc19oIGlzIGdhcmJhZ2UsXG4gICAgICogYnV0IHRoaXMgaXMgbm90IGltcG9ydGFudCBzaW5jZSBvbmx5IGxpdGVyYWwgYnl0ZXMgd2lsbCBiZSBlbWl0dGVkLlxuICAgICAqL1xuXG4gIH0gd2hpbGUgKHMubG9va2FoZWFkIDwgTUlOX0xPT0tBSEVBRCAmJiBzLnN0cm0uYXZhaWxfaW4gIT09IDApO1xuXG4gIC8qIElmIHRoZSBXSU5fSU5JVCBieXRlcyBhZnRlciB0aGUgZW5kIG9mIHRoZSBjdXJyZW50IGRhdGEgaGF2ZSBuZXZlciBiZWVuXG4gICAqIHdyaXR0ZW4sIHRoZW4gemVybyB0aG9zZSBieXRlcyBpbiBvcmRlciB0byBhdm9pZCBtZW1vcnkgY2hlY2sgcmVwb3J0cyBvZlxuICAgKiB0aGUgdXNlIG9mIHVuaW5pdGlhbGl6ZWQgKG9yIHVuaW5pdGlhbGlzZWQgYXMgSnVsaWFuIHdyaXRlcykgYnl0ZXMgYnlcbiAgICogdGhlIGxvbmdlc3QgbWF0Y2ggcm91dGluZXMuICBVcGRhdGUgdGhlIGhpZ2ggd2F0ZXIgbWFyayBmb3IgdGhlIG5leHRcbiAgICogdGltZSB0aHJvdWdoIGhlcmUuICBXSU5fSU5JVCBpcyBzZXQgdG8gTUFYX01BVENIIHNpbmNlIHRoZSBsb25nZXN0IG1hdGNoXG4gICAqIHJvdXRpbmVzIGFsbG93IHNjYW5uaW5nIHRvIHN0cnN0YXJ0ICsgTUFYX01BVENILCBpZ25vcmluZyBsb29rYWhlYWQuXG4gICAqL1xuLy8gIGlmIChzLmhpZ2hfd2F0ZXIgPCBzLndpbmRvd19zaXplKSB7XG4vLyAgICB2YXIgY3VyciA9IHMuc3Ryc3RhcnQgKyBzLmxvb2thaGVhZDtcbi8vICAgIHZhciBpbml0ID0gMDtcbi8vXG4vLyAgICBpZiAocy5oaWdoX3dhdGVyIDwgY3Vycikge1xuLy8gICAgICAvKiBQcmV2aW91cyBoaWdoIHdhdGVyIG1hcmsgYmVsb3cgY3VycmVudCBkYXRhIC0tIHplcm8gV0lOX0lOSVRcbi8vICAgICAgICogYnl0ZXMgb3IgdXAgdG8gZW5kIG9mIHdpbmRvdywgd2hpY2hldmVyIGlzIGxlc3MuXG4vLyAgICAgICAqL1xuLy8gICAgICBpbml0ID0gcy53aW5kb3dfc2l6ZSAtIGN1cnI7XG4vLyAgICAgIGlmIChpbml0ID4gV0lOX0lOSVQpXG4vLyAgICAgICAgaW5pdCA9IFdJTl9JTklUO1xuLy8gICAgICB6bWVtemVybyhzLT53aW5kb3cgKyBjdXJyLCAodW5zaWduZWQpaW5pdCk7XG4vLyAgICAgIHMtPmhpZ2hfd2F0ZXIgPSBjdXJyICsgaW5pdDtcbi8vICAgIH1cbi8vICAgIGVsc2UgaWYgKHMtPmhpZ2hfd2F0ZXIgPCAodWxnKWN1cnIgKyBXSU5fSU5JVCkge1xuLy8gICAgICAvKiBIaWdoIHdhdGVyIG1hcmsgYXQgb3IgYWJvdmUgY3VycmVudCBkYXRhLCBidXQgYmVsb3cgY3VycmVudCBkYXRhXG4vLyAgICAgICAqIHBsdXMgV0lOX0lOSVQgLS0gemVybyBvdXQgdG8gY3VycmVudCBkYXRhIHBsdXMgV0lOX0lOSVQsIG9yIHVwXG4vLyAgICAgICAqIHRvIGVuZCBvZiB3aW5kb3csIHdoaWNoZXZlciBpcyBsZXNzLlxuLy8gICAgICAgKi9cbi8vICAgICAgaW5pdCA9ICh1bGcpY3VyciArIFdJTl9JTklUIC0gcy0+aGlnaF93YXRlcjtcbi8vICAgICAgaWYgKGluaXQgPiBzLT53aW5kb3dfc2l6ZSAtIHMtPmhpZ2hfd2F0ZXIpXG4vLyAgICAgICAgaW5pdCA9IHMtPndpbmRvd19zaXplIC0gcy0+aGlnaF93YXRlcjtcbi8vICAgICAgem1lbXplcm8ocy0+d2luZG93ICsgcy0+aGlnaF93YXRlciwgKHVuc2lnbmVkKWluaXQpO1xuLy8gICAgICBzLT5oaWdoX3dhdGVyICs9IGluaXQ7XG4vLyAgICB9XG4vLyAgfVxuLy9cbi8vICBBc3NlcnQoKHVsZylzLT5zdHJzdGFydCA8PSBzLT53aW5kb3dfc2l6ZSAtIE1JTl9MT09LQUhFQUQsXG4vLyAgICBcIm5vdCBlbm91Z2ggcm9vbSBmb3Igc2VhcmNoXCIpO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIENvcHkgd2l0aG91dCBjb21wcmVzc2lvbiBhcyBtdWNoIGFzIHBvc3NpYmxlIGZyb20gdGhlIGlucHV0IHN0cmVhbSwgcmV0dXJuXG4gKiB0aGUgY3VycmVudCBibG9jayBzdGF0ZS5cbiAqIFRoaXMgZnVuY3Rpb24gZG9lcyBub3QgaW5zZXJ0IG5ldyBzdHJpbmdzIGluIHRoZSBkaWN0aW9uYXJ5IHNpbmNlXG4gKiB1bmNvbXByZXNzaWJsZSBkYXRhIGlzIHByb2JhYmx5IG5vdCB1c2VmdWwuIFRoaXMgZnVuY3Rpb24gaXMgdXNlZFxuICogb25seSBmb3IgdGhlIGxldmVsPTAgY29tcHJlc3Npb24gb3B0aW9uLlxuICogTk9URTogdGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgb3B0aW1pemVkIHRvIGF2b2lkIGV4dHJhIGNvcHlpbmcgZnJvbVxuICogd2luZG93IHRvIHBlbmRpbmdfYnVmLlxuICovXG5mdW5jdGlvbiBkZWZsYXRlX3N0b3JlZChzLCBmbHVzaCkge1xuICAvKiBTdG9yZWQgYmxvY2tzIGFyZSBsaW1pdGVkIHRvIDB4ZmZmZiBieXRlcywgcGVuZGluZ19idWYgaXMgbGltaXRlZFxuICAgKiB0byBwZW5kaW5nX2J1Zl9zaXplLCBhbmQgZWFjaCBzdG9yZWQgYmxvY2sgaGFzIGEgNSBieXRlIGhlYWRlcjpcbiAgICovXG4gIHZhciBtYXhfYmxvY2tfc2l6ZSA9IDB4ZmZmZjtcblxuICBpZiAobWF4X2Jsb2NrX3NpemUgPiBzLnBlbmRpbmdfYnVmX3NpemUgLSA1KSB7XG4gICAgbWF4X2Jsb2NrX3NpemUgPSBzLnBlbmRpbmdfYnVmX3NpemUgLSA1O1xuICB9XG5cbiAgLyogQ29weSBhcyBtdWNoIGFzIHBvc3NpYmxlIGZyb20gaW5wdXQgdG8gb3V0cHV0OiAqL1xuICBmb3IgKDs7KSB7XG4gICAgLyogRmlsbCB0aGUgd2luZG93IGFzIG11Y2ggYXMgcG9zc2libGU6ICovXG4gICAgaWYgKHMubG9va2FoZWFkIDw9IDEpIHtcblxuICAgICAgLy9Bc3NlcnQocy0+c3Ryc3RhcnQgPCBzLT53X3NpemUrTUFYX0RJU1QocykgfHxcbiAgICAgIC8vICBzLT5ibG9ja19zdGFydCA+PSAobG9uZylzLT53X3NpemUsIFwic2xpZGUgdG9vIGxhdGVcIik7XG4vLyAgICAgIGlmICghKHMuc3Ryc3RhcnQgPCBzLndfc2l6ZSArIChzLndfc2l6ZSAtIE1JTl9MT09LQUhFQUQpIHx8XG4vLyAgICAgICAgcy5ibG9ja19zdGFydCA+PSBzLndfc2l6ZSkpIHtcbi8vICAgICAgICB0aHJvdyAgbmV3IEVycm9yKFwic2xpZGUgdG9vIGxhdGVcIik7XG4vLyAgICAgIH1cblxuICAgICAgZmlsbF93aW5kb3cocyk7XG4gICAgICBpZiAocy5sb29rYWhlYWQgPT09IDAgJiYgZmx1c2ggPT09IFpfTk9fRkxVU0gpIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cblxuICAgICAgaWYgKHMubG9va2FoZWFkID09PSAwKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgLyogZmx1c2ggdGhlIGN1cnJlbnQgYmxvY2sgKi9cbiAgICB9XG4gICAgLy9Bc3NlcnQocy0+YmxvY2tfc3RhcnQgPj0gMEwsIFwiYmxvY2sgZ29uZVwiKTtcbi8vICAgIGlmIChzLmJsb2NrX3N0YXJ0IDwgMCkgdGhyb3cgbmV3IEVycm9yKFwiYmxvY2sgZ29uZVwiKTtcblxuICAgIHMuc3Ryc3RhcnQgKz0gcy5sb29rYWhlYWQ7XG4gICAgcy5sb29rYWhlYWQgPSAwO1xuXG4gICAgLyogRW1pdCBhIHN0b3JlZCBibG9jayBpZiBwZW5kaW5nX2J1ZiB3aWxsIGJlIGZ1bGw6ICovXG4gICAgdmFyIG1heF9zdGFydCA9IHMuYmxvY2tfc3RhcnQgKyBtYXhfYmxvY2tfc2l6ZTtcblxuICAgIGlmIChzLnN0cnN0YXJ0ID09PSAwIHx8IHMuc3Ryc3RhcnQgPj0gbWF4X3N0YXJ0KSB7XG4gICAgICAvKiBzdHJzdGFydCA9PSAwIGlzIHBvc3NpYmxlIHdoZW4gd3JhcGFyb3VuZCBvbiAxNi1iaXQgbWFjaGluZSAqL1xuICAgICAgcy5sb29rYWhlYWQgPSBzLnN0cnN0YXJ0IC0gbWF4X3N0YXJ0O1xuICAgICAgcy5zdHJzdGFydCA9IG1heF9zdGFydDtcbiAgICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIC8qKiovXG5cblxuICAgIH1cbiAgICAvKiBGbHVzaCBpZiB3ZSBtYXkgaGF2ZSB0byBzbGlkZSwgb3RoZXJ3aXNlIGJsb2NrX3N0YXJ0IG1heSBiZWNvbWVcbiAgICAgKiBuZWdhdGl2ZSBhbmQgdGhlIGRhdGEgd2lsbCBiZSBnb25lOlxuICAgICAqL1xuICAgIGlmIChzLnN0cnN0YXJ0IC0gcy5ibG9ja19zdGFydCA+PSAocy53X3NpemUgLSBNSU5fTE9PS0FIRUFEKSkge1xuICAgICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAwKTsgKioqL1xuICAgICAgZmx1c2hfYmxvY2tfb25seShzLCBmYWxzZSk7XG4gICAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgICAgfVxuICAgICAgLyoqKi9cbiAgICB9XG4gIH1cblxuICBzLmluc2VydCA9IDA7XG5cbiAgaWYgKGZsdXNoID09PSBaX0ZJTklTSCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMSk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIHRydWUpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfRklOSVNIX1NUQVJURUQ7XG4gICAgfVxuICAgIC8qKiovXG4gICAgcmV0dXJuIEJTX0ZJTklTSF9ET05FO1xuICB9XG5cbiAgaWYgKHMuc3Ryc3RhcnQgPiBzLmJsb2NrX3N0YXJ0KSB7XG4gICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAwKTsgKioqL1xuICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgIH1cbiAgICAvKioqL1xuICB9XG5cbiAgcmV0dXJuIEJTX05FRURfTU9SRTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBDb21wcmVzcyBhcyBtdWNoIGFzIHBvc3NpYmxlIGZyb20gdGhlIGlucHV0IHN0cmVhbSwgcmV0dXJuIHRoZSBjdXJyZW50XG4gKiBibG9jayBzdGF0ZS5cbiAqIFRoaXMgZnVuY3Rpb24gZG9lcyBub3QgcGVyZm9ybSBsYXp5IGV2YWx1YXRpb24gb2YgbWF0Y2hlcyBhbmQgaW5zZXJ0c1xuICogbmV3IHN0cmluZ3MgaW4gdGhlIGRpY3Rpb25hcnkgb25seSBmb3IgdW5tYXRjaGVkIHN0cmluZ3Mgb3IgZm9yIHNob3J0XG4gKiBtYXRjaGVzLiBJdCBpcyB1c2VkIG9ubHkgZm9yIHRoZSBmYXN0IGNvbXByZXNzaW9uIG9wdGlvbnMuXG4gKi9cbmZ1bmN0aW9uIGRlZmxhdGVfZmFzdChzLCBmbHVzaCkge1xuICB2YXIgaGFzaF9oZWFkOyAgICAgICAgLyogaGVhZCBvZiB0aGUgaGFzaCBjaGFpbiAqL1xuICB2YXIgYmZsdXNoOyAgICAgICAgICAgLyogc2V0IGlmIGN1cnJlbnQgYmxvY2sgbXVzdCBiZSBmbHVzaGVkICovXG5cbiAgZm9yICg7Oykge1xuICAgIC8qIE1ha2Ugc3VyZSB0aGF0IHdlIGFsd2F5cyBoYXZlIGVub3VnaCBsb29rYWhlYWQsIGV4Y2VwdFxuICAgICAqIGF0IHRoZSBlbmQgb2YgdGhlIGlucHV0IGZpbGUuIFdlIG5lZWQgTUFYX01BVENIIGJ5dGVzXG4gICAgICogZm9yIHRoZSBuZXh0IG1hdGNoLCBwbHVzIE1JTl9NQVRDSCBieXRlcyB0byBpbnNlcnQgdGhlXG4gICAgICogc3RyaW5nIGZvbGxvd2luZyB0aGUgbmV4dCBtYXRjaC5cbiAgICAgKi9cbiAgICBpZiAocy5sb29rYWhlYWQgPCBNSU5fTE9PS0FIRUFEKSB7XG4gICAgICBmaWxsX3dpbmRvdyhzKTtcbiAgICAgIGlmIChzLmxvb2thaGVhZCA8IE1JTl9MT09LQUhFQUQgJiYgZmx1c2ggPT09IFpfTk9fRkxVU0gpIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIGlmIChzLmxvb2thaGVhZCA9PT0gMCkge1xuICAgICAgICBicmVhazsgLyogZmx1c2ggdGhlIGN1cnJlbnQgYmxvY2sgKi9cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiBJbnNlcnQgdGhlIHN0cmluZyB3aW5kb3dbc3Ryc3RhcnQgLi4gc3Ryc3RhcnQrMl0gaW4gdGhlXG4gICAgICogZGljdGlvbmFyeSwgYW5kIHNldCBoYXNoX2hlYWQgdG8gdGhlIGhlYWQgb2YgdGhlIGhhc2ggY2hhaW46XG4gICAgICovXG4gICAgaGFzaF9oZWFkID0gMC8qTklMKi87XG4gICAgaWYgKHMubG9va2FoZWFkID49IE1JTl9NQVRDSCkge1xuICAgICAgLyoqKiBJTlNFUlRfU1RSSU5HKHMsIHMuc3Ryc3RhcnQsIGhhc2hfaGVhZCk7ICoqKi9cbiAgICAgIHMuaW5zX2ggPSAoKHMuaW5zX2ggPDwgcy5oYXNoX3NoaWZ0KSBeIHMud2luZG93W3Muc3Ryc3RhcnQgKyBNSU5fTUFUQ0ggLSAxXSkgJiBzLmhhc2hfbWFzaztcbiAgICAgIGhhc2hfaGVhZCA9IHMucHJldltzLnN0cnN0YXJ0ICYgcy53X21hc2tdID0gcy5oZWFkW3MuaW5zX2hdO1xuICAgICAgcy5oZWFkW3MuaW5zX2hdID0gcy5zdHJzdGFydDtcbiAgICAgIC8qKiovXG4gICAgfVxuXG4gICAgLyogRmluZCB0aGUgbG9uZ2VzdCBtYXRjaCwgZGlzY2FyZGluZyB0aG9zZSA8PSBwcmV2X2xlbmd0aC5cbiAgICAgKiBBdCB0aGlzIHBvaW50IHdlIGhhdmUgYWx3YXlzIG1hdGNoX2xlbmd0aCA8IE1JTl9NQVRDSFxuICAgICAqL1xuICAgIGlmIChoYXNoX2hlYWQgIT09IDAvKk5JTCovICYmICgocy5zdHJzdGFydCAtIGhhc2hfaGVhZCkgPD0gKHMud19zaXplIC0gTUlOX0xPT0tBSEVBRCkpKSB7XG4gICAgICAvKiBUbyBzaW1wbGlmeSB0aGUgY29kZSwgd2UgcHJldmVudCBtYXRjaGVzIHdpdGggdGhlIHN0cmluZ1xuICAgICAgICogb2Ygd2luZG93IGluZGV4IDAgKGluIHBhcnRpY3VsYXIgd2UgaGF2ZSB0byBhdm9pZCBhIG1hdGNoXG4gICAgICAgKiBvZiB0aGUgc3RyaW5nIHdpdGggaXRzZWxmIGF0IHRoZSBzdGFydCBvZiB0aGUgaW5wdXQgZmlsZSkuXG4gICAgICAgKi9cbiAgICAgIHMubWF0Y2hfbGVuZ3RoID0gbG9uZ2VzdF9tYXRjaChzLCBoYXNoX2hlYWQpO1xuICAgICAgLyogbG9uZ2VzdF9tYXRjaCgpIHNldHMgbWF0Y2hfc3RhcnQgKi9cbiAgICB9XG4gICAgaWYgKHMubWF0Y2hfbGVuZ3RoID49IE1JTl9NQVRDSCkge1xuICAgICAgLy8gY2hlY2tfbWF0Y2gocywgcy5zdHJzdGFydCwgcy5tYXRjaF9zdGFydCwgcy5tYXRjaF9sZW5ndGgpOyAvLyBmb3IgZGVidWcgb25seVxuXG4gICAgICAvKioqIF90cl90YWxseV9kaXN0KHMsIHMuc3Ryc3RhcnQgLSBzLm1hdGNoX3N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgcy5tYXRjaF9sZW5ndGggLSBNSU5fTUFUQ0gsIGJmbHVzaCk7ICoqKi9cbiAgICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCBzLnN0cnN0YXJ0IC0gcy5tYXRjaF9zdGFydCwgcy5tYXRjaF9sZW5ndGggLSBNSU5fTUFUQ0gpO1xuXG4gICAgICBzLmxvb2thaGVhZCAtPSBzLm1hdGNoX2xlbmd0aDtcblxuICAgICAgLyogSW5zZXJ0IG5ldyBzdHJpbmdzIGluIHRoZSBoYXNoIHRhYmxlIG9ubHkgaWYgdGhlIG1hdGNoIGxlbmd0aFxuICAgICAgICogaXMgbm90IHRvbyBsYXJnZS4gVGhpcyBzYXZlcyB0aW1lIGJ1dCBkZWdyYWRlcyBjb21wcmVzc2lvbi5cbiAgICAgICAqL1xuICAgICAgaWYgKHMubWF0Y2hfbGVuZ3RoIDw9IHMubWF4X2xhenlfbWF0Y2gvKm1heF9pbnNlcnRfbGVuZ3RoKi8gJiYgcy5sb29rYWhlYWQgPj0gTUlOX01BVENIKSB7XG4gICAgICAgIHMubWF0Y2hfbGVuZ3RoLS07IC8qIHN0cmluZyBhdCBzdHJzdGFydCBhbHJlYWR5IGluIHRhYmxlICovXG4gICAgICAgIGRvIHtcbiAgICAgICAgICBzLnN0cnN0YXJ0Kys7XG4gICAgICAgICAgLyoqKiBJTlNFUlRfU1RSSU5HKHMsIHMuc3Ryc3RhcnQsIGhhc2hfaGVhZCk7ICoqKi9cbiAgICAgICAgICBzLmluc19oID0gKChzLmluc19oIDw8IHMuaGFzaF9zaGlmdCkgXiBzLndpbmRvd1tzLnN0cnN0YXJ0ICsgTUlOX01BVENIIC0gMV0pICYgcy5oYXNoX21hc2s7XG4gICAgICAgICAgaGFzaF9oZWFkID0gcy5wcmV2W3Muc3Ryc3RhcnQgJiBzLndfbWFza10gPSBzLmhlYWRbcy5pbnNfaF07XG4gICAgICAgICAgcy5oZWFkW3MuaW5zX2hdID0gcy5zdHJzdGFydDtcbiAgICAgICAgICAvKioqL1xuICAgICAgICAgIC8qIHN0cnN0YXJ0IG5ldmVyIGV4Y2VlZHMgV1NJWkUtTUFYX01BVENILCBzbyB0aGVyZSBhcmVcbiAgICAgICAgICAgKiBhbHdheXMgTUlOX01BVENIIGJ5dGVzIGFoZWFkLlxuICAgICAgICAgICAqL1xuICAgICAgICB9IHdoaWxlICgtLXMubWF0Y2hfbGVuZ3RoICE9PSAwKTtcbiAgICAgICAgcy5zdHJzdGFydCsrO1xuICAgICAgfSBlbHNlXG4gICAgICB7XG4gICAgICAgIHMuc3Ryc3RhcnQgKz0gcy5tYXRjaF9sZW5ndGg7XG4gICAgICAgIHMubWF0Y2hfbGVuZ3RoID0gMDtcbiAgICAgICAgcy5pbnNfaCA9IHMud2luZG93W3Muc3Ryc3RhcnRdO1xuICAgICAgICAvKiBVUERBVEVfSEFTSChzLCBzLmluc19oLCBzLndpbmRvd1tzLnN0cnN0YXJ0KzFdKTsgKi9cbiAgICAgICAgcy5pbnNfaCA9ICgocy5pbnNfaCA8PCBzLmhhc2hfc2hpZnQpIF4gcy53aW5kb3dbcy5zdHJzdGFydCArIDFdKSAmIHMuaGFzaF9tYXNrO1xuXG4vLyNpZiBNSU5fTUFUQ0ggIT0gM1xuLy8gICAgICAgICAgICAgICAgQ2FsbCBVUERBVEVfSEFTSCgpIE1JTl9NQVRDSC0zIG1vcmUgdGltZXNcbi8vI2VuZGlmXG4gICAgICAgIC8qIElmIGxvb2thaGVhZCA8IE1JTl9NQVRDSCwgaW5zX2ggaXMgZ2FyYmFnZSwgYnV0IGl0IGRvZXMgbm90XG4gICAgICAgICAqIG1hdHRlciBzaW5jZSBpdCB3aWxsIGJlIHJlY29tcHV0ZWQgYXQgbmV4dCBkZWZsYXRlIGNhbGwuXG4gICAgICAgICAqL1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvKiBObyBtYXRjaCwgb3V0cHV0IGEgbGl0ZXJhbCBieXRlICovXG4gICAgICAvL1RyYWNldnYoKHN0ZGVycixcIiVjXCIsIHMud2luZG93W3Muc3Ryc3RhcnRdKSk7XG4gICAgICAvKioqIF90cl90YWxseV9saXQocywgcy53aW5kb3dbcy5zdHJzdGFydF0sIGJmbHVzaCk7ICoqKi9cbiAgICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCAwLCBzLndpbmRvd1tzLnN0cnN0YXJ0XSk7XG5cbiAgICAgIHMubG9va2FoZWFkLS07XG4gICAgICBzLnN0cnN0YXJ0Kys7XG4gICAgfVxuICAgIGlmIChiZmx1c2gpIHtcbiAgICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIC8qKiovXG4gICAgfVxuICB9XG4gIHMuaW5zZXJ0ID0gKChzLnN0cnN0YXJ0IDwgKE1JTl9NQVRDSCAtIDEpKSA/IHMuc3Ryc3RhcnQgOiBNSU5fTUFUQ0ggLSAxKTtcbiAgaWYgKGZsdXNoID09PSBaX0ZJTklTSCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMSk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIHRydWUpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfRklOSVNIX1NUQVJURUQ7XG4gICAgfVxuICAgIC8qKiovXG4gICAgcmV0dXJuIEJTX0ZJTklTSF9ET05FO1xuICB9XG4gIGlmIChzLmxhc3RfbGl0KSB7XG4gICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAwKTsgKioqL1xuICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgIH1cbiAgICAvKioqL1xuICB9XG4gIHJldHVybiBCU19CTE9DS19ET05FO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIFNhbWUgYXMgYWJvdmUsIGJ1dCBhY2hpZXZlcyBiZXR0ZXIgY29tcHJlc3Npb24uIFdlIHVzZSBhIGxhenlcbiAqIGV2YWx1YXRpb24gZm9yIG1hdGNoZXM6IGEgbWF0Y2ggaXMgZmluYWxseSBhZG9wdGVkIG9ubHkgaWYgdGhlcmUgaXNcbiAqIG5vIGJldHRlciBtYXRjaCBhdCB0aGUgbmV4dCB3aW5kb3cgcG9zaXRpb24uXG4gKi9cbmZ1bmN0aW9uIGRlZmxhdGVfc2xvdyhzLCBmbHVzaCkge1xuICB2YXIgaGFzaF9oZWFkOyAgICAgICAgICAvKiBoZWFkIG9mIGhhc2ggY2hhaW4gKi9cbiAgdmFyIGJmbHVzaDsgICAgICAgICAgICAgIC8qIHNldCBpZiBjdXJyZW50IGJsb2NrIG11c3QgYmUgZmx1c2hlZCAqL1xuXG4gIHZhciBtYXhfaW5zZXJ0O1xuXG4gIC8qIFByb2Nlc3MgdGhlIGlucHV0IGJsb2NrLiAqL1xuICBmb3IgKDs7KSB7XG4gICAgLyogTWFrZSBzdXJlIHRoYXQgd2UgYWx3YXlzIGhhdmUgZW5vdWdoIGxvb2thaGVhZCwgZXhjZXB0XG4gICAgICogYXQgdGhlIGVuZCBvZiB0aGUgaW5wdXQgZmlsZS4gV2UgbmVlZCBNQVhfTUFUQ0ggYnl0ZXNcbiAgICAgKiBmb3IgdGhlIG5leHQgbWF0Y2gsIHBsdXMgTUlOX01BVENIIGJ5dGVzIHRvIGluc2VydCB0aGVcbiAgICAgKiBzdHJpbmcgZm9sbG93aW5nIHRoZSBuZXh0IG1hdGNoLlxuICAgICAqL1xuICAgIGlmIChzLmxvb2thaGVhZCA8IE1JTl9MT09LQUhFQUQpIHtcbiAgICAgIGZpbGxfd2luZG93KHMpO1xuICAgICAgaWYgKHMubG9va2FoZWFkIDwgTUlOX0xPT0tBSEVBRCAmJiBmbHVzaCA9PT0gWl9OT19GTFVTSCkge1xuICAgICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgICAgfVxuICAgICAgaWYgKHMubG9va2FoZWFkID09PSAwKSB7IGJyZWFrOyB9IC8qIGZsdXNoIHRoZSBjdXJyZW50IGJsb2NrICovXG4gICAgfVxuXG4gICAgLyogSW5zZXJ0IHRoZSBzdHJpbmcgd2luZG93W3N0cnN0YXJ0IC4uIHN0cnN0YXJ0KzJdIGluIHRoZVxuICAgICAqIGRpY3Rpb25hcnksIGFuZCBzZXQgaGFzaF9oZWFkIHRvIHRoZSBoZWFkIG9mIHRoZSBoYXNoIGNoYWluOlxuICAgICAqL1xuICAgIGhhc2hfaGVhZCA9IDAvKk5JTCovO1xuICAgIGlmIChzLmxvb2thaGVhZCA+PSBNSU5fTUFUQ0gpIHtcbiAgICAgIC8qKiogSU5TRVJUX1NUUklORyhzLCBzLnN0cnN0YXJ0LCBoYXNoX2hlYWQpOyAqKiovXG4gICAgICBzLmluc19oID0gKChzLmluc19oIDw8IHMuaGFzaF9zaGlmdCkgXiBzLndpbmRvd1tzLnN0cnN0YXJ0ICsgTUlOX01BVENIIC0gMV0pICYgcy5oYXNoX21hc2s7XG4gICAgICBoYXNoX2hlYWQgPSBzLnByZXZbcy5zdHJzdGFydCAmIHMud19tYXNrXSA9IHMuaGVhZFtzLmluc19oXTtcbiAgICAgIHMuaGVhZFtzLmluc19oXSA9IHMuc3Ryc3RhcnQ7XG4gICAgICAvKioqL1xuICAgIH1cblxuICAgIC8qIEZpbmQgdGhlIGxvbmdlc3QgbWF0Y2gsIGRpc2NhcmRpbmcgdGhvc2UgPD0gcHJldl9sZW5ndGguXG4gICAgICovXG4gICAgcy5wcmV2X2xlbmd0aCA9IHMubWF0Y2hfbGVuZ3RoO1xuICAgIHMucHJldl9tYXRjaCA9IHMubWF0Y2hfc3RhcnQ7XG4gICAgcy5tYXRjaF9sZW5ndGggPSBNSU5fTUFUQ0ggLSAxO1xuXG4gICAgaWYgKGhhc2hfaGVhZCAhPT0gMC8qTklMKi8gJiYgcy5wcmV2X2xlbmd0aCA8IHMubWF4X2xhenlfbWF0Y2ggJiZcbiAgICAgICAgcy5zdHJzdGFydCAtIGhhc2hfaGVhZCA8PSAocy53X3NpemUgLSBNSU5fTE9PS0FIRUFEKS8qTUFYX0RJU1QocykqLykge1xuICAgICAgLyogVG8gc2ltcGxpZnkgdGhlIGNvZGUsIHdlIHByZXZlbnQgbWF0Y2hlcyB3aXRoIHRoZSBzdHJpbmdcbiAgICAgICAqIG9mIHdpbmRvdyBpbmRleCAwIChpbiBwYXJ0aWN1bGFyIHdlIGhhdmUgdG8gYXZvaWQgYSBtYXRjaFxuICAgICAgICogb2YgdGhlIHN0cmluZyB3aXRoIGl0c2VsZiBhdCB0aGUgc3RhcnQgb2YgdGhlIGlucHV0IGZpbGUpLlxuICAgICAgICovXG4gICAgICBzLm1hdGNoX2xlbmd0aCA9IGxvbmdlc3RfbWF0Y2gocywgaGFzaF9oZWFkKTtcbiAgICAgIC8qIGxvbmdlc3RfbWF0Y2goKSBzZXRzIG1hdGNoX3N0YXJ0ICovXG5cbiAgICAgIGlmIChzLm1hdGNoX2xlbmd0aCA8PSA1ICYmXG4gICAgICAgICAocy5zdHJhdGVneSA9PT0gWl9GSUxURVJFRCB8fCAocy5tYXRjaF9sZW5ndGggPT09IE1JTl9NQVRDSCAmJiBzLnN0cnN0YXJ0IC0gcy5tYXRjaF9zdGFydCA+IDQwOTYvKlRPT19GQVIqLykpKSB7XG5cbiAgICAgICAgLyogSWYgcHJldl9tYXRjaCBpcyBhbHNvIE1JTl9NQVRDSCwgbWF0Y2hfc3RhcnQgaXMgZ2FyYmFnZVxuICAgICAgICAgKiBidXQgd2Ugd2lsbCBpZ25vcmUgdGhlIGN1cnJlbnQgbWF0Y2ggYW55d2F5LlxuICAgICAgICAgKi9cbiAgICAgICAgcy5tYXRjaF9sZW5ndGggPSBNSU5fTUFUQ0ggLSAxO1xuICAgICAgfVxuICAgIH1cbiAgICAvKiBJZiB0aGVyZSB3YXMgYSBtYXRjaCBhdCB0aGUgcHJldmlvdXMgc3RlcCBhbmQgdGhlIGN1cnJlbnRcbiAgICAgKiBtYXRjaCBpcyBub3QgYmV0dGVyLCBvdXRwdXQgdGhlIHByZXZpb3VzIG1hdGNoOlxuICAgICAqL1xuICAgIGlmIChzLnByZXZfbGVuZ3RoID49IE1JTl9NQVRDSCAmJiBzLm1hdGNoX2xlbmd0aCA8PSBzLnByZXZfbGVuZ3RoKSB7XG4gICAgICBtYXhfaW5zZXJ0ID0gcy5zdHJzdGFydCArIHMubG9va2FoZWFkIC0gTUlOX01BVENIO1xuICAgICAgLyogRG8gbm90IGluc2VydCBzdHJpbmdzIGluIGhhc2ggdGFibGUgYmV5b25kIHRoaXMuICovXG5cbiAgICAgIC8vY2hlY2tfbWF0Y2gocywgcy5zdHJzdGFydC0xLCBzLnByZXZfbWF0Y2gsIHMucHJldl9sZW5ndGgpO1xuXG4gICAgICAvKioqX3RyX3RhbGx5X2Rpc3Qocywgcy5zdHJzdGFydCAtIDEgLSBzLnByZXZfbWF0Y2gsXG4gICAgICAgICAgICAgICAgICAgICBzLnByZXZfbGVuZ3RoIC0gTUlOX01BVENILCBiZmx1c2gpOyoqKi9cbiAgICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCBzLnN0cnN0YXJ0IC0gMSAtIHMucHJldl9tYXRjaCwgcy5wcmV2X2xlbmd0aCAtIE1JTl9NQVRDSCk7XG4gICAgICAvKiBJbnNlcnQgaW4gaGFzaCB0YWJsZSBhbGwgc3RyaW5ncyB1cCB0byB0aGUgZW5kIG9mIHRoZSBtYXRjaC5cbiAgICAgICAqIHN0cnN0YXJ0LTEgYW5kIHN0cnN0YXJ0IGFyZSBhbHJlYWR5IGluc2VydGVkLiBJZiB0aGVyZSBpcyBub3RcbiAgICAgICAqIGVub3VnaCBsb29rYWhlYWQsIHRoZSBsYXN0IHR3byBzdHJpbmdzIGFyZSBub3QgaW5zZXJ0ZWQgaW5cbiAgICAgICAqIHRoZSBoYXNoIHRhYmxlLlxuICAgICAgICovXG4gICAgICBzLmxvb2thaGVhZCAtPSBzLnByZXZfbGVuZ3RoIC0gMTtcbiAgICAgIHMucHJldl9sZW5ndGggLT0gMjtcbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKCsrcy5zdHJzdGFydCA8PSBtYXhfaW5zZXJ0KSB7XG4gICAgICAgICAgLyoqKiBJTlNFUlRfU1RSSU5HKHMsIHMuc3Ryc3RhcnQsIGhhc2hfaGVhZCk7ICoqKi9cbiAgICAgICAgICBzLmluc19oID0gKChzLmluc19oIDw8IHMuaGFzaF9zaGlmdCkgXiBzLndpbmRvd1tzLnN0cnN0YXJ0ICsgTUlOX01BVENIIC0gMV0pICYgcy5oYXNoX21hc2s7XG4gICAgICAgICAgaGFzaF9oZWFkID0gcy5wcmV2W3Muc3Ryc3RhcnQgJiBzLndfbWFza10gPSBzLmhlYWRbcy5pbnNfaF07XG4gICAgICAgICAgcy5oZWFkW3MuaW5zX2hdID0gcy5zdHJzdGFydDtcbiAgICAgICAgICAvKioqL1xuICAgICAgICB9XG4gICAgICB9IHdoaWxlICgtLXMucHJldl9sZW5ndGggIT09IDApO1xuICAgICAgcy5tYXRjaF9hdmFpbGFibGUgPSAwO1xuICAgICAgcy5tYXRjaF9sZW5ndGggPSBNSU5fTUFUQ0ggLSAxO1xuICAgICAgcy5zdHJzdGFydCsrO1xuXG4gICAgICBpZiAoYmZsdXNoKSB7XG4gICAgICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICAgICAgZmx1c2hfYmxvY2tfb25seShzLCBmYWxzZSk7XG4gICAgICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgICAgfVxuICAgICAgICAvKioqL1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChzLm1hdGNoX2F2YWlsYWJsZSkge1xuICAgICAgLyogSWYgdGhlcmUgd2FzIG5vIG1hdGNoIGF0IHRoZSBwcmV2aW91cyBwb3NpdGlvbiwgb3V0cHV0IGFcbiAgICAgICAqIHNpbmdsZSBsaXRlcmFsLiBJZiB0aGVyZSB3YXMgYSBtYXRjaCBidXQgdGhlIGN1cnJlbnQgbWF0Y2hcbiAgICAgICAqIGlzIGxvbmdlciwgdHJ1bmNhdGUgdGhlIHByZXZpb3VzIG1hdGNoIHRvIGEgc2luZ2xlIGxpdGVyYWwuXG4gICAgICAgKi9cbiAgICAgIC8vVHJhY2V2digoc3RkZXJyLFwiJWNcIiwgcy0+d2luZG93W3MtPnN0cnN0YXJ0LTFdKSk7XG4gICAgICAvKioqIF90cl90YWxseV9saXQocywgcy53aW5kb3dbcy5zdHJzdGFydC0xXSwgYmZsdXNoKTsgKioqL1xuICAgICAgYmZsdXNoID0gdHJlZXMuX3RyX3RhbGx5KHMsIDAsIHMud2luZG93W3Muc3Ryc3RhcnQgLSAxXSk7XG5cbiAgICAgIGlmIChiZmx1c2gpIHtcbiAgICAgICAgLyoqKiBGTFVTSF9CTE9DS19PTkxZKHMsIDApICoqKi9cbiAgICAgICAgZmx1c2hfYmxvY2tfb25seShzLCBmYWxzZSk7XG4gICAgICAgIC8qKiovXG4gICAgICB9XG4gICAgICBzLnN0cnN0YXJ0Kys7XG4gICAgICBzLmxvb2thaGVhZC0tO1xuICAgICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLyogVGhlcmUgaXMgbm8gcHJldmlvdXMgbWF0Y2ggdG8gY29tcGFyZSB3aXRoLCB3YWl0IGZvclxuICAgICAgICogdGhlIG5leHQgc3RlcCB0byBkZWNpZGUuXG4gICAgICAgKi9cbiAgICAgIHMubWF0Y2hfYXZhaWxhYmxlID0gMTtcbiAgICAgIHMuc3Ryc3RhcnQrKztcbiAgICAgIHMubG9va2FoZWFkLS07XG4gICAgfVxuICB9XG4gIC8vQXNzZXJ0IChmbHVzaCAhPSBaX05PX0ZMVVNILCBcIm5vIGZsdXNoP1wiKTtcbiAgaWYgKHMubWF0Y2hfYXZhaWxhYmxlKSB7XG4gICAgLy9UcmFjZXZ2KChzdGRlcnIsXCIlY1wiLCBzLT53aW5kb3dbcy0+c3Ryc3RhcnQtMV0pKTtcbiAgICAvKioqIF90cl90YWxseV9saXQocywgcy53aW5kb3dbcy5zdHJzdGFydC0xXSwgYmZsdXNoKTsgKioqL1xuICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCAwLCBzLndpbmRvd1tzLnN0cnN0YXJ0IC0gMV0pO1xuXG4gICAgcy5tYXRjaF9hdmFpbGFibGUgPSAwO1xuICB9XG4gIHMuaW5zZXJ0ID0gcy5zdHJzdGFydCA8IE1JTl9NQVRDSCAtIDEgPyBzLnN0cnN0YXJ0IDogTUlOX01BVENIIC0gMTtcbiAgaWYgKGZsdXNoID09PSBaX0ZJTklTSCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMSk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIHRydWUpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfRklOSVNIX1NUQVJURUQ7XG4gICAgfVxuICAgIC8qKiovXG4gICAgcmV0dXJuIEJTX0ZJTklTSF9ET05FO1xuICB9XG4gIGlmIChzLmxhc3RfbGl0KSB7XG4gICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAwKTsgKioqL1xuICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgIH1cbiAgICAvKioqL1xuICB9XG5cbiAgcmV0dXJuIEJTX0JMT0NLX0RPTkU7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBGb3IgWl9STEUsIHNpbXBseSBsb29rIGZvciBydW5zIG9mIGJ5dGVzLCBnZW5lcmF0ZSBtYXRjaGVzIG9ubHkgb2YgZGlzdGFuY2VcbiAqIG9uZS4gIERvIG5vdCBtYWludGFpbiBhIGhhc2ggdGFibGUuICAoSXQgd2lsbCBiZSByZWdlbmVyYXRlZCBpZiB0aGlzIHJ1biBvZlxuICogZGVmbGF0ZSBzd2l0Y2hlcyBhd2F5IGZyb20gWl9STEUuKVxuICovXG5mdW5jdGlvbiBkZWZsYXRlX3JsZShzLCBmbHVzaCkge1xuICB2YXIgYmZsdXNoOyAgICAgICAgICAgIC8qIHNldCBpZiBjdXJyZW50IGJsb2NrIG11c3QgYmUgZmx1c2hlZCAqL1xuICB2YXIgcHJldjsgICAgICAgICAgICAgIC8qIGJ5dGUgYXQgZGlzdGFuY2Ugb25lIHRvIG1hdGNoICovXG4gIHZhciBzY2FuLCBzdHJlbmQ7ICAgICAgLyogc2NhbiBnb2VzIHVwIHRvIHN0cmVuZCBmb3IgbGVuZ3RoIG9mIHJ1biAqL1xuXG4gIHZhciBfd2luID0gcy53aW5kb3c7XG5cbiAgZm9yICg7Oykge1xuICAgIC8qIE1ha2Ugc3VyZSB0aGF0IHdlIGFsd2F5cyBoYXZlIGVub3VnaCBsb29rYWhlYWQsIGV4Y2VwdFxuICAgICAqIGF0IHRoZSBlbmQgb2YgdGhlIGlucHV0IGZpbGUuIFdlIG5lZWQgTUFYX01BVENIIGJ5dGVzXG4gICAgICogZm9yIHRoZSBsb25nZXN0IHJ1biwgcGx1cyBvbmUgZm9yIHRoZSB1bnJvbGxlZCBsb29wLlxuICAgICAqL1xuICAgIGlmIChzLmxvb2thaGVhZCA8PSBNQVhfTUFUQ0gpIHtcbiAgICAgIGZpbGxfd2luZG93KHMpO1xuICAgICAgaWYgKHMubG9va2FoZWFkIDw9IE1BWF9NQVRDSCAmJiBmbHVzaCA9PT0gWl9OT19GTFVTSCkge1xuICAgICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgICAgfVxuICAgICAgaWYgKHMubG9va2FoZWFkID09PSAwKSB7IGJyZWFrOyB9IC8qIGZsdXNoIHRoZSBjdXJyZW50IGJsb2NrICovXG4gICAgfVxuXG4gICAgLyogU2VlIGhvdyBtYW55IHRpbWVzIHRoZSBwcmV2aW91cyBieXRlIHJlcGVhdHMgKi9cbiAgICBzLm1hdGNoX2xlbmd0aCA9IDA7XG4gICAgaWYgKHMubG9va2FoZWFkID49IE1JTl9NQVRDSCAmJiBzLnN0cnN0YXJ0ID4gMCkge1xuICAgICAgc2NhbiA9IHMuc3Ryc3RhcnQgLSAxO1xuICAgICAgcHJldiA9IF93aW5bc2Nhbl07XG4gICAgICBpZiAocHJldiA9PT0gX3dpblsrK3NjYW5dICYmIHByZXYgPT09IF93aW5bKytzY2FuXSAmJiBwcmV2ID09PSBfd2luWysrc2Nhbl0pIHtcbiAgICAgICAgc3RyZW5kID0gcy5zdHJzdGFydCArIE1BWF9NQVRDSDtcbiAgICAgICAgZG8ge1xuICAgICAgICAgIC8qanNoaW50IG5vZW1wdHk6ZmFsc2UqL1xuICAgICAgICB9IHdoaWxlIChwcmV2ID09PSBfd2luWysrc2Nhbl0gJiYgcHJldiA9PT0gX3dpblsrK3NjYW5dICYmXG4gICAgICAgICAgICAgICAgIHByZXYgPT09IF93aW5bKytzY2FuXSAmJiBwcmV2ID09PSBfd2luWysrc2Nhbl0gJiZcbiAgICAgICAgICAgICAgICAgcHJldiA9PT0gX3dpblsrK3NjYW5dICYmIHByZXYgPT09IF93aW5bKytzY2FuXSAmJlxuICAgICAgICAgICAgICAgICBwcmV2ID09PSBfd2luWysrc2Nhbl0gJiYgcHJldiA9PT0gX3dpblsrK3NjYW5dICYmXG4gICAgICAgICAgICAgICAgIHNjYW4gPCBzdHJlbmQpO1xuICAgICAgICBzLm1hdGNoX2xlbmd0aCA9IE1BWF9NQVRDSCAtIChzdHJlbmQgLSBzY2FuKTtcbiAgICAgICAgaWYgKHMubWF0Y2hfbGVuZ3RoID4gcy5sb29rYWhlYWQpIHtcbiAgICAgICAgICBzLm1hdGNoX2xlbmd0aCA9IHMubG9va2FoZWFkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvL0Fzc2VydChzY2FuIDw9IHMtPndpbmRvdysodUludCkocy0+d2luZG93X3NpemUtMSksIFwid2lsZCBzY2FuXCIpO1xuICAgIH1cblxuICAgIC8qIEVtaXQgbWF0Y2ggaWYgaGF2ZSBydW4gb2YgTUlOX01BVENIIG9yIGxvbmdlciwgZWxzZSBlbWl0IGxpdGVyYWwgKi9cbiAgICBpZiAocy5tYXRjaF9sZW5ndGggPj0gTUlOX01BVENIKSB7XG4gICAgICAvL2NoZWNrX21hdGNoKHMsIHMuc3Ryc3RhcnQsIHMuc3Ryc3RhcnQgLSAxLCBzLm1hdGNoX2xlbmd0aCk7XG5cbiAgICAgIC8qKiogX3RyX3RhbGx5X2Rpc3QocywgMSwgcy5tYXRjaF9sZW5ndGggLSBNSU5fTUFUQ0gsIGJmbHVzaCk7ICoqKi9cbiAgICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCAxLCBzLm1hdGNoX2xlbmd0aCAtIE1JTl9NQVRDSCk7XG5cbiAgICAgIHMubG9va2FoZWFkIC09IHMubWF0Y2hfbGVuZ3RoO1xuICAgICAgcy5zdHJzdGFydCArPSBzLm1hdGNoX2xlbmd0aDtcbiAgICAgIHMubWF0Y2hfbGVuZ3RoID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgLyogTm8gbWF0Y2gsIG91dHB1dCBhIGxpdGVyYWwgYnl0ZSAqL1xuICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsXCIlY1wiLCBzLT53aW5kb3dbcy0+c3Ryc3RhcnRdKSk7XG4gICAgICAvKioqIF90cl90YWxseV9saXQocywgcy53aW5kb3dbcy5zdHJzdGFydF0sIGJmbHVzaCk7ICoqKi9cbiAgICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCAwLCBzLndpbmRvd1tzLnN0cnN0YXJ0XSk7XG5cbiAgICAgIHMubG9va2FoZWFkLS07XG4gICAgICBzLnN0cnN0YXJ0Kys7XG4gICAgfVxuICAgIGlmIChiZmx1c2gpIHtcbiAgICAgIC8qKiogRkxVU0hfQkxPQ0socywgMCk7ICoqKi9cbiAgICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIEJTX05FRURfTU9SRTtcbiAgICAgIH1cbiAgICAgIC8qKiovXG4gICAgfVxuICB9XG4gIHMuaW5zZXJ0ID0gMDtcbiAgaWYgKGZsdXNoID09PSBaX0ZJTklTSCkge1xuICAgIC8qKiogRkxVU0hfQkxPQ0socywgMSk7ICoqKi9cbiAgICBmbHVzaF9ibG9ja19vbmx5KHMsIHRydWUpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfRklOSVNIX1NUQVJURUQ7XG4gICAgfVxuICAgIC8qKiovXG4gICAgcmV0dXJuIEJTX0ZJTklTSF9ET05FO1xuICB9XG4gIGlmIChzLmxhc3RfbGl0KSB7XG4gICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAwKTsgKioqL1xuICAgIGZsdXNoX2Jsb2NrX29ubHkocywgZmFsc2UpO1xuICAgIGlmIChzLnN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgIH1cbiAgICAvKioqL1xuICB9XG4gIHJldHVybiBCU19CTE9DS19ET05FO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqIEZvciBaX0hVRkZNQU5fT05MWSwgZG8gbm90IGxvb2sgZm9yIG1hdGNoZXMuICBEbyBub3QgbWFpbnRhaW4gYSBoYXNoIHRhYmxlLlxuICogKEl0IHdpbGwgYmUgcmVnZW5lcmF0ZWQgaWYgdGhpcyBydW4gb2YgZGVmbGF0ZSBzd2l0Y2hlcyBhd2F5IGZyb20gSHVmZm1hbi4pXG4gKi9cbmZ1bmN0aW9uIGRlZmxhdGVfaHVmZihzLCBmbHVzaCkge1xuICB2YXIgYmZsdXNoOyAgICAgICAgICAgICAvKiBzZXQgaWYgY3VycmVudCBibG9jayBtdXN0IGJlIGZsdXNoZWQgKi9cblxuICBmb3IgKDs7KSB7XG4gICAgLyogTWFrZSBzdXJlIHRoYXQgd2UgaGF2ZSBhIGxpdGVyYWwgdG8gd3JpdGUuICovXG4gICAgaWYgKHMubG9va2FoZWFkID09PSAwKSB7XG4gICAgICBmaWxsX3dpbmRvdyhzKTtcbiAgICAgIGlmIChzLmxvb2thaGVhZCA9PT0gMCkge1xuICAgICAgICBpZiAoZmx1c2ggPT09IFpfTk9fRkxVU0gpIHtcbiAgICAgICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrOyAgICAgIC8qIGZsdXNoIHRoZSBjdXJyZW50IGJsb2NrICovXG4gICAgICB9XG4gICAgfVxuXG4gICAgLyogT3V0cHV0IGEgbGl0ZXJhbCBieXRlICovXG4gICAgcy5tYXRjaF9sZW5ndGggPSAwO1xuICAgIC8vVHJhY2V2digoc3RkZXJyLFwiJWNcIiwgcy0+d2luZG93W3MtPnN0cnN0YXJ0XSkpO1xuICAgIC8qKiogX3RyX3RhbGx5X2xpdChzLCBzLndpbmRvd1tzLnN0cnN0YXJ0XSwgYmZsdXNoKTsgKioqL1xuICAgIGJmbHVzaCA9IHRyZWVzLl90cl90YWxseShzLCAwLCBzLndpbmRvd1tzLnN0cnN0YXJ0XSk7XG4gICAgcy5sb29rYWhlYWQtLTtcbiAgICBzLnN0cnN0YXJ0Kys7XG4gICAgaWYgKGJmbHVzaCkge1xuICAgICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAwKTsgKioqL1xuICAgICAgZmx1c2hfYmxvY2tfb25seShzLCBmYWxzZSk7XG4gICAgICBpZiAocy5zdHJtLmF2YWlsX291dCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gQlNfTkVFRF9NT1JFO1xuICAgICAgfVxuICAgICAgLyoqKi9cbiAgICB9XG4gIH1cbiAgcy5pbnNlcnQgPSAwO1xuICBpZiAoZmx1c2ggPT09IFpfRklOSVNIKSB7XG4gICAgLyoqKiBGTFVTSF9CTE9DSyhzLCAxKTsgKioqL1xuICAgIGZsdXNoX2Jsb2NrX29ubHkocywgdHJ1ZSk7XG4gICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgIHJldHVybiBCU19GSU5JU0hfU1RBUlRFRDtcbiAgICB9XG4gICAgLyoqKi9cbiAgICByZXR1cm4gQlNfRklOSVNIX0RPTkU7XG4gIH1cbiAgaWYgKHMubGFzdF9saXQpIHtcbiAgICAvKioqIEZMVVNIX0JMT0NLKHMsIDApOyAqKiovXG4gICAgZmx1c2hfYmxvY2tfb25seShzLCBmYWxzZSk7XG4gICAgaWYgKHMuc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgIHJldHVybiBCU19ORUVEX01PUkU7XG4gICAgfVxuICAgIC8qKiovXG4gIH1cbiAgcmV0dXJuIEJTX0JMT0NLX0RPTkU7XG59XG5cbi8qIFZhbHVlcyBmb3IgbWF4X2xhenlfbWF0Y2gsIGdvb2RfbWF0Y2ggYW5kIG1heF9jaGFpbl9sZW5ndGgsIGRlcGVuZGluZyBvblxuICogdGhlIGRlc2lyZWQgcGFjayBsZXZlbCAoMC4uOSkuIFRoZSB2YWx1ZXMgZ2l2ZW4gYmVsb3cgaGF2ZSBiZWVuIHR1bmVkIHRvXG4gKiBleGNsdWRlIHdvcnN0IGNhc2UgcGVyZm9ybWFuY2UgZm9yIHBhdGhvbG9naWNhbCBmaWxlcy4gQmV0dGVyIHZhbHVlcyBtYXkgYmVcbiAqIGZvdW5kIGZvciBzcGVjaWZpYyBmaWxlcy5cbiAqL1xuZnVuY3Rpb24gQ29uZmlnKGdvb2RfbGVuZ3RoLCBtYXhfbGF6eSwgbmljZV9sZW5ndGgsIG1heF9jaGFpbiwgZnVuYykge1xuICB0aGlzLmdvb2RfbGVuZ3RoID0gZ29vZF9sZW5ndGg7XG4gIHRoaXMubWF4X2xhenkgPSBtYXhfbGF6eTtcbiAgdGhpcy5uaWNlX2xlbmd0aCA9IG5pY2VfbGVuZ3RoO1xuICB0aGlzLm1heF9jaGFpbiA9IG1heF9jaGFpbjtcbiAgdGhpcy5mdW5jID0gZnVuYztcbn1cblxudmFyIGNvbmZpZ3VyYXRpb25fdGFibGU7XG5cbmNvbmZpZ3VyYXRpb25fdGFibGUgPSBbXG4gIC8qICAgICAgZ29vZCBsYXp5IG5pY2UgY2hhaW4gKi9cbiAgbmV3IENvbmZpZygwLCAwLCAwLCAwLCBkZWZsYXRlX3N0b3JlZCksICAgICAgICAgIC8qIDAgc3RvcmUgb25seSAqL1xuICBuZXcgQ29uZmlnKDQsIDQsIDgsIDQsIGRlZmxhdGVfZmFzdCksICAgICAgICAgICAgLyogMSBtYXggc3BlZWQsIG5vIGxhenkgbWF0Y2hlcyAqL1xuICBuZXcgQ29uZmlnKDQsIDUsIDE2LCA4LCBkZWZsYXRlX2Zhc3QpLCAgICAgICAgICAgLyogMiAqL1xuICBuZXcgQ29uZmlnKDQsIDYsIDMyLCAzMiwgZGVmbGF0ZV9mYXN0KSwgICAgICAgICAgLyogMyAqL1xuXG4gIG5ldyBDb25maWcoNCwgNCwgMTYsIDE2LCBkZWZsYXRlX3Nsb3cpLCAgICAgICAgICAvKiA0IGxhenkgbWF0Y2hlcyAqL1xuICBuZXcgQ29uZmlnKDgsIDE2LCAzMiwgMzIsIGRlZmxhdGVfc2xvdyksICAgICAgICAgLyogNSAqL1xuICBuZXcgQ29uZmlnKDgsIDE2LCAxMjgsIDEyOCwgZGVmbGF0ZV9zbG93KSwgICAgICAgLyogNiAqL1xuICBuZXcgQ29uZmlnKDgsIDMyLCAxMjgsIDI1NiwgZGVmbGF0ZV9zbG93KSwgICAgICAgLyogNyAqL1xuICBuZXcgQ29uZmlnKDMyLCAxMjgsIDI1OCwgMTAyNCwgZGVmbGF0ZV9zbG93KSwgICAgLyogOCAqL1xuICBuZXcgQ29uZmlnKDMyLCAyNTgsIDI1OCwgNDA5NiwgZGVmbGF0ZV9zbG93KSAgICAgLyogOSBtYXggY29tcHJlc3Npb24gKi9cbl07XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKiBJbml0aWFsaXplIHRoZSBcImxvbmdlc3QgbWF0Y2hcIiByb3V0aW5lcyBmb3IgYSBuZXcgemxpYiBzdHJlYW1cbiAqL1xuZnVuY3Rpb24gbG1faW5pdChzKSB7XG4gIHMud2luZG93X3NpemUgPSAyICogcy53X3NpemU7XG5cbiAgLyoqKiBDTEVBUl9IQVNIKHMpOyAqKiovXG4gIHplcm8ocy5oZWFkKTsgLy8gRmlsbCB3aXRoIE5JTCAoPSAwKTtcblxuICAvKiBTZXQgdGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzOlxuICAgKi9cbiAgcy5tYXhfbGF6eV9tYXRjaCA9IGNvbmZpZ3VyYXRpb25fdGFibGVbcy5sZXZlbF0ubWF4X2xhenk7XG4gIHMuZ29vZF9tYXRjaCA9IGNvbmZpZ3VyYXRpb25fdGFibGVbcy5sZXZlbF0uZ29vZF9sZW5ndGg7XG4gIHMubmljZV9tYXRjaCA9IGNvbmZpZ3VyYXRpb25fdGFibGVbcy5sZXZlbF0ubmljZV9sZW5ndGg7XG4gIHMubWF4X2NoYWluX2xlbmd0aCA9IGNvbmZpZ3VyYXRpb25fdGFibGVbcy5sZXZlbF0ubWF4X2NoYWluO1xuXG4gIHMuc3Ryc3RhcnQgPSAwO1xuICBzLmJsb2NrX3N0YXJ0ID0gMDtcbiAgcy5sb29rYWhlYWQgPSAwO1xuICBzLmluc2VydCA9IDA7XG4gIHMubWF0Y2hfbGVuZ3RoID0gcy5wcmV2X2xlbmd0aCA9IE1JTl9NQVRDSCAtIDE7XG4gIHMubWF0Y2hfYXZhaWxhYmxlID0gMDtcbiAgcy5pbnNfaCA9IDA7XG59XG5cblxuZnVuY3Rpb24gRGVmbGF0ZVN0YXRlKCkge1xuICB0aGlzLnN0cm0gPSBudWxsOyAgICAgICAgICAgIC8qIHBvaW50ZXIgYmFjayB0byB0aGlzIHpsaWIgc3RyZWFtICovXG4gIHRoaXMuc3RhdHVzID0gMDsgICAgICAgICAgICAvKiBhcyB0aGUgbmFtZSBpbXBsaWVzICovXG4gIHRoaXMucGVuZGluZ19idWYgPSBudWxsOyAgICAgIC8qIG91dHB1dCBzdGlsbCBwZW5kaW5nICovXG4gIHRoaXMucGVuZGluZ19idWZfc2l6ZSA9IDA7ICAvKiBzaXplIG9mIHBlbmRpbmdfYnVmICovXG4gIHRoaXMucGVuZGluZ19vdXQgPSAwOyAgICAgICAvKiBuZXh0IHBlbmRpbmcgYnl0ZSB0byBvdXRwdXQgdG8gdGhlIHN0cmVhbSAqL1xuICB0aGlzLnBlbmRpbmcgPSAwOyAgICAgICAgICAgLyogbmIgb2YgYnl0ZXMgaW4gdGhlIHBlbmRpbmcgYnVmZmVyICovXG4gIHRoaXMud3JhcCA9IDA7ICAgICAgICAgICAgICAvKiBiaXQgMCB0cnVlIGZvciB6bGliLCBiaXQgMSB0cnVlIGZvciBnemlwICovXG4gIHRoaXMuZ3poZWFkID0gbnVsbDsgICAgICAgICAvKiBnemlwIGhlYWRlciBpbmZvcm1hdGlvbiB0byB3cml0ZSAqL1xuICB0aGlzLmd6aW5kZXggPSAwOyAgICAgICAgICAgLyogd2hlcmUgaW4gZXh0cmEsIG5hbWUsIG9yIGNvbW1lbnQgKi9cbiAgdGhpcy5tZXRob2QgPSBaX0RFRkxBVEVEOyAvKiBjYW4gb25seSBiZSBERUZMQVRFRCAqL1xuICB0aGlzLmxhc3RfZmx1c2ggPSAtMTsgICAvKiB2YWx1ZSBvZiBmbHVzaCBwYXJhbSBmb3IgcHJldmlvdXMgZGVmbGF0ZSBjYWxsICovXG5cbiAgdGhpcy53X3NpemUgPSAwOyAgLyogTFo3NyB3aW5kb3cgc2l6ZSAoMzJLIGJ5IGRlZmF1bHQpICovXG4gIHRoaXMud19iaXRzID0gMDsgIC8qIGxvZzIod19zaXplKSAgKDguLjE2KSAqL1xuICB0aGlzLndfbWFzayA9IDA7ICAvKiB3X3NpemUgLSAxICovXG5cbiAgdGhpcy53aW5kb3cgPSBudWxsO1xuICAvKiBTbGlkaW5nIHdpbmRvdy4gSW5wdXQgYnl0ZXMgYXJlIHJlYWQgaW50byB0aGUgc2Vjb25kIGhhbGYgb2YgdGhlIHdpbmRvdyxcbiAgICogYW5kIG1vdmUgdG8gdGhlIGZpcnN0IGhhbGYgbGF0ZXIgdG8ga2VlcCBhIGRpY3Rpb25hcnkgb2YgYXQgbGVhc3Qgd1NpemVcbiAgICogYnl0ZXMuIFdpdGggdGhpcyBvcmdhbml6YXRpb24sIG1hdGNoZXMgYXJlIGxpbWl0ZWQgdG8gYSBkaXN0YW5jZSBvZlxuICAgKiB3U2l6ZS1NQVhfTUFUQ0ggYnl0ZXMsIGJ1dCB0aGlzIGVuc3VyZXMgdGhhdCBJTyBpcyBhbHdheXNcbiAgICogcGVyZm9ybWVkIHdpdGggYSBsZW5ndGggbXVsdGlwbGUgb2YgdGhlIGJsb2NrIHNpemUuXG4gICAqL1xuXG4gIHRoaXMud2luZG93X3NpemUgPSAwO1xuICAvKiBBY3R1YWwgc2l6ZSBvZiB3aW5kb3c6IDIqd1NpemUsIGV4Y2VwdCB3aGVuIHRoZSB1c2VyIGlucHV0IGJ1ZmZlclxuICAgKiBpcyBkaXJlY3RseSB1c2VkIGFzIHNsaWRpbmcgd2luZG93LlxuICAgKi9cblxuICB0aGlzLnByZXYgPSBudWxsO1xuICAvKiBMaW5rIHRvIG9sZGVyIHN0cmluZyB3aXRoIHNhbWUgaGFzaCBpbmRleC4gVG8gbGltaXQgdGhlIHNpemUgb2YgdGhpc1xuICAgKiBhcnJheSB0byA2NEssIHRoaXMgbGluayBpcyBtYWludGFpbmVkIG9ubHkgZm9yIHRoZSBsYXN0IDMySyBzdHJpbmdzLlxuICAgKiBBbiBpbmRleCBpbiB0aGlzIGFycmF5IGlzIHRodXMgYSB3aW5kb3cgaW5kZXggbW9kdWxvIDMySy5cbiAgICovXG5cbiAgdGhpcy5oZWFkID0gbnVsbDsgICAvKiBIZWFkcyBvZiB0aGUgaGFzaCBjaGFpbnMgb3IgTklMLiAqL1xuXG4gIHRoaXMuaW5zX2ggPSAwOyAgICAgICAvKiBoYXNoIGluZGV4IG9mIHN0cmluZyB0byBiZSBpbnNlcnRlZCAqL1xuICB0aGlzLmhhc2hfc2l6ZSA9IDA7ICAgLyogbnVtYmVyIG9mIGVsZW1lbnRzIGluIGhhc2ggdGFibGUgKi9cbiAgdGhpcy5oYXNoX2JpdHMgPSAwOyAgIC8qIGxvZzIoaGFzaF9zaXplKSAqL1xuICB0aGlzLmhhc2hfbWFzayA9IDA7ICAgLyogaGFzaF9zaXplLTEgKi9cblxuICB0aGlzLmhhc2hfc2hpZnQgPSAwO1xuICAvKiBOdW1iZXIgb2YgYml0cyBieSB3aGljaCBpbnNfaCBtdXN0IGJlIHNoaWZ0ZWQgYXQgZWFjaCBpbnB1dFxuICAgKiBzdGVwLiBJdCBtdXN0IGJlIHN1Y2ggdGhhdCBhZnRlciBNSU5fTUFUQ0ggc3RlcHMsIHRoZSBvbGRlc3RcbiAgICogYnl0ZSBubyBsb25nZXIgdGFrZXMgcGFydCBpbiB0aGUgaGFzaCBrZXksIHRoYXQgaXM6XG4gICAqICAgaGFzaF9zaGlmdCAqIE1JTl9NQVRDSCA+PSBoYXNoX2JpdHNcbiAgICovXG5cbiAgdGhpcy5ibG9ja19zdGFydCA9IDA7XG4gIC8qIFdpbmRvdyBwb3NpdGlvbiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBjdXJyZW50IG91dHB1dCBibG9jay4gR2V0c1xuICAgKiBuZWdhdGl2ZSB3aGVuIHRoZSB3aW5kb3cgaXMgbW92ZWQgYmFja3dhcmRzLlxuICAgKi9cblxuICB0aGlzLm1hdGNoX2xlbmd0aCA9IDA7ICAgICAgLyogbGVuZ3RoIG9mIGJlc3QgbWF0Y2ggKi9cbiAgdGhpcy5wcmV2X21hdGNoID0gMDsgICAgICAgIC8qIHByZXZpb3VzIG1hdGNoICovXG4gIHRoaXMubWF0Y2hfYXZhaWxhYmxlID0gMDsgICAvKiBzZXQgaWYgcHJldmlvdXMgbWF0Y2ggZXhpc3RzICovXG4gIHRoaXMuc3Ryc3RhcnQgPSAwOyAgICAgICAgICAvKiBzdGFydCBvZiBzdHJpbmcgdG8gaW5zZXJ0ICovXG4gIHRoaXMubWF0Y2hfc3RhcnQgPSAwOyAgICAgICAvKiBzdGFydCBvZiBtYXRjaGluZyBzdHJpbmcgKi9cbiAgdGhpcy5sb29rYWhlYWQgPSAwOyAgICAgICAgIC8qIG51bWJlciBvZiB2YWxpZCBieXRlcyBhaGVhZCBpbiB3aW5kb3cgKi9cblxuICB0aGlzLnByZXZfbGVuZ3RoID0gMDtcbiAgLyogTGVuZ3RoIG9mIHRoZSBiZXN0IG1hdGNoIGF0IHByZXZpb3VzIHN0ZXAuIE1hdGNoZXMgbm90IGdyZWF0ZXIgdGhhbiB0aGlzXG4gICAqIGFyZSBkaXNjYXJkZWQuIFRoaXMgaXMgdXNlZCBpbiB0aGUgbGF6eSBtYXRjaCBldmFsdWF0aW9uLlxuICAgKi9cblxuICB0aGlzLm1heF9jaGFpbl9sZW5ndGggPSAwO1xuICAvKiBUbyBzcGVlZCB1cCBkZWZsYXRpb24sIGhhc2ggY2hhaW5zIGFyZSBuZXZlciBzZWFyY2hlZCBiZXlvbmQgdGhpc1xuICAgKiBsZW5ndGguICBBIGhpZ2hlciBsaW1pdCBpbXByb3ZlcyBjb21wcmVzc2lvbiByYXRpbyBidXQgZGVncmFkZXMgdGhlXG4gICAqIHNwZWVkLlxuICAgKi9cblxuICB0aGlzLm1heF9sYXp5X21hdGNoID0gMDtcbiAgLyogQXR0ZW1wdCB0byBmaW5kIGEgYmV0dGVyIG1hdGNoIG9ubHkgd2hlbiB0aGUgY3VycmVudCBtYXRjaCBpcyBzdHJpY3RseVxuICAgKiBzbWFsbGVyIHRoYW4gdGhpcyB2YWx1ZS4gVGhpcyBtZWNoYW5pc20gaXMgdXNlZCBvbmx5IGZvciBjb21wcmVzc2lvblxuICAgKiBsZXZlbHMgPj0gNC5cbiAgICovXG4gIC8vIFRoYXQncyBhbGlhcyB0byBtYXhfbGF6eV9tYXRjaCwgZG9uJ3QgdXNlIGRpcmVjdGx5XG4gIC8vdGhpcy5tYXhfaW5zZXJ0X2xlbmd0aCA9IDA7XG4gIC8qIEluc2VydCBuZXcgc3RyaW5ncyBpbiB0aGUgaGFzaCB0YWJsZSBvbmx5IGlmIHRoZSBtYXRjaCBsZW5ndGggaXMgbm90XG4gICAqIGdyZWF0ZXIgdGhhbiB0aGlzIGxlbmd0aC4gVGhpcyBzYXZlcyB0aW1lIGJ1dCBkZWdyYWRlcyBjb21wcmVzc2lvbi5cbiAgICogbWF4X2luc2VydF9sZW5ndGggaXMgdXNlZCBvbmx5IGZvciBjb21wcmVzc2lvbiBsZXZlbHMgPD0gMy5cbiAgICovXG5cbiAgdGhpcy5sZXZlbCA9IDA7ICAgICAvKiBjb21wcmVzc2lvbiBsZXZlbCAoMS4uOSkgKi9cbiAgdGhpcy5zdHJhdGVneSA9IDA7ICAvKiBmYXZvciBvciBmb3JjZSBIdWZmbWFuIGNvZGluZyovXG5cbiAgdGhpcy5nb29kX21hdGNoID0gMDtcbiAgLyogVXNlIGEgZmFzdGVyIHNlYXJjaCB3aGVuIHRoZSBwcmV2aW91cyBtYXRjaCBpcyBsb25nZXIgdGhhbiB0aGlzICovXG5cbiAgdGhpcy5uaWNlX21hdGNoID0gMDsgLyogU3RvcCBzZWFyY2hpbmcgd2hlbiBjdXJyZW50IG1hdGNoIGV4Y2VlZHMgdGhpcyAqL1xuXG4gICAgICAgICAgICAgIC8qIHVzZWQgYnkgdHJlZXMuYzogKi9cblxuICAvKiBEaWRuJ3QgdXNlIGN0X2RhdGEgdHlwZWRlZiBiZWxvdyB0byBzdXBwcmVzcyBjb21waWxlciB3YXJuaW5nICovXG5cbiAgLy8gc3RydWN0IGN0X2RhdGFfcyBkeW5fbHRyZWVbSEVBUF9TSVpFXTsgICAvKiBsaXRlcmFsIGFuZCBsZW5ndGggdHJlZSAqL1xuICAvLyBzdHJ1Y3QgY3RfZGF0YV9zIGR5bl9kdHJlZVsyKkRfQ09ERVMrMV07IC8qIGRpc3RhbmNlIHRyZWUgKi9cbiAgLy8gc3RydWN0IGN0X2RhdGFfcyBibF90cmVlWzIqQkxfQ09ERVMrMV07ICAvKiBIdWZmbWFuIHRyZWUgZm9yIGJpdCBsZW5ndGhzICovXG5cbiAgLy8gVXNlIGZsYXQgYXJyYXkgb2YgRE9VQkxFIHNpemUsIHdpdGggaW50ZXJsZWF2ZWQgZmF0YSxcbiAgLy8gYmVjYXVzZSBKUyBkb2VzIG5vdCBzdXBwb3J0IGVmZmVjdGl2ZVxuICB0aGlzLmR5bl9sdHJlZSAgPSBuZXcgdXRpbHMuQnVmMTYoSEVBUF9TSVpFICogMik7XG4gIHRoaXMuZHluX2R0cmVlICA9IG5ldyB1dGlscy5CdWYxNigoMiAqIERfQ09ERVMgKyAxKSAqIDIpO1xuICB0aGlzLmJsX3RyZWUgICAgPSBuZXcgdXRpbHMuQnVmMTYoKDIgKiBCTF9DT0RFUyArIDEpICogMik7XG4gIHplcm8odGhpcy5keW5fbHRyZWUpO1xuICB6ZXJvKHRoaXMuZHluX2R0cmVlKTtcbiAgemVybyh0aGlzLmJsX3RyZWUpO1xuXG4gIHRoaXMubF9kZXNjICAgPSBudWxsOyAgICAgICAgIC8qIGRlc2MuIGZvciBsaXRlcmFsIHRyZWUgKi9cbiAgdGhpcy5kX2Rlc2MgICA9IG51bGw7ICAgICAgICAgLyogZGVzYy4gZm9yIGRpc3RhbmNlIHRyZWUgKi9cbiAgdGhpcy5ibF9kZXNjICA9IG51bGw7ICAgICAgICAgLyogZGVzYy4gZm9yIGJpdCBsZW5ndGggdHJlZSAqL1xuXG4gIC8vdXNoIGJsX2NvdW50W01BWF9CSVRTKzFdO1xuICB0aGlzLmJsX2NvdW50ID0gbmV3IHV0aWxzLkJ1ZjE2KE1BWF9CSVRTICsgMSk7XG4gIC8qIG51bWJlciBvZiBjb2RlcyBhdCBlYWNoIGJpdCBsZW5ndGggZm9yIGFuIG9wdGltYWwgdHJlZSAqL1xuXG4gIC8vaW50IGhlYXBbMipMX0NPREVTKzFdOyAgICAgIC8qIGhlYXAgdXNlZCB0byBidWlsZCB0aGUgSHVmZm1hbiB0cmVlcyAqL1xuICB0aGlzLmhlYXAgPSBuZXcgdXRpbHMuQnVmMTYoMiAqIExfQ09ERVMgKyAxKTsgIC8qIGhlYXAgdXNlZCB0byBidWlsZCB0aGUgSHVmZm1hbiB0cmVlcyAqL1xuICB6ZXJvKHRoaXMuaGVhcCk7XG5cbiAgdGhpcy5oZWFwX2xlbiA9IDA7ICAgICAgICAgICAgICAgLyogbnVtYmVyIG9mIGVsZW1lbnRzIGluIHRoZSBoZWFwICovXG4gIHRoaXMuaGVhcF9tYXggPSAwOyAgICAgICAgICAgICAgIC8qIGVsZW1lbnQgb2YgbGFyZ2VzdCBmcmVxdWVuY3kgKi9cbiAgLyogVGhlIHNvbnMgb2YgaGVhcFtuXSBhcmUgaGVhcFsyKm5dIGFuZCBoZWFwWzIqbisxXS4gaGVhcFswXSBpcyBub3QgdXNlZC5cbiAgICogVGhlIHNhbWUgaGVhcCBhcnJheSBpcyB1c2VkIHRvIGJ1aWxkIGFsbCB0cmVlcy5cbiAgICovXG5cbiAgdGhpcy5kZXB0aCA9IG5ldyB1dGlscy5CdWYxNigyICogTF9DT0RFUyArIDEpOyAvL3VjaCBkZXB0aFsyKkxfQ09ERVMrMV07XG4gIHplcm8odGhpcy5kZXB0aCk7XG4gIC8qIERlcHRoIG9mIGVhY2ggc3VidHJlZSB1c2VkIGFzIHRpZSBicmVha2VyIGZvciB0cmVlcyBvZiBlcXVhbCBmcmVxdWVuY3lcbiAgICovXG5cbiAgdGhpcy5sX2J1ZiA9IDA7ICAgICAgICAgIC8qIGJ1ZmZlciBpbmRleCBmb3IgbGl0ZXJhbHMgb3IgbGVuZ3RocyAqL1xuXG4gIHRoaXMubGl0X2J1ZnNpemUgPSAwO1xuICAvKiBTaXplIG9mIG1hdGNoIGJ1ZmZlciBmb3IgbGl0ZXJhbHMvbGVuZ3Rocy4gIFRoZXJlIGFyZSA0IHJlYXNvbnMgZm9yXG4gICAqIGxpbWl0aW5nIGxpdF9idWZzaXplIHRvIDY0SzpcbiAgICogICAtIGZyZXF1ZW5jaWVzIGNhbiBiZSBrZXB0IGluIDE2IGJpdCBjb3VudGVyc1xuICAgKiAgIC0gaWYgY29tcHJlc3Npb24gaXMgbm90IHN1Y2Nlc3NmdWwgZm9yIHRoZSBmaXJzdCBibG9jaywgYWxsIGlucHV0XG4gICAqICAgICBkYXRhIGlzIHN0aWxsIGluIHRoZSB3aW5kb3cgc28gd2UgY2FuIHN0aWxsIGVtaXQgYSBzdG9yZWQgYmxvY2sgZXZlblxuICAgKiAgICAgd2hlbiBpbnB1dCBjb21lcyBmcm9tIHN0YW5kYXJkIGlucHV0LiAgKFRoaXMgY2FuIGFsc28gYmUgZG9uZSBmb3JcbiAgICogICAgIGFsbCBibG9ja3MgaWYgbGl0X2J1ZnNpemUgaXMgbm90IGdyZWF0ZXIgdGhhbiAzMksuKVxuICAgKiAgIC0gaWYgY29tcHJlc3Npb24gaXMgbm90IHN1Y2Nlc3NmdWwgZm9yIGEgZmlsZSBzbWFsbGVyIHRoYW4gNjRLLCB3ZSBjYW5cbiAgICogICAgIGV2ZW4gZW1pdCBhIHN0b3JlZCBmaWxlIGluc3RlYWQgb2YgYSBzdG9yZWQgYmxvY2sgKHNhdmluZyA1IGJ5dGVzKS5cbiAgICogICAgIFRoaXMgaXMgYXBwbGljYWJsZSBvbmx5IGZvciB6aXAgKG5vdCBnemlwIG9yIHpsaWIpLlxuICAgKiAgIC0gY3JlYXRpbmcgbmV3IEh1ZmZtYW4gdHJlZXMgbGVzcyBmcmVxdWVudGx5IG1heSBub3QgcHJvdmlkZSBmYXN0XG4gICAqICAgICBhZGFwdGF0aW9uIHRvIGNoYW5nZXMgaW4gdGhlIGlucHV0IGRhdGEgc3RhdGlzdGljcy4gKFRha2UgZm9yXG4gICAqICAgICBleGFtcGxlIGEgYmluYXJ5IGZpbGUgd2l0aCBwb29ybHkgY29tcHJlc3NpYmxlIGNvZGUgZm9sbG93ZWQgYnlcbiAgICogICAgIGEgaGlnaGx5IGNvbXByZXNzaWJsZSBzdHJpbmcgdGFibGUuKSBTbWFsbGVyIGJ1ZmZlciBzaXplcyBnaXZlXG4gICAqICAgICBmYXN0IGFkYXB0YXRpb24gYnV0IGhhdmUgb2YgY291cnNlIHRoZSBvdmVyaGVhZCBvZiB0cmFuc21pdHRpbmdcbiAgICogICAgIHRyZWVzIG1vcmUgZnJlcXVlbnRseS5cbiAgICogICAtIEkgY2FuJ3QgY291bnQgYWJvdmUgNFxuICAgKi9cblxuICB0aGlzLmxhc3RfbGl0ID0gMDsgICAgICAvKiBydW5uaW5nIGluZGV4IGluIGxfYnVmICovXG5cbiAgdGhpcy5kX2J1ZiA9IDA7XG4gIC8qIEJ1ZmZlciBpbmRleCBmb3IgZGlzdGFuY2VzLiBUbyBzaW1wbGlmeSB0aGUgY29kZSwgZF9idWYgYW5kIGxfYnVmIGhhdmVcbiAgICogdGhlIHNhbWUgbnVtYmVyIG9mIGVsZW1lbnRzLiBUbyB1c2UgZGlmZmVyZW50IGxlbmd0aHMsIGFuIGV4dHJhIGZsYWdcbiAgICogYXJyYXkgd291bGQgYmUgbmVjZXNzYXJ5LlxuICAgKi9cblxuICB0aGlzLm9wdF9sZW4gPSAwOyAgICAgICAvKiBiaXQgbGVuZ3RoIG9mIGN1cnJlbnQgYmxvY2sgd2l0aCBvcHRpbWFsIHRyZWVzICovXG4gIHRoaXMuc3RhdGljX2xlbiA9IDA7ICAgIC8qIGJpdCBsZW5ndGggb2YgY3VycmVudCBibG9jayB3aXRoIHN0YXRpYyB0cmVlcyAqL1xuICB0aGlzLm1hdGNoZXMgPSAwOyAgICAgICAvKiBudW1iZXIgb2Ygc3RyaW5nIG1hdGNoZXMgaW4gY3VycmVudCBibG9jayAqL1xuICB0aGlzLmluc2VydCA9IDA7ICAgICAgICAvKiBieXRlcyBhdCBlbmQgb2Ygd2luZG93IGxlZnQgdG8gaW5zZXJ0ICovXG5cblxuICB0aGlzLmJpX2J1ZiA9IDA7XG4gIC8qIE91dHB1dCBidWZmZXIuIGJpdHMgYXJlIGluc2VydGVkIHN0YXJ0aW5nIGF0IHRoZSBib3R0b20gKGxlYXN0XG4gICAqIHNpZ25pZmljYW50IGJpdHMpLlxuICAgKi9cbiAgdGhpcy5iaV92YWxpZCA9IDA7XG4gIC8qIE51bWJlciBvZiB2YWxpZCBiaXRzIGluIGJpX2J1Zi4gIEFsbCBiaXRzIGFib3ZlIHRoZSBsYXN0IHZhbGlkIGJpdFxuICAgKiBhcmUgYWx3YXlzIHplcm8uXG4gICAqL1xuXG4gIC8vIFVzZWQgZm9yIHdpbmRvdyBtZW1vcnkgaW5pdC4gV2Ugc2FmZWx5IGlnbm9yZSBpdCBmb3IgSlMuIFRoYXQgbWFrZXNcbiAgLy8gc2Vuc2Ugb25seSBmb3IgcG9pbnRlcnMgYW5kIG1lbW9yeSBjaGVjayB0b29scy5cbiAgLy90aGlzLmhpZ2hfd2F0ZXIgPSAwO1xuICAvKiBIaWdoIHdhdGVyIG1hcmsgb2Zmc2V0IGluIHdpbmRvdyBmb3IgaW5pdGlhbGl6ZWQgYnl0ZXMgLS0gYnl0ZXMgYWJvdmVcbiAgICogdGhpcyBhcmUgc2V0IHRvIHplcm8gaW4gb3JkZXIgdG8gYXZvaWQgbWVtb3J5IGNoZWNrIHdhcm5pbmdzIHdoZW5cbiAgICogbG9uZ2VzdCBtYXRjaCByb3V0aW5lcyBhY2Nlc3MgYnl0ZXMgcGFzdCB0aGUgaW5wdXQuICBUaGlzIGlzIHRoZW5cbiAgICogdXBkYXRlZCB0byB0aGUgbmV3IGhpZ2ggd2F0ZXIgbWFyay5cbiAgICovXG59XG5cblxuZnVuY3Rpb24gZGVmbGF0ZVJlc2V0S2VlcChzdHJtKSB7XG4gIHZhciBzO1xuXG4gIGlmICghc3RybSB8fCAhc3RybS5zdGF0ZSkge1xuICAgIHJldHVybiBlcnIoc3RybSwgWl9TVFJFQU1fRVJST1IpO1xuICB9XG5cbiAgc3RybS50b3RhbF9pbiA9IHN0cm0udG90YWxfb3V0ID0gMDtcbiAgc3RybS5kYXRhX3R5cGUgPSBaX1VOS05PV047XG5cbiAgcyA9IHN0cm0uc3RhdGU7XG4gIHMucGVuZGluZyA9IDA7XG4gIHMucGVuZGluZ19vdXQgPSAwO1xuXG4gIGlmIChzLndyYXAgPCAwKSB7XG4gICAgcy53cmFwID0gLXMud3JhcDtcbiAgICAvKiB3YXMgbWFkZSBuZWdhdGl2ZSBieSBkZWZsYXRlKC4uLiwgWl9GSU5JU0gpOyAqL1xuICB9XG4gIHMuc3RhdHVzID0gKHMud3JhcCA/IElOSVRfU1RBVEUgOiBCVVNZX1NUQVRFKTtcbiAgc3RybS5hZGxlciA9IChzLndyYXAgPT09IDIpID9cbiAgICAwICAvLyBjcmMzMigwLCBaX05VTEwsIDApXG4gIDpcbiAgICAxOyAvLyBhZGxlcjMyKDAsIFpfTlVMTCwgMClcbiAgcy5sYXN0X2ZsdXNoID0gWl9OT19GTFVTSDtcbiAgdHJlZXMuX3RyX2luaXQocyk7XG4gIHJldHVybiBaX09LO1xufVxuXG5cbmZ1bmN0aW9uIGRlZmxhdGVSZXNldChzdHJtKSB7XG4gIHZhciByZXQgPSBkZWZsYXRlUmVzZXRLZWVwKHN0cm0pO1xuICBpZiAocmV0ID09PSBaX09LKSB7XG4gICAgbG1faW5pdChzdHJtLnN0YXRlKTtcbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXG5cbmZ1bmN0aW9uIGRlZmxhdGVTZXRIZWFkZXIoc3RybSwgaGVhZCkge1xuICBpZiAoIXN0cm0gfHwgIXN0cm0uc3RhdGUpIHsgcmV0dXJuIFpfU1RSRUFNX0VSUk9SOyB9XG4gIGlmIChzdHJtLnN0YXRlLndyYXAgIT09IDIpIHsgcmV0dXJuIFpfU1RSRUFNX0VSUk9SOyB9XG4gIHN0cm0uc3RhdGUuZ3poZWFkID0gaGVhZDtcbiAgcmV0dXJuIFpfT0s7XG59XG5cblxuZnVuY3Rpb24gZGVmbGF0ZUluaXQyKHN0cm0sIGxldmVsLCBtZXRob2QsIHdpbmRvd0JpdHMsIG1lbUxldmVsLCBzdHJhdGVneSkge1xuICBpZiAoIXN0cm0pIHsgLy8gPT09IFpfTlVMTFxuICAgIHJldHVybiBaX1NUUkVBTV9FUlJPUjtcbiAgfVxuICB2YXIgd3JhcCA9IDE7XG5cbiAgaWYgKGxldmVsID09PSBaX0RFRkFVTFRfQ09NUFJFU1NJT04pIHtcbiAgICBsZXZlbCA9IDY7XG4gIH1cblxuICBpZiAod2luZG93Qml0cyA8IDApIHsgLyogc3VwcHJlc3MgemxpYiB3cmFwcGVyICovXG4gICAgd3JhcCA9IDA7XG4gICAgd2luZG93Qml0cyA9IC13aW5kb3dCaXRzO1xuICB9XG5cbiAgZWxzZSBpZiAod2luZG93Qml0cyA+IDE1KSB7XG4gICAgd3JhcCA9IDI7ICAgICAgICAgICAvKiB3cml0ZSBnemlwIHdyYXBwZXIgaW5zdGVhZCAqL1xuICAgIHdpbmRvd0JpdHMgLT0gMTY7XG4gIH1cblxuXG4gIGlmIChtZW1MZXZlbCA8IDEgfHwgbWVtTGV2ZWwgPiBNQVhfTUVNX0xFVkVMIHx8IG1ldGhvZCAhPT0gWl9ERUZMQVRFRCB8fFxuICAgIHdpbmRvd0JpdHMgPCA4IHx8IHdpbmRvd0JpdHMgPiAxNSB8fCBsZXZlbCA8IDAgfHwgbGV2ZWwgPiA5IHx8XG4gICAgc3RyYXRlZ3kgPCAwIHx8IHN0cmF0ZWd5ID4gWl9GSVhFRCkge1xuICAgIHJldHVybiBlcnIoc3RybSwgWl9TVFJFQU1fRVJST1IpO1xuICB9XG5cblxuICBpZiAod2luZG93Qml0cyA9PT0gOCkge1xuICAgIHdpbmRvd0JpdHMgPSA5O1xuICB9XG4gIC8qIHVudGlsIDI1Ni1ieXRlIHdpbmRvdyBidWcgZml4ZWQgKi9cblxuICB2YXIgcyA9IG5ldyBEZWZsYXRlU3RhdGUoKTtcblxuICBzdHJtLnN0YXRlID0gcztcbiAgcy5zdHJtID0gc3RybTtcblxuICBzLndyYXAgPSB3cmFwO1xuICBzLmd6aGVhZCA9IG51bGw7XG4gIHMud19iaXRzID0gd2luZG93Qml0cztcbiAgcy53X3NpemUgPSAxIDw8IHMud19iaXRzO1xuICBzLndfbWFzayA9IHMud19zaXplIC0gMTtcblxuICBzLmhhc2hfYml0cyA9IG1lbUxldmVsICsgNztcbiAgcy5oYXNoX3NpemUgPSAxIDw8IHMuaGFzaF9iaXRzO1xuICBzLmhhc2hfbWFzayA9IHMuaGFzaF9zaXplIC0gMTtcbiAgcy5oYXNoX3NoaWZ0ID0gfn4oKHMuaGFzaF9iaXRzICsgTUlOX01BVENIIC0gMSkgLyBNSU5fTUFUQ0gpO1xuXG4gIHMud2luZG93ID0gbmV3IHV0aWxzLkJ1Zjgocy53X3NpemUgKiAyKTtcbiAgcy5oZWFkID0gbmV3IHV0aWxzLkJ1ZjE2KHMuaGFzaF9zaXplKTtcbiAgcy5wcmV2ID0gbmV3IHV0aWxzLkJ1ZjE2KHMud19zaXplKTtcblxuICAvLyBEb24ndCBuZWVkIG1lbSBpbml0IG1hZ2ljIGZvciBKUy5cbiAgLy9zLmhpZ2hfd2F0ZXIgPSAwOyAgLyogbm90aGluZyB3cml0dGVuIHRvIHMtPndpbmRvdyB5ZXQgKi9cblxuICBzLmxpdF9idWZzaXplID0gMSA8PCAobWVtTGV2ZWwgKyA2KTsgLyogMTZLIGVsZW1lbnRzIGJ5IGRlZmF1bHQgKi9cblxuICBzLnBlbmRpbmdfYnVmX3NpemUgPSBzLmxpdF9idWZzaXplICogNDtcblxuICAvL292ZXJsYXkgPSAodXNoZiAqKSBaQUxMT0Moc3RybSwgcy0+bGl0X2J1ZnNpemUsIHNpemVvZih1c2gpKzIpO1xuICAvL3MtPnBlbmRpbmdfYnVmID0gKHVjaGYgKikgb3ZlcmxheTtcbiAgcy5wZW5kaW5nX2J1ZiA9IG5ldyB1dGlscy5CdWY4KHMucGVuZGluZ19idWZfc2l6ZSk7XG5cbiAgLy8gSXQgaXMgb2Zmc2V0IGZyb20gYHMucGVuZGluZ19idWZgIChzaXplIGlzIGBzLmxpdF9idWZzaXplICogMmApXG4gIC8vcy0+ZF9idWYgPSBvdmVybGF5ICsgcy0+bGl0X2J1ZnNpemUvc2l6ZW9mKHVzaCk7XG4gIHMuZF9idWYgPSAxICogcy5saXRfYnVmc2l6ZTtcblxuICAvL3MtPmxfYnVmID0gcy0+cGVuZGluZ19idWYgKyAoMStzaXplb2YodXNoKSkqcy0+bGl0X2J1ZnNpemU7XG4gIHMubF9idWYgPSAoMSArIDIpICogcy5saXRfYnVmc2l6ZTtcblxuICBzLmxldmVsID0gbGV2ZWw7XG4gIHMuc3RyYXRlZ3kgPSBzdHJhdGVneTtcbiAgcy5tZXRob2QgPSBtZXRob2Q7XG5cbiAgcmV0dXJuIGRlZmxhdGVSZXNldChzdHJtKTtcbn1cblxuZnVuY3Rpb24gZGVmbGF0ZUluaXQoc3RybSwgbGV2ZWwpIHtcbiAgcmV0dXJuIGRlZmxhdGVJbml0MihzdHJtLCBsZXZlbCwgWl9ERUZMQVRFRCwgTUFYX1dCSVRTLCBERUZfTUVNX0xFVkVMLCBaX0RFRkFVTFRfU1RSQVRFR1kpO1xufVxuXG5cbmZ1bmN0aW9uIGRlZmxhdGUoc3RybSwgZmx1c2gpIHtcbiAgdmFyIG9sZF9mbHVzaCwgcztcbiAgdmFyIGJlZywgdmFsOyAvLyBmb3IgZ3ppcCBoZWFkZXIgd3JpdGUgb25seVxuXG4gIGlmICghc3RybSB8fCAhc3RybS5zdGF0ZSB8fFxuICAgIGZsdXNoID4gWl9CTE9DSyB8fCBmbHVzaCA8IDApIHtcbiAgICByZXR1cm4gc3RybSA/IGVycihzdHJtLCBaX1NUUkVBTV9FUlJPUikgOiBaX1NUUkVBTV9FUlJPUjtcbiAgfVxuXG4gIHMgPSBzdHJtLnN0YXRlO1xuXG4gIGlmICghc3RybS5vdXRwdXQgfHxcbiAgICAgICghc3RybS5pbnB1dCAmJiBzdHJtLmF2YWlsX2luICE9PSAwKSB8fFxuICAgICAgKHMuc3RhdHVzID09PSBGSU5JU0hfU1RBVEUgJiYgZmx1c2ggIT09IFpfRklOSVNIKSkge1xuICAgIHJldHVybiBlcnIoc3RybSwgKHN0cm0uYXZhaWxfb3V0ID09PSAwKSA/IFpfQlVGX0VSUk9SIDogWl9TVFJFQU1fRVJST1IpO1xuICB9XG5cbiAgcy5zdHJtID0gc3RybTsgLyoganVzdCBpbiBjYXNlICovXG4gIG9sZF9mbHVzaCA9IHMubGFzdF9mbHVzaDtcbiAgcy5sYXN0X2ZsdXNoID0gZmx1c2g7XG5cbiAgLyogV3JpdGUgdGhlIGhlYWRlciAqL1xuICBpZiAocy5zdGF0dXMgPT09IElOSVRfU1RBVEUpIHtcblxuICAgIGlmIChzLndyYXAgPT09IDIpIHsgLy8gR1pJUCBoZWFkZXJcbiAgICAgIHN0cm0uYWRsZXIgPSAwOyAgLy9jcmMzMigwTCwgWl9OVUxMLCAwKTtcbiAgICAgIHB1dF9ieXRlKHMsIDMxKTtcbiAgICAgIHB1dF9ieXRlKHMsIDEzOSk7XG4gICAgICBwdXRfYnl0ZShzLCA4KTtcbiAgICAgIGlmICghcy5nemhlYWQpIHsgLy8gcy0+Z3poZWFkID09IFpfTlVMTFxuICAgICAgICBwdXRfYnl0ZShzLCAwKTtcbiAgICAgICAgcHV0X2J5dGUocywgMCk7XG4gICAgICAgIHB1dF9ieXRlKHMsIDApO1xuICAgICAgICBwdXRfYnl0ZShzLCAwKTtcbiAgICAgICAgcHV0X2J5dGUocywgMCk7XG4gICAgICAgIHB1dF9ieXRlKHMsIHMubGV2ZWwgPT09IDkgPyAyIDpcbiAgICAgICAgICAgICAgICAgICAgKHMuc3RyYXRlZ3kgPj0gWl9IVUZGTUFOX09OTFkgfHwgcy5sZXZlbCA8IDIgP1xuICAgICAgICAgICAgICAgICAgICAgNCA6IDApKTtcbiAgICAgICAgcHV0X2J5dGUocywgT1NfQ09ERSk7XG4gICAgICAgIHMuc3RhdHVzID0gQlVTWV9TVEFURTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBwdXRfYnl0ZShzLCAocy5nemhlYWQudGV4dCA/IDEgOiAwKSArXG4gICAgICAgICAgICAgICAgICAgIChzLmd6aGVhZC5oY3JjID8gMiA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgKCFzLmd6aGVhZC5leHRyYSA/IDAgOiA0KSArXG4gICAgICAgICAgICAgICAgICAgICghcy5nemhlYWQubmFtZSA/IDAgOiA4KSArXG4gICAgICAgICAgICAgICAgICAgICghcy5nemhlYWQuY29tbWVudCA/IDAgOiAxNilcbiAgICAgICAgKTtcbiAgICAgICAgcHV0X2J5dGUocywgcy5nemhlYWQudGltZSAmIDB4ZmYpO1xuICAgICAgICBwdXRfYnl0ZShzLCAocy5nemhlYWQudGltZSA+PiA4KSAmIDB4ZmYpO1xuICAgICAgICBwdXRfYnl0ZShzLCAocy5nemhlYWQudGltZSA+PiAxNikgJiAweGZmKTtcbiAgICAgICAgcHV0X2J5dGUocywgKHMuZ3poZWFkLnRpbWUgPj4gMjQpICYgMHhmZik7XG4gICAgICAgIHB1dF9ieXRlKHMsIHMubGV2ZWwgPT09IDkgPyAyIDpcbiAgICAgICAgICAgICAgICAgICAgKHMuc3RyYXRlZ3kgPj0gWl9IVUZGTUFOX09OTFkgfHwgcy5sZXZlbCA8IDIgP1xuICAgICAgICAgICAgICAgICAgICAgNCA6IDApKTtcbiAgICAgICAgcHV0X2J5dGUocywgcy5nemhlYWQub3MgJiAweGZmKTtcbiAgICAgICAgaWYgKHMuZ3poZWFkLmV4dHJhICYmIHMuZ3poZWFkLmV4dHJhLmxlbmd0aCkge1xuICAgICAgICAgIHB1dF9ieXRlKHMsIHMuZ3poZWFkLmV4dHJhLmxlbmd0aCAmIDB4ZmYpO1xuICAgICAgICAgIHB1dF9ieXRlKHMsIChzLmd6aGVhZC5leHRyYS5sZW5ndGggPj4gOCkgJiAweGZmKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocy5nemhlYWQuaGNyYykge1xuICAgICAgICAgIHN0cm0uYWRsZXIgPSBjcmMzMihzdHJtLmFkbGVyLCBzLnBlbmRpbmdfYnVmLCBzLnBlbmRpbmcsIDApO1xuICAgICAgICB9XG4gICAgICAgIHMuZ3ppbmRleCA9IDA7XG4gICAgICAgIHMuc3RhdHVzID0gRVhUUkFfU1RBVEU7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgLy8gREVGTEFURSBoZWFkZXJcbiAgICB7XG4gICAgICB2YXIgaGVhZGVyID0gKFpfREVGTEFURUQgKyAoKHMud19iaXRzIC0gOCkgPDwgNCkpIDw8IDg7XG4gICAgICB2YXIgbGV2ZWxfZmxhZ3MgPSAtMTtcblxuICAgICAgaWYgKHMuc3RyYXRlZ3kgPj0gWl9IVUZGTUFOX09OTFkgfHwgcy5sZXZlbCA8IDIpIHtcbiAgICAgICAgbGV2ZWxfZmxhZ3MgPSAwO1xuICAgICAgfSBlbHNlIGlmIChzLmxldmVsIDwgNikge1xuICAgICAgICBsZXZlbF9mbGFncyA9IDE7XG4gICAgICB9IGVsc2UgaWYgKHMubGV2ZWwgPT09IDYpIHtcbiAgICAgICAgbGV2ZWxfZmxhZ3MgPSAyO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV2ZWxfZmxhZ3MgPSAzO1xuICAgICAgfVxuICAgICAgaGVhZGVyIHw9IChsZXZlbF9mbGFncyA8PCA2KTtcbiAgICAgIGlmIChzLnN0cnN0YXJ0ICE9PSAwKSB7IGhlYWRlciB8PSBQUkVTRVRfRElDVDsgfVxuICAgICAgaGVhZGVyICs9IDMxIC0gKGhlYWRlciAlIDMxKTtcblxuICAgICAgcy5zdGF0dXMgPSBCVVNZX1NUQVRFO1xuICAgICAgcHV0U2hvcnRNU0IocywgaGVhZGVyKTtcblxuICAgICAgLyogU2F2ZSB0aGUgYWRsZXIzMiBvZiB0aGUgcHJlc2V0IGRpY3Rpb25hcnk6ICovXG4gICAgICBpZiAocy5zdHJzdGFydCAhPT0gMCkge1xuICAgICAgICBwdXRTaG9ydE1TQihzLCBzdHJtLmFkbGVyID4+PiAxNik7XG4gICAgICAgIHB1dFNob3J0TVNCKHMsIHN0cm0uYWRsZXIgJiAweGZmZmYpO1xuICAgICAgfVxuICAgICAgc3RybS5hZGxlciA9IDE7IC8vIGFkbGVyMzIoMEwsIFpfTlVMTCwgMCk7XG4gICAgfVxuICB9XG5cbi8vI2lmZGVmIEdaSVBcbiAgaWYgKHMuc3RhdHVzID09PSBFWFRSQV9TVEFURSkge1xuICAgIGlmIChzLmd6aGVhZC5leHRyYS8qICE9IFpfTlVMTCovKSB7XG4gICAgICBiZWcgPSBzLnBlbmRpbmc7ICAvKiBzdGFydCBvZiBieXRlcyB0byB1cGRhdGUgY3JjICovXG5cbiAgICAgIHdoaWxlIChzLmd6aW5kZXggPCAocy5nemhlYWQuZXh0cmEubGVuZ3RoICYgMHhmZmZmKSkge1xuICAgICAgICBpZiAocy5wZW5kaW5nID09PSBzLnBlbmRpbmdfYnVmX3NpemUpIHtcbiAgICAgICAgICBpZiAocy5nemhlYWQuaGNyYyAmJiBzLnBlbmRpbmcgPiBiZWcpIHtcbiAgICAgICAgICAgIHN0cm0uYWRsZXIgPSBjcmMzMihzdHJtLmFkbGVyLCBzLnBlbmRpbmdfYnVmLCBzLnBlbmRpbmcgLSBiZWcsIGJlZyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZsdXNoX3BlbmRpbmcoc3RybSk7XG4gICAgICAgICAgYmVnID0gcy5wZW5kaW5nO1xuICAgICAgICAgIGlmIChzLnBlbmRpbmcgPT09IHMucGVuZGluZ19idWZfc2l6ZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHB1dF9ieXRlKHMsIHMuZ3poZWFkLmV4dHJhW3MuZ3ppbmRleF0gJiAweGZmKTtcbiAgICAgICAgcy5nemluZGV4Kys7XG4gICAgICB9XG4gICAgICBpZiAocy5nemhlYWQuaGNyYyAmJiBzLnBlbmRpbmcgPiBiZWcpIHtcbiAgICAgICAgc3RybS5hZGxlciA9IGNyYzMyKHN0cm0uYWRsZXIsIHMucGVuZGluZ19idWYsIHMucGVuZGluZyAtIGJlZywgYmVnKTtcbiAgICAgIH1cbiAgICAgIGlmIChzLmd6aW5kZXggPT09IHMuZ3poZWFkLmV4dHJhLmxlbmd0aCkge1xuICAgICAgICBzLmd6aW5kZXggPSAwO1xuICAgICAgICBzLnN0YXR1cyA9IE5BTUVfU1RBVEU7XG4gICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgcy5zdGF0dXMgPSBOQU1FX1NUQVRFO1xuICAgIH1cbiAgfVxuICBpZiAocy5zdGF0dXMgPT09IE5BTUVfU1RBVEUpIHtcbiAgICBpZiAocy5nemhlYWQubmFtZS8qICE9IFpfTlVMTCovKSB7XG4gICAgICBiZWcgPSBzLnBlbmRpbmc7ICAvKiBzdGFydCBvZiBieXRlcyB0byB1cGRhdGUgY3JjICovXG4gICAgICAvL2ludCB2YWw7XG5cbiAgICAgIGRvIHtcbiAgICAgICAgaWYgKHMucGVuZGluZyA9PT0gcy5wZW5kaW5nX2J1Zl9zaXplKSB7XG4gICAgICAgICAgaWYgKHMuZ3poZWFkLmhjcmMgJiYgcy5wZW5kaW5nID4gYmVnKSB7XG4gICAgICAgICAgICBzdHJtLmFkbGVyID0gY3JjMzIoc3RybS5hZGxlciwgcy5wZW5kaW5nX2J1Ziwgcy5wZW5kaW5nIC0gYmVnLCBiZWcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmbHVzaF9wZW5kaW5nKHN0cm0pO1xuICAgICAgICAgIGJlZyA9IHMucGVuZGluZztcbiAgICAgICAgICBpZiAocy5wZW5kaW5nID09PSBzLnBlbmRpbmdfYnVmX3NpemUpIHtcbiAgICAgICAgICAgIHZhbCA9IDE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gSlMgc3BlY2lmaWM6IGxpdHRsZSBtYWdpYyB0byBhZGQgemVybyB0ZXJtaW5hdG9yIHRvIGVuZCBvZiBzdHJpbmdcbiAgICAgICAgaWYgKHMuZ3ppbmRleCA8IHMuZ3poZWFkLm5hbWUubGVuZ3RoKSB7XG4gICAgICAgICAgdmFsID0gcy5nemhlYWQubmFtZS5jaGFyQ29kZUF0KHMuZ3ppbmRleCsrKSAmIDB4ZmY7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsID0gMDtcbiAgICAgICAgfVxuICAgICAgICBwdXRfYnl0ZShzLCB2YWwpO1xuICAgICAgfSB3aGlsZSAodmFsICE9PSAwKTtcblxuICAgICAgaWYgKHMuZ3poZWFkLmhjcmMgJiYgcy5wZW5kaW5nID4gYmVnKSB7XG4gICAgICAgIHN0cm0uYWRsZXIgPSBjcmMzMihzdHJtLmFkbGVyLCBzLnBlbmRpbmdfYnVmLCBzLnBlbmRpbmcgLSBiZWcsIGJlZyk7XG4gICAgICB9XG4gICAgICBpZiAodmFsID09PSAwKSB7XG4gICAgICAgIHMuZ3ppbmRleCA9IDA7XG4gICAgICAgIHMuc3RhdHVzID0gQ09NTUVOVF9TVEFURTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzLnN0YXR1cyA9IENPTU1FTlRfU1RBVEU7XG4gICAgfVxuICB9XG4gIGlmIChzLnN0YXR1cyA9PT0gQ09NTUVOVF9TVEFURSkge1xuICAgIGlmIChzLmd6aGVhZC5jb21tZW50LyogIT0gWl9OVUxMKi8pIHtcbiAgICAgIGJlZyA9IHMucGVuZGluZzsgIC8qIHN0YXJ0IG9mIGJ5dGVzIHRvIHVwZGF0ZSBjcmMgKi9cbiAgICAgIC8vaW50IHZhbDtcblxuICAgICAgZG8ge1xuICAgICAgICBpZiAocy5wZW5kaW5nID09PSBzLnBlbmRpbmdfYnVmX3NpemUpIHtcbiAgICAgICAgICBpZiAocy5nemhlYWQuaGNyYyAmJiBzLnBlbmRpbmcgPiBiZWcpIHtcbiAgICAgICAgICAgIHN0cm0uYWRsZXIgPSBjcmMzMihzdHJtLmFkbGVyLCBzLnBlbmRpbmdfYnVmLCBzLnBlbmRpbmcgLSBiZWcsIGJlZyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZsdXNoX3BlbmRpbmcoc3RybSk7XG4gICAgICAgICAgYmVnID0gcy5wZW5kaW5nO1xuICAgICAgICAgIGlmIChzLnBlbmRpbmcgPT09IHMucGVuZGluZ19idWZfc2l6ZSkge1xuICAgICAgICAgICAgdmFsID0gMTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBKUyBzcGVjaWZpYzogbGl0dGxlIG1hZ2ljIHRvIGFkZCB6ZXJvIHRlcm1pbmF0b3IgdG8gZW5kIG9mIHN0cmluZ1xuICAgICAgICBpZiAocy5nemluZGV4IDwgcy5nemhlYWQuY29tbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICB2YWwgPSBzLmd6aGVhZC5jb21tZW50LmNoYXJDb2RlQXQocy5nemluZGV4KyspICYgMHhmZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWwgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHB1dF9ieXRlKHMsIHZhbCk7XG4gICAgICB9IHdoaWxlICh2YWwgIT09IDApO1xuXG4gICAgICBpZiAocy5nemhlYWQuaGNyYyAmJiBzLnBlbmRpbmcgPiBiZWcpIHtcbiAgICAgICAgc3RybS5hZGxlciA9IGNyYzMyKHN0cm0uYWRsZXIsIHMucGVuZGluZ19idWYsIHMucGVuZGluZyAtIGJlZywgYmVnKTtcbiAgICAgIH1cbiAgICAgIGlmICh2YWwgPT09IDApIHtcbiAgICAgICAgcy5zdGF0dXMgPSBIQ1JDX1NUQVRFO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHMuc3RhdHVzID0gSENSQ19TVEFURTtcbiAgICB9XG4gIH1cbiAgaWYgKHMuc3RhdHVzID09PSBIQ1JDX1NUQVRFKSB7XG4gICAgaWYgKHMuZ3poZWFkLmhjcmMpIHtcbiAgICAgIGlmIChzLnBlbmRpbmcgKyAyID4gcy5wZW5kaW5nX2J1Zl9zaXplKSB7XG4gICAgICAgIGZsdXNoX3BlbmRpbmcoc3RybSk7XG4gICAgICB9XG4gICAgICBpZiAocy5wZW5kaW5nICsgMiA8PSBzLnBlbmRpbmdfYnVmX3NpemUpIHtcbiAgICAgICAgcHV0X2J5dGUocywgc3RybS5hZGxlciAmIDB4ZmYpO1xuICAgICAgICBwdXRfYnl0ZShzLCAoc3RybS5hZGxlciA+PiA4KSAmIDB4ZmYpO1xuICAgICAgICBzdHJtLmFkbGVyID0gMDsgLy9jcmMzMigwTCwgWl9OVUxMLCAwKTtcbiAgICAgICAgcy5zdGF0dXMgPSBCVVNZX1NUQVRFO1xuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHMuc3RhdHVzID0gQlVTWV9TVEFURTtcbiAgICB9XG4gIH1cbi8vI2VuZGlmXG5cbiAgLyogRmx1c2ggYXMgbXVjaCBwZW5kaW5nIG91dHB1dCBhcyBwb3NzaWJsZSAqL1xuICBpZiAocy5wZW5kaW5nICE9PSAwKSB7XG4gICAgZmx1c2hfcGVuZGluZyhzdHJtKTtcbiAgICBpZiAoc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgIC8qIFNpbmNlIGF2YWlsX291dCBpcyAwLCBkZWZsYXRlIHdpbGwgYmUgY2FsbGVkIGFnYWluIHdpdGhcbiAgICAgICAqIG1vcmUgb3V0cHV0IHNwYWNlLCBidXQgcG9zc2libHkgd2l0aCBib3RoIHBlbmRpbmcgYW5kXG4gICAgICAgKiBhdmFpbF9pbiBlcXVhbCB0byB6ZXJvLiBUaGVyZSB3b24ndCBiZSBhbnl0aGluZyB0byBkbyxcbiAgICAgICAqIGJ1dCB0aGlzIGlzIG5vdCBhbiBlcnJvciBzaXR1YXRpb24gc28gbWFrZSBzdXJlIHdlXG4gICAgICAgKiByZXR1cm4gT0sgaW5zdGVhZCBvZiBCVUZfRVJST1IgYXQgbmV4dCBjYWxsIG9mIGRlZmxhdGU6XG4gICAgICAgKi9cbiAgICAgIHMubGFzdF9mbHVzaCA9IC0xO1xuICAgICAgcmV0dXJuIFpfT0s7XG4gICAgfVxuXG4gICAgLyogTWFrZSBzdXJlIHRoZXJlIGlzIHNvbWV0aGluZyB0byBkbyBhbmQgYXZvaWQgZHVwbGljYXRlIGNvbnNlY3V0aXZlXG4gICAgICogZmx1c2hlcy4gRm9yIHJlcGVhdGVkIGFuZCB1c2VsZXNzIGNhbGxzIHdpdGggWl9GSU5JU0gsIHdlIGtlZXBcbiAgICAgKiByZXR1cm5pbmcgWl9TVFJFQU1fRU5EIGluc3RlYWQgb2YgWl9CVUZfRVJST1IuXG4gICAgICovXG4gIH0gZWxzZSBpZiAoc3RybS5hdmFpbF9pbiA9PT0gMCAmJiByYW5rKGZsdXNoKSA8PSByYW5rKG9sZF9mbHVzaCkgJiZcbiAgICBmbHVzaCAhPT0gWl9GSU5JU0gpIHtcbiAgICByZXR1cm4gZXJyKHN0cm0sIFpfQlVGX0VSUk9SKTtcbiAgfVxuXG4gIC8qIFVzZXIgbXVzdCBub3QgcHJvdmlkZSBtb3JlIGlucHV0IGFmdGVyIHRoZSBmaXJzdCBGSU5JU0g6ICovXG4gIGlmIChzLnN0YXR1cyA9PT0gRklOSVNIX1NUQVRFICYmIHN0cm0uYXZhaWxfaW4gIT09IDApIHtcbiAgICByZXR1cm4gZXJyKHN0cm0sIFpfQlVGX0VSUk9SKTtcbiAgfVxuXG4gIC8qIFN0YXJ0IGEgbmV3IGJsb2NrIG9yIGNvbnRpbnVlIHRoZSBjdXJyZW50IG9uZS5cbiAgICovXG4gIGlmIChzdHJtLmF2YWlsX2luICE9PSAwIHx8IHMubG9va2FoZWFkICE9PSAwIHx8XG4gICAgKGZsdXNoICE9PSBaX05PX0ZMVVNIICYmIHMuc3RhdHVzICE9PSBGSU5JU0hfU1RBVEUpKSB7XG4gICAgdmFyIGJzdGF0ZSA9IChzLnN0cmF0ZWd5ID09PSBaX0hVRkZNQU5fT05MWSkgPyBkZWZsYXRlX2h1ZmYocywgZmx1c2gpIDpcbiAgICAgIChzLnN0cmF0ZWd5ID09PSBaX1JMRSA/IGRlZmxhdGVfcmxlKHMsIGZsdXNoKSA6XG4gICAgICAgIGNvbmZpZ3VyYXRpb25fdGFibGVbcy5sZXZlbF0uZnVuYyhzLCBmbHVzaCkpO1xuXG4gICAgaWYgKGJzdGF0ZSA9PT0gQlNfRklOSVNIX1NUQVJURUQgfHwgYnN0YXRlID09PSBCU19GSU5JU0hfRE9ORSkge1xuICAgICAgcy5zdGF0dXMgPSBGSU5JU0hfU1RBVEU7XG4gICAgfVxuICAgIGlmIChic3RhdGUgPT09IEJTX05FRURfTU9SRSB8fCBic3RhdGUgPT09IEJTX0ZJTklTSF9TVEFSVEVEKSB7XG4gICAgICBpZiAoc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcy5sYXN0X2ZsdXNoID0gLTE7XG4gICAgICAgIC8qIGF2b2lkIEJVRl9FUlJPUiBuZXh0IGNhbGwsIHNlZSBhYm92ZSAqL1xuICAgICAgfVxuICAgICAgcmV0dXJuIFpfT0s7XG4gICAgICAvKiBJZiBmbHVzaCAhPSBaX05PX0ZMVVNIICYmIGF2YWlsX291dCA9PSAwLCB0aGUgbmV4dCBjYWxsXG4gICAgICAgKiBvZiBkZWZsYXRlIHNob3VsZCB1c2UgdGhlIHNhbWUgZmx1c2ggcGFyYW1ldGVyIHRvIG1ha2Ugc3VyZVxuICAgICAgICogdGhhdCB0aGUgZmx1c2ggaXMgY29tcGxldGUuIFNvIHdlIGRvbid0IGhhdmUgdG8gb3V0cHV0IGFuXG4gICAgICAgKiBlbXB0eSBibG9jayBoZXJlLCB0aGlzIHdpbGwgYmUgZG9uZSBhdCBuZXh0IGNhbGwuIFRoaXMgYWxzb1xuICAgICAgICogZW5zdXJlcyB0aGF0IGZvciBhIHZlcnkgc21hbGwgb3V0cHV0IGJ1ZmZlciwgd2UgZW1pdCBhdCBtb3N0XG4gICAgICAgKiBvbmUgZW1wdHkgYmxvY2suXG4gICAgICAgKi9cbiAgICB9XG4gICAgaWYgKGJzdGF0ZSA9PT0gQlNfQkxPQ0tfRE9ORSkge1xuICAgICAgaWYgKGZsdXNoID09PSBaX1BBUlRJQUxfRkxVU0gpIHtcbiAgICAgICAgdHJlZXMuX3RyX2FsaWduKHMpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZmx1c2ggIT09IFpfQkxPQ0spIHsgLyogRlVMTF9GTFVTSCBvciBTWU5DX0ZMVVNIICovXG5cbiAgICAgICAgdHJlZXMuX3RyX3N0b3JlZF9ibG9jayhzLCAwLCAwLCBmYWxzZSk7XG4gICAgICAgIC8qIEZvciBhIGZ1bGwgZmx1c2gsIHRoaXMgZW1wdHkgYmxvY2sgd2lsbCBiZSByZWNvZ25pemVkXG4gICAgICAgICAqIGFzIGEgc3BlY2lhbCBtYXJrZXIgYnkgaW5mbGF0ZV9zeW5jKCkuXG4gICAgICAgICAqL1xuICAgICAgICBpZiAoZmx1c2ggPT09IFpfRlVMTF9GTFVTSCkge1xuICAgICAgICAgIC8qKiogQ0xFQVJfSEFTSChzKTsgKioqLyAgICAgICAgICAgICAvKiBmb3JnZXQgaGlzdG9yeSAqL1xuICAgICAgICAgIHplcm8ocy5oZWFkKTsgLy8gRmlsbCB3aXRoIE5JTCAoPSAwKTtcblxuICAgICAgICAgIGlmIChzLmxvb2thaGVhZCA9PT0gMCkge1xuICAgICAgICAgICAgcy5zdHJzdGFydCA9IDA7XG4gICAgICAgICAgICBzLmJsb2NrX3N0YXJ0ID0gMDtcbiAgICAgICAgICAgIHMuaW5zZXJ0ID0gMDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZsdXNoX3BlbmRpbmcoc3RybSk7XG4gICAgICBpZiAoc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgICAgcy5sYXN0X2ZsdXNoID0gLTE7IC8qIGF2b2lkIEJVRl9FUlJPUiBhdCBuZXh0IGNhbGwsIHNlZSBhYm92ZSAqL1xuICAgICAgICByZXR1cm4gWl9PSztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy9Bc3NlcnQoc3RybS0+YXZhaWxfb3V0ID4gMCwgXCJidWcyXCIpO1xuICAvL2lmIChzdHJtLmF2YWlsX291dCA8PSAwKSB7IHRocm93IG5ldyBFcnJvcihcImJ1ZzJcIik7fVxuXG4gIGlmIChmbHVzaCAhPT0gWl9GSU5JU0gpIHsgcmV0dXJuIFpfT0s7IH1cbiAgaWYgKHMud3JhcCA8PSAwKSB7IHJldHVybiBaX1NUUkVBTV9FTkQ7IH1cblxuICAvKiBXcml0ZSB0aGUgdHJhaWxlciAqL1xuICBpZiAocy53cmFwID09PSAyKSB7XG4gICAgcHV0X2J5dGUocywgc3RybS5hZGxlciAmIDB4ZmYpO1xuICAgIHB1dF9ieXRlKHMsIChzdHJtLmFkbGVyID4+IDgpICYgMHhmZik7XG4gICAgcHV0X2J5dGUocywgKHN0cm0uYWRsZXIgPj4gMTYpICYgMHhmZik7XG4gICAgcHV0X2J5dGUocywgKHN0cm0uYWRsZXIgPj4gMjQpICYgMHhmZik7XG4gICAgcHV0X2J5dGUocywgc3RybS50b3RhbF9pbiAmIDB4ZmYpO1xuICAgIHB1dF9ieXRlKHMsIChzdHJtLnRvdGFsX2luID4+IDgpICYgMHhmZik7XG4gICAgcHV0X2J5dGUocywgKHN0cm0udG90YWxfaW4gPj4gMTYpICYgMHhmZik7XG4gICAgcHV0X2J5dGUocywgKHN0cm0udG90YWxfaW4gPj4gMjQpICYgMHhmZik7XG4gIH1cbiAgZWxzZVxuICB7XG4gICAgcHV0U2hvcnRNU0Iocywgc3RybS5hZGxlciA+Pj4gMTYpO1xuICAgIHB1dFNob3J0TVNCKHMsIHN0cm0uYWRsZXIgJiAweGZmZmYpO1xuICB9XG5cbiAgZmx1c2hfcGVuZGluZyhzdHJtKTtcbiAgLyogSWYgYXZhaWxfb3V0IGlzIHplcm8sIHRoZSBhcHBsaWNhdGlvbiB3aWxsIGNhbGwgZGVmbGF0ZSBhZ2FpblxuICAgKiB0byBmbHVzaCB0aGUgcmVzdC5cbiAgICovXG4gIGlmIChzLndyYXAgPiAwKSB7IHMud3JhcCA9IC1zLndyYXA7IH1cbiAgLyogd3JpdGUgdGhlIHRyYWlsZXIgb25seSBvbmNlISAqL1xuICByZXR1cm4gcy5wZW5kaW5nICE9PSAwID8gWl9PSyA6IFpfU1RSRUFNX0VORDtcbn1cblxuZnVuY3Rpb24gZGVmbGF0ZUVuZChzdHJtKSB7XG4gIHZhciBzdGF0dXM7XG5cbiAgaWYgKCFzdHJtLyo9PSBaX05VTEwqLyB8fCAhc3RybS5zdGF0ZS8qPT0gWl9OVUxMKi8pIHtcbiAgICByZXR1cm4gWl9TVFJFQU1fRVJST1I7XG4gIH1cblxuICBzdGF0dXMgPSBzdHJtLnN0YXRlLnN0YXR1cztcbiAgaWYgKHN0YXR1cyAhPT0gSU5JVF9TVEFURSAmJlxuICAgIHN0YXR1cyAhPT0gRVhUUkFfU1RBVEUgJiZcbiAgICBzdGF0dXMgIT09IE5BTUVfU1RBVEUgJiZcbiAgICBzdGF0dXMgIT09IENPTU1FTlRfU1RBVEUgJiZcbiAgICBzdGF0dXMgIT09IEhDUkNfU1RBVEUgJiZcbiAgICBzdGF0dXMgIT09IEJVU1lfU1RBVEUgJiZcbiAgICBzdGF0dXMgIT09IEZJTklTSF9TVEFURVxuICApIHtcbiAgICByZXR1cm4gZXJyKHN0cm0sIFpfU1RSRUFNX0VSUk9SKTtcbiAgfVxuXG4gIHN0cm0uc3RhdGUgPSBudWxsO1xuXG4gIHJldHVybiBzdGF0dXMgPT09IEJVU1lfU1RBVEUgPyBlcnIoc3RybSwgWl9EQVRBX0VSUk9SKSA6IFpfT0s7XG59XG5cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICogSW5pdGlhbGl6ZXMgdGhlIGNvbXByZXNzaW9uIGRpY3Rpb25hcnkgZnJvbSB0aGUgZ2l2ZW4gYnl0ZVxuICogc2VxdWVuY2Ugd2l0aG91dCBwcm9kdWNpbmcgYW55IGNvbXByZXNzZWQgb3V0cHV0LlxuICovXG5mdW5jdGlvbiBkZWZsYXRlU2V0RGljdGlvbmFyeShzdHJtLCBkaWN0aW9uYXJ5KSB7XG4gIHZhciBkaWN0TGVuZ3RoID0gZGljdGlvbmFyeS5sZW5ndGg7XG5cbiAgdmFyIHM7XG4gIHZhciBzdHIsIG47XG4gIHZhciB3cmFwO1xuICB2YXIgYXZhaWw7XG4gIHZhciBuZXh0O1xuICB2YXIgaW5wdXQ7XG4gIHZhciB0bXBEaWN0O1xuXG4gIGlmICghc3RybS8qPT0gWl9OVUxMKi8gfHwgIXN0cm0uc3RhdGUvKj09IFpfTlVMTCovKSB7XG4gICAgcmV0dXJuIFpfU1RSRUFNX0VSUk9SO1xuICB9XG5cbiAgcyA9IHN0cm0uc3RhdGU7XG4gIHdyYXAgPSBzLndyYXA7XG5cbiAgaWYgKHdyYXAgPT09IDIgfHwgKHdyYXAgPT09IDEgJiYgcy5zdGF0dXMgIT09IElOSVRfU1RBVEUpIHx8IHMubG9va2FoZWFkKSB7XG4gICAgcmV0dXJuIFpfU1RSRUFNX0VSUk9SO1xuICB9XG5cbiAgLyogd2hlbiB1c2luZyB6bGliIHdyYXBwZXJzLCBjb21wdXRlIEFkbGVyLTMyIGZvciBwcm92aWRlZCBkaWN0aW9uYXJ5ICovXG4gIGlmICh3cmFwID09PSAxKSB7XG4gICAgLyogYWRsZXIzMihzdHJtLT5hZGxlciwgZGljdGlvbmFyeSwgZGljdExlbmd0aCk7ICovXG4gICAgc3RybS5hZGxlciA9IGFkbGVyMzIoc3RybS5hZGxlciwgZGljdGlvbmFyeSwgZGljdExlbmd0aCwgMCk7XG4gIH1cblxuICBzLndyYXAgPSAwOyAgIC8qIGF2b2lkIGNvbXB1dGluZyBBZGxlci0zMiBpbiByZWFkX2J1ZiAqL1xuXG4gIC8qIGlmIGRpY3Rpb25hcnkgd291bGQgZmlsbCB3aW5kb3csIGp1c3QgcmVwbGFjZSB0aGUgaGlzdG9yeSAqL1xuICBpZiAoZGljdExlbmd0aCA+PSBzLndfc2l6ZSkge1xuICAgIGlmICh3cmFwID09PSAwKSB7ICAgICAgICAgICAgLyogYWxyZWFkeSBlbXB0eSBvdGhlcndpc2UgKi9cbiAgICAgIC8qKiogQ0xFQVJfSEFTSChzKTsgKioqL1xuICAgICAgemVybyhzLmhlYWQpOyAvLyBGaWxsIHdpdGggTklMICg9IDApO1xuICAgICAgcy5zdHJzdGFydCA9IDA7XG4gICAgICBzLmJsb2NrX3N0YXJ0ID0gMDtcbiAgICAgIHMuaW5zZXJ0ID0gMDtcbiAgICB9XG4gICAgLyogdXNlIHRoZSB0YWlsICovXG4gICAgLy8gZGljdGlvbmFyeSA9IGRpY3Rpb25hcnkuc2xpY2UoZGljdExlbmd0aCAtIHMud19zaXplKTtcbiAgICB0bXBEaWN0ID0gbmV3IHV0aWxzLkJ1Zjgocy53X3NpemUpO1xuICAgIHV0aWxzLmFycmF5U2V0KHRtcERpY3QsIGRpY3Rpb25hcnksIGRpY3RMZW5ndGggLSBzLndfc2l6ZSwgcy53X3NpemUsIDApO1xuICAgIGRpY3Rpb25hcnkgPSB0bXBEaWN0O1xuICAgIGRpY3RMZW5ndGggPSBzLndfc2l6ZTtcbiAgfVxuICAvKiBpbnNlcnQgZGljdGlvbmFyeSBpbnRvIHdpbmRvdyBhbmQgaGFzaCAqL1xuICBhdmFpbCA9IHN0cm0uYXZhaWxfaW47XG4gIG5leHQgPSBzdHJtLm5leHRfaW47XG4gIGlucHV0ID0gc3RybS5pbnB1dDtcbiAgc3RybS5hdmFpbF9pbiA9IGRpY3RMZW5ndGg7XG4gIHN0cm0ubmV4dF9pbiA9IDA7XG4gIHN0cm0uaW5wdXQgPSBkaWN0aW9uYXJ5O1xuICBmaWxsX3dpbmRvdyhzKTtcbiAgd2hpbGUgKHMubG9va2FoZWFkID49IE1JTl9NQVRDSCkge1xuICAgIHN0ciA9IHMuc3Ryc3RhcnQ7XG4gICAgbiA9IHMubG9va2FoZWFkIC0gKE1JTl9NQVRDSCAtIDEpO1xuICAgIGRvIHtcbiAgICAgIC8qIFVQREFURV9IQVNIKHMsIHMtPmluc19oLCBzLT53aW5kb3dbc3RyICsgTUlOX01BVENILTFdKTsgKi9cbiAgICAgIHMuaW5zX2ggPSAoKHMuaW5zX2ggPDwgcy5oYXNoX3NoaWZ0KSBeIHMud2luZG93W3N0ciArIE1JTl9NQVRDSCAtIDFdKSAmIHMuaGFzaF9tYXNrO1xuXG4gICAgICBzLnByZXZbc3RyICYgcy53X21hc2tdID0gcy5oZWFkW3MuaW5zX2hdO1xuXG4gICAgICBzLmhlYWRbcy5pbnNfaF0gPSBzdHI7XG4gICAgICBzdHIrKztcbiAgICB9IHdoaWxlICgtLW4pO1xuICAgIHMuc3Ryc3RhcnQgPSBzdHI7XG4gICAgcy5sb29rYWhlYWQgPSBNSU5fTUFUQ0ggLSAxO1xuICAgIGZpbGxfd2luZG93KHMpO1xuICB9XG4gIHMuc3Ryc3RhcnQgKz0gcy5sb29rYWhlYWQ7XG4gIHMuYmxvY2tfc3RhcnQgPSBzLnN0cnN0YXJ0O1xuICBzLmluc2VydCA9IHMubG9va2FoZWFkO1xuICBzLmxvb2thaGVhZCA9IDA7XG4gIHMubWF0Y2hfbGVuZ3RoID0gcy5wcmV2X2xlbmd0aCA9IE1JTl9NQVRDSCAtIDE7XG4gIHMubWF0Y2hfYXZhaWxhYmxlID0gMDtcbiAgc3RybS5uZXh0X2luID0gbmV4dDtcbiAgc3RybS5pbnB1dCA9IGlucHV0O1xuICBzdHJtLmF2YWlsX2luID0gYXZhaWw7XG4gIHMud3JhcCA9IHdyYXA7XG4gIHJldHVybiBaX09LO1xufVxuXG5cbmV4cG9ydHMuZGVmbGF0ZUluaXQgPSBkZWZsYXRlSW5pdDtcbmV4cG9ydHMuZGVmbGF0ZUluaXQyID0gZGVmbGF0ZUluaXQyO1xuZXhwb3J0cy5kZWZsYXRlUmVzZXQgPSBkZWZsYXRlUmVzZXQ7XG5leHBvcnRzLmRlZmxhdGVSZXNldEtlZXAgPSBkZWZsYXRlUmVzZXRLZWVwO1xuZXhwb3J0cy5kZWZsYXRlU2V0SGVhZGVyID0gZGVmbGF0ZVNldEhlYWRlcjtcbmV4cG9ydHMuZGVmbGF0ZSA9IGRlZmxhdGU7XG5leHBvcnRzLmRlZmxhdGVFbmQgPSBkZWZsYXRlRW5kO1xuZXhwb3J0cy5kZWZsYXRlU2V0RGljdGlvbmFyeSA9IGRlZmxhdGVTZXREaWN0aW9uYXJ5O1xuZXhwb3J0cy5kZWZsYXRlSW5mbyA9ICdwYWtvIGRlZmxhdGUgKGZyb20gTm9kZWNhIHByb2plY3QpJztcblxuLyogTm90IGltcGxlbWVudGVkXG5leHBvcnRzLmRlZmxhdGVCb3VuZCA9IGRlZmxhdGVCb3VuZDtcbmV4cG9ydHMuZGVmbGF0ZUNvcHkgPSBkZWZsYXRlQ29weTtcbmV4cG9ydHMuZGVmbGF0ZVBhcmFtcyA9IGRlZmxhdGVQYXJhbXM7XG5leHBvcnRzLmRlZmxhdGVQZW5kaW5nID0gZGVmbGF0ZVBlbmRpbmc7XG5leHBvcnRzLmRlZmxhdGVQcmltZSA9IGRlZmxhdGVQcmltZTtcbmV4cG9ydHMuZGVmbGF0ZVR1bmUgPSBkZWZsYXRlVHVuZTtcbiovXG4iLCAiLy8gU3RyaW5nIGVuY29kZS9kZWNvZGUgaGVscGVyc1xuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG5cblxuLy8gUXVpY2sgY2hlY2sgaWYgd2UgY2FuIHVzZSBmYXN0IGFycmF5IHRvIGJpbiBzdHJpbmcgY29udmVyc2lvblxuLy9cbi8vIC0gYXBwbHkoQXJyYXkpIGNhbiBmYWlsIG9uIEFuZHJvaWQgMi4yXG4vLyAtIGFwcGx5KFVpbnQ4QXJyYXkpIGNhbiBmYWlsIG9uIGlPUyA1LjEgU2FmYXJpXG4vL1xudmFyIFNUUl9BUFBMWV9PSyA9IHRydWU7XG52YXIgU1RSX0FQUExZX1VJQV9PSyA9IHRydWU7XG5cbnRyeSB7IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgWyAwIF0pOyB9IGNhdGNoIChfXykgeyBTVFJfQVBQTFlfT0sgPSBmYWxzZTsgfVxudHJ5IHsgU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBuZXcgVWludDhBcnJheSgxKSk7IH0gY2F0Y2ggKF9fKSB7IFNUUl9BUFBMWV9VSUFfT0sgPSBmYWxzZTsgfVxuXG5cbi8vIFRhYmxlIHdpdGggdXRmOCBsZW5ndGhzIChjYWxjdWxhdGVkIGJ5IGZpcnN0IGJ5dGUgb2Ygc2VxdWVuY2UpXG4vLyBOb3RlLCB0aGF0IDUgJiA2LWJ5dGUgdmFsdWVzIGFuZCBzb21lIDQtYnl0ZSB2YWx1ZXMgY2FuIG5vdCBiZSByZXByZXNlbnRlZCBpbiBKUyxcbi8vIGJlY2F1c2UgbWF4IHBvc3NpYmxlIGNvZGVwb2ludCBpcyAweDEwZmZmZlxudmFyIF91dGY4bGVuID0gbmV3IHV0aWxzLkJ1ZjgoMjU2KTtcbmZvciAodmFyIHEgPSAwOyBxIDwgMjU2OyBxKyspIHtcbiAgX3V0ZjhsZW5bcV0gPSAocSA+PSAyNTIgPyA2IDogcSA+PSAyNDggPyA1IDogcSA+PSAyNDAgPyA0IDogcSA+PSAyMjQgPyAzIDogcSA+PSAxOTIgPyAyIDogMSk7XG59XG5fdXRmOGxlblsyNTRdID0gX3V0ZjhsZW5bMjU0XSA9IDE7IC8vIEludmFsaWQgc2VxdWVuY2Ugc3RhcnRcblxuXG4vLyBjb252ZXJ0IHN0cmluZyB0byBhcnJheSAodHlwZWQsIHdoZW4gcG9zc2libGUpXG5leHBvcnRzLnN0cmluZzJidWYgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIHZhciBidWYsIGMsIGMyLCBtX3BvcywgaSwgc3RyX2xlbiA9IHN0ci5sZW5ndGgsIGJ1Zl9sZW4gPSAwO1xuXG4gIC8vIGNvdW50IGJpbmFyeSBzaXplXG4gIGZvciAobV9wb3MgPSAwOyBtX3BvcyA8IHN0cl9sZW47IG1fcG9zKyspIHtcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQobV9wb3MpO1xuICAgIGlmICgoYyAmIDB4ZmMwMCkgPT09IDB4ZDgwMCAmJiAobV9wb3MgKyAxIDwgc3RyX2xlbikpIHtcbiAgICAgIGMyID0gc3RyLmNoYXJDb2RlQXQobV9wb3MgKyAxKTtcbiAgICAgIGlmICgoYzIgJiAweGZjMDApID09PSAweGRjMDApIHtcbiAgICAgICAgYyA9IDB4MTAwMDAgKyAoKGMgLSAweGQ4MDApIDw8IDEwKSArIChjMiAtIDB4ZGMwMCk7XG4gICAgICAgIG1fcG9zKys7XG4gICAgICB9XG4gICAgfVxuICAgIGJ1Zl9sZW4gKz0gYyA8IDB4ODAgPyAxIDogYyA8IDB4ODAwID8gMiA6IGMgPCAweDEwMDAwID8gMyA6IDQ7XG4gIH1cblxuICAvLyBhbGxvY2F0ZSBidWZmZXJcbiAgYnVmID0gbmV3IHV0aWxzLkJ1ZjgoYnVmX2xlbik7XG5cbiAgLy8gY29udmVydFxuICBmb3IgKGkgPSAwLCBtX3BvcyA9IDA7IGkgPCBidWZfbGVuOyBtX3BvcysrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KG1fcG9zKTtcbiAgICBpZiAoKGMgJiAweGZjMDApID09PSAweGQ4MDAgJiYgKG1fcG9zICsgMSA8IHN0cl9sZW4pKSB7XG4gICAgICBjMiA9IHN0ci5jaGFyQ29kZUF0KG1fcG9zICsgMSk7XG4gICAgICBpZiAoKGMyICYgMHhmYzAwKSA9PT0gMHhkYzAwKSB7XG4gICAgICAgIGMgPSAweDEwMDAwICsgKChjIC0gMHhkODAwKSA8PCAxMCkgKyAoYzIgLSAweGRjMDApO1xuICAgICAgICBtX3BvcysrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYyA8IDB4ODApIHtcbiAgICAgIC8qIG9uZSBieXRlICovXG4gICAgICBidWZbaSsrXSA9IGM7XG4gICAgfSBlbHNlIGlmIChjIDwgMHg4MDApIHtcbiAgICAgIC8qIHR3byBieXRlcyAqL1xuICAgICAgYnVmW2krK10gPSAweEMwIHwgKGMgPj4+IDYpO1xuICAgICAgYnVmW2krK10gPSAweDgwIHwgKGMgJiAweDNmKTtcbiAgICB9IGVsc2UgaWYgKGMgPCAweDEwMDAwKSB7XG4gICAgICAvKiB0aHJlZSBieXRlcyAqL1xuICAgICAgYnVmW2krK10gPSAweEUwIHwgKGMgPj4+IDEyKTtcbiAgICAgIGJ1ZltpKytdID0gMHg4MCB8IChjID4+PiA2ICYgMHgzZik7XG4gICAgICBidWZbaSsrXSA9IDB4ODAgfCAoYyAmIDB4M2YpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvKiBmb3VyIGJ5dGVzICovXG4gICAgICBidWZbaSsrXSA9IDB4ZjAgfCAoYyA+Pj4gMTgpO1xuICAgICAgYnVmW2krK10gPSAweDgwIHwgKGMgPj4+IDEyICYgMHgzZik7XG4gICAgICBidWZbaSsrXSA9IDB4ODAgfCAoYyA+Pj4gNiAmIDB4M2YpO1xuICAgICAgYnVmW2krK10gPSAweDgwIHwgKGMgJiAweDNmKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmO1xufTtcblxuLy8gSGVscGVyICh1c2VkIGluIDIgcGxhY2VzKVxuZnVuY3Rpb24gYnVmMmJpbnN0cmluZyhidWYsIGxlbikge1xuICAvLyBPbiBDaHJvbWUsIHRoZSBhcmd1bWVudHMgaW4gYSBmdW5jdGlvbiBjYWxsIHRoYXQgYXJlIGFsbG93ZWQgaXMgYDY1NTM0YC5cbiAgLy8gSWYgdGhlIGxlbmd0aCBvZiB0aGUgYnVmZmVyIGlzIHNtYWxsZXIgdGhhbiB0aGF0LCB3ZSBjYW4gdXNlIHRoaXMgb3B0aW1pemF0aW9uLFxuICAvLyBvdGhlcndpc2Ugd2Ugd2lsbCB0YWtlIGEgc2xvd2VyIHBhdGguXG4gIGlmIChsZW4gPCA2NTUzNCkge1xuICAgIGlmICgoYnVmLnN1YmFycmF5ICYmIFNUUl9BUFBMWV9VSUFfT0spIHx8ICghYnVmLnN1YmFycmF5ICYmIFNUUl9BUFBMWV9PSykpIHtcbiAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIHV0aWxzLnNocmlua0J1ZihidWYsIGxlbikpO1xuICAgIH1cbiAgfVxuXG4gIHZhciByZXN1bHQgPSAnJztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG4vLyBDb252ZXJ0IGJ5dGUgYXJyYXkgdG8gYmluYXJ5IHN0cmluZ1xuZXhwb3J0cy5idWYyYmluc3RyaW5nID0gZnVuY3Rpb24gKGJ1Zikge1xuICByZXR1cm4gYnVmMmJpbnN0cmluZyhidWYsIGJ1Zi5sZW5ndGgpO1xufTtcblxuXG4vLyBDb252ZXJ0IGJpbmFyeSBzdHJpbmcgKHR5cGVkLCB3aGVuIHBvc3NpYmxlKVxuZXhwb3J0cy5iaW5zdHJpbmcyYnVmID0gZnVuY3Rpb24gKHN0cikge1xuICB2YXIgYnVmID0gbmV3IHV0aWxzLkJ1Zjgoc3RyLmxlbmd0aCk7XG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBidWZbaV0gPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgfVxuICByZXR1cm4gYnVmO1xufTtcblxuXG4vLyBjb252ZXJ0IGFycmF5IHRvIHN0cmluZ1xuZXhwb3J0cy5idWYyc3RyaW5nID0gZnVuY3Rpb24gKGJ1ZiwgbWF4KSB7XG4gIHZhciBpLCBvdXQsIGMsIGNfbGVuO1xuICB2YXIgbGVuID0gbWF4IHx8IGJ1Zi5sZW5ndGg7XG5cbiAgLy8gUmVzZXJ2ZSBtYXggcG9zc2libGUgbGVuZ3RoICgyIHdvcmRzIHBlciBjaGFyKVxuICAvLyBOQjogYnkgdW5rbm93biByZWFzb25zLCBBcnJheSBpcyBzaWduaWZpY2FudGx5IGZhc3RlciBmb3JcbiAgLy8gICAgIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkgdGhhbiBVaW50MTZBcnJheS5cbiAgdmFyIHV0ZjE2YnVmID0gbmV3IEFycmF5KGxlbiAqIDIpO1xuXG4gIGZvciAob3V0ID0gMCwgaSA9IDA7IGkgPCBsZW47KSB7XG4gICAgYyA9IGJ1ZltpKytdO1xuICAgIC8vIHF1aWNrIHByb2Nlc3MgYXNjaWlcbiAgICBpZiAoYyA8IDB4ODApIHsgdXRmMTZidWZbb3V0KytdID0gYzsgY29udGludWU7IH1cblxuICAgIGNfbGVuID0gX3V0ZjhsZW5bY107XG4gICAgLy8gc2tpcCA1ICYgNiBieXRlIGNvZGVzXG4gICAgaWYgKGNfbGVuID4gNCkgeyB1dGYxNmJ1ZltvdXQrK10gPSAweGZmZmQ7IGkgKz0gY19sZW4gLSAxOyBjb250aW51ZTsgfVxuXG4gICAgLy8gYXBwbHkgbWFzayBvbiBmaXJzdCBieXRlXG4gICAgYyAmPSBjX2xlbiA9PT0gMiA/IDB4MWYgOiBjX2xlbiA9PT0gMyA/IDB4MGYgOiAweDA3O1xuICAgIC8vIGpvaW4gdGhlIHJlc3RcbiAgICB3aGlsZSAoY19sZW4gPiAxICYmIGkgPCBsZW4pIHtcbiAgICAgIGMgPSAoYyA8PCA2KSB8IChidWZbaSsrXSAmIDB4M2YpO1xuICAgICAgY19sZW4tLTtcbiAgICB9XG5cbiAgICAvLyB0ZXJtaW5hdGVkIGJ5IGVuZCBvZiBzdHJpbmc/XG4gICAgaWYgKGNfbGVuID4gMSkgeyB1dGYxNmJ1ZltvdXQrK10gPSAweGZmZmQ7IGNvbnRpbnVlOyB9XG5cbiAgICBpZiAoYyA8IDB4MTAwMDApIHtcbiAgICAgIHV0ZjE2YnVmW291dCsrXSA9IGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGMgLT0gMHgxMDAwMDtcbiAgICAgIHV0ZjE2YnVmW291dCsrXSA9IDB4ZDgwMCB8ICgoYyA+PiAxMCkgJiAweDNmZik7XG4gICAgICB1dGYxNmJ1ZltvdXQrK10gPSAweGRjMDAgfCAoYyAmIDB4M2ZmKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmMmJpbnN0cmluZyh1dGYxNmJ1Ziwgb3V0KTtcbn07XG5cblxuLy8gQ2FsY3VsYXRlIG1heCBwb3NzaWJsZSBwb3NpdGlvbiBpbiB1dGY4IGJ1ZmZlcixcbi8vIHRoYXQgd2lsbCBub3QgYnJlYWsgc2VxdWVuY2UuIElmIHRoYXQncyBub3QgcG9zc2libGVcbi8vIC0gKHZlcnkgc21hbGwgbGltaXRzKSByZXR1cm4gbWF4IHNpemUgYXMgaXMuXG4vL1xuLy8gYnVmW10gLSB1dGY4IGJ5dGVzIGFycmF5XG4vLyBtYXggICAtIGxlbmd0aCBsaW1pdCAobWFuZGF0b3J5KTtcbmV4cG9ydHMudXRmOGJvcmRlciA9IGZ1bmN0aW9uIChidWYsIG1heCkge1xuICB2YXIgcG9zO1xuXG4gIG1heCA9IG1heCB8fCBidWYubGVuZ3RoO1xuICBpZiAobWF4ID4gYnVmLmxlbmd0aCkgeyBtYXggPSBidWYubGVuZ3RoOyB9XG5cbiAgLy8gZ28gYmFjayBmcm9tIGxhc3QgcG9zaXRpb24sIHVudGlsIHN0YXJ0IG9mIHNlcXVlbmNlIGZvdW5kXG4gIHBvcyA9IG1heCAtIDE7XG4gIHdoaWxlIChwb3MgPj0gMCAmJiAoYnVmW3Bvc10gJiAweEMwKSA9PT0gMHg4MCkgeyBwb3MtLTsgfVxuXG4gIC8vIFZlcnkgc21hbGwgYW5kIGJyb2tlbiBzZXF1ZW5jZSxcbiAgLy8gcmV0dXJuIG1heCwgYmVjYXVzZSB3ZSBzaG91bGQgcmV0dXJuIHNvbWV0aGluZyBhbnl3YXkuXG4gIGlmIChwb3MgPCAwKSB7IHJldHVybiBtYXg7IH1cblxuICAvLyBJZiB3ZSBjYW1lIHRvIHN0YXJ0IG9mIGJ1ZmZlciAtIHRoYXQgbWVhbnMgYnVmZmVyIGlzIHRvbyBzbWFsbCxcbiAgLy8gcmV0dXJuIG1heCB0b28uXG4gIGlmIChwb3MgPT09IDApIHsgcmV0dXJuIG1heDsgfVxuXG4gIHJldHVybiAocG9zICsgX3V0ZjhsZW5bYnVmW3Bvc11dID4gbWF4KSA/IHBvcyA6IG1heDtcbn07XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vLyAoQykgMTk5NS0yMDEzIEplYW4tbG91cCBHYWlsbHkgYW5kIE1hcmsgQWRsZXJcbi8vIChDKSAyMDE0LTIwMTcgVml0YWx5IFB1enJpbiBhbmQgQW5kcmV5IFR1cGl0c2luXG4vL1xuLy8gVGhpcyBzb2Z0d2FyZSBpcyBwcm92aWRlZCAnYXMtaXMnLCB3aXRob3V0IGFueSBleHByZXNzIG9yIGltcGxpZWRcbi8vIHdhcnJhbnR5LiBJbiBubyBldmVudCB3aWxsIHRoZSBhdXRob3JzIGJlIGhlbGQgbGlhYmxlIGZvciBhbnkgZGFtYWdlc1xuLy8gYXJpc2luZyBmcm9tIHRoZSB1c2Ugb2YgdGhpcyBzb2Z0d2FyZS5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGdyYW50ZWQgdG8gYW55b25lIHRvIHVzZSB0aGlzIHNvZnR3YXJlIGZvciBhbnkgcHVycG9zZSxcbi8vIGluY2x1ZGluZyBjb21tZXJjaWFsIGFwcGxpY2F0aW9ucywgYW5kIHRvIGFsdGVyIGl0IGFuZCByZWRpc3RyaWJ1dGUgaXRcbi8vIGZyZWVseSwgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIHJlc3RyaWN0aW9uczpcbi8vXG4vLyAxLiBUaGUgb3JpZ2luIG9mIHRoaXMgc29mdHdhcmUgbXVzdCBub3QgYmUgbWlzcmVwcmVzZW50ZWQ7IHlvdSBtdXN0IG5vdFxuLy8gICBjbGFpbSB0aGF0IHlvdSB3cm90ZSB0aGUgb3JpZ2luYWwgc29mdHdhcmUuIElmIHlvdSB1c2UgdGhpcyBzb2Z0d2FyZVxuLy8gICBpbiBhIHByb2R1Y3QsIGFuIGFja25vd2xlZGdtZW50IGluIHRoZSBwcm9kdWN0IGRvY3VtZW50YXRpb24gd291bGQgYmVcbi8vICAgYXBwcmVjaWF0ZWQgYnV0IGlzIG5vdCByZXF1aXJlZC5cbi8vIDIuIEFsdGVyZWQgc291cmNlIHZlcnNpb25zIG11c3QgYmUgcGxhaW5seSBtYXJrZWQgYXMgc3VjaCwgYW5kIG11c3Qgbm90IGJlXG4vLyAgIG1pc3JlcHJlc2VudGVkIGFzIGJlaW5nIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS5cbi8vIDMuIFRoaXMgbm90aWNlIG1heSBub3QgYmUgcmVtb3ZlZCBvciBhbHRlcmVkIGZyb20gYW55IHNvdXJjZSBkaXN0cmlidXRpb24uXG5cbmZ1bmN0aW9uIFpTdHJlYW0oKSB7XG4gIC8qIG5leHQgaW5wdXQgYnl0ZSAqL1xuICB0aGlzLmlucHV0ID0gbnVsbDsgLy8gSlMgc3BlY2lmaWMsIGJlY2F1c2Ugd2UgaGF2ZSBubyBwb2ludGVyc1xuICB0aGlzLm5leHRfaW4gPSAwO1xuICAvKiBudW1iZXIgb2YgYnl0ZXMgYXZhaWxhYmxlIGF0IGlucHV0ICovXG4gIHRoaXMuYXZhaWxfaW4gPSAwO1xuICAvKiB0b3RhbCBudW1iZXIgb2YgaW5wdXQgYnl0ZXMgcmVhZCBzbyBmYXIgKi9cbiAgdGhpcy50b3RhbF9pbiA9IDA7XG4gIC8qIG5leHQgb3V0cHV0IGJ5dGUgc2hvdWxkIGJlIHB1dCB0aGVyZSAqL1xuICB0aGlzLm91dHB1dCA9IG51bGw7IC8vIEpTIHNwZWNpZmljLCBiZWNhdXNlIHdlIGhhdmUgbm8gcG9pbnRlcnNcbiAgdGhpcy5uZXh0X291dCA9IDA7XG4gIC8qIHJlbWFpbmluZyBmcmVlIHNwYWNlIGF0IG91dHB1dCAqL1xuICB0aGlzLmF2YWlsX291dCA9IDA7XG4gIC8qIHRvdGFsIG51bWJlciBvZiBieXRlcyBvdXRwdXQgc28gZmFyICovXG4gIHRoaXMudG90YWxfb3V0ID0gMDtcbiAgLyogbGFzdCBlcnJvciBtZXNzYWdlLCBOVUxMIGlmIG5vIGVycm9yICovXG4gIHRoaXMubXNnID0gJycvKlpfTlVMTCovO1xuICAvKiBub3QgdmlzaWJsZSBieSBhcHBsaWNhdGlvbnMgKi9cbiAgdGhpcy5zdGF0ZSA9IG51bGw7XG4gIC8qIGJlc3QgZ3Vlc3MgYWJvdXQgdGhlIGRhdGEgdHlwZTogYmluYXJ5IG9yIHRleHQgKi9cbiAgdGhpcy5kYXRhX3R5cGUgPSAyLypaX1VOS05PV04qLztcbiAgLyogYWRsZXIzMiB2YWx1ZSBvZiB0aGUgdW5jb21wcmVzc2VkIGRhdGEgKi9cbiAgdGhpcy5hZGxlciA9IDA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gWlN0cmVhbTtcbiIsICIndXNlIHN0cmljdCc7XG5cblxudmFyIHpsaWJfZGVmbGF0ZSA9IHJlcXVpcmUoJy4vemxpYi9kZWZsYXRlJyk7XG52YXIgdXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi91dGlscy9jb21tb24nKTtcbnZhciBzdHJpbmdzICAgICAgPSByZXF1aXJlKCcuL3V0aWxzL3N0cmluZ3MnKTtcbnZhciBtc2cgICAgICAgICAgPSByZXF1aXJlKCcuL3psaWIvbWVzc2FnZXMnKTtcbnZhciBaU3RyZWFtICAgICAgPSByZXF1aXJlKCcuL3psaWIvenN0cmVhbScpO1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKiBQdWJsaWMgY29uc3RhbnRzID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cblxudmFyIFpfTk9fRkxVU0ggICAgICA9IDA7XG52YXIgWl9GSU5JU0ggICAgICAgID0gNDtcblxudmFyIFpfT0sgICAgICAgICAgICA9IDA7XG52YXIgWl9TVFJFQU1fRU5EICAgID0gMTtcbnZhciBaX1NZTkNfRkxVU0ggICAgPSAyO1xuXG52YXIgWl9ERUZBVUxUX0NPTVBSRVNTSU9OID0gLTE7XG5cbnZhciBaX0RFRkFVTFRfU1RSQVRFR1kgICAgPSAwO1xuXG52YXIgWl9ERUZMQVRFRCAgPSA4O1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG5cbi8qKlxuICogY2xhc3MgRGVmbGF0ZVxuICpcbiAqIEdlbmVyaWMgSlMtc3R5bGUgd3JhcHBlciBmb3IgemxpYiBjYWxscy4gSWYgeW91IGRvbid0IG5lZWRcbiAqIHN0cmVhbWluZyBiZWhhdmlvdXIgLSB1c2UgbW9yZSBzaW1wbGUgZnVuY3Rpb25zOiBbW2RlZmxhdGVdXSxcbiAqIFtbZGVmbGF0ZVJhd11dIGFuZCBbW2d6aXBdXS5cbiAqKi9cblxuLyogaW50ZXJuYWxcbiAqIERlZmxhdGUuY2h1bmtzIC0+IEFycmF5XG4gKlxuICogQ2h1bmtzIG9mIG91dHB1dCBkYXRhLCBpZiBbW0RlZmxhdGUjb25EYXRhXV0gbm90IG92ZXJyaWRkZW4uXG4gKiovXG5cbi8qKlxuICogRGVmbGF0ZS5yZXN1bHQgLT4gVWludDhBcnJheXxBcnJheVxuICpcbiAqIENvbXByZXNzZWQgcmVzdWx0LCBnZW5lcmF0ZWQgYnkgZGVmYXVsdCBbW0RlZmxhdGUjb25EYXRhXV1cbiAqIGFuZCBbW0RlZmxhdGUjb25FbmRdXSBoYW5kbGVycy4gRmlsbGVkIGFmdGVyIHlvdSBwdXNoIGxhc3QgY2h1bmtcbiAqIChjYWxsIFtbRGVmbGF0ZSNwdXNoXV0gd2l0aCBgWl9GSU5JU0hgIC8gYHRydWVgIHBhcmFtKSAgb3IgaWYgeW91XG4gKiBwdXNoIGEgY2h1bmsgd2l0aCBleHBsaWNpdCBmbHVzaCAoY2FsbCBbW0RlZmxhdGUjcHVzaF1dIHdpdGhcbiAqIGBaX1NZTkNfRkxVU0hgIHBhcmFtKS5cbiAqKi9cblxuLyoqXG4gKiBEZWZsYXRlLmVyciAtPiBOdW1iZXJcbiAqXG4gKiBFcnJvciBjb2RlIGFmdGVyIGRlZmxhdGUgZmluaXNoZWQuIDAgKFpfT0spIG9uIHN1Y2Nlc3MuXG4gKiBZb3Ugd2lsbCBub3QgbmVlZCBpdCBpbiByZWFsIGxpZmUsIGJlY2F1c2UgZGVmbGF0ZSBlcnJvcnNcbiAqIGFyZSBwb3NzaWJsZSBvbmx5IG9uIHdyb25nIG9wdGlvbnMgb3IgYmFkIGBvbkRhdGFgIC8gYG9uRW5kYFxuICogY3VzdG9tIGhhbmRsZXJzLlxuICoqL1xuXG4vKipcbiAqIERlZmxhdGUubXNnIC0+IFN0cmluZ1xuICpcbiAqIEVycm9yIG1lc3NhZ2UsIGlmIFtbRGVmbGF0ZS5lcnJdXSAhPSAwXG4gKiovXG5cblxuLyoqXG4gKiBuZXcgRGVmbGF0ZShvcHRpb25zKVxuICogLSBvcHRpb25zIChPYmplY3QpOiB6bGliIGRlZmxhdGUgb3B0aW9ucy5cbiAqXG4gKiBDcmVhdGVzIG5ldyBkZWZsYXRvciBpbnN0YW5jZSB3aXRoIHNwZWNpZmllZCBwYXJhbXMuIFRocm93cyBleGNlcHRpb25cbiAqIG9uIGJhZCBwYXJhbXMuIFN1cHBvcnRlZCBvcHRpb25zOlxuICpcbiAqIC0gYGxldmVsYFxuICogLSBgd2luZG93Qml0c2BcbiAqIC0gYG1lbUxldmVsYFxuICogLSBgc3RyYXRlZ3lgXG4gKiAtIGBkaWN0aW9uYXJ5YFxuICpcbiAqIFtodHRwOi8vemxpYi5uZXQvbWFudWFsLmh0bWwjQWR2YW5jZWRdKGh0dHA6Ly96bGliLm5ldC9tYW51YWwuaHRtbCNBZHZhbmNlZClcbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIHRoZXNlLlxuICpcbiAqIEFkZGl0aW9uYWwgb3B0aW9ucywgZm9yIGludGVybmFsIG5lZWRzOlxuICpcbiAqIC0gYGNodW5rU2l6ZWAgLSBzaXplIG9mIGdlbmVyYXRlZCBkYXRhIGNodW5rcyAoMTZLIGJ5IGRlZmF1bHQpXG4gKiAtIGByYXdgIChCb29sZWFuKSAtIGRvIHJhdyBkZWZsYXRlXG4gKiAtIGBnemlwYCAoQm9vbGVhbikgLSBjcmVhdGUgZ3ppcCB3cmFwcGVyXG4gKiAtIGB0b2AgKFN0cmluZykgLSBpZiBlcXVhbCB0byAnc3RyaW5nJywgdGhlbiByZXN1bHQgd2lsbCBiZSBcImJpbmFyeSBzdHJpbmdcIlxuICogICAgKGVhY2ggY2hhciBjb2RlIFswLi4yNTVdKVxuICogLSBgaGVhZGVyYCAoT2JqZWN0KSAtIGN1c3RvbSBoZWFkZXIgZm9yIGd6aXBcbiAqICAgLSBgdGV4dGAgKEJvb2xlYW4pIC0gdHJ1ZSBpZiBjb21wcmVzc2VkIGRhdGEgYmVsaWV2ZWQgdG8gYmUgdGV4dFxuICogICAtIGB0aW1lYCAoTnVtYmVyKSAtIG1vZGlmaWNhdGlvbiB0aW1lLCB1bml4IHRpbWVzdGFtcFxuICogICAtIGBvc2AgKE51bWJlcikgLSBvcGVyYXRpb24gc3lzdGVtIGNvZGVcbiAqICAgLSBgZXh0cmFgIChBcnJheSkgLSBhcnJheSBvZiBieXRlcyB3aXRoIGV4dHJhIGRhdGEgKG1heCA2NTUzNilcbiAqICAgLSBgbmFtZWAgKFN0cmluZykgLSBmaWxlIG5hbWUgKGJpbmFyeSBzdHJpbmcpXG4gKiAgIC0gYGNvbW1lbnRgIChTdHJpbmcpIC0gY29tbWVudCAoYmluYXJ5IHN0cmluZylcbiAqICAgLSBgaGNyY2AgKEJvb2xlYW4pIC0gdHJ1ZSBpZiBoZWFkZXIgY3JjIHNob3VsZCBiZSBhZGRlZFxuICpcbiAqICMjIyMjIEV4YW1wbGU6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIHBha28gPSByZXF1aXJlKCdwYWtvJylcbiAqICAgLCBjaHVuazEgPSBVaW50OEFycmF5KFsxLDIsMyw0LDUsNiw3LDgsOV0pXG4gKiAgICwgY2h1bmsyID0gVWludDhBcnJheShbMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTldKTtcbiAqXG4gKiB2YXIgZGVmbGF0ZSA9IG5ldyBwYWtvLkRlZmxhdGUoeyBsZXZlbDogM30pO1xuICpcbiAqIGRlZmxhdGUucHVzaChjaHVuazEsIGZhbHNlKTtcbiAqIGRlZmxhdGUucHVzaChjaHVuazIsIHRydWUpOyAgLy8gdHJ1ZSAtPiBsYXN0IGNodW5rXG4gKlxuICogaWYgKGRlZmxhdGUuZXJyKSB7IHRocm93IG5ldyBFcnJvcihkZWZsYXRlLmVycik7IH1cbiAqXG4gKiBjb25zb2xlLmxvZyhkZWZsYXRlLnJlc3VsdCk7XG4gKiBgYGBcbiAqKi9cbmZ1bmN0aW9uIERlZmxhdGUob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRGVmbGF0ZSkpIHJldHVybiBuZXcgRGVmbGF0ZShvcHRpb25zKTtcblxuICB0aGlzLm9wdGlvbnMgPSB1dGlscy5hc3NpZ24oe1xuICAgIGxldmVsOiBaX0RFRkFVTFRfQ09NUFJFU1NJT04sXG4gICAgbWV0aG9kOiBaX0RFRkxBVEVELFxuICAgIGNodW5rU2l6ZTogMTYzODQsXG4gICAgd2luZG93Qml0czogMTUsXG4gICAgbWVtTGV2ZWw6IDgsXG4gICAgc3RyYXRlZ3k6IFpfREVGQVVMVF9TVFJBVEVHWSxcbiAgICB0bzogJydcbiAgfSwgb3B0aW9ucyB8fCB7fSk7XG5cbiAgdmFyIG9wdCA9IHRoaXMub3B0aW9ucztcblxuICBpZiAob3B0LnJhdyAmJiAob3B0LndpbmRvd0JpdHMgPiAwKSkge1xuICAgIG9wdC53aW5kb3dCaXRzID0gLW9wdC53aW5kb3dCaXRzO1xuICB9XG5cbiAgZWxzZSBpZiAob3B0Lmd6aXAgJiYgKG9wdC53aW5kb3dCaXRzID4gMCkgJiYgKG9wdC53aW5kb3dCaXRzIDwgMTYpKSB7XG4gICAgb3B0LndpbmRvd0JpdHMgKz0gMTY7XG4gIH1cblxuICB0aGlzLmVyciAgICA9IDA7ICAgICAgLy8gZXJyb3IgY29kZSwgaWYgaGFwcGVucyAoMCA9IFpfT0spXG4gIHRoaXMubXNnICAgID0gJyc7ICAgICAvLyBlcnJvciBtZXNzYWdlXG4gIHRoaXMuZW5kZWQgID0gZmFsc2U7ICAvLyB1c2VkIHRvIGF2b2lkIG11bHRpcGxlIG9uRW5kKCkgY2FsbHNcbiAgdGhpcy5jaHVua3MgPSBbXTsgICAgIC8vIGNodW5rcyBvZiBjb21wcmVzc2VkIGRhdGFcblxuICB0aGlzLnN0cm0gPSBuZXcgWlN0cmVhbSgpO1xuICB0aGlzLnN0cm0uYXZhaWxfb3V0ID0gMDtcblxuICB2YXIgc3RhdHVzID0gemxpYl9kZWZsYXRlLmRlZmxhdGVJbml0MihcbiAgICB0aGlzLnN0cm0sXG4gICAgb3B0LmxldmVsLFxuICAgIG9wdC5tZXRob2QsXG4gICAgb3B0LndpbmRvd0JpdHMsXG4gICAgb3B0Lm1lbUxldmVsLFxuICAgIG9wdC5zdHJhdGVneVxuICApO1xuXG4gIGlmIChzdGF0dXMgIT09IFpfT0spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnW3N0YXR1c10pO1xuICB9XG5cbiAgaWYgKG9wdC5oZWFkZXIpIHtcbiAgICB6bGliX2RlZmxhdGUuZGVmbGF0ZVNldEhlYWRlcih0aGlzLnN0cm0sIG9wdC5oZWFkZXIpO1xuICB9XG5cbiAgaWYgKG9wdC5kaWN0aW9uYXJ5KSB7XG4gICAgdmFyIGRpY3Q7XG4gICAgLy8gQ29udmVydCBkYXRhIGlmIG5lZWRlZFxuICAgIGlmICh0eXBlb2Ygb3B0LmRpY3Rpb25hcnkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBJZiB3ZSBuZWVkIHRvIGNvbXByZXNzIHRleHQsIGNoYW5nZSBlbmNvZGluZyB0byB1dGY4LlxuICAgICAgZGljdCA9IHN0cmluZ3Muc3RyaW5nMmJ1ZihvcHQuZGljdGlvbmFyeSk7XG4gICAgfSBlbHNlIGlmICh0b1N0cmluZy5jYWxsKG9wdC5kaWN0aW9uYXJ5KSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJykge1xuICAgICAgZGljdCA9IG5ldyBVaW50OEFycmF5KG9wdC5kaWN0aW9uYXJ5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGljdCA9IG9wdC5kaWN0aW9uYXJ5O1xuICAgIH1cblxuICAgIHN0YXR1cyA9IHpsaWJfZGVmbGF0ZS5kZWZsYXRlU2V0RGljdGlvbmFyeSh0aGlzLnN0cm0sIGRpY3QpO1xuXG4gICAgaWYgKHN0YXR1cyAhPT0gWl9PSykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZ1tzdGF0dXNdKTtcbiAgICB9XG5cbiAgICB0aGlzLl9kaWN0X3NldCA9IHRydWU7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZsYXRlI3B1c2goZGF0YVssIG1vZGVdKSAtPiBCb29sZWFuXG4gKiAtIGRhdGEgKFVpbnQ4QXJyYXl8QXJyYXl8QXJyYXlCdWZmZXJ8U3RyaW5nKTogaW5wdXQgZGF0YS4gU3RyaW5ncyB3aWxsIGJlXG4gKiAgIGNvbnZlcnRlZCB0byB1dGY4IGJ5dGUgc2VxdWVuY2UuXG4gKiAtIG1vZGUgKE51bWJlcnxCb29sZWFuKTogMC4uNiBmb3IgY29ycmVzcG9uZGluZyBaX05PX0ZMVVNILi5aX1RSRUUgbW9kZXMuXG4gKiAgIFNlZSBjb25zdGFudHMuIFNraXBwZWQgb3IgYGZhbHNlYCBtZWFucyBaX05PX0ZMVVNILCBgdHJ1ZWAgbWVhbnMgWl9GSU5JU0guXG4gKlxuICogU2VuZHMgaW5wdXQgZGF0YSB0byBkZWZsYXRlIHBpcGUsIGdlbmVyYXRpbmcgW1tEZWZsYXRlI29uRGF0YV1dIGNhbGxzIHdpdGhcbiAqIG5ldyBjb21wcmVzc2VkIGNodW5rcy4gUmV0dXJucyBgdHJ1ZWAgb24gc3VjY2Vzcy4gVGhlIGxhc3QgZGF0YSBibG9jayBtdXN0IGhhdmVcbiAqIG1vZGUgWl9GSU5JU0ggKG9yIGB0cnVlYCkuIFRoYXQgd2lsbCBmbHVzaCBpbnRlcm5hbCBwZW5kaW5nIGJ1ZmZlcnMgYW5kIGNhbGxcbiAqIFtbRGVmbGF0ZSNvbkVuZF1dLiBGb3IgaW50ZXJpbSBleHBsaWNpdCBmbHVzaGVzICh3aXRob3V0IGVuZGluZyB0aGUgc3RyZWFtKSB5b3VcbiAqIGNhbiB1c2UgbW9kZSBaX1NZTkNfRkxVU0gsIGtlZXBpbmcgdGhlIGNvbXByZXNzaW9uIGNvbnRleHQuXG4gKlxuICogT24gZmFpbCBjYWxsIFtbRGVmbGF0ZSNvbkVuZF1dIHdpdGggZXJyb3IgY29kZSBhbmQgcmV0dXJuIGZhbHNlLlxuICpcbiAqIFdlIHN0cm9uZ2x5IHJlY29tbWVuZCB0byB1c2UgYFVpbnQ4QXJyYXlgIG9uIGlucHV0IGZvciBiZXN0IHNwZWVkIChvdXRwdXRcbiAqIGFycmF5IGZvcm1hdCBpcyBkZXRlY3RlZCBhdXRvbWF0aWNhbGx5KS4gQWxzbywgZG9uJ3Qgc2tpcCBsYXN0IHBhcmFtIGFuZCBhbHdheXNcbiAqIHVzZSB0aGUgc2FtZSB0eXBlIGluIHlvdXIgY29kZSAoYm9vbGVhbiBvciBudW1iZXIpLiBUaGF0IHdpbGwgaW1wcm92ZSBKUyBzcGVlZC5cbiAqXG4gKiBGb3IgcmVndWxhciBgQXJyYXlgLXMgbWFrZSBzdXJlIGFsbCBlbGVtZW50cyBhcmUgWzAuLjI1NV0uXG4gKlxuICogIyMjIyMgRXhhbXBsZVxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIHB1c2goY2h1bmssIGZhbHNlKTsgLy8gcHVzaCBvbmUgb2YgZGF0YSBjaHVua3NcbiAqIC4uLlxuICogcHVzaChjaHVuaywgdHJ1ZSk7ICAvLyBwdXNoIGxhc3QgY2h1bmtcbiAqIGBgYFxuICoqL1xuRGVmbGF0ZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uIChkYXRhLCBtb2RlKSB7XG4gIHZhciBzdHJtID0gdGhpcy5zdHJtO1xuICB2YXIgY2h1bmtTaXplID0gdGhpcy5vcHRpb25zLmNodW5rU2l6ZTtcbiAgdmFyIHN0YXR1cywgX21vZGU7XG5cbiAgaWYgKHRoaXMuZW5kZWQpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgX21vZGUgPSAobW9kZSA9PT0gfn5tb2RlKSA/IG1vZGUgOiAoKG1vZGUgPT09IHRydWUpID8gWl9GSU5JU0ggOiBaX05PX0ZMVVNIKTtcblxuICAvLyBDb252ZXJ0IGRhdGEgaWYgbmVlZGVkXG4gIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAvLyBJZiB3ZSBuZWVkIHRvIGNvbXByZXNzIHRleHQsIGNoYW5nZSBlbmNvZGluZyB0byB1dGY4LlxuICAgIHN0cm0uaW5wdXQgPSBzdHJpbmdzLnN0cmluZzJidWYoZGF0YSk7XG4gIH0gZWxzZSBpZiAodG9TdHJpbmcuY2FsbChkYXRhKSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJykge1xuICAgIHN0cm0uaW5wdXQgPSBuZXcgVWludDhBcnJheShkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICBzdHJtLmlucHV0ID0gZGF0YTtcbiAgfVxuXG4gIHN0cm0ubmV4dF9pbiA9IDA7XG4gIHN0cm0uYXZhaWxfaW4gPSBzdHJtLmlucHV0Lmxlbmd0aDtcblxuICBkbyB7XG4gICAgaWYgKHN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICBzdHJtLm91dHB1dCA9IG5ldyB1dGlscy5CdWY4KGNodW5rU2l6ZSk7XG4gICAgICBzdHJtLm5leHRfb3V0ID0gMDtcbiAgICAgIHN0cm0uYXZhaWxfb3V0ID0gY2h1bmtTaXplO1xuICAgIH1cbiAgICBzdGF0dXMgPSB6bGliX2RlZmxhdGUuZGVmbGF0ZShzdHJtLCBfbW9kZSk7ICAgIC8qIG5vIGJhZCByZXR1cm4gdmFsdWUgKi9cblxuICAgIGlmIChzdGF0dXMgIT09IFpfU1RSRUFNX0VORCAmJiBzdGF0dXMgIT09IFpfT0spIHtcbiAgICAgIHRoaXMub25FbmQoc3RhdHVzKTtcbiAgICAgIHRoaXMuZW5kZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoc3RybS5hdmFpbF9vdXQgPT09IDAgfHwgKHN0cm0uYXZhaWxfaW4gPT09IDAgJiYgKF9tb2RlID09PSBaX0ZJTklTSCB8fCBfbW9kZSA9PT0gWl9TWU5DX0ZMVVNIKSkpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMudG8gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMub25EYXRhKHN0cmluZ3MuYnVmMmJpbnN0cmluZyh1dGlscy5zaHJpbmtCdWYoc3RybS5vdXRwdXQsIHN0cm0ubmV4dF9vdXQpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm9uRGF0YSh1dGlscy5zaHJpbmtCdWYoc3RybS5vdXRwdXQsIHN0cm0ubmV4dF9vdXQpKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gd2hpbGUgKChzdHJtLmF2YWlsX2luID4gMCB8fCBzdHJtLmF2YWlsX291dCA9PT0gMCkgJiYgc3RhdHVzICE9PSBaX1NUUkVBTV9FTkQpO1xuXG4gIC8vIEZpbmFsaXplIG9uIHRoZSBsYXN0IGNodW5rLlxuICBpZiAoX21vZGUgPT09IFpfRklOSVNIKSB7XG4gICAgc3RhdHVzID0gemxpYl9kZWZsYXRlLmRlZmxhdGVFbmQodGhpcy5zdHJtKTtcbiAgICB0aGlzLm9uRW5kKHN0YXR1cyk7XG4gICAgdGhpcy5lbmRlZCA9IHRydWU7XG4gICAgcmV0dXJuIHN0YXR1cyA9PT0gWl9PSztcbiAgfVxuXG4gIC8vIGNhbGxiYWNrIGludGVyaW0gcmVzdWx0cyBpZiBaX1NZTkNfRkxVU0guXG4gIGlmIChfbW9kZSA9PT0gWl9TWU5DX0ZMVVNIKSB7XG4gICAgdGhpcy5vbkVuZChaX09LKTtcbiAgICBzdHJtLmF2YWlsX291dCA9IDA7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cblxuLyoqXG4gKiBEZWZsYXRlI29uRGF0YShjaHVuaykgLT4gVm9pZFxuICogLSBjaHVuayAoVWludDhBcnJheXxBcnJheXxTdHJpbmcpOiBvdXRwdXQgZGF0YS4gVHlwZSBvZiBhcnJheSBkZXBlbmRzXG4gKiAgIG9uIGpzIGVuZ2luZSBzdXBwb3J0LiBXaGVuIHN0cmluZyBvdXRwdXQgcmVxdWVzdGVkLCBlYWNoIGNodW5rXG4gKiAgIHdpbGwgYmUgc3RyaW5nLlxuICpcbiAqIEJ5IGRlZmF1bHQsIHN0b3JlcyBkYXRhIGJsb2NrcyBpbiBgY2h1bmtzW11gIHByb3BlcnR5IGFuZCBnbHVlXG4gKiB0aG9zZSBpbiBgb25FbmRgLiBPdmVycmlkZSB0aGlzIGhhbmRsZXIsIGlmIHlvdSBuZWVkIGFub3RoZXIgYmVoYXZpb3VyLlxuICoqL1xuRGVmbGF0ZS5wcm90b3R5cGUub25EYXRhID0gZnVuY3Rpb24gKGNodW5rKSB7XG4gIHRoaXMuY2h1bmtzLnB1c2goY2h1bmspO1xufTtcblxuXG4vKipcbiAqIERlZmxhdGUjb25FbmQoc3RhdHVzKSAtPiBWb2lkXG4gKiAtIHN0YXR1cyAoTnVtYmVyKTogZGVmbGF0ZSBzdGF0dXMuIDAgKFpfT0spIG9uIHN1Y2Nlc3MsXG4gKiAgIG90aGVyIGlmIG5vdC5cbiAqXG4gKiBDYWxsZWQgb25jZSBhZnRlciB5b3UgdGVsbCBkZWZsYXRlIHRoYXQgdGhlIGlucHV0IHN0cmVhbSBpc1xuICogY29tcGxldGUgKFpfRklOSVNIKSBvciBzaG91bGQgYmUgZmx1c2hlZCAoWl9TWU5DX0ZMVVNIKVxuICogb3IgaWYgYW4gZXJyb3IgaGFwcGVuZWQuIEJ5IGRlZmF1bHQgLSBqb2luIGNvbGxlY3RlZCBjaHVua3MsXG4gKiBmcmVlIG1lbW9yeSBhbmQgZmlsbCBgcmVzdWx0c2AgLyBgZXJyYCBwcm9wZXJ0aWVzLlxuICoqL1xuRGVmbGF0ZS5wcm90b3R5cGUub25FbmQgPSBmdW5jdGlvbiAoc3RhdHVzKSB7XG4gIC8vIE9uIHN1Y2Nlc3MgLSBqb2luXG4gIGlmIChzdGF0dXMgPT09IFpfT0spIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRvID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5yZXN1bHQgPSB0aGlzLmNodW5rcy5qb2luKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXN1bHQgPSB1dGlscy5mbGF0dGVuQ2h1bmtzKHRoaXMuY2h1bmtzKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5jaHVua3MgPSBbXTtcbiAgdGhpcy5lcnIgPSBzdGF0dXM7XG4gIHRoaXMubXNnID0gdGhpcy5zdHJtLm1zZztcbn07XG5cblxuLyoqXG4gKiBkZWZsYXRlKGRhdGFbLCBvcHRpb25zXSkgLT4gVWludDhBcnJheXxBcnJheXxTdHJpbmdcbiAqIC0gZGF0YSAoVWludDhBcnJheXxBcnJheXxTdHJpbmcpOiBpbnB1dCBkYXRhIHRvIGNvbXByZXNzLlxuICogLSBvcHRpb25zIChPYmplY3QpOiB6bGliIGRlZmxhdGUgb3B0aW9ucy5cbiAqXG4gKiBDb21wcmVzcyBgZGF0YWAgd2l0aCBkZWZsYXRlIGFsZ29yaXRobSBhbmQgYG9wdGlvbnNgLlxuICpcbiAqIFN1cHBvcnRlZCBvcHRpb25zIGFyZTpcbiAqXG4gKiAtIGxldmVsXG4gKiAtIHdpbmRvd0JpdHNcbiAqIC0gbWVtTGV2ZWxcbiAqIC0gc3RyYXRlZ3lcbiAqIC0gZGljdGlvbmFyeVxuICpcbiAqIFtodHRwOi8vemxpYi5uZXQvbWFudWFsLmh0bWwjQWR2YW5jZWRdKGh0dHA6Ly96bGliLm5ldC9tYW51YWwuaHRtbCNBZHZhbmNlZClcbiAqIGZvciBtb3JlIGluZm9ybWF0aW9uIG9uIHRoZXNlLlxuICpcbiAqIFN1Z2FyIChvcHRpb25zKTpcbiAqXG4gKiAtIGByYXdgIChCb29sZWFuKSAtIHNheSB0aGF0IHdlIHdvcmsgd2l0aCByYXcgc3RyZWFtLCBpZiB5b3UgZG9uJ3Qgd2lzaCB0byBzcGVjaWZ5XG4gKiAgIG5lZ2F0aXZlIHdpbmRvd0JpdHMgaW1wbGljaXRseS5cbiAqIC0gYHRvYCAoU3RyaW5nKSAtIGlmIGVxdWFsIHRvICdzdHJpbmcnLCB0aGVuIHJlc3VsdCB3aWxsIGJlIFwiYmluYXJ5IHN0cmluZ1wiXG4gKiAgICAoZWFjaCBjaGFyIGNvZGUgWzAuLjI1NV0pXG4gKlxuICogIyMjIyMgRXhhbXBsZTpcbiAqXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiB2YXIgcGFrbyA9IHJlcXVpcmUoJ3Bha28nKVxuICogICAsIGRhdGEgPSBVaW50OEFycmF5KFsxLDIsMyw0LDUsNiw3LDgsOV0pO1xuICpcbiAqIGNvbnNvbGUubG9nKHBha28uZGVmbGF0ZShkYXRhKSk7XG4gKiBgYGBcbiAqKi9cbmZ1bmN0aW9uIGRlZmxhdGUoaW5wdXQsIG9wdGlvbnMpIHtcbiAgdmFyIGRlZmxhdG9yID0gbmV3IERlZmxhdGUob3B0aW9ucyk7XG5cbiAgZGVmbGF0b3IucHVzaChpbnB1dCwgdHJ1ZSk7XG5cbiAgLy8gVGhhdCB3aWxsIG5ldmVyIGhhcHBlbnMsIGlmIHlvdSBkb24ndCBjaGVhdCB3aXRoIG9wdGlvbnMgOilcbiAgaWYgKGRlZmxhdG9yLmVycikgeyB0aHJvdyBkZWZsYXRvci5tc2cgfHwgbXNnW2RlZmxhdG9yLmVycl07IH1cblxuICByZXR1cm4gZGVmbGF0b3IucmVzdWx0O1xufVxuXG5cbi8qKlxuICogZGVmbGF0ZVJhdyhkYXRhWywgb3B0aW9uc10pIC0+IFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nXG4gKiAtIGRhdGEgKFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nKTogaW5wdXQgZGF0YSB0byBjb21wcmVzcy5cbiAqIC0gb3B0aW9ucyAoT2JqZWN0KTogemxpYiBkZWZsYXRlIG9wdGlvbnMuXG4gKlxuICogVGhlIHNhbWUgYXMgW1tkZWZsYXRlXV0sIGJ1dCBjcmVhdGVzIHJhdyBkYXRhLCB3aXRob3V0IHdyYXBwZXJcbiAqIChoZWFkZXIgYW5kIGFkbGVyMzIgY3JjKS5cbiAqKi9cbmZ1bmN0aW9uIGRlZmxhdGVSYXcoaW5wdXQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMucmF3ID0gdHJ1ZTtcbiAgcmV0dXJuIGRlZmxhdGUoaW5wdXQsIG9wdGlvbnMpO1xufVxuXG5cbi8qKlxuICogZ3ppcChkYXRhWywgb3B0aW9uc10pIC0+IFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nXG4gKiAtIGRhdGEgKFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nKTogaW5wdXQgZGF0YSB0byBjb21wcmVzcy5cbiAqIC0gb3B0aW9ucyAoT2JqZWN0KTogemxpYiBkZWZsYXRlIG9wdGlvbnMuXG4gKlxuICogVGhlIHNhbWUgYXMgW1tkZWZsYXRlXV0sIGJ1dCBjcmVhdGUgZ3ppcCB3cmFwcGVyIGluc3RlYWQgb2ZcbiAqIGRlZmxhdGUgb25lLlxuICoqL1xuZnVuY3Rpb24gZ3ppcChpbnB1dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5nemlwID0gdHJ1ZTtcbiAgcmV0dXJuIGRlZmxhdGUoaW5wdXQsIG9wdGlvbnMpO1xufVxuXG5cbmV4cG9ydHMuRGVmbGF0ZSA9IERlZmxhdGU7XG5leHBvcnRzLmRlZmxhdGUgPSBkZWZsYXRlO1xuZXhwb3J0cy5kZWZsYXRlUmF3ID0gZGVmbGF0ZVJhdztcbmV4cG9ydHMuZ3ppcCA9IGd6aXA7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vLyAoQykgMTk5NS0yMDEzIEplYW4tbG91cCBHYWlsbHkgYW5kIE1hcmsgQWRsZXJcbi8vIChDKSAyMDE0LTIwMTcgVml0YWx5IFB1enJpbiBhbmQgQW5kcmV5IFR1cGl0c2luXG4vL1xuLy8gVGhpcyBzb2Z0d2FyZSBpcyBwcm92aWRlZCAnYXMtaXMnLCB3aXRob3V0IGFueSBleHByZXNzIG9yIGltcGxpZWRcbi8vIHdhcnJhbnR5LiBJbiBubyBldmVudCB3aWxsIHRoZSBhdXRob3JzIGJlIGhlbGQgbGlhYmxlIGZvciBhbnkgZGFtYWdlc1xuLy8gYXJpc2luZyBmcm9tIHRoZSB1c2Ugb2YgdGhpcyBzb2Z0d2FyZS5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGdyYW50ZWQgdG8gYW55b25lIHRvIHVzZSB0aGlzIHNvZnR3YXJlIGZvciBhbnkgcHVycG9zZSxcbi8vIGluY2x1ZGluZyBjb21tZXJjaWFsIGFwcGxpY2F0aW9ucywgYW5kIHRvIGFsdGVyIGl0IGFuZCByZWRpc3RyaWJ1dGUgaXRcbi8vIGZyZWVseSwgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIHJlc3RyaWN0aW9uczpcbi8vXG4vLyAxLiBUaGUgb3JpZ2luIG9mIHRoaXMgc29mdHdhcmUgbXVzdCBub3QgYmUgbWlzcmVwcmVzZW50ZWQ7IHlvdSBtdXN0IG5vdFxuLy8gICBjbGFpbSB0aGF0IHlvdSB3cm90ZSB0aGUgb3JpZ2luYWwgc29mdHdhcmUuIElmIHlvdSB1c2UgdGhpcyBzb2Z0d2FyZVxuLy8gICBpbiBhIHByb2R1Y3QsIGFuIGFja25vd2xlZGdtZW50IGluIHRoZSBwcm9kdWN0IGRvY3VtZW50YXRpb24gd291bGQgYmVcbi8vICAgYXBwcmVjaWF0ZWQgYnV0IGlzIG5vdCByZXF1aXJlZC5cbi8vIDIuIEFsdGVyZWQgc291cmNlIHZlcnNpb25zIG11c3QgYmUgcGxhaW5seSBtYXJrZWQgYXMgc3VjaCwgYW5kIG11c3Qgbm90IGJlXG4vLyAgIG1pc3JlcHJlc2VudGVkIGFzIGJlaW5nIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS5cbi8vIDMuIFRoaXMgbm90aWNlIG1heSBub3QgYmUgcmVtb3ZlZCBvciBhbHRlcmVkIGZyb20gYW55IHNvdXJjZSBkaXN0cmlidXRpb24uXG5cbi8vIFNlZSBzdGF0ZSBkZWZzIGZyb20gaW5mbGF0ZS5qc1xudmFyIEJBRCA9IDMwOyAgICAgICAvKiBnb3QgYSBkYXRhIGVycm9yIC0tIHJlbWFpbiBoZXJlIHVudGlsIHJlc2V0ICovXG52YXIgVFlQRSA9IDEyOyAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIHR5cGUgYml0cywgaW5jbHVkaW5nIGxhc3QtZmxhZyBiaXQgKi9cblxuLypcbiAgIERlY29kZSBsaXRlcmFsLCBsZW5ndGgsIGFuZCBkaXN0YW5jZSBjb2RlcyBhbmQgd3JpdGUgb3V0IHRoZSByZXN1bHRpbmdcbiAgIGxpdGVyYWwgYW5kIG1hdGNoIGJ5dGVzIHVudGlsIGVpdGhlciBub3QgZW5vdWdoIGlucHV0IG9yIG91dHB1dCBpc1xuICAgYXZhaWxhYmxlLCBhbiBlbmQtb2YtYmxvY2sgaXMgZW5jb3VudGVyZWQsIG9yIGEgZGF0YSBlcnJvciBpcyBlbmNvdW50ZXJlZC5cbiAgIFdoZW4gbGFyZ2UgZW5vdWdoIGlucHV0IGFuZCBvdXRwdXQgYnVmZmVycyBhcmUgc3VwcGxpZWQgdG8gaW5mbGF0ZSgpLCBmb3JcbiAgIGV4YW1wbGUsIGEgMTZLIGlucHV0IGJ1ZmZlciBhbmQgYSA2NEsgb3V0cHV0IGJ1ZmZlciwgbW9yZSB0aGFuIDk1JSBvZiB0aGVcbiAgIGluZmxhdGUgZXhlY3V0aW9uIHRpbWUgaXMgc3BlbnQgaW4gdGhpcyByb3V0aW5lLlxuXG4gICBFbnRyeSBhc3N1bXB0aW9uczpcblxuICAgICAgICBzdGF0ZS5tb2RlID09PSBMRU5cbiAgICAgICAgc3RybS5hdmFpbF9pbiA+PSA2XG4gICAgICAgIHN0cm0uYXZhaWxfb3V0ID49IDI1OFxuICAgICAgICBzdGFydCA+PSBzdHJtLmF2YWlsX291dFxuICAgICAgICBzdGF0ZS5iaXRzIDwgOFxuXG4gICBPbiByZXR1cm4sIHN0YXRlLm1vZGUgaXMgb25lIG9mOlxuXG4gICAgICAgIExFTiAtLSByYW4gb3V0IG9mIGVub3VnaCBvdXRwdXQgc3BhY2Ugb3IgZW5vdWdoIGF2YWlsYWJsZSBpbnB1dFxuICAgICAgICBUWVBFIC0tIHJlYWNoZWQgZW5kIG9mIGJsb2NrIGNvZGUsIGluZmxhdGUoKSB0byBpbnRlcnByZXQgbmV4dCBibG9ja1xuICAgICAgICBCQUQgLS0gZXJyb3IgaW4gYmxvY2sgZGF0YVxuXG4gICBOb3RlczpcblxuICAgIC0gVGhlIG1heGltdW0gaW5wdXQgYml0cyB1c2VkIGJ5IGEgbGVuZ3RoL2Rpc3RhbmNlIHBhaXIgaXMgMTUgYml0cyBmb3IgdGhlXG4gICAgICBsZW5ndGggY29kZSwgNSBiaXRzIGZvciB0aGUgbGVuZ3RoIGV4dHJhLCAxNSBiaXRzIGZvciB0aGUgZGlzdGFuY2UgY29kZSxcbiAgICAgIGFuZCAxMyBiaXRzIGZvciB0aGUgZGlzdGFuY2UgZXh0cmEuICBUaGlzIHRvdGFscyA0OCBiaXRzLCBvciBzaXggYnl0ZXMuXG4gICAgICBUaGVyZWZvcmUgaWYgc3RybS5hdmFpbF9pbiA+PSA2LCB0aGVuIHRoZXJlIGlzIGVub3VnaCBpbnB1dCB0byBhdm9pZFxuICAgICAgY2hlY2tpbmcgZm9yIGF2YWlsYWJsZSBpbnB1dCB3aGlsZSBkZWNvZGluZy5cblxuICAgIC0gVGhlIG1heGltdW0gYnl0ZXMgdGhhdCBhIHNpbmdsZSBsZW5ndGgvZGlzdGFuY2UgcGFpciBjYW4gb3V0cHV0IGlzIDI1OFxuICAgICAgYnl0ZXMsIHdoaWNoIGlzIHRoZSBtYXhpbXVtIGxlbmd0aCB0aGF0IGNhbiBiZSBjb2RlZC4gIGluZmxhdGVfZmFzdCgpXG4gICAgICByZXF1aXJlcyBzdHJtLmF2YWlsX291dCA+PSAyNTggZm9yIGVhY2ggbG9vcCB0byBhdm9pZCBjaGVja2luZyBmb3JcbiAgICAgIG91dHB1dCBzcGFjZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmZsYXRlX2Zhc3Qoc3RybSwgc3RhcnQpIHtcbiAgdmFyIHN0YXRlO1xuICB2YXIgX2luOyAgICAgICAgICAgICAgICAgICAgLyogbG9jYWwgc3RybS5pbnB1dCAqL1xuICB2YXIgbGFzdDsgICAgICAgICAgICAgICAgICAgLyogaGF2ZSBlbm91Z2ggaW5wdXQgd2hpbGUgaW4gPCBsYXN0ICovXG4gIHZhciBfb3V0OyAgICAgICAgICAgICAgICAgICAvKiBsb2NhbCBzdHJtLm91dHB1dCAqL1xuICB2YXIgYmVnOyAgICAgICAgICAgICAgICAgICAgLyogaW5mbGF0ZSgpJ3MgaW5pdGlhbCBzdHJtLm91dHB1dCAqL1xuICB2YXIgZW5kOyAgICAgICAgICAgICAgICAgICAgLyogd2hpbGUgb3V0IDwgZW5kLCBlbm91Z2ggc3BhY2UgYXZhaWxhYmxlICovXG4vLyNpZmRlZiBJTkZMQVRFX1NUUklDVFxuICB2YXIgZG1heDsgICAgICAgICAgICAgICAgICAgLyogbWF4aW11bSBkaXN0YW5jZSBmcm9tIHpsaWIgaGVhZGVyICovXG4vLyNlbmRpZlxuICB2YXIgd3NpemU7ICAgICAgICAgICAgICAgICAgLyogd2luZG93IHNpemUgb3IgemVybyBpZiBub3QgdXNpbmcgd2luZG93ICovXG4gIHZhciB3aGF2ZTsgICAgICAgICAgICAgICAgICAvKiB2YWxpZCBieXRlcyBpbiB0aGUgd2luZG93ICovXG4gIHZhciB3bmV4dDsgICAgICAgICAgICAgICAgICAvKiB3aW5kb3cgd3JpdGUgaW5kZXggKi9cbiAgLy8gVXNlIGBzX3dpbmRvd2AgaW5zdGVhZCBgd2luZG93YCwgYXZvaWQgY29uZmxpY3Qgd2l0aCBpbnN0cnVtZW50YXRpb24gdG9vbHNcbiAgdmFyIHNfd2luZG93OyAgICAgICAgICAgICAgIC8qIGFsbG9jYXRlZCBzbGlkaW5nIHdpbmRvdywgaWYgd3NpemUgIT0gMCAqL1xuICB2YXIgaG9sZDsgICAgICAgICAgICAgICAgICAgLyogbG9jYWwgc3RybS5ob2xkICovXG4gIHZhciBiaXRzOyAgICAgICAgICAgICAgICAgICAvKiBsb2NhbCBzdHJtLmJpdHMgKi9cbiAgdmFyIGxjb2RlOyAgICAgICAgICAgICAgICAgIC8qIGxvY2FsIHN0cm0ubGVuY29kZSAqL1xuICB2YXIgZGNvZGU7ICAgICAgICAgICAgICAgICAgLyogbG9jYWwgc3RybS5kaXN0Y29kZSAqL1xuICB2YXIgbG1hc2s7ICAgICAgICAgICAgICAgICAgLyogbWFzayBmb3IgZmlyc3QgbGV2ZWwgb2YgbGVuZ3RoIGNvZGVzICovXG4gIHZhciBkbWFzazsgICAgICAgICAgICAgICAgICAvKiBtYXNrIGZvciBmaXJzdCBsZXZlbCBvZiBkaXN0YW5jZSBjb2RlcyAqL1xuICB2YXIgaGVyZTsgICAgICAgICAgICAgICAgICAgLyogcmV0cmlldmVkIHRhYmxlIGVudHJ5ICovXG4gIHZhciBvcDsgICAgICAgICAgICAgICAgICAgICAvKiBjb2RlIGJpdHMsIG9wZXJhdGlvbiwgZXh0cmEgYml0cywgb3IgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qICB3aW5kb3cgcG9zaXRpb24sIHdpbmRvdyBieXRlcyB0byBjb3B5ICovXG4gIHZhciBsZW47ICAgICAgICAgICAgICAgICAgICAvKiBtYXRjaCBsZW5ndGgsIHVudXNlZCBieXRlcyAqL1xuICB2YXIgZGlzdDsgICAgICAgICAgICAgICAgICAgLyogbWF0Y2ggZGlzdGFuY2UgKi9cbiAgdmFyIGZyb207ICAgICAgICAgICAgICAgICAgIC8qIHdoZXJlIHRvIGNvcHkgbWF0Y2ggZnJvbSAqL1xuICB2YXIgZnJvbV9zb3VyY2U7XG5cblxuICB2YXIgaW5wdXQsIG91dHB1dDsgLy8gSlMgc3BlY2lmaWMsIGJlY2F1c2Ugd2UgaGF2ZSBubyBwb2ludGVyc1xuXG4gIC8qIGNvcHkgc3RhdGUgdG8gbG9jYWwgdmFyaWFibGVzICovXG4gIHN0YXRlID0gc3RybS5zdGF0ZTtcbiAgLy9oZXJlID0gc3RhdGUuaGVyZTtcbiAgX2luID0gc3RybS5uZXh0X2luO1xuICBpbnB1dCA9IHN0cm0uaW5wdXQ7XG4gIGxhc3QgPSBfaW4gKyAoc3RybS5hdmFpbF9pbiAtIDUpO1xuICBfb3V0ID0gc3RybS5uZXh0X291dDtcbiAgb3V0cHV0ID0gc3RybS5vdXRwdXQ7XG4gIGJlZyA9IF9vdXQgLSAoc3RhcnQgLSBzdHJtLmF2YWlsX291dCk7XG4gIGVuZCA9IF9vdXQgKyAoc3RybS5hdmFpbF9vdXQgLSAyNTcpO1xuLy8jaWZkZWYgSU5GTEFURV9TVFJJQ1RcbiAgZG1heCA9IHN0YXRlLmRtYXg7XG4vLyNlbmRpZlxuICB3c2l6ZSA9IHN0YXRlLndzaXplO1xuICB3aGF2ZSA9IHN0YXRlLndoYXZlO1xuICB3bmV4dCA9IHN0YXRlLnduZXh0O1xuICBzX3dpbmRvdyA9IHN0YXRlLndpbmRvdztcbiAgaG9sZCA9IHN0YXRlLmhvbGQ7XG4gIGJpdHMgPSBzdGF0ZS5iaXRzO1xuICBsY29kZSA9IHN0YXRlLmxlbmNvZGU7XG4gIGRjb2RlID0gc3RhdGUuZGlzdGNvZGU7XG4gIGxtYXNrID0gKDEgPDwgc3RhdGUubGVuYml0cykgLSAxO1xuICBkbWFzayA9ICgxIDw8IHN0YXRlLmRpc3RiaXRzKSAtIDE7XG5cblxuICAvKiBkZWNvZGUgbGl0ZXJhbHMgYW5kIGxlbmd0aC9kaXN0YW5jZXMgdW50aWwgZW5kLW9mLWJsb2NrIG9yIG5vdCBlbm91Z2hcbiAgICAgaW5wdXQgZGF0YSBvciBvdXRwdXQgc3BhY2UgKi9cblxuICB0b3A6XG4gIGRvIHtcbiAgICBpZiAoYml0cyA8IDE1KSB7XG4gICAgICBob2xkICs9IGlucHV0W19pbisrXSA8PCBiaXRzO1xuICAgICAgYml0cyArPSA4O1xuICAgICAgaG9sZCArPSBpbnB1dFtfaW4rK10gPDwgYml0cztcbiAgICAgIGJpdHMgKz0gODtcbiAgICB9XG5cbiAgICBoZXJlID0gbGNvZGVbaG9sZCAmIGxtYXNrXTtcblxuICAgIGRvbGVuOlxuICAgIGZvciAoOzspIHsgLy8gR290byBlbXVsYXRpb25cbiAgICAgIG9wID0gaGVyZSA+Pj4gMjQvKmhlcmUuYml0cyovO1xuICAgICAgaG9sZCA+Pj49IG9wO1xuICAgICAgYml0cyAtPSBvcDtcbiAgICAgIG9wID0gKGhlcmUgPj4+IDE2KSAmIDB4ZmYvKmhlcmUub3AqLztcbiAgICAgIGlmIChvcCA9PT0gMCkgeyAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbGl0ZXJhbCAqL1xuICAgICAgICAvL1RyYWNldnYoKHN0ZGVyciwgaGVyZS52YWwgPj0gMHgyMCAmJiBoZXJlLnZhbCA8IDB4N2YgP1xuICAgICAgICAvLyAgICAgICAgXCJpbmZsYXRlOiAgICAgICAgIGxpdGVyYWwgJyVjJ1xcblwiIDpcbiAgICAgICAgLy8gICAgICAgIFwiaW5mbGF0ZTogICAgICAgICBsaXRlcmFsIDB4JTAyeFxcblwiLCBoZXJlLnZhbCkpO1xuICAgICAgICBvdXRwdXRbX291dCsrXSA9IGhlcmUgJiAweGZmZmYvKmhlcmUudmFsKi87XG4gICAgICB9XG4gICAgICBlbHNlIGlmIChvcCAmIDE2KSB7ICAgICAgICAgICAgICAgICAgICAgLyogbGVuZ3RoIGJhc2UgKi9cbiAgICAgICAgbGVuID0gaGVyZSAmIDB4ZmZmZi8qaGVyZS52YWwqLztcbiAgICAgICAgb3AgJj0gMTU7ICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogbnVtYmVyIG9mIGV4dHJhIGJpdHMgKi9cbiAgICAgICAgaWYgKG9wKSB7XG4gICAgICAgICAgaWYgKGJpdHMgPCBvcCkge1xuICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtfaW4rK10gPDwgYml0cztcbiAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICB9XG4gICAgICAgICAgbGVuICs9IGhvbGQgJiAoKDEgPDwgb3ApIC0gMSk7XG4gICAgICAgICAgaG9sZCA+Pj49IG9wO1xuICAgICAgICAgIGJpdHMgLT0gb3A7XG4gICAgICAgIH1cbiAgICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgICBsZW5ndGggJXVcXG5cIiwgbGVuKSk7XG4gICAgICAgIGlmIChiaXRzIDwgMTUpIHtcbiAgICAgICAgICBob2xkICs9IGlucHV0W19pbisrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICBob2xkICs9IGlucHV0W19pbisrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICBoZXJlID0gZGNvZGVbaG9sZCAmIGRtYXNrXTtcblxuICAgICAgICBkb2Rpc3Q6XG4gICAgICAgIGZvciAoOzspIHsgLy8gZ290byBlbXVsYXRpb25cbiAgICAgICAgICBvcCA9IGhlcmUgPj4+IDI0LypoZXJlLmJpdHMqLztcbiAgICAgICAgICBob2xkID4+Pj0gb3A7XG4gICAgICAgICAgYml0cyAtPSBvcDtcbiAgICAgICAgICBvcCA9IChoZXJlID4+PiAxNikgJiAweGZmLypoZXJlLm9wKi87XG5cbiAgICAgICAgICBpZiAob3AgJiAxNikgeyAgICAgICAgICAgICAgICAgICAgICAvKiBkaXN0YW5jZSBiYXNlICovXG4gICAgICAgICAgICBkaXN0ID0gaGVyZSAmIDB4ZmZmZi8qaGVyZS52YWwqLztcbiAgICAgICAgICAgIG9wICY9IDE1OyAgICAgICAgICAgICAgICAgICAgICAgLyogbnVtYmVyIG9mIGV4dHJhIGJpdHMgKi9cbiAgICAgICAgICAgIGlmIChiaXRzIDwgb3ApIHtcbiAgICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtfaW4rK10gPDwgYml0cztcbiAgICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgICAgICBpZiAoYml0cyA8IG9wKSB7XG4gICAgICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtfaW4rK10gPDwgYml0cztcbiAgICAgICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRpc3QgKz0gaG9sZCAmICgoMSA8PCBvcCkgLSAxKTtcbi8vI2lmZGVmIElORkxBVEVfU1RSSUNUXG4gICAgICAgICAgICBpZiAoZGlzdCA+IGRtYXgpIHtcbiAgICAgICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCBkaXN0YW5jZSB0b28gZmFyIGJhY2snO1xuICAgICAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgICAgICBicmVhayB0b3A7XG4gICAgICAgICAgICB9XG4vLyNlbmRpZlxuICAgICAgICAgICAgaG9sZCA+Pj49IG9wO1xuICAgICAgICAgICAgYml0cyAtPSBvcDtcbiAgICAgICAgICAgIC8vVHJhY2V2digoc3RkZXJyLCBcImluZmxhdGU6ICAgICAgICAgZGlzdGFuY2UgJXVcXG5cIiwgZGlzdCkpO1xuICAgICAgICAgICAgb3AgPSBfb3V0IC0gYmVnOyAgICAgICAgICAgICAgICAvKiBtYXggZGlzdGFuY2UgaW4gb3V0cHV0ICovXG4gICAgICAgICAgICBpZiAoZGlzdCA+IG9wKSB7ICAgICAgICAgICAgICAgIC8qIHNlZSBpZiBjb3B5IGZyb20gd2luZG93ICovXG4gICAgICAgICAgICAgIG9wID0gZGlzdCAtIG9wOyAgICAgICAgICAgICAgIC8qIGRpc3RhbmNlIGJhY2sgaW4gd2luZG93ICovXG4gICAgICAgICAgICAgIGlmIChvcCA+IHdoYXZlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnNhbmUpIHtcbiAgICAgICAgICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgZGlzdGFuY2UgdG9vIGZhciBiYWNrJztcbiAgICAgICAgICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgICAgICAgICBicmVhayB0b3A7XG4gICAgICAgICAgICAgICAgfVxuXG4vLyAoISkgVGhpcyBibG9jayBpcyBkaXNhYmxlZCBpbiB6bGliIGRlZmF1bHRzLFxuLy8gZG9uJ3QgZW5hYmxlIGl0IGZvciBiaW5hcnkgY29tcGF0aWJpbGl0eVxuLy8jaWZkZWYgSU5GTEFURV9BTExPV19JTlZBTElEX0RJU1RBTkNFX1RPT0ZBUl9BUlJSXG4vLyAgICAgICAgICAgICAgICBpZiAobGVuIDw9IG9wIC0gd2hhdmUpIHtcbi8vICAgICAgICAgICAgICAgICAgZG8ge1xuLy8gICAgICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gMDtcbi8vICAgICAgICAgICAgICAgICAgfSB3aGlsZSAoLS1sZW4pO1xuLy8gICAgICAgICAgICAgICAgICBjb250aW51ZSB0b3A7XG4vLyAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBsZW4gLT0gb3AgLSB3aGF2ZTtcbi8vICAgICAgICAgICAgICAgIGRvIHtcbi8vICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSAwO1xuLy8gICAgICAgICAgICAgICAgfSB3aGlsZSAoLS1vcCA+IHdoYXZlKTtcbi8vICAgICAgICAgICAgICAgIGlmIChvcCA9PT0gMCkge1xuLy8gICAgICAgICAgICAgICAgICBmcm9tID0gX291dCAtIGRpc3Q7XG4vLyAgICAgICAgICAgICAgICAgIGRvIHtcbi8vICAgICAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IG91dHB1dFtmcm9tKytdO1xuLy8gICAgICAgICAgICAgICAgICB9IHdoaWxlICgtLWxlbik7XG4vLyAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIHRvcDtcbi8vICAgICAgICAgICAgICAgIH1cbi8vI2VuZGlmXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZnJvbSA9IDA7IC8vIHdpbmRvdyBpbmRleFxuICAgICAgICAgICAgICBmcm9tX3NvdXJjZSA9IHNfd2luZG93O1xuICAgICAgICAgICAgICBpZiAod25leHQgPT09IDApIHsgICAgICAgICAgIC8qIHZlcnkgY29tbW9uIGNhc2UgKi9cbiAgICAgICAgICAgICAgICBmcm9tICs9IHdzaXplIC0gb3A7XG4gICAgICAgICAgICAgICAgaWYgKG9wIDwgbGVuKSB7ICAgICAgICAgLyogc29tZSBmcm9tIHdpbmRvdyAqL1xuICAgICAgICAgICAgICAgICAgbGVuIC09IG9wO1xuICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IHNfd2luZG93W2Zyb20rK107XG4gICAgICAgICAgICAgICAgICB9IHdoaWxlICgtLW9wKTtcbiAgICAgICAgICAgICAgICAgIGZyb20gPSBfb3V0IC0gZGlzdDsgIC8qIHJlc3QgZnJvbSBvdXRwdXQgKi9cbiAgICAgICAgICAgICAgICAgIGZyb21fc291cmNlID0gb3V0cHV0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIGlmICh3bmV4dCA8IG9wKSB7ICAgICAgLyogd3JhcCBhcm91bmQgd2luZG93ICovXG4gICAgICAgICAgICAgICAgZnJvbSArPSB3c2l6ZSArIHduZXh0IC0gb3A7XG4gICAgICAgICAgICAgICAgb3AgLT0gd25leHQ7XG4gICAgICAgICAgICAgICAgaWYgKG9wIDwgbGVuKSB7ICAgICAgICAgLyogc29tZSBmcm9tIGVuZCBvZiB3aW5kb3cgKi9cbiAgICAgICAgICAgICAgICAgIGxlbiAtPSBvcDtcbiAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBzX3dpbmRvd1tmcm9tKytdO1xuICAgICAgICAgICAgICAgICAgfSB3aGlsZSAoLS1vcCk7XG4gICAgICAgICAgICAgICAgICBmcm9tID0gMDtcbiAgICAgICAgICAgICAgICAgIGlmICh3bmV4dCA8IGxlbikgeyAgLyogc29tZSBmcm9tIHN0YXJ0IG9mIHdpbmRvdyAqL1xuICAgICAgICAgICAgICAgICAgICBvcCA9IHduZXh0O1xuICAgICAgICAgICAgICAgICAgICBsZW4gLT0gb3A7XG4gICAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IHNfd2luZG93W2Zyb20rK107XG4gICAgICAgICAgICAgICAgICAgIH0gd2hpbGUgKC0tb3ApO1xuICAgICAgICAgICAgICAgICAgICBmcm9tID0gX291dCAtIGRpc3Q7ICAgICAgLyogcmVzdCBmcm9tIG91dHB1dCAqL1xuICAgICAgICAgICAgICAgICAgICBmcm9tX3NvdXJjZSA9IG91dHB1dDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7ICAgICAgICAgICAgICAgICAgICAgIC8qIGNvbnRpZ3VvdXMgaW4gd2luZG93ICovXG4gICAgICAgICAgICAgICAgZnJvbSArPSB3bmV4dCAtIG9wO1xuICAgICAgICAgICAgICAgIGlmIChvcCA8IGxlbikgeyAgICAgICAgIC8qIHNvbWUgZnJvbSB3aW5kb3cgKi9cbiAgICAgICAgICAgICAgICAgIGxlbiAtPSBvcDtcbiAgICAgICAgICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBzX3dpbmRvd1tmcm9tKytdO1xuICAgICAgICAgICAgICAgICAgfSB3aGlsZSAoLS1vcCk7XG4gICAgICAgICAgICAgICAgICBmcm9tID0gX291dCAtIGRpc3Q7ICAvKiByZXN0IGZyb20gb3V0cHV0ICovXG4gICAgICAgICAgICAgICAgICBmcm9tX3NvdXJjZSA9IG91dHB1dDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgd2hpbGUgKGxlbiA+IDIpIHtcbiAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IGZyb21fc291cmNlW2Zyb20rK107XG4gICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBmcm9tX3NvdXJjZVtmcm9tKytdO1xuICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gZnJvbV9zb3VyY2VbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICBsZW4gLT0gMztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAobGVuKSB7XG4gICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBmcm9tX3NvdXJjZVtmcm9tKytdO1xuICAgICAgICAgICAgICAgIGlmIChsZW4gPiAxKSB7XG4gICAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IGZyb21fc291cmNlW2Zyb20rK107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgZnJvbSA9IF9vdXQgLSBkaXN0OyAgICAgICAgICAvKiBjb3B5IGRpcmVjdCBmcm9tIG91dHB1dCAqL1xuICAgICAgICAgICAgICBkbyB7ICAgICAgICAgICAgICAgICAgICAgICAgLyogbWluaW11bSBsZW5ndGggaXMgdGhyZWUgKi9cbiAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IG91dHB1dFtmcm9tKytdO1xuICAgICAgICAgICAgICAgIG91dHB1dFtfb3V0KytdID0gb3V0cHV0W2Zyb20rK107XG4gICAgICAgICAgICAgICAgb3V0cHV0W19vdXQrK10gPSBvdXRwdXRbZnJvbSsrXTtcbiAgICAgICAgICAgICAgICBsZW4gLT0gMztcbiAgICAgICAgICAgICAgfSB3aGlsZSAobGVuID4gMik7XG4gICAgICAgICAgICAgIGlmIChsZW4pIHtcbiAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IG91dHB1dFtmcm9tKytdO1xuICAgICAgICAgICAgICAgIGlmIChsZW4gPiAxKSB7XG4gICAgICAgICAgICAgICAgICBvdXRwdXRbX291dCsrXSA9IG91dHB1dFtmcm9tKytdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmICgob3AgJiA2NCkgPT09IDApIHsgICAgICAgICAgLyogMm5kIGxldmVsIGRpc3RhbmNlIGNvZGUgKi9cbiAgICAgICAgICAgIGhlcmUgPSBkY29kZVsoaGVyZSAmIDB4ZmZmZikvKmhlcmUudmFsKi8gKyAoaG9sZCAmICgoMSA8PCBvcCkgLSAxKSldO1xuICAgICAgICAgICAgY29udGludWUgZG9kaXN0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgZGlzdGFuY2UgY29kZSc7XG4gICAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgICAgYnJlYWsgdG9wO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGJyZWFrOyAvLyBuZWVkIHRvIGVtdWxhdGUgZ290byB2aWEgXCJjb250aW51ZVwiXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKChvcCAmIDY0KSA9PT0gMCkgeyAgICAgICAgICAgICAgLyogMm5kIGxldmVsIGxlbmd0aCBjb2RlICovXG4gICAgICAgIGhlcmUgPSBsY29kZVsoaGVyZSAmIDB4ZmZmZikvKmhlcmUudmFsKi8gKyAoaG9sZCAmICgoMSA8PCBvcCkgLSAxKSldO1xuICAgICAgICBjb250aW51ZSBkb2xlbjtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKG9wICYgMzIpIHsgICAgICAgICAgICAgICAgICAgICAvKiBlbmQtb2YtYmxvY2sgKi9cbiAgICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgICBlbmQgb2YgYmxvY2tcXG5cIikpO1xuICAgICAgICBzdGF0ZS5tb2RlID0gVFlQRTtcbiAgICAgICAgYnJlYWsgdG9wO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgbGl0ZXJhbC9sZW5ndGggY29kZSc7XG4gICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgIGJyZWFrIHRvcDtcbiAgICAgIH1cblxuICAgICAgYnJlYWs7IC8vIG5lZWQgdG8gZW11bGF0ZSBnb3RvIHZpYSBcImNvbnRpbnVlXCJcbiAgICB9XG4gIH0gd2hpbGUgKF9pbiA8IGxhc3QgJiYgX291dCA8IGVuZCk7XG5cbiAgLyogcmV0dXJuIHVudXNlZCBieXRlcyAob24gZW50cnksIGJpdHMgPCA4LCBzbyBpbiB3b24ndCBnbyB0b28gZmFyIGJhY2spICovXG4gIGxlbiA9IGJpdHMgPj4gMztcbiAgX2luIC09IGxlbjtcbiAgYml0cyAtPSBsZW4gPDwgMztcbiAgaG9sZCAmPSAoMSA8PCBiaXRzKSAtIDE7XG5cbiAgLyogdXBkYXRlIHN0YXRlIGFuZCByZXR1cm4gKi9cbiAgc3RybS5uZXh0X2luID0gX2luO1xuICBzdHJtLm5leHRfb3V0ID0gX291dDtcbiAgc3RybS5hdmFpbF9pbiA9IChfaW4gPCBsYXN0ID8gNSArIChsYXN0IC0gX2luKSA6IDUgLSAoX2luIC0gbGFzdCkpO1xuICBzdHJtLmF2YWlsX291dCA9IChfb3V0IDwgZW5kID8gMjU3ICsgKGVuZCAtIF9vdXQpIDogMjU3IC0gKF9vdXQgLSBlbmQpKTtcbiAgc3RhdGUuaG9sZCA9IGhvbGQ7XG4gIHN0YXRlLmJpdHMgPSBiaXRzO1xuICByZXR1cm47XG59O1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLy8gKEMpIDE5OTUtMjAxMyBKZWFuLWxvdXAgR2FpbGx5IGFuZCBNYXJrIEFkbGVyXG4vLyAoQykgMjAxNC0yMDE3IFZpdGFseSBQdXpyaW4gYW5kIEFuZHJleSBUdXBpdHNpblxuLy9cbi8vIFRoaXMgc29mdHdhcmUgaXMgcHJvdmlkZWQgJ2FzLWlzJywgd2l0aG91dCBhbnkgZXhwcmVzcyBvciBpbXBsaWVkXG4vLyB3YXJyYW50eS4gSW4gbm8gZXZlbnQgd2lsbCB0aGUgYXV0aG9ycyBiZSBoZWxkIGxpYWJsZSBmb3IgYW55IGRhbWFnZXNcbi8vIGFyaXNpbmcgZnJvbSB0aGUgdXNlIG9mIHRoaXMgc29mdHdhcmUuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBncmFudGVkIHRvIGFueW9uZSB0byB1c2UgdGhpcyBzb2Z0d2FyZSBmb3IgYW55IHB1cnBvc2UsXG4vLyBpbmNsdWRpbmcgY29tbWVyY2lhbCBhcHBsaWNhdGlvbnMsIGFuZCB0byBhbHRlciBpdCBhbmQgcmVkaXN0cmlidXRlIGl0XG4vLyBmcmVlbHksIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyByZXN0cmljdGlvbnM6XG4vL1xuLy8gMS4gVGhlIG9yaWdpbiBvZiB0aGlzIHNvZnR3YXJlIG11c3Qgbm90IGJlIG1pc3JlcHJlc2VudGVkOyB5b3UgbXVzdCBub3Rcbi8vICAgY2xhaW0gdGhhdCB5b3Ugd3JvdGUgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLiBJZiB5b3UgdXNlIHRoaXMgc29mdHdhcmVcbi8vICAgaW4gYSBwcm9kdWN0LCBhbiBhY2tub3dsZWRnbWVudCBpbiB0aGUgcHJvZHVjdCBkb2N1bWVudGF0aW9uIHdvdWxkIGJlXG4vLyAgIGFwcHJlY2lhdGVkIGJ1dCBpcyBub3QgcmVxdWlyZWQuXG4vLyAyLiBBbHRlcmVkIHNvdXJjZSB2ZXJzaW9ucyBtdXN0IGJlIHBsYWlubHkgbWFya2VkIGFzIHN1Y2gsIGFuZCBtdXN0IG5vdCBiZVxuLy8gICBtaXNyZXByZXNlbnRlZCBhcyBiZWluZyB0aGUgb3JpZ2luYWwgc29mdHdhcmUuXG4vLyAzLiBUaGlzIG5vdGljZSBtYXkgbm90IGJlIHJlbW92ZWQgb3IgYWx0ZXJlZCBmcm9tIGFueSBzb3VyY2UgZGlzdHJpYnV0aW9uLlxuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy9jb21tb24nKTtcblxudmFyIE1BWEJJVFMgPSAxNTtcbnZhciBFTk9VR0hfTEVOUyA9IDg1MjtcbnZhciBFTk9VR0hfRElTVFMgPSA1OTI7XG4vL3ZhciBFTk9VR0ggPSAoRU5PVUdIX0xFTlMrRU5PVUdIX0RJU1RTKTtcblxudmFyIENPREVTID0gMDtcbnZhciBMRU5TID0gMTtcbnZhciBESVNUUyA9IDI7XG5cbnZhciBsYmFzZSA9IFsgLyogTGVuZ3RoIGNvZGVzIDI1Ny4uMjg1IGJhc2UgKi9cbiAgMywgNCwgNSwgNiwgNywgOCwgOSwgMTAsIDExLCAxMywgMTUsIDE3LCAxOSwgMjMsIDI3LCAzMSxcbiAgMzUsIDQzLCA1MSwgNTksIDY3LCA4MywgOTksIDExNSwgMTMxLCAxNjMsIDE5NSwgMjI3LCAyNTgsIDAsIDBcbl07XG5cbnZhciBsZXh0ID0gWyAvKiBMZW5ndGggY29kZXMgMjU3Li4yODUgZXh0cmEgKi9cbiAgMTYsIDE2LCAxNiwgMTYsIDE2LCAxNiwgMTYsIDE2LCAxNywgMTcsIDE3LCAxNywgMTgsIDE4LCAxOCwgMTgsXG4gIDE5LCAxOSwgMTksIDE5LCAyMCwgMjAsIDIwLCAyMCwgMjEsIDIxLCAyMSwgMjEsIDE2LCA3MiwgNzhcbl07XG5cbnZhciBkYmFzZSA9IFsgLyogRGlzdGFuY2UgY29kZXMgMC4uMjkgYmFzZSAqL1xuICAxLCAyLCAzLCA0LCA1LCA3LCA5LCAxMywgMTcsIDI1LCAzMywgNDksIDY1LCA5NywgMTI5LCAxOTMsXG4gIDI1NywgMzg1LCA1MTMsIDc2OSwgMTAyNSwgMTUzNywgMjA0OSwgMzA3MywgNDA5NywgNjE0NSxcbiAgODE5MywgMTIyODksIDE2Mzg1LCAyNDU3NywgMCwgMFxuXTtcblxudmFyIGRleHQgPSBbIC8qIERpc3RhbmNlIGNvZGVzIDAuLjI5IGV4dHJhICovXG4gIDE2LCAxNiwgMTYsIDE2LCAxNywgMTcsIDE4LCAxOCwgMTksIDE5LCAyMCwgMjAsIDIxLCAyMSwgMjIsIDIyLFxuICAyMywgMjMsIDI0LCAyNCwgMjUsIDI1LCAyNiwgMjYsIDI3LCAyNyxcbiAgMjgsIDI4LCAyOSwgMjksIDY0LCA2NFxuXTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmZsYXRlX3RhYmxlKHR5cGUsIGxlbnMsIGxlbnNfaW5kZXgsIGNvZGVzLCB0YWJsZSwgdGFibGVfaW5kZXgsIHdvcmssIG9wdHMpXG57XG4gIHZhciBiaXRzID0gb3B0cy5iaXRzO1xuICAgICAgLy9oZXJlID0gb3B0cy5oZXJlOyAvKiB0YWJsZSBlbnRyeSBmb3IgZHVwbGljYXRpb24gKi9cblxuICB2YXIgbGVuID0gMDsgICAgICAgICAgICAgICAvKiBhIGNvZGUncyBsZW5ndGggaW4gYml0cyAqL1xuICB2YXIgc3ltID0gMDsgICAgICAgICAgICAgICAvKiBpbmRleCBvZiBjb2RlIHN5bWJvbHMgKi9cbiAgdmFyIG1pbiA9IDAsIG1heCA9IDA7ICAgICAgICAgIC8qIG1pbmltdW0gYW5kIG1heGltdW0gY29kZSBsZW5ndGhzICovXG4gIHZhciByb290ID0gMDsgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBpbmRleCBiaXRzIGZvciByb290IHRhYmxlICovXG4gIHZhciBjdXJyID0gMDsgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBpbmRleCBiaXRzIGZvciBjdXJyZW50IHRhYmxlICovXG4gIHZhciBkcm9wID0gMDsgICAgICAgICAgICAgIC8qIGNvZGUgYml0cyB0byBkcm9wIGZvciBzdWItdGFibGUgKi9cbiAgdmFyIGxlZnQgPSAwOyAgICAgICAgICAgICAgICAgICAvKiBudW1iZXIgb2YgcHJlZml4IGNvZGVzIGF2YWlsYWJsZSAqL1xuICB2YXIgdXNlZCA9IDA7ICAgICAgICAgICAgICAvKiBjb2RlIGVudHJpZXMgaW4gdGFibGUgdXNlZCAqL1xuICB2YXIgaHVmZiA9IDA7ICAgICAgICAgICAgICAvKiBIdWZmbWFuIGNvZGUgKi9cbiAgdmFyIGluY3I7ICAgICAgICAgICAgICAvKiBmb3IgaW5jcmVtZW50aW5nIGNvZGUsIGluZGV4ICovXG4gIHZhciBmaWxsOyAgICAgICAgICAgICAgLyogaW5kZXggZm9yIHJlcGxpY2F0aW5nIGVudHJpZXMgKi9cbiAgdmFyIGxvdzsgICAgICAgICAgICAgICAvKiBsb3cgYml0cyBmb3IgY3VycmVudCByb290IGVudHJ5ICovXG4gIHZhciBtYXNrOyAgICAgICAgICAgICAgLyogbWFzayBmb3IgbG93IHJvb3QgYml0cyAqL1xuICB2YXIgbmV4dDsgICAgICAgICAgICAgLyogbmV4dCBhdmFpbGFibGUgc3BhY2UgaW4gdGFibGUgKi9cbiAgdmFyIGJhc2UgPSBudWxsOyAgICAgLyogYmFzZSB2YWx1ZSB0YWJsZSB0byB1c2UgKi9cbiAgdmFyIGJhc2VfaW5kZXggPSAwO1xuLy8gIHZhciBzaG9leHRyYTsgICAgLyogZXh0cmEgYml0cyB0YWJsZSB0byB1c2UgKi9cbiAgdmFyIGVuZDsgICAgICAgICAgICAgICAgICAgIC8qIHVzZSBiYXNlIGFuZCBleHRyYSBmb3Igc3ltYm9sID4gZW5kICovXG4gIHZhciBjb3VudCA9IG5ldyB1dGlscy5CdWYxNihNQVhCSVRTICsgMSk7IC8vW01BWEJJVFMrMV07ICAgIC8qIG51bWJlciBvZiBjb2RlcyBvZiBlYWNoIGxlbmd0aCAqL1xuICB2YXIgb2ZmcyA9IG5ldyB1dGlscy5CdWYxNihNQVhCSVRTICsgMSk7IC8vW01BWEJJVFMrMV07ICAgICAvKiBvZmZzZXRzIGluIHRhYmxlIGZvciBlYWNoIGxlbmd0aCAqL1xuICB2YXIgZXh0cmEgPSBudWxsO1xuICB2YXIgZXh0cmFfaW5kZXggPSAwO1xuXG4gIHZhciBoZXJlX2JpdHMsIGhlcmVfb3AsIGhlcmVfdmFsO1xuXG4gIC8qXG4gICBQcm9jZXNzIGEgc2V0IG9mIGNvZGUgbGVuZ3RocyB0byBjcmVhdGUgYSBjYW5vbmljYWwgSHVmZm1hbiBjb2RlLiAgVGhlXG4gICBjb2RlIGxlbmd0aHMgYXJlIGxlbnNbMC4uY29kZXMtMV0uICBFYWNoIGxlbmd0aCBjb3JyZXNwb25kcyB0byB0aGVcbiAgIHN5bWJvbHMgMC4uY29kZXMtMS4gIFRoZSBIdWZmbWFuIGNvZGUgaXMgZ2VuZXJhdGVkIGJ5IGZpcnN0IHNvcnRpbmcgdGhlXG4gICBzeW1ib2xzIGJ5IGxlbmd0aCBmcm9tIHNob3J0IHRvIGxvbmcsIGFuZCByZXRhaW5pbmcgdGhlIHN5bWJvbCBvcmRlclxuICAgZm9yIGNvZGVzIHdpdGggZXF1YWwgbGVuZ3Rocy4gIFRoZW4gdGhlIGNvZGUgc3RhcnRzIHdpdGggYWxsIHplcm8gYml0c1xuICAgZm9yIHRoZSBmaXJzdCBjb2RlIG9mIHRoZSBzaG9ydGVzdCBsZW5ndGgsIGFuZCB0aGUgY29kZXMgYXJlIGludGVnZXJcbiAgIGluY3JlbWVudHMgZm9yIHRoZSBzYW1lIGxlbmd0aCwgYW5kIHplcm9zIGFyZSBhcHBlbmRlZCBhcyB0aGUgbGVuZ3RoXG4gICBpbmNyZWFzZXMuICBGb3IgdGhlIGRlZmxhdGUgZm9ybWF0LCB0aGVzZSBiaXRzIGFyZSBzdG9yZWQgYmFja3dhcmRzXG4gICBmcm9tIHRoZWlyIG1vcmUgbmF0dXJhbCBpbnRlZ2VyIGluY3JlbWVudCBvcmRlcmluZywgYW5kIHNvIHdoZW4gdGhlXG4gICBkZWNvZGluZyB0YWJsZXMgYXJlIGJ1aWx0IGluIHRoZSBsYXJnZSBsb29wIGJlbG93LCB0aGUgaW50ZWdlciBjb2Rlc1xuICAgYXJlIGluY3JlbWVudGVkIGJhY2t3YXJkcy5cblxuICAgVGhpcyByb3V0aW5lIGFzc3VtZXMsIGJ1dCBkb2VzIG5vdCBjaGVjaywgdGhhdCBhbGwgb2YgdGhlIGVudHJpZXMgaW5cbiAgIGxlbnNbXSBhcmUgaW4gdGhlIHJhbmdlIDAuLk1BWEJJVFMuICBUaGUgY2FsbGVyIG11c3QgYXNzdXJlIHRoaXMuXG4gICAxLi5NQVhCSVRTIGlzIGludGVycHJldGVkIGFzIHRoYXQgY29kZSBsZW5ndGguICB6ZXJvIG1lYW5zIHRoYXQgdGhhdFxuICAgc3ltYm9sIGRvZXMgbm90IG9jY3VyIGluIHRoaXMgY29kZS5cblxuICAgVGhlIGNvZGVzIGFyZSBzb3J0ZWQgYnkgY29tcHV0aW5nIGEgY291bnQgb2YgY29kZXMgZm9yIGVhY2ggbGVuZ3RoLFxuICAgY3JlYXRpbmcgZnJvbSB0aGF0IGEgdGFibGUgb2Ygc3RhcnRpbmcgaW5kaWNlcyBmb3IgZWFjaCBsZW5ndGggaW4gdGhlXG4gICBzb3J0ZWQgdGFibGUsIGFuZCB0aGVuIGVudGVyaW5nIHRoZSBzeW1ib2xzIGluIG9yZGVyIGluIHRoZSBzb3J0ZWRcbiAgIHRhYmxlLiAgVGhlIHNvcnRlZCB0YWJsZSBpcyB3b3JrW10sIHdpdGggdGhhdCBzcGFjZSBiZWluZyBwcm92aWRlZCBieVxuICAgdGhlIGNhbGxlci5cblxuICAgVGhlIGxlbmd0aCBjb3VudHMgYXJlIHVzZWQgZm9yIG90aGVyIHB1cnBvc2VzIGFzIHdlbGwsIGkuZS4gZmluZGluZ1xuICAgdGhlIG1pbmltdW0gYW5kIG1heGltdW0gbGVuZ3RoIGNvZGVzLCBkZXRlcm1pbmluZyBpZiB0aGVyZSBhcmUgYW55XG4gICBjb2RlcyBhdCBhbGwsIGNoZWNraW5nIGZvciBhIHZhbGlkIHNldCBvZiBsZW5ndGhzLCBhbmQgbG9va2luZyBhaGVhZFxuICAgYXQgbGVuZ3RoIGNvdW50cyB0byBkZXRlcm1pbmUgc3ViLXRhYmxlIHNpemVzIHdoZW4gYnVpbGRpbmcgdGhlXG4gICBkZWNvZGluZyB0YWJsZXMuXG4gICAqL1xuXG4gIC8qIGFjY3VtdWxhdGUgbGVuZ3RocyBmb3IgY29kZXMgKGFzc3VtZXMgbGVuc1tdIGFsbCBpbiAwLi5NQVhCSVRTKSAqL1xuICBmb3IgKGxlbiA9IDA7IGxlbiA8PSBNQVhCSVRTOyBsZW4rKykge1xuICAgIGNvdW50W2xlbl0gPSAwO1xuICB9XG4gIGZvciAoc3ltID0gMDsgc3ltIDwgY29kZXM7IHN5bSsrKSB7XG4gICAgY291bnRbbGVuc1tsZW5zX2luZGV4ICsgc3ltXV0rKztcbiAgfVxuXG4gIC8qIGJvdW5kIGNvZGUgbGVuZ3RocywgZm9yY2Ugcm9vdCB0byBiZSB3aXRoaW4gY29kZSBsZW5ndGhzICovXG4gIHJvb3QgPSBiaXRzO1xuICBmb3IgKG1heCA9IE1BWEJJVFM7IG1heCA+PSAxOyBtYXgtLSkge1xuICAgIGlmIChjb3VudFttYXhdICE9PSAwKSB7IGJyZWFrOyB9XG4gIH1cbiAgaWYgKHJvb3QgPiBtYXgpIHtcbiAgICByb290ID0gbWF4O1xuICB9XG4gIGlmIChtYXggPT09IDApIHsgICAgICAgICAgICAgICAgICAgICAvKiBubyBzeW1ib2xzIHRvIGNvZGUgYXQgYWxsICovXG4gICAgLy90YWJsZS5vcFtvcHRzLnRhYmxlX2luZGV4XSA9IDY0OyAgLy9oZXJlLm9wID0gKHZhciBjaGFyKTY0OyAgICAvKiBpbnZhbGlkIGNvZGUgbWFya2VyICovXG4gICAgLy90YWJsZS5iaXRzW29wdHMudGFibGVfaW5kZXhdID0gMTsgICAvL2hlcmUuYml0cyA9ICh2YXIgY2hhcikxO1xuICAgIC8vdGFibGUudmFsW29wdHMudGFibGVfaW5kZXgrK10gPSAwOyAgIC8vaGVyZS52YWwgPSAodmFyIHNob3J0KTA7XG4gICAgdGFibGVbdGFibGVfaW5kZXgrK10gPSAoMSA8PCAyNCkgfCAoNjQgPDwgMTYpIHwgMDtcblxuXG4gICAgLy90YWJsZS5vcFtvcHRzLnRhYmxlX2luZGV4XSA9IDY0O1xuICAgIC8vdGFibGUuYml0c1tvcHRzLnRhYmxlX2luZGV4XSA9IDE7XG4gICAgLy90YWJsZS52YWxbb3B0cy50YWJsZV9pbmRleCsrXSA9IDA7XG4gICAgdGFibGVbdGFibGVfaW5kZXgrK10gPSAoMSA8PCAyNCkgfCAoNjQgPDwgMTYpIHwgMDtcblxuICAgIG9wdHMuYml0cyA9IDE7XG4gICAgcmV0dXJuIDA7ICAgICAvKiBubyBzeW1ib2xzLCBidXQgd2FpdCBmb3IgZGVjb2RpbmcgdG8gcmVwb3J0IGVycm9yICovXG4gIH1cbiAgZm9yIChtaW4gPSAxOyBtaW4gPCBtYXg7IG1pbisrKSB7XG4gICAgaWYgKGNvdW50W21pbl0gIT09IDApIHsgYnJlYWs7IH1cbiAgfVxuICBpZiAocm9vdCA8IG1pbikge1xuICAgIHJvb3QgPSBtaW47XG4gIH1cblxuICAvKiBjaGVjayBmb3IgYW4gb3Zlci1zdWJzY3JpYmVkIG9yIGluY29tcGxldGUgc2V0IG9mIGxlbmd0aHMgKi9cbiAgbGVmdCA9IDE7XG4gIGZvciAobGVuID0gMTsgbGVuIDw9IE1BWEJJVFM7IGxlbisrKSB7XG4gICAgbGVmdCA8PD0gMTtcbiAgICBsZWZ0IC09IGNvdW50W2xlbl07XG4gICAgaWYgKGxlZnQgPCAwKSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSAgICAgICAgLyogb3Zlci1zdWJzY3JpYmVkICovXG4gIH1cbiAgaWYgKGxlZnQgPiAwICYmICh0eXBlID09PSBDT0RFUyB8fCBtYXggIT09IDEpKSB7XG4gICAgcmV0dXJuIC0xOyAgICAgICAgICAgICAgICAgICAgICAvKiBpbmNvbXBsZXRlIHNldCAqL1xuICB9XG5cbiAgLyogZ2VuZXJhdGUgb2Zmc2V0cyBpbnRvIHN5bWJvbCB0YWJsZSBmb3IgZWFjaCBsZW5ndGggZm9yIHNvcnRpbmcgKi9cbiAgb2Zmc1sxXSA9IDA7XG4gIGZvciAobGVuID0gMTsgbGVuIDwgTUFYQklUUzsgbGVuKyspIHtcbiAgICBvZmZzW2xlbiArIDFdID0gb2Zmc1tsZW5dICsgY291bnRbbGVuXTtcbiAgfVxuXG4gIC8qIHNvcnQgc3ltYm9scyBieSBsZW5ndGgsIGJ5IHN5bWJvbCBvcmRlciB3aXRoaW4gZWFjaCBsZW5ndGggKi9cbiAgZm9yIChzeW0gPSAwOyBzeW0gPCBjb2Rlczsgc3ltKyspIHtcbiAgICBpZiAobGVuc1tsZW5zX2luZGV4ICsgc3ltXSAhPT0gMCkge1xuICAgICAgd29ya1tvZmZzW2xlbnNbbGVuc19pbmRleCArIHN5bV1dKytdID0gc3ltO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICBDcmVhdGUgYW5kIGZpbGwgaW4gZGVjb2RpbmcgdGFibGVzLiAgSW4gdGhpcyBsb29wLCB0aGUgdGFibGUgYmVpbmdcbiAgIGZpbGxlZCBpcyBhdCBuZXh0IGFuZCBoYXMgY3VyciBpbmRleCBiaXRzLiAgVGhlIGNvZGUgYmVpbmcgdXNlZCBpcyBodWZmXG4gICB3aXRoIGxlbmd0aCBsZW4uICBUaGF0IGNvZGUgaXMgY29udmVydGVkIHRvIGFuIGluZGV4IGJ5IGRyb3BwaW5nIGRyb3BcbiAgIGJpdHMgb2ZmIG9mIHRoZSBib3R0b20uICBGb3IgY29kZXMgd2hlcmUgbGVuIGlzIGxlc3MgdGhhbiBkcm9wICsgY3VycixcbiAgIHRob3NlIHRvcCBkcm9wICsgY3VyciAtIGxlbiBiaXRzIGFyZSBpbmNyZW1lbnRlZCB0aHJvdWdoIGFsbCB2YWx1ZXMgdG9cbiAgIGZpbGwgdGhlIHRhYmxlIHdpdGggcmVwbGljYXRlZCBlbnRyaWVzLlxuXG4gICByb290IGlzIHRoZSBudW1iZXIgb2YgaW5kZXggYml0cyBmb3IgdGhlIHJvb3QgdGFibGUuICBXaGVuIGxlbiBleGNlZWRzXG4gICByb290LCBzdWItdGFibGVzIGFyZSBjcmVhdGVkIHBvaW50ZWQgdG8gYnkgdGhlIHJvb3QgZW50cnkgd2l0aCBhbiBpbmRleFxuICAgb2YgdGhlIGxvdyByb290IGJpdHMgb2YgaHVmZi4gIFRoaXMgaXMgc2F2ZWQgaW4gbG93IHRvIGNoZWNrIGZvciB3aGVuIGFcbiAgIG5ldyBzdWItdGFibGUgc2hvdWxkIGJlIHN0YXJ0ZWQuICBkcm9wIGlzIHplcm8gd2hlbiB0aGUgcm9vdCB0YWJsZSBpc1xuICAgYmVpbmcgZmlsbGVkLCBhbmQgZHJvcCBpcyByb290IHdoZW4gc3ViLXRhYmxlcyBhcmUgYmVpbmcgZmlsbGVkLlxuXG4gICBXaGVuIGEgbmV3IHN1Yi10YWJsZSBpcyBuZWVkZWQsIGl0IGlzIG5lY2Vzc2FyeSB0byBsb29rIGFoZWFkIGluIHRoZVxuICAgY29kZSBsZW5ndGhzIHRvIGRldGVybWluZSB3aGF0IHNpemUgc3ViLXRhYmxlIGlzIG5lZWRlZC4gIFRoZSBsZW5ndGhcbiAgIGNvdW50cyBhcmUgdXNlZCBmb3IgdGhpcywgYW5kIHNvIGNvdW50W10gaXMgZGVjcmVtZW50ZWQgYXMgY29kZXMgYXJlXG4gICBlbnRlcmVkIGluIHRoZSB0YWJsZXMuXG5cbiAgIHVzZWQga2VlcHMgdHJhY2sgb2YgaG93IG1hbnkgdGFibGUgZW50cmllcyBoYXZlIGJlZW4gYWxsb2NhdGVkIGZyb20gdGhlXG4gICBwcm92aWRlZCAqdGFibGUgc3BhY2UuICBJdCBpcyBjaGVja2VkIGZvciBMRU5TIGFuZCBESVNUIHRhYmxlcyBhZ2FpbnN0XG4gICB0aGUgY29uc3RhbnRzIEVOT1VHSF9MRU5TIGFuZCBFTk9VR0hfRElTVFMgdG8gZ3VhcmQgYWdhaW5zdCBjaGFuZ2VzIGluXG4gICB0aGUgaW5pdGlhbCByb290IHRhYmxlIHNpemUgY29uc3RhbnRzLiAgU2VlIHRoZSBjb21tZW50cyBpbiBpbmZ0cmVlcy5oXG4gICBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cblxuICAgc3ltIGluY3JlbWVudHMgdGhyb3VnaCBhbGwgc3ltYm9scywgYW5kIHRoZSBsb29wIHRlcm1pbmF0ZXMgd2hlblxuICAgYWxsIGNvZGVzIG9mIGxlbmd0aCBtYXgsIGkuZS4gYWxsIGNvZGVzLCBoYXZlIGJlZW4gcHJvY2Vzc2VkLiAgVGhpc1xuICAgcm91dGluZSBwZXJtaXRzIGluY29tcGxldGUgY29kZXMsIHNvIGFub3RoZXIgbG9vcCBhZnRlciB0aGlzIG9uZSBmaWxsc1xuICAgaW4gdGhlIHJlc3Qgb2YgdGhlIGRlY29kaW5nIHRhYmxlcyB3aXRoIGludmFsaWQgY29kZSBtYXJrZXJzLlxuICAgKi9cblxuICAvKiBzZXQgdXAgZm9yIGNvZGUgdHlwZSAqL1xuICAvLyBwb29yIG1hbiBvcHRpbWl6YXRpb24gLSB1c2UgaWYtZWxzZSBpbnN0ZWFkIG9mIHN3aXRjaCxcbiAgLy8gdG8gYXZvaWQgZGVvcHRzIGluIG9sZCB2OFxuICBpZiAodHlwZSA9PT0gQ09ERVMpIHtcbiAgICBiYXNlID0gZXh0cmEgPSB3b3JrOyAgICAvKiBkdW1teSB2YWx1ZS0tbm90IHVzZWQgKi9cbiAgICBlbmQgPSAxOTtcblxuICB9IGVsc2UgaWYgKHR5cGUgPT09IExFTlMpIHtcbiAgICBiYXNlID0gbGJhc2U7XG4gICAgYmFzZV9pbmRleCAtPSAyNTc7XG4gICAgZXh0cmEgPSBsZXh0O1xuICAgIGV4dHJhX2luZGV4IC09IDI1NztcbiAgICBlbmQgPSAyNTY7XG5cbiAgfSBlbHNlIHsgICAgICAgICAgICAgICAgICAgIC8qIERJU1RTICovXG4gICAgYmFzZSA9IGRiYXNlO1xuICAgIGV4dHJhID0gZGV4dDtcbiAgICBlbmQgPSAtMTtcbiAgfVxuXG4gIC8qIGluaXRpYWxpemUgb3B0cyBmb3IgbG9vcCAqL1xuICBodWZmID0gMDsgICAgICAgICAgICAgICAgICAgLyogc3RhcnRpbmcgY29kZSAqL1xuICBzeW0gPSAwOyAgICAgICAgICAgICAgICAgICAgLyogc3RhcnRpbmcgY29kZSBzeW1ib2wgKi9cbiAgbGVuID0gbWluOyAgICAgICAgICAgICAgICAgIC8qIHN0YXJ0aW5nIGNvZGUgbGVuZ3RoICovXG4gIG5leHQgPSB0YWJsZV9pbmRleDsgICAgICAgICAgICAgIC8qIGN1cnJlbnQgdGFibGUgdG8gZmlsbCBpbiAqL1xuICBjdXJyID0gcm9vdDsgICAgICAgICAgICAgICAgLyogY3VycmVudCB0YWJsZSBpbmRleCBiaXRzICovXG4gIGRyb3AgPSAwOyAgICAgICAgICAgICAgICAgICAvKiBjdXJyZW50IGJpdHMgdG8gZHJvcCBmcm9tIGNvZGUgZm9yIGluZGV4ICovXG4gIGxvdyA9IC0xOyAgICAgICAgICAgICAgICAgICAvKiB0cmlnZ2VyIG5ldyBzdWItdGFibGUgd2hlbiBsZW4gPiByb290ICovXG4gIHVzZWQgPSAxIDw8IHJvb3Q7ICAgICAgICAgIC8qIHVzZSByb290IHRhYmxlIGVudHJpZXMgKi9cbiAgbWFzayA9IHVzZWQgLSAxOyAgICAgICAgICAgIC8qIG1hc2sgZm9yIGNvbXBhcmluZyBsb3cgKi9cblxuICAvKiBjaGVjayBhdmFpbGFibGUgdGFibGUgc3BhY2UgKi9cbiAgaWYgKCh0eXBlID09PSBMRU5TICYmIHVzZWQgPiBFTk9VR0hfTEVOUykgfHxcbiAgICAodHlwZSA9PT0gRElTVFMgJiYgdXNlZCA+IEVOT1VHSF9ESVNUUykpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIC8qIHByb2Nlc3MgYWxsIGNvZGVzIGFuZCBtYWtlIHRhYmxlIGVudHJpZXMgKi9cbiAgZm9yICg7Oykge1xuICAgIC8qIGNyZWF0ZSB0YWJsZSBlbnRyeSAqL1xuICAgIGhlcmVfYml0cyA9IGxlbiAtIGRyb3A7XG4gICAgaWYgKHdvcmtbc3ltXSA8IGVuZCkge1xuICAgICAgaGVyZV9vcCA9IDA7XG4gICAgICBoZXJlX3ZhbCA9IHdvcmtbc3ltXTtcbiAgICB9XG4gICAgZWxzZSBpZiAod29ya1tzeW1dID4gZW5kKSB7XG4gICAgICBoZXJlX29wID0gZXh0cmFbZXh0cmFfaW5kZXggKyB3b3JrW3N5bV1dO1xuICAgICAgaGVyZV92YWwgPSBiYXNlW2Jhc2VfaW5kZXggKyB3b3JrW3N5bV1dO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGhlcmVfb3AgPSAzMiArIDY0OyAgICAgICAgIC8qIGVuZCBvZiBibG9jayAqL1xuICAgICAgaGVyZV92YWwgPSAwO1xuICAgIH1cblxuICAgIC8qIHJlcGxpY2F0ZSBmb3IgdGhvc2UgaW5kaWNlcyB3aXRoIGxvdyBsZW4gYml0cyBlcXVhbCB0byBodWZmICovXG4gICAgaW5jciA9IDEgPDwgKGxlbiAtIGRyb3ApO1xuICAgIGZpbGwgPSAxIDw8IGN1cnI7XG4gICAgbWluID0gZmlsbDsgICAgICAgICAgICAgICAgIC8qIHNhdmUgb2Zmc2V0IHRvIG5leHQgdGFibGUgKi9cbiAgICBkbyB7XG4gICAgICBmaWxsIC09IGluY3I7XG4gICAgICB0YWJsZVtuZXh0ICsgKGh1ZmYgPj4gZHJvcCkgKyBmaWxsXSA9IChoZXJlX2JpdHMgPDwgMjQpIHwgKGhlcmVfb3AgPDwgMTYpIHwgaGVyZV92YWwgfDA7XG4gICAgfSB3aGlsZSAoZmlsbCAhPT0gMCk7XG5cbiAgICAvKiBiYWNrd2FyZHMgaW5jcmVtZW50IHRoZSBsZW4tYml0IGNvZGUgaHVmZiAqL1xuICAgIGluY3IgPSAxIDw8IChsZW4gLSAxKTtcbiAgICB3aGlsZSAoaHVmZiAmIGluY3IpIHtcbiAgICAgIGluY3IgPj49IDE7XG4gICAgfVxuICAgIGlmIChpbmNyICE9PSAwKSB7XG4gICAgICBodWZmICY9IGluY3IgLSAxO1xuICAgICAgaHVmZiArPSBpbmNyO1xuICAgIH0gZWxzZSB7XG4gICAgICBodWZmID0gMDtcbiAgICB9XG5cbiAgICAvKiBnbyB0byBuZXh0IHN5bWJvbCwgdXBkYXRlIGNvdW50LCBsZW4gKi9cbiAgICBzeW0rKztcbiAgICBpZiAoLS1jb3VudFtsZW5dID09PSAwKSB7XG4gICAgICBpZiAobGVuID09PSBtYXgpIHsgYnJlYWs7IH1cbiAgICAgIGxlbiA9IGxlbnNbbGVuc19pbmRleCArIHdvcmtbc3ltXV07XG4gICAgfVxuXG4gICAgLyogY3JlYXRlIG5ldyBzdWItdGFibGUgaWYgbmVlZGVkICovXG4gICAgaWYgKGxlbiA+IHJvb3QgJiYgKGh1ZmYgJiBtYXNrKSAhPT0gbG93KSB7XG4gICAgICAvKiBpZiBmaXJzdCB0aW1lLCB0cmFuc2l0aW9uIHRvIHN1Yi10YWJsZXMgKi9cbiAgICAgIGlmIChkcm9wID09PSAwKSB7XG4gICAgICAgIGRyb3AgPSByb290O1xuICAgICAgfVxuXG4gICAgICAvKiBpbmNyZW1lbnQgcGFzdCBsYXN0IHRhYmxlICovXG4gICAgICBuZXh0ICs9IG1pbjsgICAgICAgICAgICAvKiBoZXJlIG1pbiBpcyAxIDw8IGN1cnIgKi9cblxuICAgICAgLyogZGV0ZXJtaW5lIGxlbmd0aCBvZiBuZXh0IHRhYmxlICovXG4gICAgICBjdXJyID0gbGVuIC0gZHJvcDtcbiAgICAgIGxlZnQgPSAxIDw8IGN1cnI7XG4gICAgICB3aGlsZSAoY3VyciArIGRyb3AgPCBtYXgpIHtcbiAgICAgICAgbGVmdCAtPSBjb3VudFtjdXJyICsgZHJvcF07XG4gICAgICAgIGlmIChsZWZ0IDw9IDApIHsgYnJlYWs7IH1cbiAgICAgICAgY3VycisrO1xuICAgICAgICBsZWZ0IDw8PSAxO1xuICAgICAgfVxuXG4gICAgICAvKiBjaGVjayBmb3IgZW5vdWdoIHNwYWNlICovXG4gICAgICB1c2VkICs9IDEgPDwgY3VycjtcbiAgICAgIGlmICgodHlwZSA9PT0gTEVOUyAmJiB1c2VkID4gRU5PVUdIX0xFTlMpIHx8XG4gICAgICAgICh0eXBlID09PSBESVNUUyAmJiB1c2VkID4gRU5PVUdIX0RJU1RTKSkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cblxuICAgICAgLyogcG9pbnQgZW50cnkgaW4gcm9vdCB0YWJsZSB0byBzdWItdGFibGUgKi9cbiAgICAgIGxvdyA9IGh1ZmYgJiBtYXNrO1xuICAgICAgLyp0YWJsZS5vcFtsb3ddID0gY3VycjtcbiAgICAgIHRhYmxlLmJpdHNbbG93XSA9IHJvb3Q7XG4gICAgICB0YWJsZS52YWxbbG93XSA9IG5leHQgLSBvcHRzLnRhYmxlX2luZGV4OyovXG4gICAgICB0YWJsZVtsb3ddID0gKHJvb3QgPDwgMjQpIHwgKGN1cnIgPDwgMTYpIHwgKG5leHQgLSB0YWJsZV9pbmRleCkgfDA7XG4gICAgfVxuICB9XG5cbiAgLyogZmlsbCBpbiByZW1haW5pbmcgdGFibGUgZW50cnkgaWYgY29kZSBpcyBpbmNvbXBsZXRlIChndWFyYW50ZWVkIHRvIGhhdmVcbiAgIGF0IG1vc3Qgb25lIHJlbWFpbmluZyBlbnRyeSwgc2luY2UgaWYgdGhlIGNvZGUgaXMgaW5jb21wbGV0ZSwgdGhlXG4gICBtYXhpbXVtIGNvZGUgbGVuZ3RoIHRoYXQgd2FzIGFsbG93ZWQgdG8gZ2V0IHRoaXMgZmFyIGlzIG9uZSBiaXQpICovXG4gIGlmIChodWZmICE9PSAwKSB7XG4gICAgLy90YWJsZS5vcFtuZXh0ICsgaHVmZl0gPSA2NDsgICAgICAgICAgICAvKiBpbnZhbGlkIGNvZGUgbWFya2VyICovXG4gICAgLy90YWJsZS5iaXRzW25leHQgKyBodWZmXSA9IGxlbiAtIGRyb3A7XG4gICAgLy90YWJsZS52YWxbbmV4dCArIGh1ZmZdID0gMDtcbiAgICB0YWJsZVtuZXh0ICsgaHVmZl0gPSAoKGxlbiAtIGRyb3ApIDw8IDI0KSB8ICg2NCA8PCAxNikgfDA7XG4gIH1cblxuICAvKiBzZXQgcmV0dXJuIHBhcmFtZXRlcnMgKi9cbiAgLy9vcHRzLnRhYmxlX2luZGV4ICs9IHVzZWQ7XG4gIG9wdHMuYml0cyA9IHJvb3Q7XG4gIHJldHVybiAwO1xufTtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxudmFyIHV0aWxzICAgICAgICAgPSByZXF1aXJlKCcuLi91dGlscy9jb21tb24nKTtcbnZhciBhZGxlcjMyICAgICAgID0gcmVxdWlyZSgnLi9hZGxlcjMyJyk7XG52YXIgY3JjMzIgICAgICAgICA9IHJlcXVpcmUoJy4vY3JjMzInKTtcbnZhciBpbmZsYXRlX2Zhc3QgID0gcmVxdWlyZSgnLi9pbmZmYXN0Jyk7XG52YXIgaW5mbGF0ZV90YWJsZSA9IHJlcXVpcmUoJy4vaW5mdHJlZXMnKTtcblxudmFyIENPREVTID0gMDtcbnZhciBMRU5TID0gMTtcbnZhciBESVNUUyA9IDI7XG5cbi8qIFB1YmxpYyBjb25zdGFudHMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0qL1xuXG5cbi8qIEFsbG93ZWQgZmx1c2ggdmFsdWVzOyBzZWUgZGVmbGF0ZSgpIGFuZCBpbmZsYXRlKCkgYmVsb3cgZm9yIGRldGFpbHMgKi9cbi8vdmFyIFpfTk9fRkxVU0ggICAgICA9IDA7XG4vL3ZhciBaX1BBUlRJQUxfRkxVU0ggPSAxO1xuLy92YXIgWl9TWU5DX0ZMVVNIICAgID0gMjtcbi8vdmFyIFpfRlVMTF9GTFVTSCAgICA9IDM7XG52YXIgWl9GSU5JU0ggICAgICAgID0gNDtcbnZhciBaX0JMT0NLICAgICAgICAgPSA1O1xudmFyIFpfVFJFRVMgICAgICAgICA9IDY7XG5cblxuLyogUmV0dXJuIGNvZGVzIGZvciB0aGUgY29tcHJlc3Npb24vZGVjb21wcmVzc2lvbiBmdW5jdGlvbnMuIE5lZ2F0aXZlIHZhbHVlc1xuICogYXJlIGVycm9ycywgcG9zaXRpdmUgdmFsdWVzIGFyZSB1c2VkIGZvciBzcGVjaWFsIGJ1dCBub3JtYWwgZXZlbnRzLlxuICovXG52YXIgWl9PSyAgICAgICAgICAgID0gMDtcbnZhciBaX1NUUkVBTV9FTkQgICAgPSAxO1xudmFyIFpfTkVFRF9ESUNUICAgICA9IDI7XG4vL3ZhciBaX0VSUk5PICAgICAgICAgPSAtMTtcbnZhciBaX1NUUkVBTV9FUlJPUiAgPSAtMjtcbnZhciBaX0RBVEFfRVJST1IgICAgPSAtMztcbnZhciBaX01FTV9FUlJPUiAgICAgPSAtNDtcbnZhciBaX0JVRl9FUlJPUiAgICAgPSAtNTtcbi8vdmFyIFpfVkVSU0lPTl9FUlJPUiA9IC02O1xuXG4vKiBUaGUgZGVmbGF0ZSBjb21wcmVzc2lvbiBtZXRob2QgKi9cbnZhciBaX0RFRkxBVEVEICA9IDg7XG5cblxuLyogU1RBVEVTID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09Ki9cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cblxudmFyICAgIEhFQUQgPSAxOyAgICAgICAvKiBpOiB3YWl0aW5nIGZvciBtYWdpYyBoZWFkZXIgKi9cbnZhciAgICBGTEFHUyA9IDI7ICAgICAgLyogaTogd2FpdGluZyBmb3IgbWV0aG9kIGFuZCBmbGFncyAoZ3ppcCkgKi9cbnZhciAgICBUSU1FID0gMzsgICAgICAgLyogaTogd2FpdGluZyBmb3IgbW9kaWZpY2F0aW9uIHRpbWUgKGd6aXApICovXG52YXIgICAgT1MgPSA0OyAgICAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIGV4dHJhIGZsYWdzIGFuZCBvcGVyYXRpbmcgc3lzdGVtIChnemlwKSAqL1xudmFyICAgIEVYTEVOID0gNTsgICAgICAvKiBpOiB3YWl0aW5nIGZvciBleHRyYSBsZW5ndGggKGd6aXApICovXG52YXIgICAgRVhUUkEgPSA2OyAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIGV4dHJhIGJ5dGVzIChnemlwKSAqL1xudmFyICAgIE5BTUUgPSA3OyAgICAgICAvKiBpOiB3YWl0aW5nIGZvciBlbmQgb2YgZmlsZSBuYW1lIChnemlwKSAqL1xudmFyICAgIENPTU1FTlQgPSA4OyAgICAvKiBpOiB3YWl0aW5nIGZvciBlbmQgb2YgY29tbWVudCAoZ3ppcCkgKi9cbnZhciAgICBIQ1JDID0gOTsgICAgICAgLyogaTogd2FpdGluZyBmb3IgaGVhZGVyIGNyYyAoZ3ppcCkgKi9cbnZhciAgICBESUNUSUQgPSAxMDsgICAgLyogaTogd2FpdGluZyBmb3IgZGljdGlvbmFyeSBjaGVjayB2YWx1ZSAqL1xudmFyICAgIERJQ1QgPSAxMTsgICAgICAvKiB3YWl0aW5nIGZvciBpbmZsYXRlU2V0RGljdGlvbmFyeSgpIGNhbGwgKi9cbnZhciAgICAgICAgVFlQRSA9IDEyOyAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIHR5cGUgYml0cywgaW5jbHVkaW5nIGxhc3QtZmxhZyBiaXQgKi9cbnZhciAgICAgICAgVFlQRURPID0gMTM7ICAgIC8qIGk6IHNhbWUsIGJ1dCBza2lwIGNoZWNrIHRvIGV4aXQgaW5mbGF0ZSBvbiBuZXcgYmxvY2sgKi9cbnZhciAgICAgICAgU1RPUkVEID0gMTQ7ICAgIC8qIGk6IHdhaXRpbmcgZm9yIHN0b3JlZCBzaXplIChsZW5ndGggYW5kIGNvbXBsZW1lbnQpICovXG52YXIgICAgICAgIENPUFlfID0gMTU7ICAgICAvKiBpL286IHNhbWUgYXMgQ09QWSBiZWxvdywgYnV0IG9ubHkgZmlyc3QgdGltZSBpbiAqL1xudmFyICAgICAgICBDT1BZID0gMTY7ICAgICAgLyogaS9vOiB3YWl0aW5nIGZvciBpbnB1dCBvciBvdXRwdXQgdG8gY29weSBzdG9yZWQgYmxvY2sgKi9cbnZhciAgICAgICAgVEFCTEUgPSAxNzsgICAgIC8qIGk6IHdhaXRpbmcgZm9yIGR5bmFtaWMgYmxvY2sgdGFibGUgbGVuZ3RocyAqL1xudmFyICAgICAgICBMRU5MRU5TID0gMTg7ICAgLyogaTogd2FpdGluZyBmb3IgY29kZSBsZW5ndGggY29kZSBsZW5ndGhzICovXG52YXIgICAgICAgIENPREVMRU5TID0gMTk7ICAvKiBpOiB3YWl0aW5nIGZvciBsZW5ndGgvbGl0IGFuZCBkaXN0YW5jZSBjb2RlIGxlbmd0aHMgKi9cbnZhciAgICAgICAgICAgIExFTl8gPSAyMDsgICAgICAvKiBpOiBzYW1lIGFzIExFTiBiZWxvdywgYnV0IG9ubHkgZmlyc3QgdGltZSBpbiAqL1xudmFyICAgICAgICAgICAgTEVOID0gMjE7ICAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIGxlbmd0aC9saXQvZW9iIGNvZGUgKi9cbnZhciAgICAgICAgICAgIExFTkVYVCA9IDIyOyAgICAvKiBpOiB3YWl0aW5nIGZvciBsZW5ndGggZXh0cmEgYml0cyAqL1xudmFyICAgICAgICAgICAgRElTVCA9IDIzOyAgICAgIC8qIGk6IHdhaXRpbmcgZm9yIGRpc3RhbmNlIGNvZGUgKi9cbnZhciAgICAgICAgICAgIERJU1RFWFQgPSAyNDsgICAvKiBpOiB3YWl0aW5nIGZvciBkaXN0YW5jZSBleHRyYSBiaXRzICovXG52YXIgICAgICAgICAgICBNQVRDSCA9IDI1OyAgICAgLyogbzogd2FpdGluZyBmb3Igb3V0cHV0IHNwYWNlIHRvIGNvcHkgc3RyaW5nICovXG52YXIgICAgICAgICAgICBMSVQgPSAyNjsgICAgICAgLyogbzogd2FpdGluZyBmb3Igb3V0cHV0IHNwYWNlIHRvIHdyaXRlIGxpdGVyYWwgKi9cbnZhciAgICBDSEVDSyA9IDI3OyAgICAgLyogaTogd2FpdGluZyBmb3IgMzItYml0IGNoZWNrIHZhbHVlICovXG52YXIgICAgTEVOR1RIID0gMjg7ICAgIC8qIGk6IHdhaXRpbmcgZm9yIDMyLWJpdCBsZW5ndGggKGd6aXApICovXG52YXIgICAgRE9ORSA9IDI5OyAgICAgIC8qIGZpbmlzaGVkIGNoZWNrLCBkb25lIC0tIHJlbWFpbiBoZXJlIHVudGlsIHJlc2V0ICovXG52YXIgICAgQkFEID0gMzA7ICAgICAgIC8qIGdvdCBhIGRhdGEgZXJyb3IgLS0gcmVtYWluIGhlcmUgdW50aWwgcmVzZXQgKi9cbnZhciAgICBNRU0gPSAzMTsgICAgICAgLyogZ290IGFuIGluZmxhdGUoKSBtZW1vcnkgZXJyb3IgLS0gcmVtYWluIGhlcmUgdW50aWwgcmVzZXQgKi9cbnZhciAgICBTWU5DID0gMzI7ICAgICAgLyogbG9va2luZyBmb3Igc3luY2hyb25pemF0aW9uIGJ5dGVzIHRvIHJlc3RhcnQgaW5mbGF0ZSgpICovXG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSovXG5cblxuXG52YXIgRU5PVUdIX0xFTlMgPSA4NTI7XG52YXIgRU5PVUdIX0RJU1RTID0gNTkyO1xuLy92YXIgRU5PVUdIID0gIChFTk9VR0hfTEVOUytFTk9VR0hfRElTVFMpO1xuXG52YXIgTUFYX1dCSVRTID0gMTU7XG4vKiAzMksgTFo3NyB3aW5kb3cgKi9cbnZhciBERUZfV0JJVFMgPSBNQVhfV0JJVFM7XG5cblxuZnVuY3Rpb24genN3YXAzMihxKSB7XG4gIHJldHVybiAgKCgocSA+Pj4gMjQpICYgMHhmZikgK1xuICAgICAgICAgICgocSA+Pj4gOCkgJiAweGZmMDApICtcbiAgICAgICAgICAoKHEgJiAweGZmMDApIDw8IDgpICtcbiAgICAgICAgICAoKHEgJiAweGZmKSA8PCAyNCkpO1xufVxuXG5cbmZ1bmN0aW9uIEluZmxhdGVTdGF0ZSgpIHtcbiAgdGhpcy5tb2RlID0gMDsgICAgICAgICAgICAgLyogY3VycmVudCBpbmZsYXRlIG1vZGUgKi9cbiAgdGhpcy5sYXN0ID0gZmFsc2U7ICAgICAgICAgIC8qIHRydWUgaWYgcHJvY2Vzc2luZyBsYXN0IGJsb2NrICovXG4gIHRoaXMud3JhcCA9IDA7ICAgICAgICAgICAgICAvKiBiaXQgMCB0cnVlIGZvciB6bGliLCBiaXQgMSB0cnVlIGZvciBnemlwICovXG4gIHRoaXMuaGF2ZWRpY3QgPSBmYWxzZTsgICAgICAvKiB0cnVlIGlmIGRpY3Rpb25hcnkgcHJvdmlkZWQgKi9cbiAgdGhpcy5mbGFncyA9IDA7ICAgICAgICAgICAgIC8qIGd6aXAgaGVhZGVyIG1ldGhvZCBhbmQgZmxhZ3MgKDAgaWYgemxpYikgKi9cbiAgdGhpcy5kbWF4ID0gMDsgICAgICAgICAgICAgIC8qIHpsaWIgaGVhZGVyIG1heCBkaXN0YW5jZSAoSU5GTEFURV9TVFJJQ1QpICovXG4gIHRoaXMuY2hlY2sgPSAwOyAgICAgICAgICAgICAvKiBwcm90ZWN0ZWQgY29weSBvZiBjaGVjayB2YWx1ZSAqL1xuICB0aGlzLnRvdGFsID0gMDsgICAgICAgICAgICAgLyogcHJvdGVjdGVkIGNvcHkgb2Ygb3V0cHV0IGNvdW50ICovXG4gIC8vIFRPRE86IG1heSBiZSB7fVxuICB0aGlzLmhlYWQgPSBudWxsOyAgICAgICAgICAgLyogd2hlcmUgdG8gc2F2ZSBnemlwIGhlYWRlciBpbmZvcm1hdGlvbiAqL1xuXG4gIC8qIHNsaWRpbmcgd2luZG93ICovXG4gIHRoaXMud2JpdHMgPSAwOyAgICAgICAgICAgICAvKiBsb2cgYmFzZSAyIG9mIHJlcXVlc3RlZCB3aW5kb3cgc2l6ZSAqL1xuICB0aGlzLndzaXplID0gMDsgICAgICAgICAgICAgLyogd2luZG93IHNpemUgb3IgemVybyBpZiBub3QgdXNpbmcgd2luZG93ICovXG4gIHRoaXMud2hhdmUgPSAwOyAgICAgICAgICAgICAvKiB2YWxpZCBieXRlcyBpbiB0aGUgd2luZG93ICovXG4gIHRoaXMud25leHQgPSAwOyAgICAgICAgICAgICAvKiB3aW5kb3cgd3JpdGUgaW5kZXggKi9cbiAgdGhpcy53aW5kb3cgPSBudWxsOyAgICAgICAgIC8qIGFsbG9jYXRlZCBzbGlkaW5nIHdpbmRvdywgaWYgbmVlZGVkICovXG5cbiAgLyogYml0IGFjY3VtdWxhdG9yICovXG4gIHRoaXMuaG9sZCA9IDA7ICAgICAgICAgICAgICAvKiBpbnB1dCBiaXQgYWNjdW11bGF0b3IgKi9cbiAgdGhpcy5iaXRzID0gMDsgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBiaXRzIGluIFwiaW5cIiAqL1xuXG4gIC8qIGZvciBzdHJpbmcgYW5kIHN0b3JlZCBibG9jayBjb3B5aW5nICovXG4gIHRoaXMubGVuZ3RoID0gMDsgICAgICAgICAgICAvKiBsaXRlcmFsIG9yIGxlbmd0aCBvZiBkYXRhIHRvIGNvcHkgKi9cbiAgdGhpcy5vZmZzZXQgPSAwOyAgICAgICAgICAgIC8qIGRpc3RhbmNlIGJhY2sgdG8gY29weSBzdHJpbmcgZnJvbSAqL1xuXG4gIC8qIGZvciB0YWJsZSBhbmQgY29kZSBkZWNvZGluZyAqL1xuICB0aGlzLmV4dHJhID0gMDsgICAgICAgICAgICAgLyogZXh0cmEgYml0cyBuZWVkZWQgKi9cblxuICAvKiBmaXhlZCBhbmQgZHluYW1pYyBjb2RlIHRhYmxlcyAqL1xuICB0aGlzLmxlbmNvZGUgPSBudWxsOyAgICAgICAgICAvKiBzdGFydGluZyB0YWJsZSBmb3IgbGVuZ3RoL2xpdGVyYWwgY29kZXMgKi9cbiAgdGhpcy5kaXN0Y29kZSA9IG51bGw7ICAgICAgICAgLyogc3RhcnRpbmcgdGFibGUgZm9yIGRpc3RhbmNlIGNvZGVzICovXG4gIHRoaXMubGVuYml0cyA9IDA7ICAgICAgICAgICAvKiBpbmRleCBiaXRzIGZvciBsZW5jb2RlICovXG4gIHRoaXMuZGlzdGJpdHMgPSAwOyAgICAgICAgICAvKiBpbmRleCBiaXRzIGZvciBkaXN0Y29kZSAqL1xuXG4gIC8qIGR5bmFtaWMgdGFibGUgYnVpbGRpbmcgKi9cbiAgdGhpcy5uY29kZSA9IDA7ICAgICAgICAgICAgIC8qIG51bWJlciBvZiBjb2RlIGxlbmd0aCBjb2RlIGxlbmd0aHMgKi9cbiAgdGhpcy5ubGVuID0gMDsgICAgICAgICAgICAgIC8qIG51bWJlciBvZiBsZW5ndGggY29kZSBsZW5ndGhzICovXG4gIHRoaXMubmRpc3QgPSAwOyAgICAgICAgICAgICAvKiBudW1iZXIgb2YgZGlzdGFuY2UgY29kZSBsZW5ndGhzICovXG4gIHRoaXMuaGF2ZSA9IDA7ICAgICAgICAgICAgICAvKiBudW1iZXIgb2YgY29kZSBsZW5ndGhzIGluIGxlbnNbXSAqL1xuICB0aGlzLm5leHQgPSBudWxsOyAgICAgICAgICAgICAgLyogbmV4dCBhdmFpbGFibGUgc3BhY2UgaW4gY29kZXNbXSAqL1xuXG4gIHRoaXMubGVucyA9IG5ldyB1dGlscy5CdWYxNigzMjApOyAvKiB0ZW1wb3Jhcnkgc3RvcmFnZSBmb3IgY29kZSBsZW5ndGhzICovXG4gIHRoaXMud29yayA9IG5ldyB1dGlscy5CdWYxNigyODgpOyAvKiB3b3JrIGFyZWEgZm9yIGNvZGUgdGFibGUgYnVpbGRpbmcgKi9cblxuICAvKlxuICAgYmVjYXVzZSB3ZSBkb24ndCBoYXZlIHBvaW50ZXJzIGluIGpzLCB3ZSB1c2UgbGVuY29kZSBhbmQgZGlzdGNvZGUgZGlyZWN0bHlcbiAgIGFzIGJ1ZmZlcnMgc28gd2UgZG9uJ3QgbmVlZCBjb2Rlc1xuICAqL1xuICAvL3RoaXMuY29kZXMgPSBuZXcgdXRpbHMuQnVmMzIoRU5PVUdIKTsgICAgICAgLyogc3BhY2UgZm9yIGNvZGUgdGFibGVzICovXG4gIHRoaXMubGVuZHluID0gbnVsbDsgICAgICAgICAgICAgIC8qIGR5bmFtaWMgdGFibGUgZm9yIGxlbmd0aC9saXRlcmFsIGNvZGVzIChKUyBzcGVjaWZpYykgKi9cbiAgdGhpcy5kaXN0ZHluID0gbnVsbDsgICAgICAgICAgICAgLyogZHluYW1pYyB0YWJsZSBmb3IgZGlzdGFuY2UgY29kZXMgKEpTIHNwZWNpZmljKSAqL1xuICB0aGlzLnNhbmUgPSAwOyAgICAgICAgICAgICAgICAgICAvKiBpZiBmYWxzZSwgYWxsb3cgaW52YWxpZCBkaXN0YW5jZSB0b28gZmFyICovXG4gIHRoaXMuYmFjayA9IDA7ICAgICAgICAgICAgICAgICAgIC8qIGJpdHMgYmFjayBvZiBsYXN0IHVucHJvY2Vzc2VkIGxlbmd0aC9saXQgKi9cbiAgdGhpcy53YXMgPSAwOyAgICAgICAgICAgICAgICAgICAgLyogaW5pdGlhbCBsZW5ndGggb2YgbWF0Y2ggKi9cbn1cblxuZnVuY3Rpb24gaW5mbGF0ZVJlc2V0S2VlcChzdHJtKSB7XG4gIHZhciBzdGF0ZTtcblxuICBpZiAoIXN0cm0gfHwgIXN0cm0uc3RhdGUpIHsgcmV0dXJuIFpfU1RSRUFNX0VSUk9SOyB9XG4gIHN0YXRlID0gc3RybS5zdGF0ZTtcbiAgc3RybS50b3RhbF9pbiA9IHN0cm0udG90YWxfb3V0ID0gc3RhdGUudG90YWwgPSAwO1xuICBzdHJtLm1zZyA9ICcnOyAvKlpfTlVMTCovXG4gIGlmIChzdGF0ZS53cmFwKSB7ICAgICAgIC8qIHRvIHN1cHBvcnQgaWxsLWNvbmNlaXZlZCBKYXZhIHRlc3Qgc3VpdGUgKi9cbiAgICBzdHJtLmFkbGVyID0gc3RhdGUud3JhcCAmIDE7XG4gIH1cbiAgc3RhdGUubW9kZSA9IEhFQUQ7XG4gIHN0YXRlLmxhc3QgPSAwO1xuICBzdGF0ZS5oYXZlZGljdCA9IDA7XG4gIHN0YXRlLmRtYXggPSAzMjc2ODtcbiAgc3RhdGUuaGVhZCA9IG51bGwvKlpfTlVMTCovO1xuICBzdGF0ZS5ob2xkID0gMDtcbiAgc3RhdGUuYml0cyA9IDA7XG4gIC8vc3RhdGUubGVuY29kZSA9IHN0YXRlLmRpc3Rjb2RlID0gc3RhdGUubmV4dCA9IHN0YXRlLmNvZGVzO1xuICBzdGF0ZS5sZW5jb2RlID0gc3RhdGUubGVuZHluID0gbmV3IHV0aWxzLkJ1ZjMyKEVOT1VHSF9MRU5TKTtcbiAgc3RhdGUuZGlzdGNvZGUgPSBzdGF0ZS5kaXN0ZHluID0gbmV3IHV0aWxzLkJ1ZjMyKEVOT1VHSF9ESVNUUyk7XG5cbiAgc3RhdGUuc2FuZSA9IDE7XG4gIHN0YXRlLmJhY2sgPSAtMTtcbiAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiByZXNldFxcblwiKSk7XG4gIHJldHVybiBaX09LO1xufVxuXG5mdW5jdGlvbiBpbmZsYXRlUmVzZXQoc3RybSkge1xuICB2YXIgc3RhdGU7XG5cbiAgaWYgKCFzdHJtIHx8ICFzdHJtLnN0YXRlKSB7IHJldHVybiBaX1NUUkVBTV9FUlJPUjsgfVxuICBzdGF0ZSA9IHN0cm0uc3RhdGU7XG4gIHN0YXRlLndzaXplID0gMDtcbiAgc3RhdGUud2hhdmUgPSAwO1xuICBzdGF0ZS53bmV4dCA9IDA7XG4gIHJldHVybiBpbmZsYXRlUmVzZXRLZWVwKHN0cm0pO1xuXG59XG5cbmZ1bmN0aW9uIGluZmxhdGVSZXNldDIoc3RybSwgd2luZG93Qml0cykge1xuICB2YXIgd3JhcDtcbiAgdmFyIHN0YXRlO1xuXG4gIC8qIGdldCB0aGUgc3RhdGUgKi9cbiAgaWYgKCFzdHJtIHx8ICFzdHJtLnN0YXRlKSB7IHJldHVybiBaX1NUUkVBTV9FUlJPUjsgfVxuICBzdGF0ZSA9IHN0cm0uc3RhdGU7XG5cbiAgLyogZXh0cmFjdCB3cmFwIHJlcXVlc3QgZnJvbSB3aW5kb3dCaXRzIHBhcmFtZXRlciAqL1xuICBpZiAod2luZG93Qml0cyA8IDApIHtcbiAgICB3cmFwID0gMDtcbiAgICB3aW5kb3dCaXRzID0gLXdpbmRvd0JpdHM7XG4gIH1cbiAgZWxzZSB7XG4gICAgd3JhcCA9ICh3aW5kb3dCaXRzID4+IDQpICsgMTtcbiAgICBpZiAod2luZG93Qml0cyA8IDQ4KSB7XG4gICAgICB3aW5kb3dCaXRzICY9IDE1O1xuICAgIH1cbiAgfVxuXG4gIC8qIHNldCBudW1iZXIgb2Ygd2luZG93IGJpdHMsIGZyZWUgd2luZG93IGlmIGRpZmZlcmVudCAqL1xuICBpZiAod2luZG93Qml0cyAmJiAod2luZG93Qml0cyA8IDggfHwgd2luZG93Qml0cyA+IDE1KSkge1xuICAgIHJldHVybiBaX1NUUkVBTV9FUlJPUjtcbiAgfVxuICBpZiAoc3RhdGUud2luZG93ICE9PSBudWxsICYmIHN0YXRlLndiaXRzICE9PSB3aW5kb3dCaXRzKSB7XG4gICAgc3RhdGUud2luZG93ID0gbnVsbDtcbiAgfVxuXG4gIC8qIHVwZGF0ZSBzdGF0ZSBhbmQgcmVzZXQgdGhlIHJlc3Qgb2YgaXQgKi9cbiAgc3RhdGUud3JhcCA9IHdyYXA7XG4gIHN0YXRlLndiaXRzID0gd2luZG93Qml0cztcbiAgcmV0dXJuIGluZmxhdGVSZXNldChzdHJtKTtcbn1cblxuZnVuY3Rpb24gaW5mbGF0ZUluaXQyKHN0cm0sIHdpbmRvd0JpdHMpIHtcbiAgdmFyIHJldDtcbiAgdmFyIHN0YXRlO1xuXG4gIGlmICghc3RybSkgeyByZXR1cm4gWl9TVFJFQU1fRVJST1I7IH1cbiAgLy9zdHJtLm1zZyA9IFpfTlVMTDsgICAgICAgICAgICAgICAgIC8qIGluIGNhc2Ugd2UgcmV0dXJuIGFuIGVycm9yICovXG5cbiAgc3RhdGUgPSBuZXcgSW5mbGF0ZVN0YXRlKCk7XG5cbiAgLy9pZiAoc3RhdGUgPT09IFpfTlVMTCkgcmV0dXJuIFpfTUVNX0VSUk9SO1xuICAvL1RyYWNldigoc3RkZXJyLCBcImluZmxhdGU6IGFsbG9jYXRlZFxcblwiKSk7XG4gIHN0cm0uc3RhdGUgPSBzdGF0ZTtcbiAgc3RhdGUud2luZG93ID0gbnVsbC8qWl9OVUxMKi87XG4gIHJldCA9IGluZmxhdGVSZXNldDIoc3RybSwgd2luZG93Qml0cyk7XG4gIGlmIChyZXQgIT09IFpfT0spIHtcbiAgICBzdHJtLnN0YXRlID0gbnVsbC8qWl9OVUxMKi87XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gaW5mbGF0ZUluaXQoc3RybSkge1xuICByZXR1cm4gaW5mbGF0ZUluaXQyKHN0cm0sIERFRl9XQklUUyk7XG59XG5cblxuLypcbiBSZXR1cm4gc3RhdGUgd2l0aCBsZW5ndGggYW5kIGRpc3RhbmNlIGRlY29kaW5nIHRhYmxlcyBhbmQgaW5kZXggc2l6ZXMgc2V0IHRvXG4gZml4ZWQgY29kZSBkZWNvZGluZy4gIE5vcm1hbGx5IHRoaXMgcmV0dXJucyBmaXhlZCB0YWJsZXMgZnJvbSBpbmZmaXhlZC5oLlxuIElmIEJVSUxERklYRUQgaXMgZGVmaW5lZCwgdGhlbiBpbnN0ZWFkIHRoaXMgcm91dGluZSBidWlsZHMgdGhlIHRhYmxlcyB0aGVcbiBmaXJzdCB0aW1lIGl0J3MgY2FsbGVkLCBhbmQgcmV0dXJucyB0aG9zZSB0YWJsZXMgdGhlIGZpcnN0IHRpbWUgYW5kXG4gdGhlcmVhZnRlci4gIFRoaXMgcmVkdWNlcyB0aGUgc2l6ZSBvZiB0aGUgY29kZSBieSBhYm91dCAySyBieXRlcywgaW5cbiBleGNoYW5nZSBmb3IgYSBsaXR0bGUgZXhlY3V0aW9uIHRpbWUuICBIb3dldmVyLCBCVUlMREZJWEVEIHNob3VsZCBub3QgYmVcbiB1c2VkIGZvciB0aHJlYWRlZCBhcHBsaWNhdGlvbnMsIHNpbmNlIHRoZSByZXdyaXRpbmcgb2YgdGhlIHRhYmxlcyBhbmQgdmlyZ2luXG4gbWF5IG5vdCBiZSB0aHJlYWQtc2FmZS5cbiAqL1xudmFyIHZpcmdpbiA9IHRydWU7XG5cbnZhciBsZW5maXgsIGRpc3RmaXg7IC8vIFdlIGhhdmUgbm8gcG9pbnRlcnMgaW4gSlMsIHNvIGtlZXAgdGFibGVzIHNlcGFyYXRlXG5cbmZ1bmN0aW9uIGZpeGVkdGFibGVzKHN0YXRlKSB7XG4gIC8qIGJ1aWxkIGZpeGVkIGh1ZmZtYW4gdGFibGVzIGlmIGZpcnN0IGNhbGwgKG1heSBub3QgYmUgdGhyZWFkIHNhZmUpICovXG4gIGlmICh2aXJnaW4pIHtcbiAgICB2YXIgc3ltO1xuXG4gICAgbGVuZml4ID0gbmV3IHV0aWxzLkJ1ZjMyKDUxMik7XG4gICAgZGlzdGZpeCA9IG5ldyB1dGlscy5CdWYzMigzMik7XG5cbiAgICAvKiBsaXRlcmFsL2xlbmd0aCB0YWJsZSAqL1xuICAgIHN5bSA9IDA7XG4gICAgd2hpbGUgKHN5bSA8IDE0NCkgeyBzdGF0ZS5sZW5zW3N5bSsrXSA9IDg7IH1cbiAgICB3aGlsZSAoc3ltIDwgMjU2KSB7IHN0YXRlLmxlbnNbc3ltKytdID0gOTsgfVxuICAgIHdoaWxlIChzeW0gPCAyODApIHsgc3RhdGUubGVuc1tzeW0rK10gPSA3OyB9XG4gICAgd2hpbGUgKHN5bSA8IDI4OCkgeyBzdGF0ZS5sZW5zW3N5bSsrXSA9IDg7IH1cblxuICAgIGluZmxhdGVfdGFibGUoTEVOUywgIHN0YXRlLmxlbnMsIDAsIDI4OCwgbGVuZml4LCAgIDAsIHN0YXRlLndvcmssIHsgYml0czogOSB9KTtcblxuICAgIC8qIGRpc3RhbmNlIHRhYmxlICovXG4gICAgc3ltID0gMDtcbiAgICB3aGlsZSAoc3ltIDwgMzIpIHsgc3RhdGUubGVuc1tzeW0rK10gPSA1OyB9XG5cbiAgICBpbmZsYXRlX3RhYmxlKERJU1RTLCBzdGF0ZS5sZW5zLCAwLCAzMiwgICBkaXN0Zml4LCAwLCBzdGF0ZS53b3JrLCB7IGJpdHM6IDUgfSk7XG5cbiAgICAvKiBkbyB0aGlzIGp1c3Qgb25jZSAqL1xuICAgIHZpcmdpbiA9IGZhbHNlO1xuICB9XG5cbiAgc3RhdGUubGVuY29kZSA9IGxlbmZpeDtcbiAgc3RhdGUubGVuYml0cyA9IDk7XG4gIHN0YXRlLmRpc3Rjb2RlID0gZGlzdGZpeDtcbiAgc3RhdGUuZGlzdGJpdHMgPSA1O1xufVxuXG5cbi8qXG4gVXBkYXRlIHRoZSB3aW5kb3cgd2l0aCB0aGUgbGFzdCB3c2l6ZSAobm9ybWFsbHkgMzJLKSBieXRlcyB3cml0dGVuIGJlZm9yZVxuIHJldHVybmluZy4gIElmIHdpbmRvdyBkb2VzIG5vdCBleGlzdCB5ZXQsIGNyZWF0ZSBpdC4gIFRoaXMgaXMgb25seSBjYWxsZWRcbiB3aGVuIGEgd2luZG93IGlzIGFscmVhZHkgaW4gdXNlLCBvciB3aGVuIG91dHB1dCBoYXMgYmVlbiB3cml0dGVuIGR1cmluZyB0aGlzXG4gaW5mbGF0ZSBjYWxsLCBidXQgdGhlIGVuZCBvZiB0aGUgZGVmbGF0ZSBzdHJlYW0gaGFzIG5vdCBiZWVuIHJlYWNoZWQgeWV0LlxuIEl0IGlzIGFsc28gY2FsbGVkIHRvIGNyZWF0ZSBhIHdpbmRvdyBmb3IgZGljdGlvbmFyeSBkYXRhIHdoZW4gYSBkaWN0aW9uYXJ5XG4gaXMgbG9hZGVkLlxuXG4gUHJvdmlkaW5nIG91dHB1dCBidWZmZXJzIGxhcmdlciB0aGFuIDMySyB0byBpbmZsYXRlKCkgc2hvdWxkIHByb3ZpZGUgYSBzcGVlZFxuIGFkdmFudGFnZSwgc2luY2Ugb25seSB0aGUgbGFzdCAzMksgb2Ygb3V0cHV0IGlzIGNvcGllZCB0byB0aGUgc2xpZGluZyB3aW5kb3dcbiB1cG9uIHJldHVybiBmcm9tIGluZmxhdGUoKSwgYW5kIHNpbmNlIGFsbCBkaXN0YW5jZXMgYWZ0ZXIgdGhlIGZpcnN0IDMySyBvZlxuIG91dHB1dCB3aWxsIGZhbGwgaW4gdGhlIG91dHB1dCBkYXRhLCBtYWtpbmcgbWF0Y2ggY29waWVzIHNpbXBsZXIgYW5kIGZhc3Rlci5cbiBUaGUgYWR2YW50YWdlIG1heSBiZSBkZXBlbmRlbnQgb24gdGhlIHNpemUgb2YgdGhlIHByb2Nlc3NvcidzIGRhdGEgY2FjaGVzLlxuICovXG5mdW5jdGlvbiB1cGRhdGV3aW5kb3coc3RybSwgc3JjLCBlbmQsIGNvcHkpIHtcbiAgdmFyIGRpc3Q7XG4gIHZhciBzdGF0ZSA9IHN0cm0uc3RhdGU7XG5cbiAgLyogaWYgaXQgaGFzbid0IGJlZW4gZG9uZSBhbHJlYWR5LCBhbGxvY2F0ZSBzcGFjZSBmb3IgdGhlIHdpbmRvdyAqL1xuICBpZiAoc3RhdGUud2luZG93ID09PSBudWxsKSB7XG4gICAgc3RhdGUud3NpemUgPSAxIDw8IHN0YXRlLndiaXRzO1xuICAgIHN0YXRlLnduZXh0ID0gMDtcbiAgICBzdGF0ZS53aGF2ZSA9IDA7XG5cbiAgICBzdGF0ZS53aW5kb3cgPSBuZXcgdXRpbHMuQnVmOChzdGF0ZS53c2l6ZSk7XG4gIH1cblxuICAvKiBjb3B5IHN0YXRlLT53c2l6ZSBvciBsZXNzIG91dHB1dCBieXRlcyBpbnRvIHRoZSBjaXJjdWxhciB3aW5kb3cgKi9cbiAgaWYgKGNvcHkgPj0gc3RhdGUud3NpemUpIHtcbiAgICB1dGlscy5hcnJheVNldChzdGF0ZS53aW5kb3csIHNyYywgZW5kIC0gc3RhdGUud3NpemUsIHN0YXRlLndzaXplLCAwKTtcbiAgICBzdGF0ZS53bmV4dCA9IDA7XG4gICAgc3RhdGUud2hhdmUgPSBzdGF0ZS53c2l6ZTtcbiAgfVxuICBlbHNlIHtcbiAgICBkaXN0ID0gc3RhdGUud3NpemUgLSBzdGF0ZS53bmV4dDtcbiAgICBpZiAoZGlzdCA+IGNvcHkpIHtcbiAgICAgIGRpc3QgPSBjb3B5O1xuICAgIH1cbiAgICAvL3ptZW1jcHkoc3RhdGUtPndpbmRvdyArIHN0YXRlLT53bmV4dCwgZW5kIC0gY29weSwgZGlzdCk7XG4gICAgdXRpbHMuYXJyYXlTZXQoc3RhdGUud2luZG93LCBzcmMsIGVuZCAtIGNvcHksIGRpc3QsIHN0YXRlLnduZXh0KTtcbiAgICBjb3B5IC09IGRpc3Q7XG4gICAgaWYgKGNvcHkpIHtcbiAgICAgIC8vem1lbWNweShzdGF0ZS0+d2luZG93LCBlbmQgLSBjb3B5LCBjb3B5KTtcbiAgICAgIHV0aWxzLmFycmF5U2V0KHN0YXRlLndpbmRvdywgc3JjLCBlbmQgLSBjb3B5LCBjb3B5LCAwKTtcbiAgICAgIHN0YXRlLnduZXh0ID0gY29weTtcbiAgICAgIHN0YXRlLndoYXZlID0gc3RhdGUud3NpemU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgc3RhdGUud25leHQgKz0gZGlzdDtcbiAgICAgIGlmIChzdGF0ZS53bmV4dCA9PT0gc3RhdGUud3NpemUpIHsgc3RhdGUud25leHQgPSAwOyB9XG4gICAgICBpZiAoc3RhdGUud2hhdmUgPCBzdGF0ZS53c2l6ZSkgeyBzdGF0ZS53aGF2ZSArPSBkaXN0OyB9XG4gICAgfVxuICB9XG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBpbmZsYXRlKHN0cm0sIGZsdXNoKSB7XG4gIHZhciBzdGF0ZTtcbiAgdmFyIGlucHV0LCBvdXRwdXQ7ICAgICAgICAgIC8vIGlucHV0L291dHB1dCBidWZmZXJzXG4gIHZhciBuZXh0OyAgICAgICAgICAgICAgICAgICAvKiBuZXh0IGlucHV0IElOREVYICovXG4gIHZhciBwdXQ7ICAgICAgICAgICAgICAgICAgICAvKiBuZXh0IG91dHB1dCBJTkRFWCAqL1xuICB2YXIgaGF2ZSwgbGVmdDsgICAgICAgICAgICAgLyogYXZhaWxhYmxlIGlucHV0IGFuZCBvdXRwdXQgKi9cbiAgdmFyIGhvbGQ7ICAgICAgICAgICAgICAgICAgIC8qIGJpdCBidWZmZXIgKi9cbiAgdmFyIGJpdHM7ICAgICAgICAgICAgICAgICAgIC8qIGJpdHMgaW4gYml0IGJ1ZmZlciAqL1xuICB2YXIgX2luLCBfb3V0OyAgICAgICAgICAgICAgLyogc2F2ZSBzdGFydGluZyBhdmFpbGFibGUgaW5wdXQgYW5kIG91dHB1dCAqL1xuICB2YXIgY29weTsgICAgICAgICAgICAgICAgICAgLyogbnVtYmVyIG9mIHN0b3JlZCBvciBtYXRjaCBieXRlcyB0byBjb3B5ICovXG4gIHZhciBmcm9tOyAgICAgICAgICAgICAgICAgICAvKiB3aGVyZSB0byBjb3B5IG1hdGNoIGJ5dGVzIGZyb20gKi9cbiAgdmFyIGZyb21fc291cmNlO1xuICB2YXIgaGVyZSA9IDA7ICAgICAgICAgICAgICAgLyogY3VycmVudCBkZWNvZGluZyB0YWJsZSBlbnRyeSAqL1xuICB2YXIgaGVyZV9iaXRzLCBoZXJlX29wLCBoZXJlX3ZhbDsgLy8gcGFrZWQgXCJoZXJlXCIgZGVub3JtYWxpemVkIChKUyBzcGVjaWZpYylcbiAgLy92YXIgbGFzdDsgICAgICAgICAgICAgICAgICAgLyogcGFyZW50IHRhYmxlIGVudHJ5ICovXG4gIHZhciBsYXN0X2JpdHMsIGxhc3Rfb3AsIGxhc3RfdmFsOyAvLyBwYWtlZCBcImxhc3RcIiBkZW5vcm1hbGl6ZWQgKEpTIHNwZWNpZmljKVxuICB2YXIgbGVuOyAgICAgICAgICAgICAgICAgICAgLyogbGVuZ3RoIHRvIGNvcHkgZm9yIHJlcGVhdHMsIGJpdHMgdG8gZHJvcCAqL1xuICB2YXIgcmV0OyAgICAgICAgICAgICAgICAgICAgLyogcmV0dXJuIGNvZGUgKi9cbiAgdmFyIGhidWYgPSBuZXcgdXRpbHMuQnVmOCg0KTsgICAgLyogYnVmZmVyIGZvciBnemlwIGhlYWRlciBjcmMgY2FsY3VsYXRpb24gKi9cbiAgdmFyIG9wdHM7XG5cbiAgdmFyIG47IC8vIHRlbXBvcmFyeSB2YXIgZm9yIE5FRURfQklUU1xuXG4gIHZhciBvcmRlciA9IC8qIHBlcm11dGF0aW9uIG9mIGNvZGUgbGVuZ3RocyAqL1xuICAgIFsgMTYsIDE3LCAxOCwgMCwgOCwgNywgOSwgNiwgMTAsIDUsIDExLCA0LCAxMiwgMywgMTMsIDIsIDE0LCAxLCAxNSBdO1xuXG5cbiAgaWYgKCFzdHJtIHx8ICFzdHJtLnN0YXRlIHx8ICFzdHJtLm91dHB1dCB8fFxuICAgICAgKCFzdHJtLmlucHV0ICYmIHN0cm0uYXZhaWxfaW4gIT09IDApKSB7XG4gICAgcmV0dXJuIFpfU1RSRUFNX0VSUk9SO1xuICB9XG5cbiAgc3RhdGUgPSBzdHJtLnN0YXRlO1xuICBpZiAoc3RhdGUubW9kZSA9PT0gVFlQRSkgeyBzdGF0ZS5tb2RlID0gVFlQRURPOyB9ICAgIC8qIHNraXAgY2hlY2sgKi9cblxuXG4gIC8vLS0tIExPQUQoKSAtLS1cbiAgcHV0ID0gc3RybS5uZXh0X291dDtcbiAgb3V0cHV0ID0gc3RybS5vdXRwdXQ7XG4gIGxlZnQgPSBzdHJtLmF2YWlsX291dDtcbiAgbmV4dCA9IHN0cm0ubmV4dF9pbjtcbiAgaW5wdXQgPSBzdHJtLmlucHV0O1xuICBoYXZlID0gc3RybS5hdmFpbF9pbjtcbiAgaG9sZCA9IHN0YXRlLmhvbGQ7XG4gIGJpdHMgPSBzdGF0ZS5iaXRzO1xuICAvLy0tLVxuXG4gIF9pbiA9IGhhdmU7XG4gIF9vdXQgPSBsZWZ0O1xuICByZXQgPSBaX09LO1xuXG4gIGluZl9sZWF2ZTogLy8gZ290byBlbXVsYXRpb25cbiAgZm9yICg7Oykge1xuICAgIHN3aXRjaCAoc3RhdGUubW9kZSkge1xuICAgICAgY2FzZSBIRUFEOlxuICAgICAgICBpZiAoc3RhdGUud3JhcCA9PT0gMCkge1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBUWVBFRE87XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0gTkVFREJJVFMoMTYpO1xuICAgICAgICB3aGlsZSAoYml0cyA8IDE2KSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIGlmICgoc3RhdGUud3JhcCAmIDIpICYmIGhvbGQgPT09IDB4OGIxZikgeyAgLyogZ3ppcCBoZWFkZXIgKi9cbiAgICAgICAgICBzdGF0ZS5jaGVjayA9IDAvKmNyYzMyKDBMLCBaX05VTEwsIDApKi87XG4gICAgICAgICAgLy89PT0gQ1JDMihzdGF0ZS5jaGVjaywgaG9sZCk7XG4gICAgICAgICAgaGJ1ZlswXSA9IGhvbGQgJiAweGZmO1xuICAgICAgICAgIGhidWZbMV0gPSAoaG9sZCA+Pj4gOCkgJiAweGZmO1xuICAgICAgICAgIHN0YXRlLmNoZWNrID0gY3JjMzIoc3RhdGUuY2hlY2ssIGhidWYsIDIsIDApO1xuICAgICAgICAgIC8vPT09Ly9cblxuICAgICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBGTEFHUztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5mbGFncyA9IDA7ICAgICAgICAgICAvKiBleHBlY3QgemxpYiBoZWFkZXIgKi9cbiAgICAgICAgaWYgKHN0YXRlLmhlYWQpIHtcbiAgICAgICAgICBzdGF0ZS5oZWFkLmRvbmUgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIShzdGF0ZS53cmFwICYgMSkgfHwgICAvKiBjaGVjayBpZiB6bGliIGhlYWRlciBhbGxvd2VkICovXG4gICAgICAgICAgKCgoaG9sZCAmIDB4ZmYpLypCSVRTKDgpKi8gPDwgOCkgKyAoaG9sZCA+PiA4KSkgJSAzMSkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2luY29ycmVjdCBoZWFkZXIgY2hlY2snO1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChob2xkICYgMHgwZikvKkJJVFMoNCkqLyAhPT0gWl9ERUZMQVRFRCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ3Vua25vd24gY29tcHJlc3Npb24gbWV0aG9kJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vLS0tIERST1BCSVRTKDQpIC0tLS8vXG4gICAgICAgIGhvbGQgPj4+PSA0O1xuICAgICAgICBiaXRzIC09IDQ7XG4gICAgICAgIC8vLS0tLy9cbiAgICAgICAgbGVuID0gKGhvbGQgJiAweDBmKS8qQklUUyg0KSovICsgODtcbiAgICAgICAgaWYgKHN0YXRlLndiaXRzID09PSAwKSB7XG4gICAgICAgICAgc3RhdGUud2JpdHMgPSBsZW47XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobGVuID4gc3RhdGUud2JpdHMpIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIHdpbmRvdyBzaXplJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRtYXggPSAxIDw8IGxlbjtcbiAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgIHpsaWIgaGVhZGVyIG9rXFxuXCIpKTtcbiAgICAgICAgc3RybS5hZGxlciA9IHN0YXRlLmNoZWNrID0gMS8qYWRsZXIzMigwTCwgWl9OVUxMLCAwKSovO1xuICAgICAgICBzdGF0ZS5tb2RlID0gaG9sZCAmIDB4MjAwID8gRElDVElEIDogVFlQRTtcbiAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAvLz09PS8vXG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBGTEFHUzpcbiAgICAgICAgLy89PT0gTkVFREJJVFMoMTYpOyAqL1xuICAgICAgICB3aGlsZSAoYml0cyA8IDE2KSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0YXRlLmZsYWdzID0gaG9sZDtcbiAgICAgICAgaWYgKChzdGF0ZS5mbGFncyAmIDB4ZmYpICE9PSBaX0RFRkxBVEVEKSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAndW5rbm93biBjb21wcmVzc2lvbiBtZXRob2QnO1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHhlMDAwKSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAndW5rbm93biBoZWFkZXIgZmxhZ3Mgc2V0JztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZS5oZWFkKSB7XG4gICAgICAgICAgc3RhdGUuaGVhZC50ZXh0ID0gKChob2xkID4+IDgpICYgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgwMjAwKSB7XG4gICAgICAgICAgLy89PT0gQ1JDMihzdGF0ZS5jaGVjaywgaG9sZCk7XG4gICAgICAgICAgaGJ1ZlswXSA9IGhvbGQgJiAweGZmO1xuICAgICAgICAgIGhidWZbMV0gPSAoaG9sZCA+Pj4gOCkgJiAweGZmO1xuICAgICAgICAgIHN0YXRlLmNoZWNrID0gY3JjMzIoc3RhdGUuY2hlY2ssIGhidWYsIDIsIDApO1xuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgfVxuICAgICAgICAvLz09PSBJTklUQklUUygpO1xuICAgICAgICBob2xkID0gMDtcbiAgICAgICAgYml0cyA9IDA7XG4gICAgICAgIC8vPT09Ly9cbiAgICAgICAgc3RhdGUubW9kZSA9IFRJTUU7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgVElNRTpcbiAgICAgICAgLy89PT0gTkVFREJJVFMoMzIpOyAqL1xuICAgICAgICB3aGlsZSAoYml0cyA8IDMyKSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIGlmIChzdGF0ZS5oZWFkKSB7XG4gICAgICAgICAgc3RhdGUuaGVhZC50aW1lID0gaG9sZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDAyMDApIHtcbiAgICAgICAgICAvLz09PSBDUkM0KHN0YXRlLmNoZWNrLCBob2xkKVxuICAgICAgICAgIGhidWZbMF0gPSBob2xkICYgMHhmZjtcbiAgICAgICAgICBoYnVmWzFdID0gKGhvbGQgPj4+IDgpICYgMHhmZjtcbiAgICAgICAgICBoYnVmWzJdID0gKGhvbGQgPj4+IDE2KSAmIDB4ZmY7XG4gICAgICAgICAgaGJ1ZlszXSA9IChob2xkID4+PiAyNCkgJiAweGZmO1xuICAgICAgICAgIHN0YXRlLmNoZWNrID0gY3JjMzIoc3RhdGUuY2hlY2ssIGhidWYsIDQsIDApO1xuICAgICAgICAgIC8vPT09XG4gICAgICAgIH1cbiAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0YXRlLm1vZGUgPSBPUztcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBPUzpcbiAgICAgICAgLy89PT0gTkVFREJJVFMoMTYpOyAqL1xuICAgICAgICB3aGlsZSAoYml0cyA8IDE2KSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIGlmIChzdGF0ZS5oZWFkKSB7XG4gICAgICAgICAgc3RhdGUuaGVhZC54ZmxhZ3MgPSAoaG9sZCAmIDB4ZmYpO1xuICAgICAgICAgIHN0YXRlLmhlYWQub3MgPSAoaG9sZCA+PiA4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDAyMDApIHtcbiAgICAgICAgICAvLz09PSBDUkMyKHN0YXRlLmNoZWNrLCBob2xkKTtcbiAgICAgICAgICBoYnVmWzBdID0gaG9sZCAmIDB4ZmY7XG4gICAgICAgICAgaGJ1ZlsxXSA9IChob2xkID4+PiA4KSAmIDB4ZmY7XG4gICAgICAgICAgc3RhdGUuY2hlY2sgPSBjcmMzMihzdGF0ZS5jaGVjaywgaGJ1ZiwgMiwgMCk7XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICB9XG4gICAgICAgIC8vPT09IElOSVRCSVRTKCk7XG4gICAgICAgIGhvbGQgPSAwO1xuICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgLy89PT0vL1xuICAgICAgICBzdGF0ZS5tb2RlID0gRVhMRU47XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgRVhMRU46XG4gICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4MDQwMCkge1xuICAgICAgICAgIC8vPT09IE5FRURCSVRTKDE2KTsgKi9cbiAgICAgICAgICB3aGlsZSAoYml0cyA8IDE2KSB7XG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgc3RhdGUubGVuZ3RoID0gaG9sZDtcbiAgICAgICAgICBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgICAgc3RhdGUuaGVhZC5leHRyYV9sZW4gPSBob2xkO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDAyMDApIHtcbiAgICAgICAgICAgIC8vPT09IENSQzIoc3RhdGUuY2hlY2ssIGhvbGQpO1xuICAgICAgICAgICAgaGJ1ZlswXSA9IGhvbGQgJiAweGZmO1xuICAgICAgICAgICAgaGJ1ZlsxXSA9IChob2xkID4+PiA4KSAmIDB4ZmY7XG4gICAgICAgICAgICBzdGF0ZS5jaGVjayA9IGNyYzMyKHN0YXRlLmNoZWNrLCBoYnVmLCAyLCAwKTtcbiAgICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgICBob2xkID0gMDtcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgIHN0YXRlLmhlYWQuZXh0cmEgPSBudWxsLypaX05VTEwqLztcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5tb2RlID0gRVhUUkE7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgRVhUUkE6XG4gICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4MDQwMCkge1xuICAgICAgICAgIGNvcHkgPSBzdGF0ZS5sZW5ndGg7XG4gICAgICAgICAgaWYgKGNvcHkgPiBoYXZlKSB7IGNvcHkgPSBoYXZlOyB9XG4gICAgICAgICAgaWYgKGNvcHkpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5oZWFkKSB7XG4gICAgICAgICAgICAgIGxlbiA9IHN0YXRlLmhlYWQuZXh0cmFfbGVuIC0gc3RhdGUubGVuZ3RoO1xuICAgICAgICAgICAgICBpZiAoIXN0YXRlLmhlYWQuZXh0cmEpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdW50eXBlZCBhcnJheSBmb3IgbW9yZSBjb252ZW5pZW50IHByb2Nlc3NpbmcgbGF0ZXJcbiAgICAgICAgICAgICAgICBzdGF0ZS5oZWFkLmV4dHJhID0gbmV3IEFycmF5KHN0YXRlLmhlYWQuZXh0cmFfbGVuKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB1dGlscy5hcnJheVNldChcbiAgICAgICAgICAgICAgICBzdGF0ZS5oZWFkLmV4dHJhLFxuICAgICAgICAgICAgICAgIGlucHV0LFxuICAgICAgICAgICAgICAgIG5leHQsXG4gICAgICAgICAgICAgICAgLy8gZXh0cmEgZmllbGQgaXMgbGltaXRlZCB0byA2NTUzNiBieXRlc1xuICAgICAgICAgICAgICAgIC8vIC0gbm8gbmVlZCBmb3IgYWRkaXRpb25hbCBzaXplIGNoZWNrXG4gICAgICAgICAgICAgICAgY29weSxcbiAgICAgICAgICAgICAgICAvKmxlbiArIGNvcHkgPiBzdGF0ZS5oZWFkLmV4dHJhX21heCAtIGxlbiA/IHN0YXRlLmhlYWQuZXh0cmFfbWF4IDogY29weSwqL1xuICAgICAgICAgICAgICAgIGxlblxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAvL3ptZW1jcHkoc3RhdGUuaGVhZC5leHRyYSArIGxlbiwgbmV4dCxcbiAgICAgICAgICAgICAgLy8gICAgICAgIGxlbiArIGNvcHkgPiBzdGF0ZS5oZWFkLmV4dHJhX21heCA/XG4gICAgICAgICAgICAgIC8vICAgICAgICBzdGF0ZS5oZWFkLmV4dHJhX21heCAtIGxlbiA6IGNvcHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgwMjAwKSB7XG4gICAgICAgICAgICAgIHN0YXRlLmNoZWNrID0gY3JjMzIoc3RhdGUuY2hlY2ssIGlucHV0LCBjb3B5LCBuZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhhdmUgLT0gY29weTtcbiAgICAgICAgICAgIG5leHQgKz0gY29weTtcbiAgICAgICAgICAgIHN0YXRlLmxlbmd0aCAtPSBjb3B5O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoc3RhdGUubGVuZ3RoKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmxlbmd0aCA9IDA7XG4gICAgICAgIHN0YXRlLm1vZGUgPSBOQU1FO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIE5BTUU6XG4gICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4MDgwMCkge1xuICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIGNvcHkgPSAwO1xuICAgICAgICAgIGRvIHtcbiAgICAgICAgICAgIC8vIFRPRE86IDIgb3IgMSBieXRlcz9cbiAgICAgICAgICAgIGxlbiA9IGlucHV0W25leHQgKyBjb3B5KytdO1xuICAgICAgICAgICAgLyogdXNlIGNvbnN0YW50IGxpbWl0IGJlY2F1c2UgaW4ganMgd2Ugc2hvdWxkIG5vdCBwcmVhbGxvY2F0ZSBtZW1vcnkgKi9cbiAgICAgICAgICAgIGlmIChzdGF0ZS5oZWFkICYmIGxlbiAmJlxuICAgICAgICAgICAgICAgIChzdGF0ZS5sZW5ndGggPCA2NTUzNiAvKnN0YXRlLmhlYWQubmFtZV9tYXgqLykpIHtcbiAgICAgICAgICAgICAgc3RhdGUuaGVhZC5uYW1lICs9IFN0cmluZy5mcm9tQ2hhckNvZGUobGVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IHdoaWxlIChsZW4gJiYgY29weSA8IGhhdmUpO1xuXG4gICAgICAgICAgaWYgKHN0YXRlLmZsYWdzICYgMHgwMjAwKSB7XG4gICAgICAgICAgICBzdGF0ZS5jaGVjayA9IGNyYzMyKHN0YXRlLmNoZWNrLCBpbnB1dCwgY29weSwgbmV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGhhdmUgLT0gY29weTtcbiAgICAgICAgICBuZXh0ICs9IGNvcHk7XG4gICAgICAgICAgaWYgKGxlbikgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzdGF0ZS5oZWFkKSB7XG4gICAgICAgICAgc3RhdGUuaGVhZC5uYW1lID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5sZW5ndGggPSAwO1xuICAgICAgICBzdGF0ZS5tb2RlID0gQ09NTUVOVDtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBDT01NRU5UOlxuICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDEwMDApIHtcbiAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICBjb3B5ID0gMDtcbiAgICAgICAgICBkbyB7XG4gICAgICAgICAgICBsZW4gPSBpbnB1dFtuZXh0ICsgY29weSsrXTtcbiAgICAgICAgICAgIC8qIHVzZSBjb25zdGFudCBsaW1pdCBiZWNhdXNlIGluIGpzIHdlIHNob3VsZCBub3QgcHJlYWxsb2NhdGUgbWVtb3J5ICovXG4gICAgICAgICAgICBpZiAoc3RhdGUuaGVhZCAmJiBsZW4gJiZcbiAgICAgICAgICAgICAgICAoc3RhdGUubGVuZ3RoIDwgNjU1MzYgLypzdGF0ZS5oZWFkLmNvbW1fbWF4Ki8pKSB7XG4gICAgICAgICAgICAgIHN0YXRlLmhlYWQuY29tbWVudCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGxlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSB3aGlsZSAobGVuICYmIGNvcHkgPCBoYXZlKTtcbiAgICAgICAgICBpZiAoc3RhdGUuZmxhZ3MgJiAweDAyMDApIHtcbiAgICAgICAgICAgIHN0YXRlLmNoZWNrID0gY3JjMzIoc3RhdGUuY2hlY2ssIGlucHV0LCBjb3B5LCBuZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaGF2ZSAtPSBjb3B5O1xuICAgICAgICAgIG5leHQgKz0gY29weTtcbiAgICAgICAgICBpZiAobGVuKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHN0YXRlLmhlYWQpIHtcbiAgICAgICAgICBzdGF0ZS5oZWFkLmNvbW1lbnQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLm1vZGUgPSBIQ1JDO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIEhDUkM6XG4gICAgICAgIGlmIChzdGF0ZS5mbGFncyAmIDB4MDIwMCkge1xuICAgICAgICAgIC8vPT09IE5FRURCSVRTKDE2KTsgKi9cbiAgICAgICAgICB3aGlsZSAoYml0cyA8IDE2KSB7XG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgaWYgKGhvbGQgIT09IChzdGF0ZS5jaGVjayAmIDB4ZmZmZikpIHtcbiAgICAgICAgICAgIHN0cm0ubXNnID0gJ2hlYWRlciBjcmMgbWlzbWF0Y2gnO1xuICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PSBJTklUQklUUygpO1xuICAgICAgICAgIGhvbGQgPSAwO1xuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUuaGVhZCkge1xuICAgICAgICAgIHN0YXRlLmhlYWQuaGNyYyA9ICgoc3RhdGUuZmxhZ3MgPj4gOSkgJiAxKTtcbiAgICAgICAgICBzdGF0ZS5oZWFkLmRvbmUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHN0cm0uYWRsZXIgPSBzdGF0ZS5jaGVjayA9IDA7XG4gICAgICAgIHN0YXRlLm1vZGUgPSBUWVBFO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgRElDVElEOlxuICAgICAgICAvLz09PSBORUVEQklUUygzMik7ICovXG4gICAgICAgIHdoaWxlIChiaXRzIDwgMzIpIHtcbiAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICB9XG4gICAgICAgIC8vPT09Ly9cbiAgICAgICAgc3RybS5hZGxlciA9IHN0YXRlLmNoZWNrID0genN3YXAzMihob2xkKTtcbiAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0YXRlLm1vZGUgPSBESUNUO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIERJQ1Q6XG4gICAgICAgIGlmIChzdGF0ZS5oYXZlZGljdCA9PT0gMCkge1xuICAgICAgICAgIC8vLS0tIFJFU1RPUkUoKSAtLS1cbiAgICAgICAgICBzdHJtLm5leHRfb3V0ID0gcHV0O1xuICAgICAgICAgIHN0cm0uYXZhaWxfb3V0ID0gbGVmdDtcbiAgICAgICAgICBzdHJtLm5leHRfaW4gPSBuZXh0O1xuICAgICAgICAgIHN0cm0uYXZhaWxfaW4gPSBoYXZlO1xuICAgICAgICAgIHN0YXRlLmhvbGQgPSBob2xkO1xuICAgICAgICAgIHN0YXRlLmJpdHMgPSBiaXRzO1xuICAgICAgICAgIC8vLS0tXG4gICAgICAgICAgcmV0dXJuIFpfTkVFRF9ESUNUO1xuICAgICAgICB9XG4gICAgICAgIHN0cm0uYWRsZXIgPSBzdGF0ZS5jaGVjayA9IDEvKmFkbGVyMzIoMEwsIFpfTlVMTCwgMCkqLztcbiAgICAgICAgc3RhdGUubW9kZSA9IFRZUEU7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgVFlQRTpcbiAgICAgICAgaWYgKGZsdXNoID09PSBaX0JMT0NLIHx8IGZsdXNoID09PSBaX1RSRUVTKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIFRZUEVETzpcbiAgICAgICAgaWYgKHN0YXRlLmxhc3QpIHtcbiAgICAgICAgICAvLy0tLSBCWVRFQklUUygpIC0tLS8vXG4gICAgICAgICAgaG9sZCA+Pj49IGJpdHMgJiA3O1xuICAgICAgICAgIGJpdHMgLT0gYml0cyAmIDc7XG4gICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBDSEVDSztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLz09PSBORUVEQklUUygzKTsgKi9cbiAgICAgICAgd2hpbGUgKGJpdHMgPCAzKSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0YXRlLmxhc3QgPSAoaG9sZCAmIDB4MDEpLypCSVRTKDEpKi87XG4gICAgICAgIC8vLS0tIERST1BCSVRTKDEpIC0tLS8vXG4gICAgICAgIGhvbGQgPj4+PSAxO1xuICAgICAgICBiaXRzIC09IDE7XG4gICAgICAgIC8vLS0tLy9cblxuICAgICAgICBzd2l0Y2ggKChob2xkICYgMHgwMykvKkJJVFMoMikqLykge1xuICAgICAgICAgIGNhc2UgMDogICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIHN0b3JlZCBibG9jayAqL1xuICAgICAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgc3RvcmVkIGJsb2NrJXNcXG5cIixcbiAgICAgICAgICAgIC8vICAgICAgICBzdGF0ZS5sYXN0ID8gXCIgKGxhc3QpXCIgOiBcIlwiKSk7XG4gICAgICAgICAgICBzdGF0ZS5tb2RlID0gU1RPUkVEO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAxOiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyogZml4ZWQgYmxvY2sgKi9cbiAgICAgICAgICAgIGZpeGVkdGFibGVzKHN0YXRlKTtcbiAgICAgICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgIGZpeGVkIGNvZGVzIGJsb2NrJXNcXG5cIixcbiAgICAgICAgICAgIC8vICAgICAgICBzdGF0ZS5sYXN0ID8gXCIgKGxhc3QpXCIgOiBcIlwiKSk7XG4gICAgICAgICAgICBzdGF0ZS5tb2RlID0gTEVOXzsgICAgICAgICAgICAgLyogZGVjb2RlIGNvZGVzICovXG4gICAgICAgICAgICBpZiAoZmx1c2ggPT09IFpfVFJFRVMpIHtcbiAgICAgICAgICAgICAgLy8tLS0gRFJPUEJJVFMoMikgLS0tLy9cbiAgICAgICAgICAgICAgaG9sZCA+Pj49IDI7XG4gICAgICAgICAgICAgIGJpdHMgLT0gMjtcbiAgICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgICAgICBicmVhayBpbmZfbGVhdmU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIDI6ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBkeW5hbWljIGJsb2NrICovXG4gICAgICAgICAgICAvL1RyYWNldigoc3RkZXJyLCBcImluZmxhdGU6ICAgICBkeW5hbWljIGNvZGVzIGJsb2NrJXNcXG5cIixcbiAgICAgICAgICAgIC8vICAgICAgICBzdGF0ZS5sYXN0ID8gXCIgKGxhc3QpXCIgOiBcIlwiKSk7XG4gICAgICAgICAgICBzdGF0ZS5tb2RlID0gVEFCTEU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGJsb2NrIHR5cGUnO1xuICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgfVxuICAgICAgICAvLy0tLSBEUk9QQklUUygyKSAtLS0vL1xuICAgICAgICBob2xkID4+Pj0gMjtcbiAgICAgICAgYml0cyAtPSAyO1xuICAgICAgICAvLy0tLS8vXG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBTVE9SRUQ6XG4gICAgICAgIC8vLS0tIEJZVEVCSVRTKCkgLS0tLy8gLyogZ28gdG8gYnl0ZSBib3VuZGFyeSAqL1xuICAgICAgICBob2xkID4+Pj0gYml0cyAmIDc7XG4gICAgICAgIGJpdHMgLT0gYml0cyAmIDc7XG4gICAgICAgIC8vLS0tLy9cbiAgICAgICAgLy89PT0gTkVFREJJVFMoMzIpOyAqL1xuICAgICAgICB3aGlsZSAoYml0cyA8IDMyKSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIGlmICgoaG9sZCAmIDB4ZmZmZikgIT09ICgoaG9sZCA+Pj4gMTYpIF4gMHhmZmZmKSkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgc3RvcmVkIGJsb2NrIGxlbmd0aHMnO1xuICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUubGVuZ3RoID0gaG9sZCAmIDB4ZmZmZjtcbiAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgICBzdG9yZWQgbGVuZ3RoICV1XFxuXCIsXG4gICAgICAgIC8vICAgICAgICBzdGF0ZS5sZW5ndGgpKTtcbiAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgaG9sZCA9IDA7XG4gICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0YXRlLm1vZGUgPSBDT1BZXztcbiAgICAgICAgaWYgKGZsdXNoID09PSBaX1RSRUVTKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIENPUFlfOlxuICAgICAgICBzdGF0ZS5tb2RlID0gQ09QWTtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBDT1BZOlxuICAgICAgICBjb3B5ID0gc3RhdGUubGVuZ3RoO1xuICAgICAgICBpZiAoY29weSkge1xuICAgICAgICAgIGlmIChjb3B5ID4gaGF2ZSkgeyBjb3B5ID0gaGF2ZTsgfVxuICAgICAgICAgIGlmIChjb3B5ID4gbGVmdCkgeyBjb3B5ID0gbGVmdDsgfVxuICAgICAgICAgIGlmIChjb3B5ID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgIC8vLS0tIHptZW1jcHkocHV0LCBuZXh0LCBjb3B5KTsgLS0tXG4gICAgICAgICAgdXRpbHMuYXJyYXlTZXQob3V0cHV0LCBpbnB1dCwgbmV4dCwgY29weSwgcHV0KTtcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgaGF2ZSAtPSBjb3B5O1xuICAgICAgICAgIG5leHQgKz0gY29weTtcbiAgICAgICAgICBsZWZ0IC09IGNvcHk7XG4gICAgICAgICAgcHV0ICs9IGNvcHk7XG4gICAgICAgICAgc3RhdGUubGVuZ3RoIC09IGNvcHk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgICBzdG9yZWQgZW5kXFxuXCIpKTtcbiAgICAgICAgc3RhdGUubW9kZSA9IFRZUEU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUQUJMRTpcbiAgICAgICAgLy89PT0gTkVFREJJVFMoMTQpOyAqL1xuICAgICAgICB3aGlsZSAoYml0cyA8IDE0KSB7XG4gICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgfVxuICAgICAgICAvLz09PS8vXG4gICAgICAgIHN0YXRlLm5sZW4gPSAoaG9sZCAmIDB4MWYpLypCSVRTKDUpKi8gKyAyNTc7XG4gICAgICAgIC8vLS0tIERST1BCSVRTKDUpIC0tLS8vXG4gICAgICAgIGhvbGQgPj4+PSA1O1xuICAgICAgICBiaXRzIC09IDU7XG4gICAgICAgIC8vLS0tLy9cbiAgICAgICAgc3RhdGUubmRpc3QgPSAoaG9sZCAmIDB4MWYpLypCSVRTKDUpKi8gKyAxO1xuICAgICAgICAvLy0tLSBEUk9QQklUUyg1KSAtLS0vL1xuICAgICAgICBob2xkID4+Pj0gNTtcbiAgICAgICAgYml0cyAtPSA1O1xuICAgICAgICAvLy0tLS8vXG4gICAgICAgIHN0YXRlLm5jb2RlID0gKGhvbGQgJiAweDBmKS8qQklUUyg0KSovICsgNDtcbiAgICAgICAgLy8tLS0gRFJPUEJJVFMoNCkgLS0tLy9cbiAgICAgICAgaG9sZCA+Pj49IDQ7XG4gICAgICAgIGJpdHMgLT0gNDtcbiAgICAgICAgLy8tLS0vL1xuLy8jaWZuZGVmIFBLWklQX0JVR19XT1JLQVJPVU5EXG4gICAgICAgIGlmIChzdGF0ZS5ubGVuID4gMjg2IHx8IHN0YXRlLm5kaXN0ID4gMzApIHtcbiAgICAgICAgICBzdHJtLm1zZyA9ICd0b28gbWFueSBsZW5ndGggb3IgZGlzdGFuY2Ugc3ltYm9scyc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuLy8jZW5kaWZcbiAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgICB0YWJsZSBzaXplcyBva1xcblwiKSk7XG4gICAgICAgIHN0YXRlLmhhdmUgPSAwO1xuICAgICAgICBzdGF0ZS5tb2RlID0gTEVOTEVOUztcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBMRU5MRU5TOlxuICAgICAgICB3aGlsZSAoc3RhdGUuaGF2ZSA8IHN0YXRlLm5jb2RlKSB7XG4gICAgICAgICAgLy89PT0gTkVFREJJVFMoMyk7XG4gICAgICAgICAgd2hpbGUgKGJpdHMgPCAzKSB7XG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgc3RhdGUubGVuc1tvcmRlcltzdGF0ZS5oYXZlKytdXSA9IChob2xkICYgMHgwNyk7Ly9CSVRTKDMpO1xuICAgICAgICAgIC8vLS0tIERST1BCSVRTKDMpIC0tLS8vXG4gICAgICAgICAgaG9sZCA+Pj49IDM7XG4gICAgICAgICAgYml0cyAtPSAzO1xuICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoc3RhdGUuaGF2ZSA8IDE5KSB7XG4gICAgICAgICAgc3RhdGUubGVuc1tvcmRlcltzdGF0ZS5oYXZlKytdXSA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gV2UgaGF2ZSBzZXBhcmF0ZSB0YWJsZXMgJiBubyBwb2ludGVycy4gMiBjb21tZW50ZWQgbGluZXMgYmVsb3cgbm90IG5lZWRlZC5cbiAgICAgICAgLy9zdGF0ZS5uZXh0ID0gc3RhdGUuY29kZXM7XG4gICAgICAgIC8vc3RhdGUubGVuY29kZSA9IHN0YXRlLm5leHQ7XG4gICAgICAgIC8vIFN3aXRjaCB0byB1c2UgZHluYW1pYyB0YWJsZVxuICAgICAgICBzdGF0ZS5sZW5jb2RlID0gc3RhdGUubGVuZHluO1xuICAgICAgICBzdGF0ZS5sZW5iaXRzID0gNztcblxuICAgICAgICBvcHRzID0geyBiaXRzOiBzdGF0ZS5sZW5iaXRzIH07XG4gICAgICAgIHJldCA9IGluZmxhdGVfdGFibGUoQ09ERVMsIHN0YXRlLmxlbnMsIDAsIDE5LCBzdGF0ZS5sZW5jb2RlLCAwLCBzdGF0ZS53b3JrLCBvcHRzKTtcbiAgICAgICAgc3RhdGUubGVuYml0cyA9IG9wdHMuYml0cztcblxuICAgICAgICBpZiAocmV0KSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCBjb2RlIGxlbmd0aHMgc2V0JztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIC8vVHJhY2V2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgY29kZSBsZW5ndGhzIG9rXFxuXCIpKTtcbiAgICAgICAgc3RhdGUuaGF2ZSA9IDA7XG4gICAgICAgIHN0YXRlLm1vZGUgPSBDT0RFTEVOUztcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBDT0RFTEVOUzpcbiAgICAgICAgd2hpbGUgKHN0YXRlLmhhdmUgPCBzdGF0ZS5ubGVuICsgc3RhdGUubmRpc3QpIHtcbiAgICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgICBoZXJlID0gc3RhdGUubGVuY29kZVtob2xkICYgKCgxIDw8IHN0YXRlLmxlbmJpdHMpIC0gMSldOy8qQklUUyhzdGF0ZS5sZW5iaXRzKSovXG4gICAgICAgICAgICBoZXJlX2JpdHMgPSBoZXJlID4+PiAyNDtcbiAgICAgICAgICAgIGhlcmVfb3AgPSAoaGVyZSA+Pj4gMTYpICYgMHhmZjtcbiAgICAgICAgICAgIGhlcmVfdmFsID0gaGVyZSAmIDB4ZmZmZjtcblxuICAgICAgICAgICAgaWYgKChoZXJlX2JpdHMpIDw9IGJpdHMpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIC8vLS0tIFBVTExCWVRFKCkgLS0tLy9cbiAgICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChoZXJlX3ZhbCA8IDE2KSB7XG4gICAgICAgICAgICAvLy0tLSBEUk9QQklUUyhoZXJlLmJpdHMpIC0tLS8vXG4gICAgICAgICAgICBob2xkID4+Pj0gaGVyZV9iaXRzO1xuICAgICAgICAgICAgYml0cyAtPSBoZXJlX2JpdHM7XG4gICAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgICBzdGF0ZS5sZW5zW3N0YXRlLmhhdmUrK10gPSBoZXJlX3ZhbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBpZiAoaGVyZV92YWwgPT09IDE2KSB7XG4gICAgICAgICAgICAgIC8vPT09IE5FRURCSVRTKGhlcmUuYml0cyArIDIpO1xuICAgICAgICAgICAgICBuID0gaGVyZV9iaXRzICsgMjtcbiAgICAgICAgICAgICAgd2hpbGUgKGJpdHMgPCBuKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgICAgIC8vLS0tIERST1BCSVRTKGhlcmUuYml0cykgLS0tLy9cbiAgICAgICAgICAgICAgaG9sZCA+Pj49IGhlcmVfYml0cztcbiAgICAgICAgICAgICAgYml0cyAtPSBoZXJlX2JpdHM7XG4gICAgICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICAgICAgaWYgKHN0YXRlLmhhdmUgPT09IDApIHtcbiAgICAgICAgICAgICAgICBzdHJtLm1zZyA9ICdpbnZhbGlkIGJpdCBsZW5ndGggcmVwZWF0JztcbiAgICAgICAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGxlbiA9IHN0YXRlLmxlbnNbc3RhdGUuaGF2ZSAtIDFdO1xuICAgICAgICAgICAgICBjb3B5ID0gMyArIChob2xkICYgMHgwMyk7Ly9CSVRTKDIpO1xuICAgICAgICAgICAgICAvLy0tLSBEUk9QQklUUygyKSAtLS0vL1xuICAgICAgICAgICAgICBob2xkID4+Pj0gMjtcbiAgICAgICAgICAgICAgYml0cyAtPSAyO1xuICAgICAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZXJlX3ZhbCA9PT0gMTcpIHtcbiAgICAgICAgICAgICAgLy89PT0gTkVFREJJVFMoaGVyZS5iaXRzICsgMyk7XG4gICAgICAgICAgICAgIG4gPSBoZXJlX2JpdHMgKyAzO1xuICAgICAgICAgICAgICB3aGlsZSAoYml0cyA8IG4pIHtcbiAgICAgICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICAgICAgLy8tLS0gRFJPUEJJVFMoaGVyZS5iaXRzKSAtLS0vL1xuICAgICAgICAgICAgICBob2xkID4+Pj0gaGVyZV9iaXRzO1xuICAgICAgICAgICAgICBiaXRzIC09IGhlcmVfYml0cztcbiAgICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgICAgICBsZW4gPSAwO1xuICAgICAgICAgICAgICBjb3B5ID0gMyArIChob2xkICYgMHgwNyk7Ly9CSVRTKDMpO1xuICAgICAgICAgICAgICAvLy0tLSBEUk9QQklUUygzKSAtLS0vL1xuICAgICAgICAgICAgICBob2xkID4+Pj0gMztcbiAgICAgICAgICAgICAgYml0cyAtPSAzO1xuICAgICAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgLy89PT0gTkVFREJJVFMoaGVyZS5iaXRzICsgNyk7XG4gICAgICAgICAgICAgIG4gPSBoZXJlX2JpdHMgKyA3O1xuICAgICAgICAgICAgICB3aGlsZSAoYml0cyA8IG4pIHtcbiAgICAgICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICAgICAgLy8tLS0gRFJPUEJJVFMoaGVyZS5iaXRzKSAtLS0vL1xuICAgICAgICAgICAgICBob2xkID4+Pj0gaGVyZV9iaXRzO1xuICAgICAgICAgICAgICBiaXRzIC09IGhlcmVfYml0cztcbiAgICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgICAgICBsZW4gPSAwO1xuICAgICAgICAgICAgICBjb3B5ID0gMTEgKyAoaG9sZCAmIDB4N2YpOy8vQklUUyg3KTtcbiAgICAgICAgICAgICAgLy8tLS0gRFJPUEJJVFMoNykgLS0tLy9cbiAgICAgICAgICAgICAgaG9sZCA+Pj49IDc7XG4gICAgICAgICAgICAgIGJpdHMgLT0gNztcbiAgICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHN0YXRlLmhhdmUgKyBjb3B5ID4gc3RhdGUubmxlbiArIHN0YXRlLm5kaXN0KSB7XG4gICAgICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgYml0IGxlbmd0aCByZXBlYXQnO1xuICAgICAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlIChjb3B5LS0pIHtcbiAgICAgICAgICAgICAgc3RhdGUubGVuc1tzdGF0ZS5oYXZlKytdID0gbGVuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8qIGhhbmRsZSBlcnJvciBicmVha3MgaW4gd2hpbGUgKi9cbiAgICAgICAgaWYgKHN0YXRlLm1vZGUgPT09IEJBRCkgeyBicmVhazsgfVxuXG4gICAgICAgIC8qIGNoZWNrIGZvciBlbmQtb2YtYmxvY2sgY29kZSAoYmV0dGVyIGhhdmUgb25lKSAqL1xuICAgICAgICBpZiAoc3RhdGUubGVuc1syNTZdID09PSAwKSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCBjb2RlIC0tIG1pc3NpbmcgZW5kLW9mLWJsb2NrJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogYnVpbGQgY29kZSB0YWJsZXMgLS0gbm90ZTogZG8gbm90IGNoYW5nZSB0aGUgbGVuYml0cyBvciBkaXN0Yml0c1xuICAgICAgICAgICB2YWx1ZXMgaGVyZSAoOSBhbmQgNikgd2l0aG91dCByZWFkaW5nIHRoZSBjb21tZW50cyBpbiBpbmZ0cmVlcy5oXG4gICAgICAgICAgIGNvbmNlcm5pbmcgdGhlIEVOT1VHSCBjb25zdGFudHMsIHdoaWNoIGRlcGVuZCBvbiB0aG9zZSB2YWx1ZXMgKi9cbiAgICAgICAgc3RhdGUubGVuYml0cyA9IDk7XG5cbiAgICAgICAgb3B0cyA9IHsgYml0czogc3RhdGUubGVuYml0cyB9O1xuICAgICAgICByZXQgPSBpbmZsYXRlX3RhYmxlKExFTlMsIHN0YXRlLmxlbnMsIDAsIHN0YXRlLm5sZW4sIHN0YXRlLmxlbmNvZGUsIDAsIHN0YXRlLndvcmssIG9wdHMpO1xuICAgICAgICAvLyBXZSBoYXZlIHNlcGFyYXRlIHRhYmxlcyAmIG5vIHBvaW50ZXJzLiAyIGNvbW1lbnRlZCBsaW5lcyBiZWxvdyBub3QgbmVlZGVkLlxuICAgICAgICAvLyBzdGF0ZS5uZXh0X2luZGV4ID0gb3B0cy50YWJsZV9pbmRleDtcbiAgICAgICAgc3RhdGUubGVuYml0cyA9IG9wdHMuYml0cztcbiAgICAgICAgLy8gc3RhdGUubGVuY29kZSA9IHN0YXRlLm5leHQ7XG5cbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgbGl0ZXJhbC9sZW5ndGhzIHNldCc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmRpc3RiaXRzID0gNjtcbiAgICAgICAgLy9zdGF0ZS5kaXN0Y29kZS5jb3B5KHN0YXRlLmNvZGVzKTtcbiAgICAgICAgLy8gU3dpdGNoIHRvIHVzZSBkeW5hbWljIHRhYmxlXG4gICAgICAgIHN0YXRlLmRpc3Rjb2RlID0gc3RhdGUuZGlzdGR5bjtcbiAgICAgICAgb3B0cyA9IHsgYml0czogc3RhdGUuZGlzdGJpdHMgfTtcbiAgICAgICAgcmV0ID0gaW5mbGF0ZV90YWJsZShESVNUUywgc3RhdGUubGVucywgc3RhdGUubmxlbiwgc3RhdGUubmRpc3QsIHN0YXRlLmRpc3Rjb2RlLCAwLCBzdGF0ZS53b3JrLCBvcHRzKTtcbiAgICAgICAgLy8gV2UgaGF2ZSBzZXBhcmF0ZSB0YWJsZXMgJiBubyBwb2ludGVycy4gMiBjb21tZW50ZWQgbGluZXMgYmVsb3cgbm90IG5lZWRlZC5cbiAgICAgICAgLy8gc3RhdGUubmV4dF9pbmRleCA9IG9wdHMudGFibGVfaW5kZXg7XG4gICAgICAgIHN0YXRlLmRpc3RiaXRzID0gb3B0cy5iaXRzO1xuICAgICAgICAvLyBzdGF0ZS5kaXN0Y29kZSA9IHN0YXRlLm5leHQ7XG5cbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgZGlzdGFuY2VzIHNldCc7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvL1RyYWNldigoc3RkZXJyLCAnaW5mbGF0ZTogICAgICAgY29kZXMgb2tcXG4nKSk7XG4gICAgICAgIHN0YXRlLm1vZGUgPSBMRU5fO1xuICAgICAgICBpZiAoZmx1c2ggPT09IFpfVFJFRVMpIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgTEVOXzpcbiAgICAgICAgc3RhdGUubW9kZSA9IExFTjtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBMRU46XG4gICAgICAgIGlmIChoYXZlID49IDYgJiYgbGVmdCA+PSAyNTgpIHtcbiAgICAgICAgICAvLy0tLSBSRVNUT1JFKCkgLS0tXG4gICAgICAgICAgc3RybS5uZXh0X291dCA9IHB1dDtcbiAgICAgICAgICBzdHJtLmF2YWlsX291dCA9IGxlZnQ7XG4gICAgICAgICAgc3RybS5uZXh0X2luID0gbmV4dDtcbiAgICAgICAgICBzdHJtLmF2YWlsX2luID0gaGF2ZTtcbiAgICAgICAgICBzdGF0ZS5ob2xkID0gaG9sZDtcbiAgICAgICAgICBzdGF0ZS5iaXRzID0gYml0cztcbiAgICAgICAgICAvLy0tLVxuICAgICAgICAgIGluZmxhdGVfZmFzdChzdHJtLCBfb3V0KTtcbiAgICAgICAgICAvLy0tLSBMT0FEKCkgLS0tXG4gICAgICAgICAgcHV0ID0gc3RybS5uZXh0X291dDtcbiAgICAgICAgICBvdXRwdXQgPSBzdHJtLm91dHB1dDtcbiAgICAgICAgICBsZWZ0ID0gc3RybS5hdmFpbF9vdXQ7XG4gICAgICAgICAgbmV4dCA9IHN0cm0ubmV4dF9pbjtcbiAgICAgICAgICBpbnB1dCA9IHN0cm0uaW5wdXQ7XG4gICAgICAgICAgaGF2ZSA9IHN0cm0uYXZhaWxfaW47XG4gICAgICAgICAgaG9sZCA9IHN0YXRlLmhvbGQ7XG4gICAgICAgICAgYml0cyA9IHN0YXRlLmJpdHM7XG4gICAgICAgICAgLy8tLS1cblxuICAgICAgICAgIGlmIChzdGF0ZS5tb2RlID09PSBUWVBFKSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrID0gLTE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmJhY2sgPSAwO1xuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgaGVyZSA9IHN0YXRlLmxlbmNvZGVbaG9sZCAmICgoMSA8PCBzdGF0ZS5sZW5iaXRzKSAtIDEpXTsgIC8qQklUUyhzdGF0ZS5sZW5iaXRzKSovXG4gICAgICAgICAgaGVyZV9iaXRzID0gaGVyZSA+Pj4gMjQ7XG4gICAgICAgICAgaGVyZV9vcCA9IChoZXJlID4+PiAxNikgJiAweGZmO1xuICAgICAgICAgIGhlcmVfdmFsID0gaGVyZSAmIDB4ZmZmZjtcblxuICAgICAgICAgIGlmIChoZXJlX2JpdHMgPD0gYml0cykgeyBicmVhazsgfVxuICAgICAgICAgIC8vLS0tIFBVTExCWVRFKCkgLS0tLy9cbiAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVyZV9vcCAmJiAoaGVyZV9vcCAmIDB4ZjApID09PSAwKSB7XG4gICAgICAgICAgbGFzdF9iaXRzID0gaGVyZV9iaXRzO1xuICAgICAgICAgIGxhc3Rfb3AgPSBoZXJlX29wO1xuICAgICAgICAgIGxhc3RfdmFsID0gaGVyZV92YWw7XG4gICAgICAgICAgZm9yICg7Oykge1xuICAgICAgICAgICAgaGVyZSA9IHN0YXRlLmxlbmNvZGVbbGFzdF92YWwgK1xuICAgICAgICAgICAgICAgICAgICAoKGhvbGQgJiAoKDEgPDwgKGxhc3RfYml0cyArIGxhc3Rfb3ApKSAtIDEpKS8qQklUUyhsYXN0LmJpdHMgKyBsYXN0Lm9wKSovID4+IGxhc3RfYml0cyldO1xuICAgICAgICAgICAgaGVyZV9iaXRzID0gaGVyZSA+Pj4gMjQ7XG4gICAgICAgICAgICBoZXJlX29wID0gKGhlcmUgPj4+IDE2KSAmIDB4ZmY7XG4gICAgICAgICAgICBoZXJlX3ZhbCA9IGhlcmUgJiAweGZmZmY7XG5cbiAgICAgICAgICAgIGlmICgobGFzdF9iaXRzICsgaGVyZV9iaXRzKSA8PSBiaXRzKSB7IGJyZWFrOyB9XG4gICAgICAgICAgICAvLy0tLSBQVUxMQllURSgpIC0tLS8vXG4gICAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICAgIGhhdmUtLTtcbiAgICAgICAgICAgIGhvbGQgKz0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgICAgLy8tLS0vL1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLy0tLSBEUk9QQklUUyhsYXN0LmJpdHMpIC0tLS8vXG4gICAgICAgICAgaG9sZCA+Pj49IGxhc3RfYml0cztcbiAgICAgICAgICBiaXRzIC09IGxhc3RfYml0cztcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgc3RhdGUuYmFjayArPSBsYXN0X2JpdHM7XG4gICAgICAgIH1cbiAgICAgICAgLy8tLS0gRFJPUEJJVFMoaGVyZS5iaXRzKSAtLS0vL1xuICAgICAgICBob2xkID4+Pj0gaGVyZV9iaXRzO1xuICAgICAgICBiaXRzIC09IGhlcmVfYml0cztcbiAgICAgICAgLy8tLS0vL1xuICAgICAgICBzdGF0ZS5iYWNrICs9IGhlcmVfYml0cztcbiAgICAgICAgc3RhdGUubGVuZ3RoID0gaGVyZV92YWw7XG4gICAgICAgIGlmIChoZXJlX29wID09PSAwKSB7XG4gICAgICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsIGhlcmUudmFsID49IDB4MjAgJiYgaGVyZS52YWwgPCAweDdmID9cbiAgICAgICAgICAvLyAgICAgICAgXCJpbmZsYXRlOiAgICAgICAgIGxpdGVyYWwgJyVjJ1xcblwiIDpcbiAgICAgICAgICAvLyAgICAgICAgXCJpbmZsYXRlOiAgICAgICAgIGxpdGVyYWwgMHglMDJ4XFxuXCIsIGhlcmUudmFsKSk7XG4gICAgICAgICAgc3RhdGUubW9kZSA9IExJVDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVyZV9vcCAmIDMyKSB7XG4gICAgICAgICAgLy9UcmFjZXZ2KChzdGRlcnIsIFwiaW5mbGF0ZTogICAgICAgICBlbmQgb2YgYmxvY2tcXG5cIikpO1xuICAgICAgICAgIHN0YXRlLmJhY2sgPSAtMTtcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gVFlQRTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVyZV9vcCAmIDY0KSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCBsaXRlcmFsL2xlbmd0aCBjb2RlJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmV4dHJhID0gaGVyZV9vcCAmIDE1O1xuICAgICAgICBzdGF0ZS5tb2RlID0gTEVORVhUO1xuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBjYXNlIExFTkVYVDpcbiAgICAgICAgaWYgKHN0YXRlLmV4dHJhKSB7XG4gICAgICAgICAgLy89PT0gTkVFREJJVFMoc3RhdGUuZXh0cmEpO1xuICAgICAgICAgIG4gPSBzdGF0ZS5leHRyYTtcbiAgICAgICAgICB3aGlsZSAoYml0cyA8IG4pIHtcbiAgICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICBzdGF0ZS5sZW5ndGggKz0gaG9sZCAmICgoMSA8PCBzdGF0ZS5leHRyYSkgLSAxKS8qQklUUyhzdGF0ZS5leHRyYSkqLztcbiAgICAgICAgICAvLy0tLSBEUk9QQklUUyhzdGF0ZS5leHRyYSkgLS0tLy9cbiAgICAgICAgICBob2xkID4+Pj0gc3RhdGUuZXh0cmE7XG4gICAgICAgICAgYml0cyAtPSBzdGF0ZS5leHRyYTtcbiAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgc3RhdGUuYmFjayArPSBzdGF0ZS5leHRyYTtcbiAgICAgICAgfVxuICAgICAgICAvL1RyYWNldnYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgICAgIGxlbmd0aCAldVxcblwiLCBzdGF0ZS5sZW5ndGgpKTtcbiAgICAgICAgc3RhdGUud2FzID0gc3RhdGUubGVuZ3RoO1xuICAgICAgICBzdGF0ZS5tb2RlID0gRElTVDtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBESVNUOlxuICAgICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgaGVyZSA9IHN0YXRlLmRpc3Rjb2RlW2hvbGQgJiAoKDEgPDwgc3RhdGUuZGlzdGJpdHMpIC0gMSldOy8qQklUUyhzdGF0ZS5kaXN0Yml0cykqL1xuICAgICAgICAgIGhlcmVfYml0cyA9IGhlcmUgPj4+IDI0O1xuICAgICAgICAgIGhlcmVfb3AgPSAoaGVyZSA+Pj4gMTYpICYgMHhmZjtcbiAgICAgICAgICBoZXJlX3ZhbCA9IGhlcmUgJiAweGZmZmY7XG5cbiAgICAgICAgICBpZiAoKGhlcmVfYml0cykgPD0gYml0cykgeyBicmVhazsgfVxuICAgICAgICAgIC8vLS0tIFBVTExCWVRFKCkgLS0tLy9cbiAgICAgICAgICBpZiAoaGF2ZSA9PT0gMCkgeyBicmVhayBpbmZfbGVhdmU7IH1cbiAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgfVxuICAgICAgICBpZiAoKGhlcmVfb3AgJiAweGYwKSA9PT0gMCkge1xuICAgICAgICAgIGxhc3RfYml0cyA9IGhlcmVfYml0cztcbiAgICAgICAgICBsYXN0X29wID0gaGVyZV9vcDtcbiAgICAgICAgICBsYXN0X3ZhbCA9IGhlcmVfdmFsO1xuICAgICAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICAgIGhlcmUgPSBzdGF0ZS5kaXN0Y29kZVtsYXN0X3ZhbCArXG4gICAgICAgICAgICAgICAgICAgICgoaG9sZCAmICgoMSA8PCAobGFzdF9iaXRzICsgbGFzdF9vcCkpIC0gMSkpLypCSVRTKGxhc3QuYml0cyArIGxhc3Qub3ApKi8gPj4gbGFzdF9iaXRzKV07XG4gICAgICAgICAgICBoZXJlX2JpdHMgPSBoZXJlID4+PiAyNDtcbiAgICAgICAgICAgIGhlcmVfb3AgPSAoaGVyZSA+Pj4gMTYpICYgMHhmZjtcbiAgICAgICAgICAgIGhlcmVfdmFsID0gaGVyZSAmIDB4ZmZmZjtcblxuICAgICAgICAgICAgaWYgKChsYXN0X2JpdHMgKyBoZXJlX2JpdHMpIDw9IGJpdHMpIHsgYnJlYWs7IH1cbiAgICAgICAgICAgIC8vLS0tIFBVTExCWVRFKCkgLS0tLy9cbiAgICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgICAvLy0tLS8vXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vLS0tIERST1BCSVRTKGxhc3QuYml0cykgLS0tLy9cbiAgICAgICAgICBob2xkID4+Pj0gbGFzdF9iaXRzO1xuICAgICAgICAgIGJpdHMgLT0gbGFzdF9iaXRzO1xuICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICBzdGF0ZS5iYWNrICs9IGxhc3RfYml0cztcbiAgICAgICAgfVxuICAgICAgICAvLy0tLSBEUk9QQklUUyhoZXJlLmJpdHMpIC0tLS8vXG4gICAgICAgIGhvbGQgPj4+PSBoZXJlX2JpdHM7XG4gICAgICAgIGJpdHMgLT0gaGVyZV9iaXRzO1xuICAgICAgICAvLy0tLS8vXG4gICAgICAgIHN0YXRlLmJhY2sgKz0gaGVyZV9iaXRzO1xuICAgICAgICBpZiAoaGVyZV9vcCAmIDY0KSB7XG4gICAgICAgICAgc3RybS5tc2cgPSAnaW52YWxpZCBkaXN0YW5jZSBjb2RlJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLm9mZnNldCA9IGhlcmVfdmFsO1xuICAgICAgICBzdGF0ZS5leHRyYSA9IChoZXJlX29wKSAmIDE1O1xuICAgICAgICBzdGF0ZS5tb2RlID0gRElTVEVYVDtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBESVNURVhUOlxuICAgICAgICBpZiAoc3RhdGUuZXh0cmEpIHtcbiAgICAgICAgICAvLz09PSBORUVEQklUUyhzdGF0ZS5leHRyYSk7XG4gICAgICAgICAgbiA9IHN0YXRlLmV4dHJhO1xuICAgICAgICAgIHdoaWxlIChiaXRzIDwgbikge1xuICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICBob2xkICs9IGlucHV0W25leHQrK10gPDwgYml0cztcbiAgICAgICAgICAgIGJpdHMgKz0gODtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0vL1xuICAgICAgICAgIHN0YXRlLm9mZnNldCArPSBob2xkICYgKCgxIDw8IHN0YXRlLmV4dHJhKSAtIDEpLypCSVRTKHN0YXRlLmV4dHJhKSovO1xuICAgICAgICAgIC8vLS0tIERST1BCSVRTKHN0YXRlLmV4dHJhKSAtLS0vL1xuICAgICAgICAgIGhvbGQgPj4+PSBzdGF0ZS5leHRyYTtcbiAgICAgICAgICBiaXRzIC09IHN0YXRlLmV4dHJhO1xuICAgICAgICAgIC8vLS0tLy9cbiAgICAgICAgICBzdGF0ZS5iYWNrICs9IHN0YXRlLmV4dHJhO1xuICAgICAgICB9XG4vLyNpZmRlZiBJTkZMQVRFX1NUUklDVFxuICAgICAgICBpZiAoc3RhdGUub2Zmc2V0ID4gc3RhdGUuZG1heCkge1xuICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgZGlzdGFuY2UgdG9vIGZhciBiYWNrJztcbiAgICAgICAgICBzdGF0ZS5tb2RlID0gQkFEO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4vLyNlbmRpZlxuICAgICAgICAvL1RyYWNldnYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgICAgICAgIGRpc3RhbmNlICV1XFxuXCIsIHN0YXRlLm9mZnNldCkpO1xuICAgICAgICBzdGF0ZS5tb2RlID0gTUFUQ0g7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgTUFUQ0g6XG4gICAgICAgIGlmIChsZWZ0ID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICBjb3B5ID0gX291dCAtIGxlZnQ7XG4gICAgICAgIGlmIChzdGF0ZS5vZmZzZXQgPiBjb3B5KSB7ICAgICAgICAgLyogY29weSBmcm9tIHdpbmRvdyAqL1xuICAgICAgICAgIGNvcHkgPSBzdGF0ZS5vZmZzZXQgLSBjb3B5O1xuICAgICAgICAgIGlmIChjb3B5ID4gc3RhdGUud2hhdmUpIHtcbiAgICAgICAgICAgIGlmIChzdGF0ZS5zYW5lKSB7XG4gICAgICAgICAgICAgIHN0cm0ubXNnID0gJ2ludmFsaWQgZGlzdGFuY2UgdG9vIGZhciBiYWNrJztcbiAgICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4vLyAoISkgVGhpcyBibG9jayBpcyBkaXNhYmxlZCBpbiB6bGliIGRlZmF1bHRzLFxuLy8gZG9uJ3QgZW5hYmxlIGl0IGZvciBiaW5hcnkgY29tcGF0aWJpbGl0eVxuLy8jaWZkZWYgSU5GTEFURV9BTExPV19JTlZBTElEX0RJU1RBTkNFX1RPT0ZBUl9BUlJSXG4vLyAgICAgICAgICBUcmFjZSgoc3RkZXJyLCBcImluZmxhdGUuYyB0b28gZmFyXFxuXCIpKTtcbi8vICAgICAgICAgIGNvcHkgLT0gc3RhdGUud2hhdmU7XG4vLyAgICAgICAgICBpZiAoY29weSA+IHN0YXRlLmxlbmd0aCkgeyBjb3B5ID0gc3RhdGUubGVuZ3RoOyB9XG4vLyAgICAgICAgICBpZiAoY29weSA+IGxlZnQpIHsgY29weSA9IGxlZnQ7IH1cbi8vICAgICAgICAgIGxlZnQgLT0gY29weTtcbi8vICAgICAgICAgIHN0YXRlLmxlbmd0aCAtPSBjb3B5O1xuLy8gICAgICAgICAgZG8ge1xuLy8gICAgICAgICAgICBvdXRwdXRbcHV0KytdID0gMDtcbi8vICAgICAgICAgIH0gd2hpbGUgKC0tY29weSk7XG4vLyAgICAgICAgICBpZiAoc3RhdGUubGVuZ3RoID09PSAwKSB7IHN0YXRlLm1vZGUgPSBMRU47IH1cbi8vICAgICAgICAgIGJyZWFrO1xuLy8jZW5kaWZcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNvcHkgPiBzdGF0ZS53bmV4dCkge1xuICAgICAgICAgICAgY29weSAtPSBzdGF0ZS53bmV4dDtcbiAgICAgICAgICAgIGZyb20gPSBzdGF0ZS53c2l6ZSAtIGNvcHk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZnJvbSA9IHN0YXRlLnduZXh0IC0gY29weTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNvcHkgPiBzdGF0ZS5sZW5ndGgpIHsgY29weSA9IHN0YXRlLmxlbmd0aDsgfVxuICAgICAgICAgIGZyb21fc291cmNlID0gc3RhdGUud2luZG93O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgeyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qIGNvcHkgZnJvbSBvdXRwdXQgKi9cbiAgICAgICAgICBmcm9tX3NvdXJjZSA9IG91dHB1dDtcbiAgICAgICAgICBmcm9tID0gcHV0IC0gc3RhdGUub2Zmc2V0O1xuICAgICAgICAgIGNvcHkgPSBzdGF0ZS5sZW5ndGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvcHkgPiBsZWZ0KSB7IGNvcHkgPSBsZWZ0OyB9XG4gICAgICAgIGxlZnQgLT0gY29weTtcbiAgICAgICAgc3RhdGUubGVuZ3RoIC09IGNvcHk7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICBvdXRwdXRbcHV0KytdID0gZnJvbV9zb3VyY2VbZnJvbSsrXTtcbiAgICAgICAgfSB3aGlsZSAoLS1jb3B5KTtcbiAgICAgICAgaWYgKHN0YXRlLmxlbmd0aCA9PT0gMCkgeyBzdGF0ZS5tb2RlID0gTEVOOyB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBMSVQ6XG4gICAgICAgIGlmIChsZWZ0ID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICBvdXRwdXRbcHV0KytdID0gc3RhdGUubGVuZ3RoO1xuICAgICAgICBsZWZ0LS07XG4gICAgICAgIHN0YXRlLm1vZGUgPSBMRU47XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBDSEVDSzpcbiAgICAgICAgaWYgKHN0YXRlLndyYXApIHtcbiAgICAgICAgICAvLz09PSBORUVEQklUUygzMik7XG4gICAgICAgICAgd2hpbGUgKGJpdHMgPCAzMikge1xuICAgICAgICAgICAgaWYgKGhhdmUgPT09IDApIHsgYnJlYWsgaW5mX2xlYXZlOyB9XG4gICAgICAgICAgICBoYXZlLS07XG4gICAgICAgICAgICAvLyBVc2UgJ3wnIGluc3RlYWQgb2YgJysnIHRvIG1ha2Ugc3VyZSB0aGF0IHJlc3VsdCBpcyBzaWduZWRcbiAgICAgICAgICAgIGhvbGQgfD0gaW5wdXRbbmV4dCsrXSA8PCBiaXRzO1xuICAgICAgICAgICAgYml0cyArPSA4O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgX291dCAtPSBsZWZ0O1xuICAgICAgICAgIHN0cm0udG90YWxfb3V0ICs9IF9vdXQ7XG4gICAgICAgICAgc3RhdGUudG90YWwgKz0gX291dDtcbiAgICAgICAgICBpZiAoX291dCkge1xuICAgICAgICAgICAgc3RybS5hZGxlciA9IHN0YXRlLmNoZWNrID1cbiAgICAgICAgICAgICAgICAvKlVQREFURShzdGF0ZS5jaGVjaywgcHV0IC0gX291dCwgX291dCk7Ki9cbiAgICAgICAgICAgICAgICAoc3RhdGUuZmxhZ3MgPyBjcmMzMihzdGF0ZS5jaGVjaywgb3V0cHV0LCBfb3V0LCBwdXQgLSBfb3V0KSA6IGFkbGVyMzIoc3RhdGUuY2hlY2ssIG91dHB1dCwgX291dCwgcHV0IC0gX291dCkpO1xuXG4gICAgICAgICAgfVxuICAgICAgICAgIF9vdXQgPSBsZWZ0O1xuICAgICAgICAgIC8vIE5COiBjcmMzMiBzdG9yZWQgYXMgc2lnbmVkIDMyLWJpdCBpbnQsIHpzd2FwMzIgcmV0dXJucyBzaWduZWQgdG9vXG4gICAgICAgICAgaWYgKChzdGF0ZS5mbGFncyA/IGhvbGQgOiB6c3dhcDMyKGhvbGQpKSAhPT0gc3RhdGUuY2hlY2spIHtcbiAgICAgICAgICAgIHN0cm0ubXNnID0gJ2luY29ycmVjdCBkYXRhIGNoZWNrJztcbiAgICAgICAgICAgIHN0YXRlLm1vZGUgPSBCQUQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy89PT0gSU5JVEJJVFMoKTtcbiAgICAgICAgICBob2xkID0gMDtcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICAvLz09PS8vXG4gICAgICAgICAgLy9UcmFjZXYoKHN0ZGVyciwgXCJpbmZsYXRlOiAgIGNoZWNrIG1hdGNoZXMgdHJhaWxlclxcblwiKSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUubW9kZSA9IExFTkdUSDtcbiAgICAgICAgLyogZmFsbHMgdGhyb3VnaCAqL1xuICAgICAgY2FzZSBMRU5HVEg6XG4gICAgICAgIGlmIChzdGF0ZS53cmFwICYmIHN0YXRlLmZsYWdzKSB7XG4gICAgICAgICAgLy89PT0gTkVFREJJVFMoMzIpO1xuICAgICAgICAgIHdoaWxlIChiaXRzIDwgMzIpIHtcbiAgICAgICAgICAgIGlmIChoYXZlID09PSAwKSB7IGJyZWFrIGluZl9sZWF2ZTsgfVxuICAgICAgICAgICAgaGF2ZS0tO1xuICAgICAgICAgICAgaG9sZCArPSBpbnB1dFtuZXh0KytdIDw8IGJpdHM7XG4gICAgICAgICAgICBiaXRzICs9IDg7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICBpZiAoaG9sZCAhPT0gKHN0YXRlLnRvdGFsICYgMHhmZmZmZmZmZikpIHtcbiAgICAgICAgICAgIHN0cm0ubXNnID0gJ2luY29ycmVjdCBsZW5ndGggY2hlY2snO1xuICAgICAgICAgICAgc3RhdGUubW9kZSA9IEJBRDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLz09PSBJTklUQklUUygpO1xuICAgICAgICAgIGhvbGQgPSAwO1xuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIC8vPT09Ly9cbiAgICAgICAgICAvL1RyYWNldigoc3RkZXJyLCBcImluZmxhdGU6ICAgbGVuZ3RoIG1hdGNoZXMgdHJhaWxlclxcblwiKSk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUubW9kZSA9IERPTkU7XG4gICAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgRE9ORTpcbiAgICAgICAgcmV0ID0gWl9TVFJFQU1fRU5EO1xuICAgICAgICBicmVhayBpbmZfbGVhdmU7XG4gICAgICBjYXNlIEJBRDpcbiAgICAgICAgcmV0ID0gWl9EQVRBX0VSUk9SO1xuICAgICAgICBicmVhayBpbmZfbGVhdmU7XG4gICAgICBjYXNlIE1FTTpcbiAgICAgICAgcmV0dXJuIFpfTUVNX0VSUk9SO1xuICAgICAgY2FzZSBTWU5DOlxuICAgICAgICAvKiBmYWxscyB0aHJvdWdoICovXG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gWl9TVFJFQU1fRVJST1I7XG4gICAgfVxuICB9XG5cbiAgLy8gaW5mX2xlYXZlIDwtIGhlcmUgaXMgcmVhbCBwbGFjZSBmb3IgXCJnb3RvIGluZl9sZWF2ZVwiLCBlbXVsYXRlZCB2aWEgXCJicmVhayBpbmZfbGVhdmVcIlxuXG4gIC8qXG4gICAgIFJldHVybiBmcm9tIGluZmxhdGUoKSwgdXBkYXRpbmcgdGhlIHRvdGFsIGNvdW50cyBhbmQgdGhlIGNoZWNrIHZhbHVlLlxuICAgICBJZiB0aGVyZSB3YXMgbm8gcHJvZ3Jlc3MgZHVyaW5nIHRoZSBpbmZsYXRlKCkgY2FsbCwgcmV0dXJuIGEgYnVmZmVyXG4gICAgIGVycm9yLiAgQ2FsbCB1cGRhdGV3aW5kb3coKSB0byBjcmVhdGUgYW5kL29yIHVwZGF0ZSB0aGUgd2luZG93IHN0YXRlLlxuICAgICBOb3RlOiBhIG1lbW9yeSBlcnJvciBmcm9tIGluZmxhdGUoKSBpcyBub24tcmVjb3ZlcmFibGUuXG4gICAqL1xuXG4gIC8vLS0tIFJFU1RPUkUoKSAtLS1cbiAgc3RybS5uZXh0X291dCA9IHB1dDtcbiAgc3RybS5hdmFpbF9vdXQgPSBsZWZ0O1xuICBzdHJtLm5leHRfaW4gPSBuZXh0O1xuICBzdHJtLmF2YWlsX2luID0gaGF2ZTtcbiAgc3RhdGUuaG9sZCA9IGhvbGQ7XG4gIHN0YXRlLmJpdHMgPSBiaXRzO1xuICAvLy0tLVxuXG4gIGlmIChzdGF0ZS53c2l6ZSB8fCAoX291dCAhPT0gc3RybS5hdmFpbF9vdXQgJiYgc3RhdGUubW9kZSA8IEJBRCAmJlxuICAgICAgICAgICAgICAgICAgICAgIChzdGF0ZS5tb2RlIDwgQ0hFQ0sgfHwgZmx1c2ggIT09IFpfRklOSVNIKSkpIHtcbiAgICBpZiAodXBkYXRld2luZG93KHN0cm0sIHN0cm0ub3V0cHV0LCBzdHJtLm5leHRfb3V0LCBfb3V0IC0gc3RybS5hdmFpbF9vdXQpKSB7XG4gICAgICBzdGF0ZS5tb2RlID0gTUVNO1xuICAgICAgcmV0dXJuIFpfTUVNX0VSUk9SO1xuICAgIH1cbiAgfVxuICBfaW4gLT0gc3RybS5hdmFpbF9pbjtcbiAgX291dCAtPSBzdHJtLmF2YWlsX291dDtcbiAgc3RybS50b3RhbF9pbiArPSBfaW47XG4gIHN0cm0udG90YWxfb3V0ICs9IF9vdXQ7XG4gIHN0YXRlLnRvdGFsICs9IF9vdXQ7XG4gIGlmIChzdGF0ZS53cmFwICYmIF9vdXQpIHtcbiAgICBzdHJtLmFkbGVyID0gc3RhdGUuY2hlY2sgPSAvKlVQREFURShzdGF0ZS5jaGVjaywgc3RybS5uZXh0X291dCAtIF9vdXQsIF9vdXQpOyovXG4gICAgICAoc3RhdGUuZmxhZ3MgPyBjcmMzMihzdGF0ZS5jaGVjaywgb3V0cHV0LCBfb3V0LCBzdHJtLm5leHRfb3V0IC0gX291dCkgOiBhZGxlcjMyKHN0YXRlLmNoZWNrLCBvdXRwdXQsIF9vdXQsIHN0cm0ubmV4dF9vdXQgLSBfb3V0KSk7XG4gIH1cbiAgc3RybS5kYXRhX3R5cGUgPSBzdGF0ZS5iaXRzICsgKHN0YXRlLmxhc3QgPyA2NCA6IDApICtcbiAgICAgICAgICAgICAgICAgICAgKHN0YXRlLm1vZGUgPT09IFRZUEUgPyAxMjggOiAwKSArXG4gICAgICAgICAgICAgICAgICAgIChzdGF0ZS5tb2RlID09PSBMRU5fIHx8IHN0YXRlLm1vZGUgPT09IENPUFlfID8gMjU2IDogMCk7XG4gIGlmICgoKF9pbiA9PT0gMCAmJiBfb3V0ID09PSAwKSB8fCBmbHVzaCA9PT0gWl9GSU5JU0gpICYmIHJldCA9PT0gWl9PSykge1xuICAgIHJldCA9IFpfQlVGX0VSUk9SO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIGluZmxhdGVFbmQoc3RybSkge1xuXG4gIGlmICghc3RybSB8fCAhc3RybS5zdGF0ZSAvKnx8IHN0cm0tPnpmcmVlID09IChmcmVlX2Z1bmMpMCovKSB7XG4gICAgcmV0dXJuIFpfU1RSRUFNX0VSUk9SO1xuICB9XG5cbiAgdmFyIHN0YXRlID0gc3RybS5zdGF0ZTtcbiAgaWYgKHN0YXRlLndpbmRvdykge1xuICAgIHN0YXRlLndpbmRvdyA9IG51bGw7XG4gIH1cbiAgc3RybS5zdGF0ZSA9IG51bGw7XG4gIHJldHVybiBaX09LO1xufVxuXG5mdW5jdGlvbiBpbmZsYXRlR2V0SGVhZGVyKHN0cm0sIGhlYWQpIHtcbiAgdmFyIHN0YXRlO1xuXG4gIC8qIGNoZWNrIHN0YXRlICovXG4gIGlmICghc3RybSB8fCAhc3RybS5zdGF0ZSkgeyByZXR1cm4gWl9TVFJFQU1fRVJST1I7IH1cbiAgc3RhdGUgPSBzdHJtLnN0YXRlO1xuICBpZiAoKHN0YXRlLndyYXAgJiAyKSA9PT0gMCkgeyByZXR1cm4gWl9TVFJFQU1fRVJST1I7IH1cblxuICAvKiBzYXZlIGhlYWRlciBzdHJ1Y3R1cmUgKi9cbiAgc3RhdGUuaGVhZCA9IGhlYWQ7XG4gIGhlYWQuZG9uZSA9IGZhbHNlO1xuICByZXR1cm4gWl9PSztcbn1cblxuZnVuY3Rpb24gaW5mbGF0ZVNldERpY3Rpb25hcnkoc3RybSwgZGljdGlvbmFyeSkge1xuICB2YXIgZGljdExlbmd0aCA9IGRpY3Rpb25hcnkubGVuZ3RoO1xuXG4gIHZhciBzdGF0ZTtcbiAgdmFyIGRpY3RpZDtcbiAgdmFyIHJldDtcblxuICAvKiBjaGVjayBzdGF0ZSAqL1xuICBpZiAoIXN0cm0gLyogPT0gWl9OVUxMICovIHx8ICFzdHJtLnN0YXRlIC8qID09IFpfTlVMTCAqLykgeyByZXR1cm4gWl9TVFJFQU1fRVJST1I7IH1cbiAgc3RhdGUgPSBzdHJtLnN0YXRlO1xuXG4gIGlmIChzdGF0ZS53cmFwICE9PSAwICYmIHN0YXRlLm1vZGUgIT09IERJQ1QpIHtcbiAgICByZXR1cm4gWl9TVFJFQU1fRVJST1I7XG4gIH1cblxuICAvKiBjaGVjayBmb3IgY29ycmVjdCBkaWN0aW9uYXJ5IGlkZW50aWZpZXIgKi9cbiAgaWYgKHN0YXRlLm1vZGUgPT09IERJQ1QpIHtcbiAgICBkaWN0aWQgPSAxOyAvKiBhZGxlcjMyKDAsIG51bGwsIDApKi9cbiAgICAvKiBkaWN0aWQgPSBhZGxlcjMyKGRpY3RpZCwgZGljdGlvbmFyeSwgZGljdExlbmd0aCk7ICovXG4gICAgZGljdGlkID0gYWRsZXIzMihkaWN0aWQsIGRpY3Rpb25hcnksIGRpY3RMZW5ndGgsIDApO1xuICAgIGlmIChkaWN0aWQgIT09IHN0YXRlLmNoZWNrKSB7XG4gICAgICByZXR1cm4gWl9EQVRBX0VSUk9SO1xuICAgIH1cbiAgfVxuICAvKiBjb3B5IGRpY3Rpb25hcnkgdG8gd2luZG93IHVzaW5nIHVwZGF0ZXdpbmRvdygpLCB3aGljaCB3aWxsIGFtZW5kIHRoZVxuICAgZXhpc3RpbmcgZGljdGlvbmFyeSBpZiBhcHByb3ByaWF0ZSAqL1xuICByZXQgPSB1cGRhdGV3aW5kb3coc3RybSwgZGljdGlvbmFyeSwgZGljdExlbmd0aCwgZGljdExlbmd0aCk7XG4gIGlmIChyZXQpIHtcbiAgICBzdGF0ZS5tb2RlID0gTUVNO1xuICAgIHJldHVybiBaX01FTV9FUlJPUjtcbiAgfVxuICBzdGF0ZS5oYXZlZGljdCA9IDE7XG4gIC8vIFRyYWNldigoc3RkZXJyLCBcImluZmxhdGU6ICAgZGljdGlvbmFyeSBzZXRcXG5cIikpO1xuICByZXR1cm4gWl9PSztcbn1cblxuZXhwb3J0cy5pbmZsYXRlUmVzZXQgPSBpbmZsYXRlUmVzZXQ7XG5leHBvcnRzLmluZmxhdGVSZXNldDIgPSBpbmZsYXRlUmVzZXQyO1xuZXhwb3J0cy5pbmZsYXRlUmVzZXRLZWVwID0gaW5mbGF0ZVJlc2V0S2VlcDtcbmV4cG9ydHMuaW5mbGF0ZUluaXQgPSBpbmZsYXRlSW5pdDtcbmV4cG9ydHMuaW5mbGF0ZUluaXQyID0gaW5mbGF0ZUluaXQyO1xuZXhwb3J0cy5pbmZsYXRlID0gaW5mbGF0ZTtcbmV4cG9ydHMuaW5mbGF0ZUVuZCA9IGluZmxhdGVFbmQ7XG5leHBvcnRzLmluZmxhdGVHZXRIZWFkZXIgPSBpbmZsYXRlR2V0SGVhZGVyO1xuZXhwb3J0cy5pbmZsYXRlU2V0RGljdGlvbmFyeSA9IGluZmxhdGVTZXREaWN0aW9uYXJ5O1xuZXhwb3J0cy5pbmZsYXRlSW5mbyA9ICdwYWtvIGluZmxhdGUgKGZyb20gTm9kZWNhIHByb2plY3QpJztcblxuLyogTm90IGltcGxlbWVudGVkXG5leHBvcnRzLmluZmxhdGVDb3B5ID0gaW5mbGF0ZUNvcHk7XG5leHBvcnRzLmluZmxhdGVHZXREaWN0aW9uYXJ5ID0gaW5mbGF0ZUdldERpY3Rpb25hcnk7XG5leHBvcnRzLmluZmxhdGVNYXJrID0gaW5mbGF0ZU1hcms7XG5leHBvcnRzLmluZmxhdGVQcmltZSA9IGluZmxhdGVQcmltZTtcbmV4cG9ydHMuaW5mbGF0ZVN5bmMgPSBpbmZsYXRlU3luYztcbmV4cG9ydHMuaW5mbGF0ZVN5bmNQb2ludCA9IGluZmxhdGVTeW5jUG9pbnQ7XG5leHBvcnRzLmluZmxhdGVVbmRlcm1pbmUgPSBpbmZsYXRlVW5kZXJtaW5lO1xuKi9cbiIsICIndXNlIHN0cmljdCc7XG5cbi8vIChDKSAxOTk1LTIwMTMgSmVhbi1sb3VwIEdhaWxseSBhbmQgTWFyayBBZGxlclxuLy8gKEMpIDIwMTQtMjAxNyBWaXRhbHkgUHV6cmluIGFuZCBBbmRyZXkgVHVwaXRzaW5cbi8vXG4vLyBUaGlzIHNvZnR3YXJlIGlzIHByb3ZpZGVkICdhcy1pcycsIHdpdGhvdXQgYW55IGV4cHJlc3Mgb3IgaW1wbGllZFxuLy8gd2FycmFudHkuIEluIG5vIGV2ZW50IHdpbGwgdGhlIGF1dGhvcnMgYmUgaGVsZCBsaWFibGUgZm9yIGFueSBkYW1hZ2VzXG4vLyBhcmlzaW5nIGZyb20gdGhlIHVzZSBvZiB0aGlzIHNvZnR3YXJlLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgZ3JhbnRlZCB0byBhbnlvbmUgdG8gdXNlIHRoaXMgc29mdHdhcmUgZm9yIGFueSBwdXJwb3NlLFxuLy8gaW5jbHVkaW5nIGNvbW1lcmNpYWwgYXBwbGljYXRpb25zLCBhbmQgdG8gYWx0ZXIgaXQgYW5kIHJlZGlzdHJpYnV0ZSBpdFxuLy8gZnJlZWx5LCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgcmVzdHJpY3Rpb25zOlxuLy9cbi8vIDEuIFRoZSBvcmlnaW4gb2YgdGhpcyBzb2Z0d2FyZSBtdXN0IG5vdCBiZSBtaXNyZXByZXNlbnRlZDsgeW91IG11c3Qgbm90XG4vLyAgIGNsYWltIHRoYXQgeW91IHdyb3RlIHRoZSBvcmlnaW5hbCBzb2Z0d2FyZS4gSWYgeW91IHVzZSB0aGlzIHNvZnR3YXJlXG4vLyAgIGluIGEgcHJvZHVjdCwgYW4gYWNrbm93bGVkZ21lbnQgaW4gdGhlIHByb2R1Y3QgZG9jdW1lbnRhdGlvbiB3b3VsZCBiZVxuLy8gICBhcHByZWNpYXRlZCBidXQgaXMgbm90IHJlcXVpcmVkLlxuLy8gMi4gQWx0ZXJlZCBzb3VyY2UgdmVyc2lvbnMgbXVzdCBiZSBwbGFpbmx5IG1hcmtlZCBhcyBzdWNoLCBhbmQgbXVzdCBub3QgYmVcbi8vICAgbWlzcmVwcmVzZW50ZWQgYXMgYmVpbmcgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLlxuLy8gMy4gVGhpcyBub3RpY2UgbWF5IG5vdCBiZSByZW1vdmVkIG9yIGFsdGVyZWQgZnJvbSBhbnkgc291cmNlIGRpc3RyaWJ1dGlvbi5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgLyogQWxsb3dlZCBmbHVzaCB2YWx1ZXM7IHNlZSBkZWZsYXRlKCkgYW5kIGluZmxhdGUoKSBiZWxvdyBmb3IgZGV0YWlscyAqL1xuICBaX05PX0ZMVVNIOiAgICAgICAgIDAsXG4gIFpfUEFSVElBTF9GTFVTSDogICAgMSxcbiAgWl9TWU5DX0ZMVVNIOiAgICAgICAyLFxuICBaX0ZVTExfRkxVU0g6ICAgICAgIDMsXG4gIFpfRklOSVNIOiAgICAgICAgICAgNCxcbiAgWl9CTE9DSzogICAgICAgICAgICA1LFxuICBaX1RSRUVTOiAgICAgICAgICAgIDYsXG5cbiAgLyogUmV0dXJuIGNvZGVzIGZvciB0aGUgY29tcHJlc3Npb24vZGVjb21wcmVzc2lvbiBmdW5jdGlvbnMuIE5lZ2F0aXZlIHZhbHVlc1xuICAqIGFyZSBlcnJvcnMsIHBvc2l0aXZlIHZhbHVlcyBhcmUgdXNlZCBmb3Igc3BlY2lhbCBidXQgbm9ybWFsIGV2ZW50cy5cbiAgKi9cbiAgWl9PSzogICAgICAgICAgICAgICAwLFxuICBaX1NUUkVBTV9FTkQ6ICAgICAgIDEsXG4gIFpfTkVFRF9ESUNUOiAgICAgICAgMixcbiAgWl9FUlJOTzogICAgICAgICAgIC0xLFxuICBaX1NUUkVBTV9FUlJPUjogICAgLTIsXG4gIFpfREFUQV9FUlJPUjogICAgICAtMyxcbiAgLy9aX01FTV9FUlJPUjogICAgIC00LFxuICBaX0JVRl9FUlJPUjogICAgICAgLTUsXG4gIC8vWl9WRVJTSU9OX0VSUk9SOiAtNixcblxuICAvKiBjb21wcmVzc2lvbiBsZXZlbHMgKi9cbiAgWl9OT19DT01QUkVTU0lPTjogICAgICAgICAwLFxuICBaX0JFU1RfU1BFRUQ6ICAgICAgICAgICAgIDEsXG4gIFpfQkVTVF9DT01QUkVTU0lPTjogICAgICAgOSxcbiAgWl9ERUZBVUxUX0NPTVBSRVNTSU9OOiAgIC0xLFxuXG5cbiAgWl9GSUxURVJFRDogICAgICAgICAgICAgICAxLFxuICBaX0hVRkZNQU5fT05MWTogICAgICAgICAgIDIsXG4gIFpfUkxFOiAgICAgICAgICAgICAgICAgICAgMyxcbiAgWl9GSVhFRDogICAgICAgICAgICAgICAgICA0LFxuICBaX0RFRkFVTFRfU1RSQVRFR1k6ICAgICAgIDAsXG5cbiAgLyogUG9zc2libGUgdmFsdWVzIG9mIHRoZSBkYXRhX3R5cGUgZmllbGQgKHRob3VnaCBzZWUgaW5mbGF0ZSgpKSAqL1xuICBaX0JJTkFSWTogICAgICAgICAgICAgICAgIDAsXG4gIFpfVEVYVDogICAgICAgICAgICAgICAgICAgMSxcbiAgLy9aX0FTQ0lJOiAgICAgICAgICAgICAgICAxLCAvLyA9IFpfVEVYVCAoZGVwcmVjYXRlZClcbiAgWl9VTktOT1dOOiAgICAgICAgICAgICAgICAyLFxuXG4gIC8qIFRoZSBkZWZsYXRlIGNvbXByZXNzaW9uIG1ldGhvZCAqL1xuICBaX0RFRkxBVEVEOiAgICAgICAgICAgICAgIDhcbiAgLy9aX05VTEw6ICAgICAgICAgICAgICAgICBudWxsIC8vIFVzZSAtMSBvciBudWxsIGlubGluZSwgZGVwZW5kaW5nIG9uIHZhciB0eXBlXG59O1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLy8gKEMpIDE5OTUtMjAxMyBKZWFuLWxvdXAgR2FpbGx5IGFuZCBNYXJrIEFkbGVyXG4vLyAoQykgMjAxNC0yMDE3IFZpdGFseSBQdXpyaW4gYW5kIEFuZHJleSBUdXBpdHNpblxuLy9cbi8vIFRoaXMgc29mdHdhcmUgaXMgcHJvdmlkZWQgJ2FzLWlzJywgd2l0aG91dCBhbnkgZXhwcmVzcyBvciBpbXBsaWVkXG4vLyB3YXJyYW50eS4gSW4gbm8gZXZlbnQgd2lsbCB0aGUgYXV0aG9ycyBiZSBoZWxkIGxpYWJsZSBmb3IgYW55IGRhbWFnZXNcbi8vIGFyaXNpbmcgZnJvbSB0aGUgdXNlIG9mIHRoaXMgc29mdHdhcmUuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBncmFudGVkIHRvIGFueW9uZSB0byB1c2UgdGhpcyBzb2Z0d2FyZSBmb3IgYW55IHB1cnBvc2UsXG4vLyBpbmNsdWRpbmcgY29tbWVyY2lhbCBhcHBsaWNhdGlvbnMsIGFuZCB0byBhbHRlciBpdCBhbmQgcmVkaXN0cmlidXRlIGl0XG4vLyBmcmVlbHksIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyByZXN0cmljdGlvbnM6XG4vL1xuLy8gMS4gVGhlIG9yaWdpbiBvZiB0aGlzIHNvZnR3YXJlIG11c3Qgbm90IGJlIG1pc3JlcHJlc2VudGVkOyB5b3UgbXVzdCBub3Rcbi8vICAgY2xhaW0gdGhhdCB5b3Ugd3JvdGUgdGhlIG9yaWdpbmFsIHNvZnR3YXJlLiBJZiB5b3UgdXNlIHRoaXMgc29mdHdhcmVcbi8vICAgaW4gYSBwcm9kdWN0LCBhbiBhY2tub3dsZWRnbWVudCBpbiB0aGUgcHJvZHVjdCBkb2N1bWVudGF0aW9uIHdvdWxkIGJlXG4vLyAgIGFwcHJlY2lhdGVkIGJ1dCBpcyBub3QgcmVxdWlyZWQuXG4vLyAyLiBBbHRlcmVkIHNvdXJjZSB2ZXJzaW9ucyBtdXN0IGJlIHBsYWlubHkgbWFya2VkIGFzIHN1Y2gsIGFuZCBtdXN0IG5vdCBiZVxuLy8gICBtaXNyZXByZXNlbnRlZCBhcyBiZWluZyB0aGUgb3JpZ2luYWwgc29mdHdhcmUuXG4vLyAzLiBUaGlzIG5vdGljZSBtYXkgbm90IGJlIHJlbW92ZWQgb3IgYWx0ZXJlZCBmcm9tIGFueSBzb3VyY2UgZGlzdHJpYnV0aW9uLlxuXG5mdW5jdGlvbiBHWmhlYWRlcigpIHtcbiAgLyogdHJ1ZSBpZiBjb21wcmVzc2VkIGRhdGEgYmVsaWV2ZWQgdG8gYmUgdGV4dCAqL1xuICB0aGlzLnRleHQgICAgICAgPSAwO1xuICAvKiBtb2RpZmljYXRpb24gdGltZSAqL1xuICB0aGlzLnRpbWUgICAgICAgPSAwO1xuICAvKiBleHRyYSBmbGFncyAobm90IHVzZWQgd2hlbiB3cml0aW5nIGEgZ3ppcCBmaWxlKSAqL1xuICB0aGlzLnhmbGFncyAgICAgPSAwO1xuICAvKiBvcGVyYXRpbmcgc3lzdGVtICovXG4gIHRoaXMub3MgICAgICAgICA9IDA7XG4gIC8qIHBvaW50ZXIgdG8gZXh0cmEgZmllbGQgb3IgWl9OVUxMIGlmIG5vbmUgKi9cbiAgdGhpcy5leHRyYSAgICAgID0gbnVsbDtcbiAgLyogZXh0cmEgZmllbGQgbGVuZ3RoICh2YWxpZCBpZiBleHRyYSAhPSBaX05VTEwpICovXG4gIHRoaXMuZXh0cmFfbGVuICA9IDA7IC8vIEFjdHVhbGx5LCB3ZSBkb24ndCBuZWVkIGl0IGluIEpTLFxuICAgICAgICAgICAgICAgICAgICAgICAvLyBidXQgbGVhdmUgZm9yIGZldyBjb2RlIG1vZGlmaWNhdGlvbnNcblxuICAvL1xuICAvLyBTZXR1cCBsaW1pdHMgaXMgbm90IG5lY2Vzc2FyeSBiZWNhdXNlIGluIGpzIHdlIHNob3VsZCBub3QgcHJlYWxsb2NhdGUgbWVtb3J5XG4gIC8vIGZvciBpbmZsYXRlIHVzZSBjb25zdGFudCBsaW1pdCBpbiA2NTUzNiBieXRlc1xuICAvL1xuXG4gIC8qIHNwYWNlIGF0IGV4dHJhIChvbmx5IHdoZW4gcmVhZGluZyBoZWFkZXIpICovXG4gIC8vIHRoaXMuZXh0cmFfbWF4ICA9IDA7XG4gIC8qIHBvaW50ZXIgdG8gemVyby10ZXJtaW5hdGVkIGZpbGUgbmFtZSBvciBaX05VTEwgKi9cbiAgdGhpcy5uYW1lICAgICAgID0gJyc7XG4gIC8qIHNwYWNlIGF0IG5hbWUgKG9ubHkgd2hlbiByZWFkaW5nIGhlYWRlcikgKi9cbiAgLy8gdGhpcy5uYW1lX21heCAgID0gMDtcbiAgLyogcG9pbnRlciB0byB6ZXJvLXRlcm1pbmF0ZWQgY29tbWVudCBvciBaX05VTEwgKi9cbiAgdGhpcy5jb21tZW50ICAgID0gJyc7XG4gIC8qIHNwYWNlIGF0IGNvbW1lbnQgKG9ubHkgd2hlbiByZWFkaW5nIGhlYWRlcikgKi9cbiAgLy8gdGhpcy5jb21tX21heCAgID0gMDtcbiAgLyogdHJ1ZSBpZiB0aGVyZSB3YXMgb3Igd2lsbCBiZSBhIGhlYWRlciBjcmMgKi9cbiAgdGhpcy5oY3JjICAgICAgID0gMDtcbiAgLyogdHJ1ZSB3aGVuIGRvbmUgcmVhZGluZyBnemlwIGhlYWRlciAobm90IHVzZWQgd2hlbiB3cml0aW5nIGEgZ3ppcCBmaWxlKSAqL1xuICB0aGlzLmRvbmUgICAgICAgPSBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHWmhlYWRlcjtcbiIsICIndXNlIHN0cmljdCc7XG5cblxudmFyIHpsaWJfaW5mbGF0ZSA9IHJlcXVpcmUoJy4vemxpYi9pbmZsYXRlJyk7XG52YXIgdXRpbHMgICAgICAgID0gcmVxdWlyZSgnLi91dGlscy9jb21tb24nKTtcbnZhciBzdHJpbmdzICAgICAgPSByZXF1aXJlKCcuL3V0aWxzL3N0cmluZ3MnKTtcbnZhciBjICAgICAgICAgICAgPSByZXF1aXJlKCcuL3psaWIvY29uc3RhbnRzJyk7XG52YXIgbXNnICAgICAgICAgID0gcmVxdWlyZSgnLi96bGliL21lc3NhZ2VzJyk7XG52YXIgWlN0cmVhbSAgICAgID0gcmVxdWlyZSgnLi96bGliL3pzdHJlYW0nKTtcbnZhciBHWmhlYWRlciAgICAgPSByZXF1aXJlKCcuL3psaWIvZ3poZWFkZXInKTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBjbGFzcyBJbmZsYXRlXG4gKlxuICogR2VuZXJpYyBKUy1zdHlsZSB3cmFwcGVyIGZvciB6bGliIGNhbGxzLiBJZiB5b3UgZG9uJ3QgbmVlZFxuICogc3RyZWFtaW5nIGJlaGF2aW91ciAtIHVzZSBtb3JlIHNpbXBsZSBmdW5jdGlvbnM6IFtbaW5mbGF0ZV1dXG4gKiBhbmQgW1tpbmZsYXRlUmF3XV0uXG4gKiovXG5cbi8qIGludGVybmFsXG4gKiBpbmZsYXRlLmNodW5rcyAtPiBBcnJheVxuICpcbiAqIENodW5rcyBvZiBvdXRwdXQgZGF0YSwgaWYgW1tJbmZsYXRlI29uRGF0YV1dIG5vdCBvdmVycmlkZGVuLlxuICoqL1xuXG4vKipcbiAqIEluZmxhdGUucmVzdWx0IC0+IFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nXG4gKlxuICogVW5jb21wcmVzc2VkIHJlc3VsdCwgZ2VuZXJhdGVkIGJ5IGRlZmF1bHQgW1tJbmZsYXRlI29uRGF0YV1dXG4gKiBhbmQgW1tJbmZsYXRlI29uRW5kXV0gaGFuZGxlcnMuIEZpbGxlZCBhZnRlciB5b3UgcHVzaCBsYXN0IGNodW5rXG4gKiAoY2FsbCBbW0luZmxhdGUjcHVzaF1dIHdpdGggYFpfRklOSVNIYCAvIGB0cnVlYCBwYXJhbSkgb3IgaWYgeW91XG4gKiBwdXNoIGEgY2h1bmsgd2l0aCBleHBsaWNpdCBmbHVzaCAoY2FsbCBbW0luZmxhdGUjcHVzaF1dIHdpdGhcbiAqIGBaX1NZTkNfRkxVU0hgIHBhcmFtKS5cbiAqKi9cblxuLyoqXG4gKiBJbmZsYXRlLmVyciAtPiBOdW1iZXJcbiAqXG4gKiBFcnJvciBjb2RlIGFmdGVyIGluZmxhdGUgZmluaXNoZWQuIDAgKFpfT0spIG9uIHN1Y2Nlc3MuXG4gKiBTaG91bGQgYmUgY2hlY2tlZCBpZiBicm9rZW4gZGF0YSBwb3NzaWJsZS5cbiAqKi9cblxuLyoqXG4gKiBJbmZsYXRlLm1zZyAtPiBTdHJpbmdcbiAqXG4gKiBFcnJvciBtZXNzYWdlLCBpZiBbW0luZmxhdGUuZXJyXV0gIT0gMFxuICoqL1xuXG5cbi8qKlxuICogbmV3IEluZmxhdGUob3B0aW9ucylcbiAqIC0gb3B0aW9ucyAoT2JqZWN0KTogemxpYiBpbmZsYXRlIG9wdGlvbnMuXG4gKlxuICogQ3JlYXRlcyBuZXcgaW5mbGF0b3IgaW5zdGFuY2Ugd2l0aCBzcGVjaWZpZWQgcGFyYW1zLiBUaHJvd3MgZXhjZXB0aW9uXG4gKiBvbiBiYWQgcGFyYW1zLiBTdXBwb3J0ZWQgb3B0aW9uczpcbiAqXG4gKiAtIGB3aW5kb3dCaXRzYFxuICogLSBgZGljdGlvbmFyeWBcbiAqXG4gKiBbaHR0cDovL3psaWIubmV0L21hbnVhbC5odG1sI0FkdmFuY2VkXShodHRwOi8vemxpYi5uZXQvbWFudWFsLmh0bWwjQWR2YW5jZWQpXG4gKiBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvbiB0aGVzZS5cbiAqXG4gKiBBZGRpdGlvbmFsIG9wdGlvbnMsIGZvciBpbnRlcm5hbCBuZWVkczpcbiAqXG4gKiAtIGBjaHVua1NpemVgIC0gc2l6ZSBvZiBnZW5lcmF0ZWQgZGF0YSBjaHVua3MgKDE2SyBieSBkZWZhdWx0KVxuICogLSBgcmF3YCAoQm9vbGVhbikgLSBkbyByYXcgaW5mbGF0ZVxuICogLSBgdG9gIChTdHJpbmcpIC0gaWYgZXF1YWwgdG8gJ3N0cmluZycsIHRoZW4gcmVzdWx0IHdpbGwgYmUgY29udmVydGVkXG4gKiAgIGZyb20gdXRmOCB0byB1dGYxNiAoamF2YXNjcmlwdCkgc3RyaW5nLiBXaGVuIHN0cmluZyBvdXRwdXQgcmVxdWVzdGVkLFxuICogICBjaHVuayBsZW5ndGggY2FuIGRpZmZlciBmcm9tIGBjaHVua1NpemVgLCBkZXBlbmRpbmcgb24gY29udGVudC5cbiAqXG4gKiBCeSBkZWZhdWx0LCB3aGVuIG5vIG9wdGlvbnMgc2V0LCBhdXRvZGV0ZWN0IGRlZmxhdGUvZ3ppcCBkYXRhIGZvcm1hdCB2aWFcbiAqIHdyYXBwZXIgaGVhZGVyLlxuICpcbiAqICMjIyMjIEV4YW1wbGU6XG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogdmFyIHBha28gPSByZXF1aXJlKCdwYWtvJylcbiAqICAgLCBjaHVuazEgPSBVaW50OEFycmF5KFsxLDIsMyw0LDUsNiw3LDgsOV0pXG4gKiAgICwgY2h1bmsyID0gVWludDhBcnJheShbMTAsMTEsMTIsMTMsMTQsMTUsMTYsMTcsMTgsMTldKTtcbiAqXG4gKiB2YXIgaW5mbGF0ZSA9IG5ldyBwYWtvLkluZmxhdGUoeyBsZXZlbDogM30pO1xuICpcbiAqIGluZmxhdGUucHVzaChjaHVuazEsIGZhbHNlKTtcbiAqIGluZmxhdGUucHVzaChjaHVuazIsIHRydWUpOyAgLy8gdHJ1ZSAtPiBsYXN0IGNodW5rXG4gKlxuICogaWYgKGluZmxhdGUuZXJyKSB7IHRocm93IG5ldyBFcnJvcihpbmZsYXRlLmVycik7IH1cbiAqXG4gKiBjb25zb2xlLmxvZyhpbmZsYXRlLnJlc3VsdCk7XG4gKiBgYGBcbiAqKi9cbmZ1bmN0aW9uIEluZmxhdGUob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgSW5mbGF0ZSkpIHJldHVybiBuZXcgSW5mbGF0ZShvcHRpb25zKTtcblxuICB0aGlzLm9wdGlvbnMgPSB1dGlscy5hc3NpZ24oe1xuICAgIGNodW5rU2l6ZTogMTYzODQsXG4gICAgd2luZG93Qml0czogMCxcbiAgICB0bzogJydcbiAgfSwgb3B0aW9ucyB8fCB7fSk7XG5cbiAgdmFyIG9wdCA9IHRoaXMub3B0aW9ucztcblxuICAvLyBGb3JjZSB3aW5kb3cgc2l6ZSBmb3IgYHJhd2AgZGF0YSwgaWYgbm90IHNldCBkaXJlY3RseSxcbiAgLy8gYmVjYXVzZSB3ZSBoYXZlIG5vIGhlYWRlciBmb3IgYXV0b2RldGVjdC5cbiAgaWYgKG9wdC5yYXcgJiYgKG9wdC53aW5kb3dCaXRzID49IDApICYmIChvcHQud2luZG93Qml0cyA8IDE2KSkge1xuICAgIG9wdC53aW5kb3dCaXRzID0gLW9wdC53aW5kb3dCaXRzO1xuICAgIGlmIChvcHQud2luZG93Qml0cyA9PT0gMCkgeyBvcHQud2luZG93Qml0cyA9IC0xNTsgfVxuICB9XG5cbiAgLy8gSWYgYHdpbmRvd0JpdHNgIG5vdCBkZWZpbmVkIChhbmQgbW9kZSBub3QgcmF3KSAtIHNldCBhdXRvZGV0ZWN0IGZsYWcgZm9yIGd6aXAvZGVmbGF0ZVxuICBpZiAoKG9wdC53aW5kb3dCaXRzID49IDApICYmIChvcHQud2luZG93Qml0cyA8IDE2KSAmJlxuICAgICAgIShvcHRpb25zICYmIG9wdGlvbnMud2luZG93Qml0cykpIHtcbiAgICBvcHQud2luZG93Qml0cyArPSAzMjtcbiAgfVxuXG4gIC8vIEd6aXAgaGVhZGVyIGhhcyBubyBpbmZvIGFib3V0IHdpbmRvd3Mgc2l6ZSwgd2UgY2FuIGRvIGF1dG9kZXRlY3Qgb25seVxuICAvLyBmb3IgZGVmbGF0ZS4gU28sIGlmIHdpbmRvdyBzaXplIG5vdCBzZXQsIGZvcmNlIGl0IHRvIG1heCB3aGVuIGd6aXAgcG9zc2libGVcbiAgaWYgKChvcHQud2luZG93Qml0cyA+IDE1KSAmJiAob3B0LndpbmRvd0JpdHMgPCA0OCkpIHtcbiAgICAvLyBiaXQgMyAoMTYpIC0+IGd6aXBwZWQgZGF0YVxuICAgIC8vIGJpdCA0ICgzMikgLT4gYXV0b2RldGVjdCBnemlwL2RlZmxhdGVcbiAgICBpZiAoKG9wdC53aW5kb3dCaXRzICYgMTUpID09PSAwKSB7XG4gICAgICBvcHQud2luZG93Qml0cyB8PSAxNTtcbiAgICB9XG4gIH1cblxuICB0aGlzLmVyciAgICA9IDA7ICAgICAgLy8gZXJyb3IgY29kZSwgaWYgaGFwcGVucyAoMCA9IFpfT0spXG4gIHRoaXMubXNnICAgID0gJyc7ICAgICAvLyBlcnJvciBtZXNzYWdlXG4gIHRoaXMuZW5kZWQgID0gZmFsc2U7ICAvLyB1c2VkIHRvIGF2b2lkIG11bHRpcGxlIG9uRW5kKCkgY2FsbHNcbiAgdGhpcy5jaHVua3MgPSBbXTsgICAgIC8vIGNodW5rcyBvZiBjb21wcmVzc2VkIGRhdGFcblxuICB0aGlzLnN0cm0gICA9IG5ldyBaU3RyZWFtKCk7XG4gIHRoaXMuc3RybS5hdmFpbF9vdXQgPSAwO1xuXG4gIHZhciBzdGF0dXMgID0gemxpYl9pbmZsYXRlLmluZmxhdGVJbml0MihcbiAgICB0aGlzLnN0cm0sXG4gICAgb3B0LndpbmRvd0JpdHNcbiAgKTtcblxuICBpZiAoc3RhdHVzICE9PSBjLlpfT0spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnW3N0YXR1c10pO1xuICB9XG5cbiAgdGhpcy5oZWFkZXIgPSBuZXcgR1poZWFkZXIoKTtcblxuICB6bGliX2luZmxhdGUuaW5mbGF0ZUdldEhlYWRlcih0aGlzLnN0cm0sIHRoaXMuaGVhZGVyKTtcblxuICAvLyBTZXR1cCBkaWN0aW9uYXJ5XG4gIGlmIChvcHQuZGljdGlvbmFyeSkge1xuICAgIC8vIENvbnZlcnQgZGF0YSBpZiBuZWVkZWRcbiAgICBpZiAodHlwZW9mIG9wdC5kaWN0aW9uYXJ5ID09PSAnc3RyaW5nJykge1xuICAgICAgb3B0LmRpY3Rpb25hcnkgPSBzdHJpbmdzLnN0cmluZzJidWYob3B0LmRpY3Rpb25hcnkpO1xuICAgIH0gZWxzZSBpZiAodG9TdHJpbmcuY2FsbChvcHQuZGljdGlvbmFyeSkgPT09ICdbb2JqZWN0IEFycmF5QnVmZmVyXScpIHtcbiAgICAgIG9wdC5kaWN0aW9uYXJ5ID0gbmV3IFVpbnQ4QXJyYXkob3B0LmRpY3Rpb25hcnkpO1xuICAgIH1cbiAgICBpZiAob3B0LnJhdykgeyAvL0luIHJhdyBtb2RlIHdlIG5lZWQgdG8gc2V0IHRoZSBkaWN0aW9uYXJ5IGVhcmx5XG4gICAgICBzdGF0dXMgPSB6bGliX2luZmxhdGUuaW5mbGF0ZVNldERpY3Rpb25hcnkodGhpcy5zdHJtLCBvcHQuZGljdGlvbmFyeSk7XG4gICAgICBpZiAoc3RhdHVzICE9PSBjLlpfT0spIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZ1tzdGF0dXNdKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBJbmZsYXRlI3B1c2goZGF0YVssIG1vZGVdKSAtPiBCb29sZWFuXG4gKiAtIGRhdGEgKFVpbnQ4QXJyYXl8QXJyYXl8QXJyYXlCdWZmZXJ8U3RyaW5nKTogaW5wdXQgZGF0YVxuICogLSBtb2RlIChOdW1iZXJ8Qm9vbGVhbik6IDAuLjYgZm9yIGNvcnJlc3BvbmRpbmcgWl9OT19GTFVTSC4uWl9UUkVFIG1vZGVzLlxuICogICBTZWUgY29uc3RhbnRzLiBTa2lwcGVkIG9yIGBmYWxzZWAgbWVhbnMgWl9OT19GTFVTSCwgYHRydWVgIG1lYW5zIFpfRklOSVNILlxuICpcbiAqIFNlbmRzIGlucHV0IGRhdGEgdG8gaW5mbGF0ZSBwaXBlLCBnZW5lcmF0aW5nIFtbSW5mbGF0ZSNvbkRhdGFdXSBjYWxscyB3aXRoXG4gKiBuZXcgb3V0cHV0IGNodW5rcy4gUmV0dXJucyBgdHJ1ZWAgb24gc3VjY2Vzcy4gVGhlIGxhc3QgZGF0YSBibG9jayBtdXN0IGhhdmVcbiAqIG1vZGUgWl9GSU5JU0ggKG9yIGB0cnVlYCkuIFRoYXQgd2lsbCBmbHVzaCBpbnRlcm5hbCBwZW5kaW5nIGJ1ZmZlcnMgYW5kIGNhbGxcbiAqIFtbSW5mbGF0ZSNvbkVuZF1dLiBGb3IgaW50ZXJpbSBleHBsaWNpdCBmbHVzaGVzICh3aXRob3V0IGVuZGluZyB0aGUgc3RyZWFtKSB5b3VcbiAqIGNhbiB1c2UgbW9kZSBaX1NZTkNfRkxVU0gsIGtlZXBpbmcgdGhlIGRlY29tcHJlc3Npb24gY29udGV4dC5cbiAqXG4gKiBPbiBmYWlsIGNhbGwgW1tJbmZsYXRlI29uRW5kXV0gd2l0aCBlcnJvciBjb2RlIGFuZCByZXR1cm4gZmFsc2UuXG4gKlxuICogV2Ugc3Ryb25nbHkgcmVjb21tZW5kIHRvIHVzZSBgVWludDhBcnJheWAgb24gaW5wdXQgZm9yIGJlc3Qgc3BlZWQgKG91dHB1dFxuICogZm9ybWF0IGlzIGRldGVjdGVkIGF1dG9tYXRpY2FsbHkpLiBBbHNvLCBkb24ndCBza2lwIGxhc3QgcGFyYW0gYW5kIGFsd2F5c1xuICogdXNlIHRoZSBzYW1lIHR5cGUgaW4geW91ciBjb2RlIChib29sZWFuIG9yIG51bWJlcikuIFRoYXQgd2lsbCBpbXByb3ZlIEpTIHNwZWVkLlxuICpcbiAqIEZvciByZWd1bGFyIGBBcnJheWAtcyBtYWtlIHN1cmUgYWxsIGVsZW1lbnRzIGFyZSBbMC4uMjU1XS5cbiAqXG4gKiAjIyMjIyBFeGFtcGxlXG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogcHVzaChjaHVuaywgZmFsc2UpOyAvLyBwdXNoIG9uZSBvZiBkYXRhIGNodW5rc1xuICogLi4uXG4gKiBwdXNoKGNodW5rLCB0cnVlKTsgIC8vIHB1c2ggbGFzdCBjaHVua1xuICogYGBgXG4gKiovXG5JbmZsYXRlLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKGRhdGEsIG1vZGUpIHtcbiAgdmFyIHN0cm0gPSB0aGlzLnN0cm07XG4gIHZhciBjaHVua1NpemUgPSB0aGlzLm9wdGlvbnMuY2h1bmtTaXplO1xuICB2YXIgZGljdGlvbmFyeSA9IHRoaXMub3B0aW9ucy5kaWN0aW9uYXJ5O1xuICB2YXIgc3RhdHVzLCBfbW9kZTtcbiAgdmFyIG5leHRfb3V0X3V0ZjgsIHRhaWwsIHV0ZjhzdHI7XG5cbiAgLy8gRmxhZyB0byBwcm9wZXJseSBwcm9jZXNzIFpfQlVGX0VSUk9SIG9uIHRlc3RpbmcgaW5mbGF0ZSBjYWxsXG4gIC8vIHdoZW4gd2UgY2hlY2sgdGhhdCBhbGwgb3V0cHV0IGRhdGEgd2FzIGZsdXNoZWQuXG4gIHZhciBhbGxvd0J1ZkVycm9yID0gZmFsc2U7XG5cbiAgaWYgKHRoaXMuZW5kZWQpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIF9tb2RlID0gKG1vZGUgPT09IH5+bW9kZSkgPyBtb2RlIDogKChtb2RlID09PSB0cnVlKSA/IGMuWl9GSU5JU0ggOiBjLlpfTk9fRkxVU0gpO1xuXG4gIC8vIENvbnZlcnQgZGF0YSBpZiBuZWVkZWRcbiAgaWYgKHR5cGVvZiBkYXRhID09PSAnc3RyaW5nJykge1xuICAgIC8vIE9ubHkgYmluYXJ5IHN0cmluZ3MgY2FuIGJlIGRlY29tcHJlc3NlZCBvbiBwcmFjdGljZVxuICAgIHN0cm0uaW5wdXQgPSBzdHJpbmdzLmJpbnN0cmluZzJidWYoZGF0YSk7XG4gIH0gZWxzZSBpZiAodG9TdHJpbmcuY2FsbChkYXRhKSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJykge1xuICAgIHN0cm0uaW5wdXQgPSBuZXcgVWludDhBcnJheShkYXRhKTtcbiAgfSBlbHNlIHtcbiAgICBzdHJtLmlucHV0ID0gZGF0YTtcbiAgfVxuXG4gIHN0cm0ubmV4dF9pbiA9IDA7XG4gIHN0cm0uYXZhaWxfaW4gPSBzdHJtLmlucHV0Lmxlbmd0aDtcblxuICBkbyB7XG4gICAgaWYgKHN0cm0uYXZhaWxfb3V0ID09PSAwKSB7XG4gICAgICBzdHJtLm91dHB1dCA9IG5ldyB1dGlscy5CdWY4KGNodW5rU2l6ZSk7XG4gICAgICBzdHJtLm5leHRfb3V0ID0gMDtcbiAgICAgIHN0cm0uYXZhaWxfb3V0ID0gY2h1bmtTaXplO1xuICAgIH1cblxuICAgIHN0YXR1cyA9IHpsaWJfaW5mbGF0ZS5pbmZsYXRlKHN0cm0sIGMuWl9OT19GTFVTSCk7ICAgIC8qIG5vIGJhZCByZXR1cm4gdmFsdWUgKi9cblxuICAgIGlmIChzdGF0dXMgPT09IGMuWl9ORUVEX0RJQ1QgJiYgZGljdGlvbmFyeSkge1xuICAgICAgc3RhdHVzID0gemxpYl9pbmZsYXRlLmluZmxhdGVTZXREaWN0aW9uYXJ5KHRoaXMuc3RybSwgZGljdGlvbmFyeSk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXR1cyA9PT0gYy5aX0JVRl9FUlJPUiAmJiBhbGxvd0J1ZkVycm9yID09PSB0cnVlKSB7XG4gICAgICBzdGF0dXMgPSBjLlpfT0s7XG4gICAgICBhbGxvd0J1ZkVycm9yID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHN0YXR1cyAhPT0gYy5aX1NUUkVBTV9FTkQgJiYgc3RhdHVzICE9PSBjLlpfT0spIHtcbiAgICAgIHRoaXMub25FbmQoc3RhdHVzKTtcbiAgICAgIHRoaXMuZW5kZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChzdHJtLm5leHRfb3V0KSB7XG4gICAgICBpZiAoc3RybS5hdmFpbF9vdXQgPT09IDAgfHwgc3RhdHVzID09PSBjLlpfU1RSRUFNX0VORCB8fCAoc3RybS5hdmFpbF9pbiA9PT0gMCAmJiAoX21vZGUgPT09IGMuWl9GSU5JU0ggfHwgX21vZGUgPT09IGMuWl9TWU5DX0ZMVVNIKSkpIHtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnRvID09PSAnc3RyaW5nJykge1xuXG4gICAgICAgICAgbmV4dF9vdXRfdXRmOCA9IHN0cmluZ3MudXRmOGJvcmRlcihzdHJtLm91dHB1dCwgc3RybS5uZXh0X291dCk7XG5cbiAgICAgICAgICB0YWlsID0gc3RybS5uZXh0X291dCAtIG5leHRfb3V0X3V0Zjg7XG4gICAgICAgICAgdXRmOHN0ciA9IHN0cmluZ3MuYnVmMnN0cmluZyhzdHJtLm91dHB1dCwgbmV4dF9vdXRfdXRmOCk7XG5cbiAgICAgICAgICAvLyBtb3ZlIHRhaWxcbiAgICAgICAgICBzdHJtLm5leHRfb3V0ID0gdGFpbDtcbiAgICAgICAgICBzdHJtLmF2YWlsX291dCA9IGNodW5rU2l6ZSAtIHRhaWw7XG4gICAgICAgICAgaWYgKHRhaWwpIHsgdXRpbHMuYXJyYXlTZXQoc3RybS5vdXRwdXQsIHN0cm0ub3V0cHV0LCBuZXh0X291dF91dGY4LCB0YWlsLCAwKTsgfVxuXG4gICAgICAgICAgdGhpcy5vbkRhdGEodXRmOHN0cik7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLm9uRGF0YSh1dGlscy5zaHJpbmtCdWYoc3RybS5vdXRwdXQsIHN0cm0ubmV4dF9vdXQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdoZW4gbm8gbW9yZSBpbnB1dCBkYXRhLCB3ZSBzaG91bGQgY2hlY2sgdGhhdCBpbnRlcm5hbCBpbmZsYXRlIGJ1ZmZlcnNcbiAgICAvLyBhcmUgZmx1c2hlZC4gVGhlIG9ubHkgd2F5IHRvIGRvIGl0IHdoZW4gYXZhaWxfb3V0ID0gMCAtIHJ1biBvbmUgbW9yZVxuICAgIC8vIGluZmxhdGUgcGFzcy4gQnV0IGlmIG91dHB1dCBkYXRhIG5vdCBleGlzdHMsIGluZmxhdGUgcmV0dXJuIFpfQlVGX0VSUk9SLlxuICAgIC8vIEhlcmUgd2Ugc2V0IGZsYWcgdG8gcHJvY2VzcyB0aGlzIGVycm9yIHByb3Blcmx5LlxuICAgIC8vXG4gICAgLy8gTk9URS4gRGVmbGF0ZSBkb2VzIG5vdCByZXR1cm4gZXJyb3IgaW4gdGhpcyBjYXNlIGFuZCBkb2VzIG5vdCBuZWVkcyBzdWNoXG4gICAgLy8gbG9naWMuXG4gICAgaWYgKHN0cm0uYXZhaWxfaW4gPT09IDAgJiYgc3RybS5hdmFpbF9vdXQgPT09IDApIHtcbiAgICAgIGFsbG93QnVmRXJyb3IgPSB0cnVlO1xuICAgIH1cblxuICB9IHdoaWxlICgoc3RybS5hdmFpbF9pbiA+IDAgfHwgc3RybS5hdmFpbF9vdXQgPT09IDApICYmIHN0YXR1cyAhPT0gYy5aX1NUUkVBTV9FTkQpO1xuXG4gIGlmIChzdGF0dXMgPT09IGMuWl9TVFJFQU1fRU5EKSB7XG4gICAgX21vZGUgPSBjLlpfRklOSVNIO1xuICB9XG5cbiAgLy8gRmluYWxpemUgb24gdGhlIGxhc3QgY2h1bmsuXG4gIGlmIChfbW9kZSA9PT0gYy5aX0ZJTklTSCkge1xuICAgIHN0YXR1cyA9IHpsaWJfaW5mbGF0ZS5pbmZsYXRlRW5kKHRoaXMuc3RybSk7XG4gICAgdGhpcy5vbkVuZChzdGF0dXMpO1xuICAgIHRoaXMuZW5kZWQgPSB0cnVlO1xuICAgIHJldHVybiBzdGF0dXMgPT09IGMuWl9PSztcbiAgfVxuXG4gIC8vIGNhbGxiYWNrIGludGVyaW0gcmVzdWx0cyBpZiBaX1NZTkNfRkxVU0guXG4gIGlmIChfbW9kZSA9PT0gYy5aX1NZTkNfRkxVU0gpIHtcbiAgICB0aGlzLm9uRW5kKGMuWl9PSyk7XG4gICAgc3RybS5hdmFpbF9vdXQgPSAwO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogSW5mbGF0ZSNvbkRhdGEoY2h1bmspIC0+IFZvaWRcbiAqIC0gY2h1bmsgKFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nKTogb3V0cHV0IGRhdGEuIFR5cGUgb2YgYXJyYXkgZGVwZW5kc1xuICogICBvbiBqcyBlbmdpbmUgc3VwcG9ydC4gV2hlbiBzdHJpbmcgb3V0cHV0IHJlcXVlc3RlZCwgZWFjaCBjaHVua1xuICogICB3aWxsIGJlIHN0cmluZy5cbiAqXG4gKiBCeSBkZWZhdWx0LCBzdG9yZXMgZGF0YSBibG9ja3MgaW4gYGNodW5rc1tdYCBwcm9wZXJ0eSBhbmQgZ2x1ZVxuICogdGhvc2UgaW4gYG9uRW5kYC4gT3ZlcnJpZGUgdGhpcyBoYW5kbGVyLCBpZiB5b3UgbmVlZCBhbm90aGVyIGJlaGF2aW91ci5cbiAqKi9cbkluZmxhdGUucHJvdG90eXBlLm9uRGF0YSA9IGZ1bmN0aW9uIChjaHVuaykge1xuICB0aGlzLmNodW5rcy5wdXNoKGNodW5rKTtcbn07XG5cblxuLyoqXG4gKiBJbmZsYXRlI29uRW5kKHN0YXR1cykgLT4gVm9pZFxuICogLSBzdGF0dXMgKE51bWJlcik6IGluZmxhdGUgc3RhdHVzLiAwIChaX09LKSBvbiBzdWNjZXNzLFxuICogICBvdGhlciBpZiBub3QuXG4gKlxuICogQ2FsbGVkIGVpdGhlciBhZnRlciB5b3UgdGVsbCBpbmZsYXRlIHRoYXQgdGhlIGlucHV0IHN0cmVhbSBpc1xuICogY29tcGxldGUgKFpfRklOSVNIKSBvciBzaG91bGQgYmUgZmx1c2hlZCAoWl9TWU5DX0ZMVVNIKVxuICogb3IgaWYgYW4gZXJyb3IgaGFwcGVuZWQuIEJ5IGRlZmF1bHQgLSBqb2luIGNvbGxlY3RlZCBjaHVua3MsXG4gKiBmcmVlIG1lbW9yeSBhbmQgZmlsbCBgcmVzdWx0c2AgLyBgZXJyYCBwcm9wZXJ0aWVzLlxuICoqL1xuSW5mbGF0ZS5wcm90b3R5cGUub25FbmQgPSBmdW5jdGlvbiAoc3RhdHVzKSB7XG4gIC8vIE9uIHN1Y2Nlc3MgLSBqb2luXG4gIGlmIChzdGF0dXMgPT09IGMuWl9PSykge1xuICAgIGlmICh0aGlzLm9wdGlvbnMudG8gPT09ICdzdHJpbmcnKSB7XG4gICAgICAvLyBHbHVlICYgY29udmVydCBoZXJlLCB1bnRpbCB3ZSB0ZWFjaCBwYWtvIHRvIHNlbmRcbiAgICAgIC8vIHV0ZjggYWxpZ25lZCBzdHJpbmdzIHRvIG9uRGF0YVxuICAgICAgdGhpcy5yZXN1bHQgPSB0aGlzLmNodW5rcy5qb2luKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXN1bHQgPSB1dGlscy5mbGF0dGVuQ2h1bmtzKHRoaXMuY2h1bmtzKTtcbiAgICB9XG4gIH1cbiAgdGhpcy5jaHVua3MgPSBbXTtcbiAgdGhpcy5lcnIgPSBzdGF0dXM7XG4gIHRoaXMubXNnID0gdGhpcy5zdHJtLm1zZztcbn07XG5cblxuLyoqXG4gKiBpbmZsYXRlKGRhdGFbLCBvcHRpb25zXSkgLT4gVWludDhBcnJheXxBcnJheXxTdHJpbmdcbiAqIC0gZGF0YSAoVWludDhBcnJheXxBcnJheXxTdHJpbmcpOiBpbnB1dCBkYXRhIHRvIGRlY29tcHJlc3MuXG4gKiAtIG9wdGlvbnMgKE9iamVjdCk6IHpsaWIgaW5mbGF0ZSBvcHRpb25zLlxuICpcbiAqIERlY29tcHJlc3MgYGRhdGFgIHdpdGggaW5mbGF0ZS91bmd6aXAgYW5kIGBvcHRpb25zYC4gQXV0b2RldGVjdFxuICogZm9ybWF0IHZpYSB3cmFwcGVyIGhlYWRlciBieSBkZWZhdWx0LiBUaGF0J3Mgd2h5IHdlIGRvbid0IHByb3ZpZGVcbiAqIHNlcGFyYXRlIGB1bmd6aXBgIG1ldGhvZC5cbiAqXG4gKiBTdXBwb3J0ZWQgb3B0aW9ucyBhcmU6XG4gKlxuICogLSB3aW5kb3dCaXRzXG4gKlxuICogW2h0dHA6Ly96bGliLm5ldC9tYW51YWwuaHRtbCNBZHZhbmNlZF0oaHR0cDovL3psaWIubmV0L21hbnVhbC5odG1sI0FkdmFuY2VkKVxuICogZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKlxuICogU3VnYXIgKG9wdGlvbnMpOlxuICpcbiAqIC0gYHJhd2AgKEJvb2xlYW4pIC0gc2F5IHRoYXQgd2Ugd29yayB3aXRoIHJhdyBzdHJlYW0sIGlmIHlvdSBkb24ndCB3aXNoIHRvIHNwZWNpZnlcbiAqICAgbmVnYXRpdmUgd2luZG93Qml0cyBpbXBsaWNpdGx5LlxuICogLSBgdG9gIChTdHJpbmcpIC0gaWYgZXF1YWwgdG8gJ3N0cmluZycsIHRoZW4gcmVzdWx0IHdpbGwgYmUgY29udmVydGVkXG4gKiAgIGZyb20gdXRmOCB0byB1dGYxNiAoamF2YXNjcmlwdCkgc3RyaW5nLiBXaGVuIHN0cmluZyBvdXRwdXQgcmVxdWVzdGVkLFxuICogICBjaHVuayBsZW5ndGggY2FuIGRpZmZlciBmcm9tIGBjaHVua1NpemVgLCBkZXBlbmRpbmcgb24gY29udGVudC5cbiAqXG4gKlxuICogIyMjIyMgRXhhbXBsZTpcbiAqXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiB2YXIgcGFrbyA9IHJlcXVpcmUoJ3Bha28nKVxuICogICAsIGlucHV0ID0gcGFrby5kZWZsYXRlKFsxLDIsMyw0LDUsNiw3LDgsOV0pXG4gKiAgICwgb3V0cHV0O1xuICpcbiAqIHRyeSB7XG4gKiAgIG91dHB1dCA9IHBha28uaW5mbGF0ZShpbnB1dCk7XG4gKiB9IGNhdGNoIChlcnIpXG4gKiAgIGNvbnNvbGUubG9nKGVycik7XG4gKiB9XG4gKiBgYGBcbiAqKi9cbmZ1bmN0aW9uIGluZmxhdGUoaW5wdXQsIG9wdGlvbnMpIHtcbiAgdmFyIGluZmxhdG9yID0gbmV3IEluZmxhdGUob3B0aW9ucyk7XG5cbiAgaW5mbGF0b3IucHVzaChpbnB1dCwgdHJ1ZSk7XG5cbiAgLy8gVGhhdCB3aWxsIG5ldmVyIGhhcHBlbnMsIGlmIHlvdSBkb24ndCBjaGVhdCB3aXRoIG9wdGlvbnMgOilcbiAgaWYgKGluZmxhdG9yLmVycikgeyB0aHJvdyBpbmZsYXRvci5tc2cgfHwgbXNnW2luZmxhdG9yLmVycl07IH1cblxuICByZXR1cm4gaW5mbGF0b3IucmVzdWx0O1xufVxuXG5cbi8qKlxuICogaW5mbGF0ZVJhdyhkYXRhWywgb3B0aW9uc10pIC0+IFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nXG4gKiAtIGRhdGEgKFVpbnQ4QXJyYXl8QXJyYXl8U3RyaW5nKTogaW5wdXQgZGF0YSB0byBkZWNvbXByZXNzLlxuICogLSBvcHRpb25zIChPYmplY3QpOiB6bGliIGluZmxhdGUgb3B0aW9ucy5cbiAqXG4gKiBUaGUgc2FtZSBhcyBbW2luZmxhdGVdXSwgYnV0IGNyZWF0ZXMgcmF3IGRhdGEsIHdpdGhvdXQgd3JhcHBlclxuICogKGhlYWRlciBhbmQgYWRsZXIzMiBjcmMpLlxuICoqL1xuZnVuY3Rpb24gaW5mbGF0ZVJhdyhpbnB1dCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgb3B0aW9ucy5yYXcgPSB0cnVlO1xuICByZXR1cm4gaW5mbGF0ZShpbnB1dCwgb3B0aW9ucyk7XG59XG5cblxuLyoqXG4gKiB1bmd6aXAoZGF0YVssIG9wdGlvbnNdKSAtPiBVaW50OEFycmF5fEFycmF5fFN0cmluZ1xuICogLSBkYXRhIChVaW50OEFycmF5fEFycmF5fFN0cmluZyk6IGlucHV0IGRhdGEgdG8gZGVjb21wcmVzcy5cbiAqIC0gb3B0aW9ucyAoT2JqZWN0KTogemxpYiBpbmZsYXRlIG9wdGlvbnMuXG4gKlxuICogSnVzdCBzaG9ydGN1dCB0byBbW2luZmxhdGVdXSwgYmVjYXVzZSBpdCBhdXRvZGV0ZWN0cyBmb3JtYXRcbiAqIGJ5IGhlYWRlci5jb250ZW50LiBEb25lIGZvciBjb252ZW5pZW5jZS5cbiAqKi9cblxuXG5leHBvcnRzLkluZmxhdGUgPSBJbmZsYXRlO1xuZXhwb3J0cy5pbmZsYXRlID0gaW5mbGF0ZTtcbmV4cG9ydHMuaW5mbGF0ZVJhdyA9IGluZmxhdGVSYXc7XG5leHBvcnRzLnVuZ3ppcCAgPSBpbmZsYXRlO1xuIiwgIi8vIFRvcCBsZXZlbCBmaWxlIGlzIGp1c3QgYSBtaXhpbiBvZiBzdWJtb2R1bGVzICYgY29uc3RhbnRzXG4ndXNlIHN0cmljdCc7XG5cbnZhciBhc3NpZ24gICAgPSByZXF1aXJlKCcuL2xpYi91dGlscy9jb21tb24nKS5hc3NpZ247XG5cbnZhciBkZWZsYXRlICAgPSByZXF1aXJlKCcuL2xpYi9kZWZsYXRlJyk7XG52YXIgaW5mbGF0ZSAgID0gcmVxdWlyZSgnLi9saWIvaW5mbGF0ZScpO1xudmFyIGNvbnN0YW50cyA9IHJlcXVpcmUoJy4vbGliL3psaWIvY29uc3RhbnRzJyk7XG5cbnZhciBwYWtvID0ge307XG5cbmFzc2lnbihwYWtvLCBkZWZsYXRlLCBpbmZsYXRlLCBjb25zdGFudHMpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBha287XG4iLCAiXG47KGZ1bmN0aW9uKCl7XG52YXIgVVBORyA9IHt9O1xuXG4vLyBNYWtlIGF2YWlsYWJsZSBmb3IgaW1wb3J0IGJ5IGByZXF1aXJlKClgXG52YXIgcGFrbztcbmlmICh0eXBlb2YgbW9kdWxlID09IFwib2JqZWN0XCIpIHttb2R1bGUuZXhwb3J0cyA9IFVQTkc7fSAgZWxzZSB7d2luZG93LlVQTkcgPSBVUE5HO31cbmlmICh0eXBlb2YgcmVxdWlyZSA9PSBcImZ1bmN0aW9uXCIpIHtwYWtvID0gcmVxdWlyZShcInBha29cIik7fSAgZWxzZSB7cGFrbyA9IHdpbmRvdy5wYWtvO31cbmZ1bmN0aW9uIGxvZygpIHsgaWYgKHR5cGVvZiBwcm9jZXNzPT1cInVuZGVmaW5lZFwiIHx8IHByb2Nlc3MuZW52Lk5PREVfRU5WPT1cImRldmVsb3BtZW50XCIpIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cyk7ICB9XG4oZnVuY3Rpb24oVVBORywgcGFrbyl7XG5cblx0XG5cblx0XG5cblVQTkcudG9SR0JBOCA9IGZ1bmN0aW9uKG91dClcbntcblx0dmFyIHcgPSBvdXQud2lkdGgsIGggPSBvdXQuaGVpZ2h0O1xuXHRpZihvdXQudGFicy5hY1RMPT1udWxsKSByZXR1cm4gW1VQTkcudG9SR0JBOC5kZWNvZGVJbWFnZShvdXQuZGF0YSwgdywgaCwgb3V0KS5idWZmZXJdO1xuXHRcblx0dmFyIGZybXMgPSBbXTtcblx0aWYob3V0LmZyYW1lc1swXS5kYXRhPT1udWxsKSBvdXQuZnJhbWVzWzBdLmRhdGEgPSBvdXQuZGF0YTtcblx0XG5cdHZhciBpbWcsIGVtcHR5ID0gbmV3IFVpbnQ4QXJyYXkodypoKjQpO1xuXHRmb3IodmFyIGk9MDsgaTxvdXQuZnJhbWVzLmxlbmd0aDsgaSsrKVxuXHR7XG5cdFx0dmFyIGZybSA9IG91dC5mcmFtZXNbaV07XG5cdFx0dmFyIGZ4PWZybS5yZWN0LngsIGZ5PWZybS5yZWN0LnksIGZ3ID0gZnJtLnJlY3Qud2lkdGgsIGZoID0gZnJtLnJlY3QuaGVpZ2h0O1xuXHRcdHZhciBmZGF0YSA9IFVQTkcudG9SR0JBOC5kZWNvZGVJbWFnZShmcm0uZGF0YSwgZncsZmgsIG91dCk7XG5cdFx0XG5cdFx0aWYoaT09MCkgaW1nID0gZmRhdGE7XG5cdFx0ZWxzZSBpZihmcm0uYmxlbmQgID09MCkgVVBORy5fY29weVRpbGUoZmRhdGEsIGZ3LCBmaCwgaW1nLCB3LCBoLCBmeCwgZnksIDApO1xuXHRcdGVsc2UgaWYoZnJtLmJsZW5kICA9PTEpIFVQTkcuX2NvcHlUaWxlKGZkYXRhLCBmdywgZmgsIGltZywgdywgaCwgZngsIGZ5LCAxKTtcblx0XHRcblx0XHRmcm1zLnB1c2goaW1nLmJ1ZmZlcik7ICBpbWcgPSBpbWcuc2xpY2UoMCk7XG5cdFx0XG5cdFx0aWYgICAgIChmcm0uZGlzcG9zZT09MCkge31cblx0XHRlbHNlIGlmKGZybS5kaXNwb3NlPT0xKSBVUE5HLl9jb3B5VGlsZShlbXB0eSwgZncsIGZoLCBpbWcsIHcsIGgsIGZ4LCBmeSwgMCk7XG5cdFx0ZWxzZSBpZihmcm0uZGlzcG9zZT09Mikge1xuXHRcdFx0dmFyIHBpID0gaS0xO1xuXHRcdFx0d2hpbGUob3V0LmZyYW1lc1twaV0uZGlzcG9zZT09MikgcGktLTtcblx0XHRcdGltZyA9IG5ldyBVaW50OEFycmF5KGZybXNbcGldKS5zbGljZSgwKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGZybXM7XG59XG5VUE5HLnRvUkdCQTguZGVjb2RlSW1hZ2UgPSBmdW5jdGlvbihkYXRhLCB3LCBoLCBvdXQpXG57XG5cdHZhciBhcmVhID0gdypoLCBicHAgPSBVUE5HLmRlY29kZS5fZ2V0QlBQKG91dCk7XG5cdHZhciBicGwgPSBNYXRoLmNlaWwodypicHAvOCk7XHQvLyBieXRlcyBwZXIgbGluZVxuXG5cdHZhciBiZiA9IG5ldyBVaW50OEFycmF5KGFyZWEqNCksIGJmMzIgPSBuZXcgVWludDMyQXJyYXkoYmYuYnVmZmVyKTtcblx0dmFyIGN0eXBlID0gb3V0LmN0eXBlLCBkZXB0aCA9IG91dC5kZXB0aDtcblx0dmFyIHJzID0gVVBORy5fYmluLnJlYWRVc2hvcnQ7XG5cdFxuXHQvL2NvbnNvbGUubG9nKGN0eXBlLCBkZXB0aCk7XG5cblx0aWYgICAgIChjdHlwZT09NikgeyAvLyBSR0IgKyBhbHBoYVxuXHRcdHZhciBxYXJlYSA9IGFyZWE8PDI7XG5cdFx0aWYoZGVwdGg9PSA4KSBmb3IodmFyIGk9MDsgaTxxYXJlYTtpKyspIHsgIGJmW2ldID0gZGF0YVtpXTsgIC8qaWYoKGkmMyk9PTMgJiYgZGF0YVtpXSE9MCkgYmZbaV09MjU1OyovIH1cblx0XHRpZihkZXB0aD09MTYpIGZvcih2YXIgaT0wOyBpPHFhcmVhO2krKykgeyAgYmZbaV0gPSBkYXRhW2k8PDFdOyAgfVxuXHR9XG5cdGVsc2UgaWYoY3R5cGU9PTIpIHtcdC8vIFJHQlxuXHRcdHZhciB0cz1vdXQudGFic1tcInRSTlNcIl0sIHRyPS0xLCB0Zz0tMSwgdGI9LTE7XG5cdFx0aWYodHMpIHsgIHRyPXRzWzBdOyAgdGc9dHNbMV07ICB0Yj10c1syXTsgIH1cblx0XHRpZihkZXB0aD09IDgpIGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKykgeyAgdmFyIHFpPWk8PDIsIHRpPWkqMzsgIGJmW3FpXSA9IGRhdGFbdGldOyAgYmZbcWkrMV0gPSBkYXRhW3RpKzFdOyAgYmZbcWkrMl0gPSBkYXRhW3RpKzJdOyAgYmZbcWkrM10gPSAyNTU7XG5cdFx0XHRpZih0ciE9LTEgJiYgZGF0YVt0aV0gICA9PXRyICYmIGRhdGFbdGkrMV0gICA9PXRnICYmIGRhdGFbdGkrMl0gICA9PXRiKSBiZltxaSszXSA9IDA7ICB9XG5cdFx0aWYoZGVwdGg9PTE2KSBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgIHZhciBxaT1pPDwyLCB0aT1pKjY7ICBiZltxaV0gPSBkYXRhW3RpXTsgIGJmW3FpKzFdID0gZGF0YVt0aSsyXTsgIGJmW3FpKzJdID0gZGF0YVt0aSs0XTsgIGJmW3FpKzNdID0gMjU1O1xuXHRcdFx0aWYodHIhPS0xICYmIHJzKGRhdGEsdGkpPT10ciAmJiBycyhkYXRhLHRpKzIpPT10ZyAmJiBycyhkYXRhLHRpKzQpPT10YikgYmZbcWkrM10gPSAwOyAgfVxuXHR9XG5cdGVsc2UgaWYoY3R5cGU9PTMpIHtcdC8vIHBhbGV0dGVcblx0XHR2YXIgcD1vdXQudGFic1tcIlBMVEVcIl0sIGFwPW91dC50YWJzW1widFJOU1wiXSwgdGw9YXA/YXAubGVuZ3RoOjA7XG5cdFx0Ly9jb25zb2xlLmxvZyhwLCBhcCk7XG5cdFx0aWYoZGVwdGg9PTEpIGZvcih2YXIgeT0wOyB5PGg7IHkrKykgeyAgdmFyIHMwID0geSpicGwsIHQwID0geSp3O1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8dzsgaSsrKSB7IHZhciBxaT0odDAraSk8PDIsIGo9KChkYXRhW3MwKyhpPj4zKV0+Pig3LSgoaSY3KTw8MCkpKSYgMSksIGNqPTMqajsgIGJmW3FpXT1wW2NqXTsgIGJmW3FpKzFdPXBbY2orMV07ICBiZltxaSsyXT1wW2NqKzJdOyAgYmZbcWkrM109KGo8dGwpP2FwW2pdOjI1NTsgIH1cblx0XHR9XG5cdFx0aWYoZGVwdGg9PTIpIGZvcih2YXIgeT0wOyB5PGg7IHkrKykgeyAgdmFyIHMwID0geSpicGwsIHQwID0geSp3O1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8dzsgaSsrKSB7IHZhciBxaT0odDAraSk8PDIsIGo9KChkYXRhW3MwKyhpPj4yKV0+Pig2LSgoaSYzKTw8MSkpKSYgMyksIGNqPTMqajsgIGJmW3FpXT1wW2NqXTsgIGJmW3FpKzFdPXBbY2orMV07ICBiZltxaSsyXT1wW2NqKzJdOyAgYmZbcWkrM109KGo8dGwpP2FwW2pdOjI1NTsgIH1cblx0XHR9XG5cdFx0aWYoZGVwdGg9PTQpIGZvcih2YXIgeT0wOyB5PGg7IHkrKykgeyAgdmFyIHMwID0geSpicGwsIHQwID0geSp3O1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8dzsgaSsrKSB7IHZhciBxaT0odDAraSk8PDIsIGo9KChkYXRhW3MwKyhpPj4xKV0+Pig0LSgoaSYxKTw8MikpKSYxNSksIGNqPTMqajsgIGJmW3FpXT1wW2NqXTsgIGJmW3FpKzFdPXBbY2orMV07ICBiZltxaSsyXT1wW2NqKzJdOyAgYmZbcWkrM109KGo8dGwpP2FwW2pdOjI1NTsgIH1cblx0XHR9XG5cdFx0aWYoZGVwdGg9PTgpIGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKyApIHsgIHZhciBxaT1pPDwyLCBqPWRhdGFbaV0gICAgICAgICAgICAgICAgICAgICAgLCBjaj0zKmo7ICBiZltxaV09cFtjal07ICBiZltxaSsxXT1wW2NqKzFdOyAgYmZbcWkrMl09cFtjaisyXTsgIGJmW3FpKzNdPShqPHRsKT9hcFtqXToyNTU7ICB9XG5cdH1cblx0ZWxzZSBpZihjdHlwZT09NCkge1x0Ly8gZ3JheSArIGFscGhhXG5cdFx0aWYoZGVwdGg9PSA4KSAgZm9yKHZhciBpPTA7IGk8YXJlYTsgaSsrKSB7ICB2YXIgcWk9aTw8MiwgZGk9aTw8MSwgZ3I9ZGF0YVtkaV07ICBiZltxaV09Z3I7ICBiZltxaSsxXT1ncjsgIGJmW3FpKzJdPWdyOyAgYmZbcWkrM109ZGF0YVtkaSsxXTsgIH1cblx0XHRpZihkZXB0aD09MTYpICBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgIHZhciBxaT1pPDwyLCBkaT1pPDwyLCBncj1kYXRhW2RpXTsgIGJmW3FpXT1ncjsgIGJmW3FpKzFdPWdyOyAgYmZbcWkrMl09Z3I7ICBiZltxaSszXT1kYXRhW2RpKzJdOyAgfVxuXHR9XG5cdGVsc2UgaWYoY3R5cGU9PTApIHtcdC8vIGdyYXlcblx0XHR2YXIgdHIgPSBvdXQudGFic1tcInRSTlNcIl0gPyBvdXQudGFic1tcInRSTlNcIl0gOiAtMTtcblx0XHRpZihkZXB0aD09IDEpIGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKykgeyAgdmFyIGdyPTI1NSooKGRhdGFbaT4+M10+Pig3IC0oKGkmNykgICApKSkmIDEpLCBhbD0oZ3I9PXRyKjI1NSk/MDoyNTU7ICBiZjMyW2ldPShhbDw8MjQpfChncjw8MTYpfChncjw8OCl8Z3I7ICB9XG5cdFx0aWYoZGVwdGg9PSAyKSBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgIHZhciBncj0gODUqKChkYXRhW2k+PjJdPj4oNiAtKChpJjMpPDwxKSkpJiAzKSwgYWw9KGdyPT10ciogODUpPzA6MjU1OyAgYmYzMltpXT0oYWw8PDI0KXwoZ3I8PDE2KXwoZ3I8PDgpfGdyOyAgfVxuXHRcdGlmKGRlcHRoPT0gNCkgZm9yKHZhciBpPTA7IGk8YXJlYTsgaSsrKSB7ICB2YXIgZ3I9IDE3KigoZGF0YVtpPj4xXT4+KDQgLSgoaSYxKTw8MikpKSYxNSksIGFsPShncj09dHIqIDE3KT8wOjI1NTsgIGJmMzJbaV09KGFsPDwyNCl8KGdyPDwxNil8KGdyPDw4KXxncjsgIH1cblx0XHRpZihkZXB0aD09IDgpIGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKykgeyAgdmFyIGdyPWRhdGFbaSAgXSAsIGFsPShnciAgICAgICAgICAgPT10cik/MDoyNTU7ICBiZjMyW2ldPShhbDw8MjQpfChncjw8MTYpfChncjw8OCl8Z3I7ICB9XG5cdFx0aWYoZGVwdGg9PTE2KSBmb3IodmFyIGk9MDsgaTxhcmVhOyBpKyspIHsgIHZhciBncj1kYXRhW2k8PDFdLCBhbD0ocnMoZGF0YSxpPDwxKT09dHIpPzA6MjU1OyAgYmYzMltpXT0oYWw8PDI0KXwoZ3I8PDE2KXwoZ3I8PDgpfGdyOyAgfVxuXHR9XG5cdHJldHVybiBiZjtcbn1cblxuXG5cblVQTkcuZGVjb2RlID0gZnVuY3Rpb24oYnVmZilcbntcblx0dmFyIGRhdGEgPSBuZXcgVWludDhBcnJheShidWZmKSwgb2Zmc2V0ID0gOCwgYmluID0gVVBORy5fYmluLCByVXMgPSBiaW4ucmVhZFVzaG9ydCwgclVpID0gYmluLnJlYWRVaW50O1xuXHR2YXIgb3V0ID0ge3RhYnM6e30sIGZyYW1lczpbXX07XG5cdHZhciBkZCA9IG5ldyBVaW50OEFycmF5KGRhdGEubGVuZ3RoKSwgZG9mZiA9IDA7XHQgLy8gcHV0IGFsbCBJREFUIGRhdGEgaW50byBpdFxuXHR2YXIgZmQsIGZvZmYgPSAwO1x0Ly8gZnJhbWVzXG5cdFxuXHR2YXIgbWdjayA9IFsweDg5LCAweDUwLCAweDRlLCAweDQ3LCAweDBkLCAweDBhLCAweDFhLCAweDBhXTtcblx0Zm9yKHZhciBpPTA7IGk8ODsgaSsrKSBpZihkYXRhW2ldIT1tZ2NrW2ldKSB0aHJvdyBcIlRoZSBpbnB1dCBpcyBub3QgYSBQTkcgZmlsZSFcIjtcblxuXHR3aGlsZShvZmZzZXQ8ZGF0YS5sZW5ndGgpXG5cdHtcblx0XHR2YXIgbGVuICA9IGJpbi5yZWFkVWludChkYXRhLCBvZmZzZXQpOyAgb2Zmc2V0ICs9IDQ7XG5cdFx0dmFyIHR5cGUgPSBiaW4ucmVhZEFTQ0lJKGRhdGEsIG9mZnNldCwgNCk7ICBvZmZzZXQgKz0gNDtcblx0XHQvL2xvZyh0eXBlLGxlbik7XG5cdFx0XG5cdFx0aWYgICAgICh0eXBlPT1cIklIRFJcIikgIHsgIFVQTkcuZGVjb2RlLl9JSERSKGRhdGEsIG9mZnNldCwgb3V0KTsgIH1cblx0XHRlbHNlIGlmKHR5cGU9PVwiSURBVFwiKSB7XG5cdFx0XHRmb3IodmFyIGk9MDsgaTxsZW47IGkrKykgZGRbZG9mZitpXSA9IGRhdGFbb2Zmc2V0K2ldO1xuXHRcdFx0ZG9mZiArPSBsZW47XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJhY1RMXCIpICB7XG5cdFx0XHRvdXQudGFic1t0eXBlXSA9IHsgIG51bV9mcmFtZXM6clVpKGRhdGEsIG9mZnNldCksIG51bV9wbGF5czpyVWkoZGF0YSwgb2Zmc2V0KzQpICB9O1xuXHRcdFx0ZmQgPSBuZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCk7XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJmY1RMXCIpICB7XG5cdFx0XHRpZihmb2ZmIT0wKSB7ICB2YXIgZnIgPSBvdXQuZnJhbWVzW291dC5mcmFtZXMubGVuZ3RoLTFdO1xuXHRcdFx0XHRmci5kYXRhID0gVVBORy5kZWNvZGUuX2RlY29tcHJlc3Mob3V0LCBmZC5zbGljZSgwLGZvZmYpLCBmci5yZWN0LndpZHRoLCBmci5yZWN0LmhlaWdodCk7ICBmb2ZmPTA7XG5cdFx0XHR9XG5cdFx0XHR2YXIgcmN0ID0ge3g6clVpKGRhdGEsIG9mZnNldCsxMikseTpyVWkoZGF0YSwgb2Zmc2V0KzE2KSx3aWR0aDpyVWkoZGF0YSwgb2Zmc2V0KzQpLGhlaWdodDpyVWkoZGF0YSwgb2Zmc2V0KzgpfTtcblx0XHRcdHZhciBkZWwgPSByVXMoZGF0YSwgb2Zmc2V0KzIyKTsgIGRlbCA9IHJVcyhkYXRhLCBvZmZzZXQrMjApIC8gKGRlbD09MD8xMDA6ZGVsKTtcblx0XHRcdHZhciBmcm0gPSB7cmVjdDpyY3QsIGRlbGF5Ok1hdGgucm91bmQoZGVsKjEwMDApLCBkaXNwb3NlOmRhdGFbb2Zmc2V0KzI0XSwgYmxlbmQ6ZGF0YVtvZmZzZXQrMjVdfTtcblx0XHRcdC8vY29uc29sZS5sb2coZnJtKTtcblx0XHRcdG91dC5mcmFtZXMucHVzaChmcm0pO1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGU9PVwiZmRBVFwiKSB7XG5cdFx0XHRmb3IodmFyIGk9MDsgaTxsZW4tNDsgaSsrKSBmZFtmb2ZmK2ldID0gZGF0YVtvZmZzZXQraSs0XTtcblx0XHRcdGZvZmYgKz0gbGVuLTQ7XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJwSFlzXCIpIHtcblx0XHRcdG91dC50YWJzW3R5cGVdID0gW2Jpbi5yZWFkVWludChkYXRhLCBvZmZzZXQpLCBiaW4ucmVhZFVpbnQoZGF0YSwgb2Zmc2V0KzQpLCBkYXRhW29mZnNldCs4XV07XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJjSFJNXCIpIHtcblx0XHRcdG91dC50YWJzW3R5cGVdID0gW107XG5cdFx0XHRmb3IodmFyIGk9MDsgaTw4OyBpKyspIG91dC50YWJzW3R5cGVdLnB1c2goYmluLnJlYWRVaW50KGRhdGEsIG9mZnNldCtpKjQpKTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlPT1cInRFWHRcIikge1xuXHRcdFx0aWYob3V0LnRhYnNbdHlwZV09PW51bGwpIG91dC50YWJzW3R5cGVdID0ge307XG5cdFx0XHR2YXIgbnogPSBiaW4ubmV4dFplcm8oZGF0YSwgb2Zmc2V0KTtcblx0XHRcdHZhciBrZXl3ID0gYmluLnJlYWRBU0NJSShkYXRhLCBvZmZzZXQsIG56LW9mZnNldCk7XG5cdFx0XHR2YXIgdGV4dCA9IGJpbi5yZWFkQVNDSUkoZGF0YSwgbnorMSwgb2Zmc2V0K2xlbi1uei0xKTtcblx0XHRcdG91dC50YWJzW3R5cGVdW2tleXddID0gdGV4dDtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlPT1cImlUWHRcIikge1xuXHRcdFx0aWYob3V0LnRhYnNbdHlwZV09PW51bGwpIG91dC50YWJzW3R5cGVdID0ge307XG5cdFx0XHR2YXIgbnogPSAwLCBvZmYgPSBvZmZzZXQ7XG5cdFx0XHRueiA9IGJpbi5uZXh0WmVybyhkYXRhLCBvZmYpO1xuXHRcdFx0dmFyIGtleXcgPSBiaW4ucmVhZEFTQ0lJKGRhdGEsIG9mZiwgbnotb2ZmKTsgIG9mZiA9IG56ICsgMTtcblx0XHRcdHZhciBjZmxhZyA9IGRhdGFbb2ZmXSwgY21ldGggPSBkYXRhW29mZisxXTsgIG9mZis9Mjtcblx0XHRcdG56ID0gYmluLm5leHRaZXJvKGRhdGEsIG9mZik7XG5cdFx0XHR2YXIgbHRhZyA9IGJpbi5yZWFkQVNDSUkoZGF0YSwgb2ZmLCBuei1vZmYpOyAgb2ZmID0gbnogKyAxO1xuXHRcdFx0bnogPSBiaW4ubmV4dFplcm8oZGF0YSwgb2ZmKTtcblx0XHRcdHZhciB0a2V5dyA9IGJpbi5yZWFkVVRGOChkYXRhLCBvZmYsIG56LW9mZik7ICBvZmYgPSBueiArIDE7XG5cdFx0XHR2YXIgdGV4dCAgPSBiaW4ucmVhZFVURjgoZGF0YSwgb2ZmLCBsZW4tKG9mZi1vZmZzZXQpKTtcblx0XHRcdG91dC50YWJzW3R5cGVdW2tleXddID0gdGV4dDtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlPT1cIlBMVEVcIikge1xuXHRcdFx0b3V0LnRhYnNbdHlwZV0gPSBiaW4ucmVhZEJ5dGVzKGRhdGEsIG9mZnNldCwgbGVuKTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlPT1cImhJU1RcIikge1xuXHRcdFx0dmFyIHBsID0gb3V0LnRhYnNbXCJQTFRFXCJdLmxlbmd0aC8zO1xuXHRcdFx0b3V0LnRhYnNbdHlwZV0gPSBbXTsgIGZvcih2YXIgaT0wOyBpPHBsOyBpKyspIG91dC50YWJzW3R5cGVdLnB1c2goclVzKGRhdGEsIG9mZnNldCtpKjIpKTtcblx0XHR9XG5cdFx0ZWxzZSBpZih0eXBlPT1cInRSTlNcIikge1xuXHRcdFx0aWYgICAgIChvdXQuY3R5cGU9PTMpIG91dC50YWJzW3R5cGVdID0gYmluLnJlYWRCeXRlcyhkYXRhLCBvZmZzZXQsIGxlbik7XG5cdFx0XHRlbHNlIGlmKG91dC5jdHlwZT09MCkgb3V0LnRhYnNbdHlwZV0gPSByVXMoZGF0YSwgb2Zmc2V0KTtcblx0XHRcdGVsc2UgaWYob3V0LmN0eXBlPT0yKSBvdXQudGFic1t0eXBlXSA9IFsgclVzKGRhdGEsb2Zmc2V0KSxyVXMoZGF0YSxvZmZzZXQrMiksclVzKGRhdGEsb2Zmc2V0KzQpIF07XG5cdFx0XHQvL2Vsc2UgY29uc29sZS5sb2coXCJ0Uk5TIGZvciB1bnN1cHBvcnRlZCBjb2xvciB0eXBlXCIsb3V0LmN0eXBlLCBsZW4pO1xuXHRcdH1cblx0XHRlbHNlIGlmKHR5cGU9PVwiZ0FNQVwiKSBvdXQudGFic1t0eXBlXSA9IGJpbi5yZWFkVWludChkYXRhLCBvZmZzZXQpLzEwMDAwMDtcblx0XHRlbHNlIGlmKHR5cGU9PVwic1JHQlwiKSBvdXQudGFic1t0eXBlXSA9IGRhdGFbb2Zmc2V0XTtcblx0XHRlbHNlIGlmKHR5cGU9PVwiYktHRFwiKVxuXHRcdHtcblx0XHRcdGlmICAgICAob3V0LmN0eXBlPT0wIHx8IG91dC5jdHlwZT09NCkgb3V0LnRhYnNbdHlwZV0gPSBbclVzKGRhdGEsIG9mZnNldCldO1xuXHRcdFx0ZWxzZSBpZihvdXQuY3R5cGU9PTIgfHwgb3V0LmN0eXBlPT02KSBvdXQudGFic1t0eXBlXSA9IFtyVXMoZGF0YSwgb2Zmc2V0KSwgclVzKGRhdGEsIG9mZnNldCsyKSwgclVzKGRhdGEsIG9mZnNldCs0KV07XG5cdFx0XHRlbHNlIGlmKG91dC5jdHlwZT09Mykgb3V0LnRhYnNbdHlwZV0gPSBkYXRhW29mZnNldF07XG5cdFx0fVxuXHRcdGVsc2UgaWYodHlwZT09XCJJRU5EXCIpIHtcblx0XHRcdGlmKGZvZmYhPTApIHsgIHZhciBmciA9IG91dC5mcmFtZXNbb3V0LmZyYW1lcy5sZW5ndGgtMV07XG5cdFx0XHRcdGZyLmRhdGEgPSBVUE5HLmRlY29kZS5fZGVjb21wcmVzcyhvdXQsIGZkLnNsaWNlKDAsZm9mZiksIGZyLnJlY3Qud2lkdGgsIGZyLnJlY3QuaGVpZ2h0KTsgIGZvZmY9MDtcblx0XHRcdH1cdFxuXHRcdFx0b3V0LmRhdGEgPSBVUE5HLmRlY29kZS5fZGVjb21wcmVzcyhvdXQsIGRkLCBvdXQud2lkdGgsIG91dC5oZWlnaHQpOyAgYnJlYWs7XG5cdFx0fVxuXHRcdC8vZWxzZSB7ICBsb2coXCJ1bmtub3duIGNodW5rIHR5cGVcIiwgdHlwZSwgbGVuKTsgIH1cblx0XHRvZmZzZXQgKz0gbGVuO1xuXHRcdHZhciBjcmMgPSBiaW4ucmVhZFVpbnQoZGF0YSwgb2Zmc2V0KTsgIG9mZnNldCArPSA0O1xuXHR9XG5cdGRlbGV0ZSBvdXQuY29tcHJlc3M7ICBkZWxldGUgb3V0LmludGVybGFjZTsgIGRlbGV0ZSBvdXQuZmlsdGVyO1xuXHRyZXR1cm4gb3V0O1xufVxuXG5VUE5HLmRlY29kZS5fZGVjb21wcmVzcyA9IGZ1bmN0aW9uKG91dCwgZGQsIHcsIGgpIHtcblx0aWYob3V0LmNvbXByZXNzID09MCkgZGQgPSBVUE5HLmRlY29kZS5faW5mbGF0ZShkZCk7XG5cblx0aWYgICAgIChvdXQuaW50ZXJsYWNlPT0wKSBkZCA9IFVQTkcuZGVjb2RlLl9maWx0ZXJaZXJvKGRkLCBvdXQsIDAsIHcsIGgpO1xuXHRlbHNlIGlmKG91dC5pbnRlcmxhY2U9PTEpIGRkID0gVVBORy5kZWNvZGUuX3JlYWRJbnRlcmxhY2UoZGQsIG91dCk7XG5cdHJldHVybiBkZDtcbn1cblxuVVBORy5kZWNvZGUuX2luZmxhdGUgPSBmdW5jdGlvbihkYXRhKSB7ICByZXR1cm4gcGFrb1tcImluZmxhdGVcIl0oZGF0YSk7ICB9XG5cblVQTkcuZGVjb2RlLl9yZWFkSW50ZXJsYWNlID0gZnVuY3Rpb24oZGF0YSwgb3V0KVxue1xuXHR2YXIgdyA9IG91dC53aWR0aCwgaCA9IG91dC5oZWlnaHQ7XG5cdHZhciBicHAgPSBVUE5HLmRlY29kZS5fZ2V0QlBQKG91dCksIGNicHAgPSBicHA+PjMsIGJwbCA9IE1hdGguY2VpbCh3KmJwcC84KTtcblx0dmFyIGltZyA9IG5ldyBVaW50OEFycmF5KCBoICogYnBsICk7XG5cdHZhciBkaSA9IDA7XG5cblx0dmFyIHN0YXJ0aW5nX3JvdyAgPSBbIDAsIDAsIDQsIDAsIDIsIDAsIDEgXTtcblx0dmFyIHN0YXJ0aW5nX2NvbCAgPSBbIDAsIDQsIDAsIDIsIDAsIDEsIDAgXTtcblx0dmFyIHJvd19pbmNyZW1lbnQgPSBbIDgsIDgsIDgsIDQsIDQsIDIsIDIgXTtcblx0dmFyIGNvbF9pbmNyZW1lbnQgPSBbIDgsIDgsIDQsIDQsIDIsIDIsIDEgXTtcblxuXHR2YXIgcGFzcz0wO1xuXHR3aGlsZShwYXNzPDcpXG5cdHtcblx0XHR2YXIgcmkgPSByb3dfaW5jcmVtZW50W3Bhc3NdLCBjaSA9IGNvbF9pbmNyZW1lbnRbcGFzc107XG5cdFx0dmFyIHN3ID0gMCwgc2ggPSAwO1xuXHRcdHZhciBjciA9IHN0YXJ0aW5nX3Jvd1twYXNzXTsgIHdoaWxlKGNyPGgpIHsgIGNyKz1yaTsgIHNoKys7ICB9XG5cdFx0dmFyIGNjID0gc3RhcnRpbmdfY29sW3Bhc3NdOyAgd2hpbGUoY2M8dykgeyAgY2MrPWNpOyAgc3crKzsgIH1cblx0XHR2YXIgYnBsbCA9IE1hdGguY2VpbChzdypicHAvOCk7XG5cdFx0VVBORy5kZWNvZGUuX2ZpbHRlclplcm8oZGF0YSwgb3V0LCBkaSwgc3csIHNoKTtcblxuXHRcdHZhciB5PTAsIHJvdyA9IHN0YXJ0aW5nX3Jvd1twYXNzXTtcblx0XHR3aGlsZShyb3c8aClcblx0XHR7XG5cdFx0XHR2YXIgY29sID0gc3RhcnRpbmdfY29sW3Bhc3NdO1xuXHRcdFx0dmFyIGNkaSA9IChkaSt5KmJwbGwpPDwzO1xuXG5cdFx0XHR3aGlsZShjb2w8dylcblx0XHRcdHtcblx0XHRcdFx0aWYoYnBwPT0xKSB7XG5cdFx0XHRcdFx0dmFyIHZhbCA9IGRhdGFbY2RpPj4zXTsgIHZhbCA9ICh2YWw+Pig3LShjZGkmNykpKSYxO1xuXHRcdFx0XHRcdGltZ1tyb3cqYnBsICsgKGNvbD4+MyldIHw9ICh2YWwgPDwgKDctKChjb2wmMyk8PDApKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYoYnBwPT0yKSB7XG5cdFx0XHRcdFx0dmFyIHZhbCA9IGRhdGFbY2RpPj4zXTsgIHZhbCA9ICh2YWw+Pig2LShjZGkmNykpKSYzO1xuXHRcdFx0XHRcdGltZ1tyb3cqYnBsICsgKGNvbD4+MildIHw9ICh2YWwgPDwgKDYtKChjb2wmMyk8PDEpKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYoYnBwPT00KSB7XG5cdFx0XHRcdFx0dmFyIHZhbCA9IGRhdGFbY2RpPj4zXTsgIHZhbCA9ICh2YWw+Pig0LShjZGkmNykpKSYxNTtcblx0XHRcdFx0XHRpbWdbcm93KmJwbCArIChjb2w+PjEpXSB8PSAodmFsIDw8ICg0LSgoY29sJjEpPDwyKSkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmKGJwcD49OCkge1xuXHRcdFx0XHRcdHZhciBpaSA9IHJvdypicGwrY29sKmNicHA7XG5cdFx0XHRcdFx0Zm9yKHZhciBqPTA7IGo8Y2JwcDsgaisrKSBpbWdbaWkral0gPSBkYXRhWyhjZGk+PjMpK2pdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNkaSs9YnBwOyAgY29sKz1jaTtcblx0XHRcdH1cblx0XHRcdHkrKzsgIHJvdyArPSByaTtcblx0XHR9XG5cdFx0aWYoc3cqc2ghPTApIGRpICs9IHNoICogKDEgKyBicGxsKTtcblx0XHRwYXNzID0gcGFzcyArIDE7XG5cdH1cblx0cmV0dXJuIGltZztcbn1cblxuVVBORy5kZWNvZGUuX2dldEJQUCA9IGZ1bmN0aW9uKG91dCkge1xuXHR2YXIgbm9jID0gWzEsbnVsbCwzLDEsMixudWxsLDRdW291dC5jdHlwZV07XG5cdHJldHVybiBub2MgKiBvdXQuZGVwdGg7XG59XG5cblVQTkcuZGVjb2RlLl9maWx0ZXJaZXJvID0gZnVuY3Rpb24oZGF0YSwgb3V0LCBvZmYsIHcsIGgpXG57XG5cdHZhciBicHAgPSBVUE5HLmRlY29kZS5fZ2V0QlBQKG91dCksIGJwbCA9IE1hdGguY2VpbCh3KmJwcC84KSwgcGFldGggPSBVUE5HLmRlY29kZS5fcGFldGg7XG5cdGJwcCA9IE1hdGguY2VpbChicHAvOCk7XG5cblx0Zm9yKHZhciB5PTA7IHk8aDsgeSsrKSAge1xuXHRcdHZhciBpID0gb2ZmK3kqYnBsLCBkaSA9IGkreSsxO1xuXHRcdHZhciB0eXBlID0gZGF0YVtkaS0xXTtcblxuXHRcdGlmICAgICAodHlwZT09MCkgZm9yKHZhciB4PSAgMDsgeDxicGw7IHgrKykgZGF0YVtpK3hdID0gZGF0YVtkaSt4XTtcblx0XHRlbHNlIGlmKHR5cGU9PTEpIHtcblx0XHRcdGZvcih2YXIgeD0gIDA7IHg8YnBwOyB4KyspIGRhdGFbaSt4XSA9IGRhdGFbZGkreF07XG5cdFx0XHRmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2kreF0gPSAoZGF0YVtkaSt4XSArIGRhdGFbaSt4LWJwcF0pJjI1NTtcblx0XHR9XG5cdFx0ZWxzZSBpZih5PT0wKSB7XG5cdFx0XHRmb3IodmFyIHg9ICAwOyB4PGJwcDsgeCsrKSBkYXRhW2kreF0gPSBkYXRhW2RpK3hdO1xuXHRcdFx0aWYodHlwZT09MikgZm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtpK3hdID0gKGRhdGFbZGkreF0pJjI1NTtcblx0XHRcdGlmKHR5cGU9PTMpIGZvcih2YXIgeD1icHA7IHg8YnBsOyB4KyspIGRhdGFbaSt4XSA9IChkYXRhW2RpK3hdICsgKGRhdGFbaSt4LWJwcF0+PjEpICkmMjU1O1xuXHRcdFx0aWYodHlwZT09NCkgZm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtpK3hdID0gKGRhdGFbZGkreF0gKyBwYWV0aChkYXRhW2kreC1icHBdLCAwLCAwKSApJjI1NTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRpZih0eXBlPT0yKSB7IGZvcih2YXIgeD0gIDA7IHg8YnBsOyB4KyspIGRhdGFbaSt4XSA9IChkYXRhW2RpK3hdICsgZGF0YVtpK3gtYnBsXSkmMjU1OyAgfVxuXG5cdFx0XHRpZih0eXBlPT0zKSB7IGZvcih2YXIgeD0gIDA7IHg8YnBwOyB4KyspIGRhdGFbaSt4XSA9IChkYXRhW2RpK3hdICsgKGRhdGFbaSt4LWJwbF0+PjEpKSYyNTU7XG5cdFx0XHQgICAgICAgICAgICAgIGZvcih2YXIgeD1icHA7IHg8YnBsOyB4KyspIGRhdGFbaSt4XSA9IChkYXRhW2RpK3hdICsgKChkYXRhW2kreC1icGxdK2RhdGFbaSt4LWJwcF0pPj4xKSApJjI1NTsgIH1cblxuXHRcdFx0aWYodHlwZT09NCkgeyBmb3IodmFyIHg9ICAwOyB4PGJwcDsgeCsrKSBkYXRhW2kreF0gPSAoZGF0YVtkaSt4XSArIHBhZXRoKDAsIGRhdGFbaSt4LWJwbF0sIDApKSYyNTU7XG5cdFx0XHRcdFx0XHQgIGZvcih2YXIgeD1icHA7IHg8YnBsOyB4KyspIGRhdGFbaSt4XSA9IChkYXRhW2RpK3hdICsgcGFldGgoZGF0YVtpK3gtYnBwXSwgZGF0YVtpK3gtYnBsXSwgZGF0YVtpK3gtYnBwLWJwbF0pICkmMjU1OyAgfVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gZGF0YTtcbn1cblxuVVBORy5kZWNvZGUuX3BhZXRoID0gZnVuY3Rpb24oYSxiLGMpXG57XG5cdHZhciBwID0gYStiLWMsIHBhID0gTWF0aC5hYnMocC1hKSwgcGIgPSBNYXRoLmFicyhwLWIpLCBwYyA9IE1hdGguYWJzKHAtYyk7XG5cdGlmIChwYSA8PSBwYiAmJiBwYSA8PSBwYykgIHJldHVybiBhO1xuXHRlbHNlIGlmIChwYiA8PSBwYykgIHJldHVybiBiO1xuXHRyZXR1cm4gYztcbn1cblxuVVBORy5kZWNvZGUuX0lIRFIgPSBmdW5jdGlvbihkYXRhLCBvZmZzZXQsIG91dClcbntcblx0dmFyIGJpbiA9IFVQTkcuX2Jpbjtcblx0b3V0LndpZHRoICA9IGJpbi5yZWFkVWludChkYXRhLCBvZmZzZXQpOyAgb2Zmc2V0ICs9IDQ7XG5cdG91dC5oZWlnaHQgPSBiaW4ucmVhZFVpbnQoZGF0YSwgb2Zmc2V0KTsgIG9mZnNldCArPSA0O1xuXHRvdXQuZGVwdGggICAgID0gZGF0YVtvZmZzZXRdOyAgb2Zmc2V0Kys7XG5cdG91dC5jdHlwZSAgICAgPSBkYXRhW29mZnNldF07ICBvZmZzZXQrKztcblx0b3V0LmNvbXByZXNzICA9IGRhdGFbb2Zmc2V0XTsgIG9mZnNldCsrO1xuXHRvdXQuZmlsdGVyICAgID0gZGF0YVtvZmZzZXRdOyAgb2Zmc2V0Kys7XG5cdG91dC5pbnRlcmxhY2UgPSBkYXRhW29mZnNldF07ICBvZmZzZXQrKztcbn1cblxuVVBORy5fYmluID0ge1xuXHRuZXh0WmVybyAgIDogZnVuY3Rpb24oZGF0YSxwKSAgeyAgd2hpbGUoZGF0YVtwXSE9MCkgcCsrOyAgcmV0dXJuIHA7ICB9LFxuXHRyZWFkVXNob3J0IDogZnVuY3Rpb24oYnVmZixwKSAgeyAgcmV0dXJuIChidWZmW3BdPDwgOCkgfCBidWZmW3ArMV07ICB9LFxuXHR3cml0ZVVzaG9ydDogZnVuY3Rpb24oYnVmZixwLG4peyAgYnVmZltwXSA9IChuPj44KSYyNTU7ICBidWZmW3ArMV0gPSBuJjI1NTsgIH0sXG5cdHJlYWRVaW50ICAgOiBmdW5jdGlvbihidWZmLHApICB7ICByZXR1cm4gKGJ1ZmZbcF0qKDI1NioyNTYqMjU2KSkgKyAoKGJ1ZmZbcCsxXTw8MTYpIHwgKGJ1ZmZbcCsyXTw8IDgpIHwgYnVmZltwKzNdKTsgIH0sXG5cdHdyaXRlVWludCAgOiBmdW5jdGlvbihidWZmLHAsbil7ICBidWZmW3BdPShuPj4yNCkmMjU1OyAgYnVmZltwKzFdPShuPj4xNikmMjU1OyAgYnVmZltwKzJdPShuPj44KSYyNTU7ICBidWZmW3ArM109biYyNTU7ICB9LFxuXHRyZWFkQVNDSUkgIDogZnVuY3Rpb24oYnVmZixwLGwpeyAgdmFyIHMgPSBcIlwiOyAgZm9yKHZhciBpPTA7IGk8bDsgaSsrKSBzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmZltwK2ldKTsgIHJldHVybiBzOyAgICB9LFxuXHR3cml0ZUFTQ0lJIDogZnVuY3Rpb24oZGF0YSxwLHMpeyAgZm9yKHZhciBpPTA7IGk8cy5sZW5ndGg7IGkrKykgZGF0YVtwK2ldID0gcy5jaGFyQ29kZUF0KGkpOyAgfSxcblx0cmVhZEJ5dGVzICA6IGZ1bmN0aW9uKGJ1ZmYscCxsKXsgIHZhciBhcnIgPSBbXTsgICBmb3IodmFyIGk9MDsgaTxsOyBpKyspIGFyci5wdXNoKGJ1ZmZbcCtpXSk7ICAgcmV0dXJuIGFycjsgIH0sXG5cdHBhZCA6IGZ1bmN0aW9uKG4pIHsgcmV0dXJuIG4ubGVuZ3RoIDwgMiA/IFwiMFwiICsgbiA6IG47IH0sXG5cdHJlYWRVVEY4IDogZnVuY3Rpb24oYnVmZiwgcCwgbCkge1xuXHRcdHZhciBzID0gXCJcIiwgbnM7XG5cdFx0Zm9yKHZhciBpPTA7IGk8bDsgaSsrKSBzICs9IFwiJVwiICsgVVBORy5fYmluLnBhZChidWZmW3AraV0udG9TdHJpbmcoMTYpKTtcblx0XHR0cnkgeyAgbnMgPSBkZWNvZGVVUklDb21wb25lbnQocyk7IH1cblx0XHRjYXRjaChlKSB7ICByZXR1cm4gVVBORy5fYmluLnJlYWRBU0NJSShidWZmLCBwLCBsKTsgIH1cblx0XHRyZXR1cm4gIG5zO1xuXHR9XG59XG5VUE5HLl9jb3B5VGlsZSA9IGZ1bmN0aW9uKHNiLCBzdywgc2gsIHRiLCB0dywgdGgsIHhvZmYsIHlvZmYsIG1vZGUpXG57XG5cdHZhciB3ID0gTWF0aC5taW4oc3csdHcpLCBoID0gTWF0aC5taW4oc2gsdGgpO1xuXHR2YXIgc2k9MCwgdGk9MDtcblx0Zm9yKHZhciB5PTA7IHk8aDsgeSsrKVxuXHRcdGZvcih2YXIgeD0wOyB4PHc7IHgrKylcblx0XHR7XG5cdFx0XHRpZih4b2ZmPj0wICYmIHlvZmY+PTApIHsgIHNpID0gKHkqc3creCk8PDI7ICB0aSA9ICgoIHlvZmYreSkqdHcreG9mZit4KTw8MjsgIH1cblx0XHRcdGVsc2UgICAgICAgICAgICAgICAgICAgeyAgc2kgPSAoKC15b2ZmK3kpKnN3LXhvZmYreCk8PDI7ICB0aSA9ICh5KnR3K3gpPDwyOyAgfVxuXHRcdFx0XG5cdFx0XHRpZiAgICAgKG1vZGU9PTApIHsgIHRiW3RpXSA9IHNiW3NpXTsgIHRiW3RpKzFdID0gc2Jbc2krMV07ICB0Ylt0aSsyXSA9IHNiW3NpKzJdOyAgdGJbdGkrM10gPSBzYltzaSszXTsgIH1cblx0XHRcdGVsc2UgaWYobW9kZT09MSkge1xuXHRcdFx0XHR2YXIgZmEgPSBzYltzaSszXSooMS8yNTUpLCBmcj1zYltzaV0qZmEsIGZnPXNiW3NpKzFdKmZhLCBmYj1zYltzaSsyXSpmYTsgXG5cdFx0XHRcdHZhciBiYSA9IHRiW3RpKzNdKigxLzI1NSksIGJyPXRiW3RpXSpiYSwgYmc9dGJbdGkrMV0qYmEsIGJiPXRiW3RpKzJdKmJhOyBcblx0XHRcdFx0XG5cdFx0XHRcdHZhciBpZmE9MS1mYSwgb2EgPSBmYStiYSppZmEsIGlvYSA9IChvYT09MD8wOjEvb2EpO1xuXHRcdFx0XHR0Ylt0aSszXSA9IDI1NSpvYTsgIFxuXHRcdFx0XHR0Ylt0aSswXSA9IChmciticippZmEpKmlvYTsgIFxuXHRcdFx0XHR0Ylt0aSsxXSA9IChmZytiZyppZmEpKmlvYTsgICBcblx0XHRcdFx0dGJbdGkrMl0gPSAoZmIrYmIqaWZhKSppb2E7ICBcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYobW9kZT09Mil7XHQvLyBjb3B5IG9ubHkgZGlmZmVyZW5jZXMsIG90aGVyd2lzZSB6ZXJvXG5cdFx0XHRcdHZhciBmYSA9IHNiW3NpKzNdLCBmcj1zYltzaV0sIGZnPXNiW3NpKzFdLCBmYj1zYltzaSsyXTsgXG5cdFx0XHRcdHZhciBiYSA9IHRiW3RpKzNdLCBicj10Ylt0aV0sIGJnPXRiW3RpKzFdLCBiYj10Ylt0aSsyXTsgXG5cdFx0XHRcdGlmKGZhPT1iYSAmJiBmcj09YnIgJiYgZmc9PWJnICYmIGZiPT1iYikgeyAgdGJbdGldPTA7ICB0Ylt0aSsxXT0wOyAgdGJbdGkrMl09MDsgIHRiW3RpKzNdPTA7ICB9XG5cdFx0XHRcdGVsc2UgeyAgdGJbdGldPWZyOyAgdGJbdGkrMV09Zmc7ICB0Ylt0aSsyXT1mYjsgIHRiW3RpKzNdPWZhOyAgfVxuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZihtb2RlPT0zKXtcdC8vIGNoZWNrIGlmIGNhbiBiZSBibGVuZGVkXG5cdFx0XHRcdHZhciBmYSA9IHNiW3NpKzNdLCBmcj1zYltzaV0sIGZnPXNiW3NpKzFdLCBmYj1zYltzaSsyXTsgXG5cdFx0XHRcdHZhciBiYSA9IHRiW3RpKzNdLCBicj10Ylt0aV0sIGJnPXRiW3RpKzFdLCBiYj10Ylt0aSsyXTsgXG5cdFx0XHRcdGlmKGZhPT1iYSAmJiBmcj09YnIgJiYgZmc9PWJnICYmIGZiPT1iYikgY29udGludWU7XG5cdFx0XHRcdC8vaWYoZmEhPTI1NSAmJiBiYSE9MCkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRpZihmYTwyMjAgJiYgYmE+MjApIHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cdHJldHVybiB0cnVlO1xufVxuXG5cblxuVVBORy5lbmNvZGUgPSBmdW5jdGlvbihidWZzLCB3LCBoLCBwcywgZGVscywgZm9yYmlkUGx0ZSlcbntcblx0aWYocHM9PW51bGwpIHBzPTA7XG5cdGlmKGZvcmJpZFBsdGU9PW51bGwpIGZvcmJpZFBsdGUgPSBmYWxzZTtcblx0dmFyIGRhdGEgPSBuZXcgVWludDhBcnJheShidWZzWzBdLmJ5dGVMZW5ndGgqYnVmcy5sZW5ndGgrMTAwKTtcblx0dmFyIHdyPVsweDg5LCAweDUwLCAweDRlLCAweDQ3LCAweDBkLCAweDBhLCAweDFhLCAweDBhXTtcblx0Zm9yKHZhciBpPTA7IGk8ODsgaSsrKSBkYXRhW2ldPXdyW2ldO1xuXHR2YXIgb2Zmc2V0ID0gOCwgIGJpbiA9IFVQTkcuX2JpbiwgY3JjID0gVVBORy5jcmMuY3JjLCB3VWkgPSBiaW4ud3JpdGVVaW50LCB3VXMgPSBiaW4ud3JpdGVVc2hvcnQsIHdBcyA9IGJpbi53cml0ZUFTQ0lJO1xuXG5cdHZhciBuaW1nID0gVVBORy5lbmNvZGUuY29tcHJlc3NQTkcoYnVmcywgdywgaCwgcHMsIGZvcmJpZFBsdGUpO1xuXG5cdHdVaShkYXRhLG9mZnNldCwgMTMpOyAgICAgb2Zmc2V0Kz00O1xuXHR3QXMoZGF0YSxvZmZzZXQsXCJJSERSXCIpOyAgb2Zmc2V0Kz00O1xuXHR3VWkoZGF0YSxvZmZzZXQsdyk7ICBvZmZzZXQrPTQ7XG5cdHdVaShkYXRhLG9mZnNldCxoKTsgIG9mZnNldCs9NDtcblx0ZGF0YVtvZmZzZXRdID0gbmltZy5kZXB0aDsgIG9mZnNldCsrOyAgLy8gZGVwdGhcblx0ZGF0YVtvZmZzZXRdID0gbmltZy5jdHlwZTsgIG9mZnNldCsrOyAgLy8gY3R5cGVcblx0ZGF0YVtvZmZzZXRdID0gMDsgIG9mZnNldCsrOyAgLy8gY29tcHJlc3Ncblx0ZGF0YVtvZmZzZXRdID0gMDsgIG9mZnNldCsrOyAgLy8gZmlsdGVyXG5cdGRhdGFbb2Zmc2V0XSA9IDA7ICBvZmZzZXQrKzsgIC8vIGludGVybGFjZVxuXHR3VWkoZGF0YSxvZmZzZXQsY3JjKGRhdGEsb2Zmc2V0LTE3LDE3KSk7ICBvZmZzZXQrPTQ7IC8vIGNyY1xuXG5cdC8vIDkgYnl0ZXMgdG8gc2F5LCB0aGF0IGl0IGlzIHNSR0Jcblx0d1VpKGRhdGEsb2Zmc2V0LCAxKTsgICAgICBvZmZzZXQrPTQ7XG5cdHdBcyhkYXRhLG9mZnNldCxcInNSR0JcIik7ICBvZmZzZXQrPTQ7XG5cdGRhdGFbb2Zmc2V0XSA9IDE7ICBvZmZzZXQrKztcblx0d1VpKGRhdGEsb2Zmc2V0LGNyYyhkYXRhLG9mZnNldC01LDUpKTsgIG9mZnNldCs9NDsgLy8gY3JjXG5cblx0dmFyIGFuaW0gPSBidWZzLmxlbmd0aD4xO1xuXHRpZihhbmltKSB7XG5cdFx0d1VpKGRhdGEsb2Zmc2V0LCA4KTsgICAgICBvZmZzZXQrPTQ7XG5cdFx0d0FzKGRhdGEsb2Zmc2V0LFwiYWNUTFwiKTsgIG9mZnNldCs9NDtcblx0XHR3VWkoZGF0YSxvZmZzZXQsIGJ1ZnMubGVuZ3RoKTsgICAgICBvZmZzZXQrPTQ7XG5cdFx0d1VpKGRhdGEsb2Zmc2V0LCAwKTsgICAgICBvZmZzZXQrPTQ7XG5cdFx0d1VpKGRhdGEsb2Zmc2V0LGNyYyhkYXRhLG9mZnNldC0xMiwxMikpOyAgb2Zmc2V0Kz00OyAvLyBjcmNcblx0fVxuXG5cdGlmKG5pbWcuY3R5cGU9PTMpIHtcblx0XHR2YXIgZGwgPSBuaW1nLnBsdGUubGVuZ3RoO1xuXHRcdHdVaShkYXRhLG9mZnNldCwgZGwqMyk7ICBvZmZzZXQrPTQ7XG5cdFx0d0FzKGRhdGEsb2Zmc2V0LFwiUExURVwiKTsgIG9mZnNldCs9NDtcblx0XHRmb3IodmFyIGk9MDsgaTxkbDsgaSsrKXtcblx0XHRcdHZhciB0aT1pKjMsIGM9bmltZy5wbHRlW2ldLCByPShjKSYyNTUsIGc9KGM+PjgpJjI1NSwgYj0oYz4+MTYpJjI1NTtcblx0XHRcdGRhdGFbb2Zmc2V0K3RpKzBdPXI7ICBkYXRhW29mZnNldCt0aSsxXT1nOyAgZGF0YVtvZmZzZXQrdGkrMl09Yjtcblx0XHR9XG5cdFx0b2Zmc2V0Kz1kbCozO1xuXHRcdHdVaShkYXRhLG9mZnNldCxjcmMoZGF0YSxvZmZzZXQtZGwqMy00LGRsKjMrNCkpOyAgb2Zmc2V0Kz00OyAvLyBjcmNcblxuXHRcdGlmKG5pbWcuZ290QWxwaGEpIHtcblx0XHRcdHdVaShkYXRhLG9mZnNldCwgZGwpOyAgb2Zmc2V0Kz00O1xuXHRcdFx0d0FzKGRhdGEsb2Zmc2V0LFwidFJOU1wiKTsgIG9mZnNldCs9NDtcblx0XHRcdGZvcih2YXIgaT0wOyBpPGRsOyBpKyspICBkYXRhW29mZnNldCtpXT0obmltZy5wbHRlW2ldPj4yNCkmMjU1O1xuXHRcdFx0b2Zmc2V0Kz1kbDtcblx0XHRcdHdVaShkYXRhLG9mZnNldCxjcmMoZGF0YSxvZmZzZXQtZGwtNCxkbCs0KSk7ICBvZmZzZXQrPTQ7IC8vIGNyY1xuXHRcdH1cblx0fVxuXHRcblx0dmFyIGZpID0gMDtcblx0Zm9yKHZhciBqPTA7IGo8bmltZy5mcmFtZXMubGVuZ3RoOyBqKyspXG5cdHtcblx0XHR2YXIgZnIgPSBuaW1nLmZyYW1lc1tqXTtcblx0XHRpZihhbmltKSB7XG5cdFx0XHR3VWkoZGF0YSxvZmZzZXQsIDI2KTsgICAgIG9mZnNldCs9NDtcblx0XHRcdHdBcyhkYXRhLG9mZnNldCxcImZjVExcIik7ICBvZmZzZXQrPTQ7XG5cdFx0XHR3VWkoZGF0YSwgb2Zmc2V0LCBmaSsrKTsgICBvZmZzZXQrPTQ7XG5cdFx0XHR3VWkoZGF0YSwgb2Zmc2V0LCBmci5yZWN0LndpZHRoICk7ICAgb2Zmc2V0Kz00O1xuXHRcdFx0d1VpKGRhdGEsIG9mZnNldCwgZnIucmVjdC5oZWlnaHQpOyAgIG9mZnNldCs9NDtcblx0XHRcdHdVaShkYXRhLCBvZmZzZXQsIGZyLnJlY3QueCk7ICAgb2Zmc2V0Kz00O1xuXHRcdFx0d1VpKGRhdGEsIG9mZnNldCwgZnIucmVjdC55KTsgICBvZmZzZXQrPTQ7XG5cdFx0XHR3VXMoZGF0YSwgb2Zmc2V0LCBkZWxzW2pdKTsgICBvZmZzZXQrPTI7XG5cdFx0XHR3VXMoZGF0YSwgb2Zmc2V0LCAgMTAwMCk7ICAgb2Zmc2V0Kz0yO1xuXHRcdFx0ZGF0YVtvZmZzZXRdID0gZnIuZGlzcG9zZTsgIG9mZnNldCsrO1x0Ly8gZGlzcG9zZVxuXHRcdFx0ZGF0YVtvZmZzZXRdID0gZnIuYmxlbmQgIDsgIG9mZnNldCsrO1x0Ly8gYmxlbmRcblx0XHRcdHdVaShkYXRhLG9mZnNldCxjcmMoZGF0YSxvZmZzZXQtMzAsMzApKTsgIG9mZnNldCs9NDsgLy8gY3JjXG5cdFx0fVxuXHRcdFx0XHRcblx0XHR2YXIgaW1nZCA9IGZyLmNpbWcsIGRsID0gaW1nZC5sZW5ndGg7XG5cdFx0d1VpKGRhdGEsb2Zmc2V0LCBkbCsoaj09MD8wOjQpKTsgICAgIG9mZnNldCs9NDtcblx0XHR2YXIgaW9mZiA9IG9mZnNldDtcblx0XHR3QXMoZGF0YSxvZmZzZXQsKGo9PTApP1wiSURBVFwiOlwiZmRBVFwiKTsgIG9mZnNldCs9NDtcblx0XHRpZihqIT0wKSB7ICB3VWkoZGF0YSwgb2Zmc2V0LCBmaSsrKTsgIG9mZnNldCs9NDsgIH1cblx0XHRmb3IodmFyIGk9MDsgaTxkbDsgaSsrKSBkYXRhW29mZnNldCtpXSA9IGltZ2RbaV07XG5cdFx0b2Zmc2V0ICs9IGRsO1xuXHRcdHdVaShkYXRhLG9mZnNldCxjcmMoZGF0YSxpb2ZmLG9mZnNldC1pb2ZmKSk7ICBvZmZzZXQrPTQ7IC8vIGNyY1xuXHR9XG5cblx0d1VpKGRhdGEsb2Zmc2V0LCAwKTsgICAgIG9mZnNldCs9NDtcblx0d0FzKGRhdGEsb2Zmc2V0LFwiSUVORFwiKTsgIG9mZnNldCs9NDtcblx0d1VpKGRhdGEsb2Zmc2V0LGNyYyhkYXRhLG9mZnNldC00LDQpKTsgIG9mZnNldCs9NDsgLy8gY3JjXG5cblx0cmV0dXJuIGRhdGEuYnVmZmVyLnNsaWNlKDAsb2Zmc2V0KTtcbn1cblxuVVBORy5lbmNvZGUuY29tcHJlc3NQTkcgPSBmdW5jdGlvbihidWZzLCB3LCBoLCBwcywgZm9yYmlkUGx0ZSlcbntcblx0dmFyIG91dCA9IFVQTkcuZW5jb2RlLmNvbXByZXNzKGJ1ZnMsIHcsIGgsIHBzLCBmYWxzZSwgZm9yYmlkUGx0ZSk7XG5cdGZvcih2YXIgaT0wOyBpPGJ1ZnMubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgZnJtID0gb3V0LmZyYW1lc1tpXSwgbnc9ZnJtLnJlY3Qud2lkdGgsIG5oPWZybS5yZWN0LmhlaWdodCwgYnBsPWZybS5icGwsIGJwcD1mcm0uYnBwO1xuXHRcdHZhciBmZGF0YSA9IG5ldyBVaW50OEFycmF5KG5oKmJwbCtuaCk7XG5cdFx0ZnJtLmNpbWcgPSBVUE5HLmVuY29kZS5fZmlsdGVyWmVybyhmcm0uaW1nLG5oLGJwcCxicGwsZmRhdGEpO1xuXHR9XHRcblx0cmV0dXJuIG91dDtcbn1cblxuVVBORy5lbmNvZGUuY29tcHJlc3MgPSBmdW5jdGlvbihidWZzLCB3LCBoLCBwcywgZm9yR0lGLCBmb3JiaWRQbHRlKVxue1xuXHRpZihmb3JiaWRQbHRlPT1udWxsKSBmb3JiaWRQbHRlID0gZmFsc2U7XG5cdFxuXHR2YXIgY3R5cGUgPSA2LCBkZXB0aCA9IDgsIGJwcCA9IDQsIGFscGhhQW5kPTI1NVxuXHRcblx0Zm9yKHZhciBqPTA7IGo8YnVmcy5sZW5ndGg7IGorKykgIHsgIC8vIHdoZW4gbm90IHF1YW50aXplZCwgb3RoZXIgZnJhbWVzIGNhbiBjb250YWluIGNvbG9ycywgdGhhdCBhcmUgbm90IGluIGFuIGluaXRpYWwgZnJhbWVcblx0XHR2YXIgaW1nID0gbmV3IFVpbnQ4QXJyYXkoYnVmc1tqXSksIGlsZW4gPSBpbWcubGVuZ3RoO1xuXHRcdGZvcih2YXIgaT0wOyBpPGlsZW47IGkrPTQpIGFscGhhQW5kICY9IGltZ1tpKzNdO1xuXHR9XG5cdHZhciBnb3RBbHBoYSA9IChhbHBoYUFuZCkhPTI1NTtcblx0XG5cdHZhciBjbWFwPXt9LCBwbHRlPVtdOyAgaWYoYnVmcy5sZW5ndGghPTApIHsgIGNtYXBbMF09MDsgIHBsdGUucHVzaCgwKTsgIGlmKHBzIT0wKSBwcy0tOyAgfSBcblx0XG5cdFxuXHRpZihwcyE9MCkge1xuXHRcdHZhciBxcmVzID0gVVBORy5xdWFudGl6ZShidWZzLCBwcywgZm9yR0lGKTsgIGJ1ZnMgPSBxcmVzLmJ1ZnM7XG5cdFx0Zm9yKHZhciBpPTA7IGk8cXJlcy5wbHRlLmxlbmd0aDsgaSsrKSB7ICB2YXIgYz1xcmVzLnBsdGVbaV0uZXN0LnJnYmE7ICBpZihjbWFwW2NdPT1udWxsKSB7ICBjbWFwW2NdPXBsdGUubGVuZ3RoOyAgcGx0ZS5wdXNoKGMpOyAgfSAgICAgfVxuXHR9XG5cdGVsc2Uge1xuXHRcdC8vIHdoYXQgaWYgcHM9PTAsIGJ1dCB0aGVyZSBhcmUgPD0yNTYgY29sb3JzPyAgd2Ugc3RpbGwgbmVlZCB0byBkZXRlY3QsIGlmIHRoZSBwYWxldHRlIGNvdWxkIGJlIHVzZWRcblx0XHRmb3IodmFyIGo9MDsgajxidWZzLmxlbmd0aDsgaisrKSAgeyAgLy8gd2hlbiBub3QgcXVhbnRpemVkLCBvdGhlciBmcmFtZXMgY2FuIGNvbnRhaW4gY29sb3JzLCB0aGF0IGFyZSBub3QgaW4gYW4gaW5pdGlhbCBmcmFtZVxuXHRcdFx0dmFyIGltZzMyID0gbmV3IFVpbnQzMkFycmF5KGJ1ZnNbal0pLCBpbGVuID0gaW1nMzIubGVuZ3RoO1xuXHRcdFx0Zm9yKHZhciBpPTA7IGk8aWxlbjsgaSsrKSB7XG5cdFx0XHRcdHZhciBjID0gaW1nMzJbaV07XG5cdFx0XHRcdGlmKChpPHcgfHwgKGMhPWltZzMyW2ktMV0gJiYgYyE9aW1nMzJbaS13XSkpICYmIGNtYXBbY109PW51bGwpIHsgIGNtYXBbY109cGx0ZS5sZW5ndGg7ICBwbHRlLnB1c2goYyk7ICBpZihwbHRlLmxlbmd0aD49MzAwKSBicmVhazsgIH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblx0XG5cdHZhciBicnV0ZSA9IGdvdEFscGhhID8gZm9yR0lGIDogZmFsc2U7XHRcdC8vIGJydXRlIDogZnJhbWVzIGNhbiBvbmx5IGJlIGNvcGllZCwgbm90IFwiYmxlbmRlZFwiXG5cdHZhciBjYz1wbHRlLmxlbmd0aDsgIC8vY29uc29sZS5sb2coY2MpO1xuXHRpZihjYzw9MjU2ICYmIGZvcmJpZFBsdGU9PWZhbHNlKSB7XG5cdFx0aWYoY2M8PSAyKSBkZXB0aD0xOyAgZWxzZSBpZihjYzw9IDQpIGRlcHRoPTI7ICBlbHNlIGlmKGNjPD0xNikgZGVwdGg9NDsgIGVsc2UgZGVwdGg9ODtcblx0XHRpZihmb3JHSUYpIGRlcHRoPTg7XG5cdFx0Z290QWxwaGEgPSB0cnVlO1xuXHR9XG5cdFxuXHRcblx0dmFyIGZybXMgPSBbXTtcblx0Zm9yKHZhciBqPTA7IGo8YnVmcy5sZW5ndGg7IGorKylcblx0e1xuXHRcdHZhciBjaW1nID0gbmV3IFVpbnQ4QXJyYXkoYnVmc1tqXSksIGNpbWczMiA9IG5ldyBVaW50MzJBcnJheShjaW1nLmJ1ZmZlcik7XG5cdFx0XG5cdFx0dmFyIG54PTAsIG55PTAsIG53PXcsIG5oPWgsIGJsZW5kPTA7XG5cdFx0aWYoaiE9MCAmJiAhYnJ1dGUpIHtcblx0XHRcdHZhciB0bGltID0gKGZvckdJRiB8fCBqPT0xIHx8IGZybXNbZnJtcy5sZW5ndGgtMl0uZGlzcG9zZT09Mik/MToyLCB0c3RwID0gMCwgdGFyZWEgPSAxZTk7XG5cdFx0XHRmb3IodmFyIGl0PTA7IGl0PHRsaW07IGl0KyspXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwaW1nID0gbmV3IFVpbnQ4QXJyYXkoYnVmc1tqLTEtaXRdKSwgcDMyID0gbmV3IFVpbnQzMkFycmF5KGJ1ZnNbai0xLWl0XSk7XG5cdFx0XHRcdHZhciBtaXg9dyxtaXk9aCxtYXg9LTEsbWF5PS0xO1xuXHRcdFx0XHRmb3IodmFyIHk9MDsgeTxoOyB5KyspIGZvcih2YXIgeD0wOyB4PHc7IHgrKykge1xuXHRcdFx0XHRcdHZhciBpID0geSp3K3g7XG5cdFx0XHRcdFx0aWYoY2ltZzMyW2ldIT1wMzJbaV0pIHtcblx0XHRcdFx0XHRcdGlmKHg8bWl4KSBtaXg9eDsgIGlmKHg+bWF4KSBtYXg9eDtcblx0XHRcdFx0XHRcdGlmKHk8bWl5KSBtaXk9eTsgIGlmKHk+bWF5KSBtYXk9eTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHNhcmVhID0gKG1heD09LTEpID8gMSA6IChtYXgtbWl4KzEpKihtYXktbWl5KzEpO1xuXHRcdFx0XHRpZihzYXJlYTx0YXJlYSkge1xuXHRcdFx0XHRcdHRhcmVhID0gc2FyZWE7ICB0c3RwID0gaXQ7ICBcblx0XHRcdFx0XHRpZihtYXg9PS0xKSB7ICBueD1ueT0wOyAgbnc9bmg9MTsgIH1cblx0XHRcdFx0XHRlbHNlIHsgIG54ID0gbWl4OyBueSA9IG1peTsgbncgPSBtYXgtbWl4KzE7IG5oID0gbWF5LW1peSsxOyAgfVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHZhciBwaW1nID0gbmV3IFVpbnQ4QXJyYXkoYnVmc1tqLTEtdHN0cF0pO1xuXHRcdFx0aWYodHN0cD09MSkgZnJtc1tmcm1zLmxlbmd0aC0xXS5kaXNwb3NlID0gMjtcblx0XHRcdFxuXHRcdFx0dmFyIG5pbWcgPSBuZXcgVWludDhBcnJheShudypuaCo0KSwgbmltZzMyID0gbmV3IFVpbnQzMkFycmF5KG5pbWcuYnVmZmVyKTtcblx0XHRcdFVQTkcuICAgX2NvcHlUaWxlKHBpbWcsdyxoLCBuaW1nLG53LG5oLCAtbngsLW55LCAwKTtcblx0XHRcdGlmKFVQTkcuX2NvcHlUaWxlKGNpbWcsdyxoLCBuaW1nLG53LG5oLCAtbngsLW55LCAzKSkge1xuXHRcdFx0XHRVUE5HLl9jb3B5VGlsZShjaW1nLHcsaCwgbmltZyxudyxuaCwgLW54LC1ueSwgMik7ICBibGVuZCA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0VVBORy5fY29weVRpbGUoY2ltZyx3LGgsIG5pbWcsbncsbmgsIC1ueCwtbnksIDApOyAgYmxlbmQgPSAwO1xuXHRcdFx0fVxuXHRcdFx0Y2ltZyA9IG5pbWc7ICBjaW1nMzIgPSBuZXcgVWludDMyQXJyYXkoY2ltZy5idWZmZXIpO1xuXHRcdH1cblx0XHR2YXIgYnBsID0gNCpudztcblx0XHRpZihjYzw9MjU2ICYmIGZvcmJpZFBsdGU9PWZhbHNlKSB7XG5cdFx0XHRicGwgPSBNYXRoLmNlaWwoZGVwdGgqbncvOCk7XG5cdFx0XHR2YXIgbmltZyA9IG5ldyBVaW50OEFycmF5KGJwbCpuaCk7XG5cdFx0XHRmb3IodmFyIHk9MDsgeTxuaDsgeSsrKSB7ICB2YXIgaT15KmJwbCwgaWk9eSpudztcblx0XHRcdFx0aWYgICAgIChkZXB0aD09OCkgZm9yKHZhciB4PTA7IHg8bnc7IHgrKykgbmltZ1tpKyh4KSAgIF0gICA9ICAoY21hcFtjaW1nMzJbaWkreF1dICAgICAgICAgICAgICk7XG5cdFx0XHRcdGVsc2UgaWYoZGVwdGg9PTQpIGZvcih2YXIgeD0wOyB4PG53OyB4KyspIG5pbWdbaSsoeD4+MSldICB8PSAgKGNtYXBbY2ltZzMyW2lpK3hdXTw8KDQtKHgmMSkqNCkpO1xuXHRcdFx0XHRlbHNlIGlmKGRlcHRoPT0yKSBmb3IodmFyIHg9MDsgeDxudzsgeCsrKSBuaW1nW2krKHg+PjIpXSAgfD0gIChjbWFwW2NpbWczMltpaSt4XV08PCg2LSh4JjMpKjIpKTtcblx0XHRcdFx0ZWxzZSBpZihkZXB0aD09MSkgZm9yKHZhciB4PTA7IHg8bnc7IHgrKykgbmltZ1tpKyh4Pj4zKV0gIHw9ICAoY21hcFtjaW1nMzJbaWkreF1dPDwoNy0oeCY3KSoxKSk7XG5cdFx0XHR9XG5cdFx0XHRjaW1nPW5pbWc7ICBjdHlwZT0zOyAgYnBwPTE7XG5cdFx0fVxuXHRcdGVsc2UgaWYoZ290QWxwaGE9PWZhbHNlICYmIGJ1ZnMubGVuZ3RoPT0xKSB7XHQvLyBzb21lIG5leHQgXCJyZWR1Y2VkXCIgZnJhbWVzIG1heSBjb250YWluIGFscGhhIGZvciBibGVuZGluZ1xuXHRcdFx0dmFyIG5pbWcgPSBuZXcgVWludDhBcnJheShudypuaCozKSwgYXJlYT1udypuaDtcblx0XHRcdGZvcih2YXIgaT0wOyBpPGFyZWE7IGkrKykgeyB2YXIgdGk9aSozLCBxaT1pKjQ7ICBuaW1nW3RpXT1jaW1nW3FpXTsgIG5pbWdbdGkrMV09Y2ltZ1txaSsxXTsgIG5pbWdbdGkrMl09Y2ltZ1txaSsyXTsgIH1cblx0XHRcdGNpbWc9bmltZzsgIGN0eXBlPTI7ICBicHA9MzsgIGJwbD0zKm53O1xuXHRcdH1cblx0XHRmcm1zLnB1c2goe3JlY3Q6e3g6bngseTpueSx3aWR0aDpudyxoZWlnaHQ6bmh9LCBpbWc6Y2ltZywgYnBsOmJwbCwgYnBwOmJwcCwgYmxlbmQ6YmxlbmQsIGRpc3Bvc2U6YnJ1dGU/MTowfSk7XG5cdH1cblx0cmV0dXJuIHtjdHlwZTpjdHlwZSwgZGVwdGg6ZGVwdGgsIHBsdGU6cGx0ZSwgZ290QWxwaGE6Z290QWxwaGEsIGZyYW1lczpmcm1zICB9O1xufVxuXG5VUE5HLmVuY29kZS5fZmlsdGVyWmVybyA9IGZ1bmN0aW9uKGltZyxoLGJwcCxicGwsZGF0YSlcbntcblx0dmFyIGZscyA9IFtdO1xuXHRmb3IodmFyIHQ9MDsgdDw1OyB0KyspIHsgIGlmKGgqYnBsPjUwMDAwMCAmJiAodD09MiB8fCB0PT0zIHx8IHQ9PTQpKSBjb250aW51ZTtcblx0XHRmb3IodmFyIHk9MDsgeTxoOyB5KyspIFVQTkcuZW5jb2RlLl9maWx0ZXJMaW5lKGRhdGEsIGltZywgeSwgYnBsLCBicHAsIHQpO1xuXHRcdGZscy5wdXNoKHBha29bXCJkZWZsYXRlXCJdKGRhdGEpKTsgIGlmKGJwcD09MSkgYnJlYWs7XG5cdH1cblx0dmFyIHRpLCB0c2l6ZT0xZTk7XG5cdGZvcih2YXIgaT0wOyBpPGZscy5sZW5ndGg7IGkrKykgaWYoZmxzW2ldLmxlbmd0aDx0c2l6ZSkgeyAgdGk9aTsgIHRzaXplPWZsc1tpXS5sZW5ndGg7ICB9XG5cdHJldHVybiBmbHNbdGldO1xufVxuVVBORy5lbmNvZGUuX2ZpbHRlckxpbmUgPSBmdW5jdGlvbihkYXRhLCBpbWcsIHksIGJwbCwgYnBwLCB0eXBlKVxue1xuXHR2YXIgaSA9IHkqYnBsLCBkaSA9IGkreSwgcGFldGggPSBVUE5HLmRlY29kZS5fcGFldGhcblx0ZGF0YVtkaV09dHlwZTsgIGRpKys7XG5cblx0aWYodHlwZT09MCkgZm9yKHZhciB4PTA7IHg8YnBsOyB4KyspIGRhdGFbZGkreF0gPSBpbWdbaSt4XTtcblx0ZWxzZSBpZih0eXBlPT0xKSB7XG5cdFx0Zm9yKHZhciB4PSAgMDsgeDxicHA7IHgrKykgZGF0YVtkaSt4XSA9ICBpbWdbaSt4XTtcblx0XHRmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2RpK3hdID0gKGltZ1tpK3hdLWltZ1tpK3gtYnBwXSsyNTYpJjI1NTtcblx0fVxuXHRlbHNlIGlmKHk9PTApIHtcblx0XHRmb3IodmFyIHg9ICAwOyB4PGJwcDsgeCsrKSBkYXRhW2RpK3hdID0gaW1nW2kreF07XG5cblx0XHRpZih0eXBlPT0yKSBmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2RpK3hdID0gaW1nW2kreF07XG5cdFx0aWYodHlwZT09MykgZm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XSAtIChpbWdbaSt4LWJwcF0+PjEpICsyNTYpJjI1NTtcblx0XHRpZih0eXBlPT00KSBmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2RpK3hdID0gKGltZ1tpK3hdIC0gcGFldGgoaW1nW2kreC1icHBdLCAwLCAwKSArMjU2KSYyNTU7XG5cdH1cblx0ZWxzZSB7XG5cdFx0aWYodHlwZT09MikgeyBmb3IodmFyIHg9ICAwOyB4PGJwbDsgeCsrKSBkYXRhW2RpK3hdID0gKGltZ1tpK3hdKzI1NiAtIGltZ1tpK3gtYnBsXSkmMjU1OyAgfVxuXHRcdGlmKHR5cGU9PTMpIHsgZm9yKHZhciB4PSAgMDsgeDxicHA7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XSsyNTYgLSAoaW1nW2kreC1icGxdPj4xKSkmMjU1O1xuXHRcdFx0XHRcdCAgZm9yKHZhciB4PWJwcDsgeDxicGw7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XSsyNTYgLSAoKGltZ1tpK3gtYnBsXStpbWdbaSt4LWJwcF0pPj4xKSkmMjU1OyAgfVxuXHRcdGlmKHR5cGU9PTQpIHsgZm9yKHZhciB4PSAgMDsgeDxicHA7IHgrKykgZGF0YVtkaSt4XSA9IChpbWdbaSt4XSsyNTYgLSBwYWV0aCgwLCBpbWdbaSt4LWJwbF0sIDApKSYyNTU7XG5cdFx0XHRcdFx0ICBmb3IodmFyIHg9YnBwOyB4PGJwbDsgeCsrKSBkYXRhW2RpK3hdID0gKGltZ1tpK3hdKzI1NiAtIHBhZXRoKGltZ1tpK3gtYnBwXSwgaW1nW2kreC1icGxdLCBpbWdbaSt4LWJwcC1icGxdKSkmMjU1OyAgfVxuXHR9XG59XG5cblVQTkcuY3JjID0ge1xuXHR0YWJsZSA6ICggZnVuY3Rpb24oKSB7XG5cdCAgIHZhciB0YWIgPSBuZXcgVWludDMyQXJyYXkoMjU2KTtcblx0ICAgZm9yICh2YXIgbj0wOyBuPDI1NjsgbisrKSB7XG5cdFx0XHR2YXIgYyA9IG47XG5cdFx0XHRmb3IgKHZhciBrPTA7IGs8ODsgaysrKSB7XG5cdFx0XHRcdGlmIChjICYgMSkgIGMgPSAweGVkYjg4MzIwIF4gKGMgPj4+IDEpO1xuXHRcdFx0XHRlbHNlICAgICAgICBjID0gYyA+Pj4gMTtcblx0XHRcdH1cblx0XHRcdHRhYltuXSA9IGM7ICB9XG5cdFx0cmV0dXJuIHRhYjsgIH0pKCksXG5cdHVwZGF0ZSA6IGZ1bmN0aW9uKGMsIGJ1Ziwgb2ZmLCBsZW4pIHtcblx0XHRmb3IgKHZhciBpPTA7IGk8bGVuOyBpKyspICBjID0gVVBORy5jcmMudGFibGVbKGMgXiBidWZbb2ZmK2ldKSAmIDB4ZmZdIF4gKGMgPj4+IDgpO1xuXHRcdHJldHVybiBjO1xuXHR9LFxuXHRjcmMgOiBmdW5jdGlvbihiLG8sbCkgIHsgIHJldHVybiBVUE5HLmNyYy51cGRhdGUoMHhmZmZmZmZmZixiLG8sbCkgXiAweGZmZmZmZmZmOyAgfVxufVxuXG5cblVQTkcucXVhbnRpemUgPSBmdW5jdGlvbihidWZzLCBwcywgcm91bmRBbHBoYSlcbntcdFxuXHR2YXIgaW1ncyA9IFtdLCB0b3RsID0gMDtcblx0Zm9yKHZhciBpPTA7IGk8YnVmcy5sZW5ndGg7IGkrKykgeyAgaW1ncy5wdXNoKFVQTkcuZW5jb2RlLmFscGhhTXVsKG5ldyBVaW50OEFycmF5KGJ1ZnNbaV0pLCByb3VuZEFscGhhKSk7ICB0b3RsKz1idWZzW2ldLmJ5dGVMZW5ndGg7ICB9XG5cdFxuXHR2YXIgbmltZyA9IG5ldyBVaW50OEFycmF5KHRvdGwpLCBuaW1nMzIgPSBuZXcgVWludDMyQXJyYXkobmltZy5idWZmZXIpLCBub2ZmPTA7XG5cdGZvcih2YXIgaT0wOyBpPGltZ3MubGVuZ3RoOyBpKyspIHtcblx0XHR2YXIgaW1nID0gaW1nc1tpXSwgaWwgPSBpbWcubGVuZ3RoO1xuXHRcdGZvcih2YXIgaj0wOyBqPGlsOyBqKyspIG5pbWdbbm9mZitqXSA9IGltZ1tqXTtcblx0XHRub2ZmICs9IGlsO1xuXHR9XG5cdFxuXHR2YXIgcm9vdCA9IHtpMDowLCBpMTpuaW1nLmxlbmd0aCwgYnN0Om51bGwsIGVzdDpudWxsLCB0ZHN0OjAsIGxlZnQ6bnVsbCwgcmlnaHQ6bnVsbCB9OyAgLy8gYmFzaWMgc3RhdGlzdGljLCBleHRyYSBzdGF0aXN0aWNcblx0cm9vdC5ic3QgPSBVUE5HLnF1YW50aXplLnN0YXRzKCAgbmltZyxyb290LmkwLCByb290LmkxICApOyAgcm9vdC5lc3QgPSBVUE5HLnF1YW50aXplLmVzdGF0cyggcm9vdC5ic3QgKTtcblx0dmFyIGxlYWZzID0gW3Jvb3RdO1xuXHRcblx0d2hpbGUobGVhZnMubGVuZ3RoPHBzKVxuXHR7XG5cdFx0dmFyIG1heEwgPSAwLCBtaT0wO1xuXHRcdGZvcih2YXIgaT0wOyBpPGxlYWZzLmxlbmd0aDsgaSsrKSBpZihsZWFmc1tpXS5lc3QuTCA+IG1heEwpIHsgIG1heEw9bGVhZnNbaV0uZXN0Lkw7ICBtaT1pOyAgfVxuXHRcdGlmKG1heEw8MWUtMykgYnJlYWs7XG5cdFx0dmFyIG5vZGUgPSBsZWFmc1ttaV07XG5cdFx0XG5cdFx0dmFyIHMwID0gVVBORy5xdWFudGl6ZS5zcGxpdFBpeGVscyhuaW1nLG5pbWczMiwgbm9kZS5pMCwgbm9kZS5pMSwgbm9kZS5lc3QuZSwgbm9kZS5lc3QuZU1xMjU1KTtcblx0XHRcblx0XHR2YXIgbG4gPSB7aTA6bm9kZS5pMCwgaTE6czAsIGJzdDpudWxsLCBlc3Q6bnVsbCwgdGRzdDowLCBsZWZ0Om51bGwsIHJpZ2h0Om51bGwgfTsgIGxuLmJzdCA9IFVQTkcucXVhbnRpemUuc3RhdHMoIG5pbWcsIGxuLmkwLCBsbi5pMSApOyAgXG5cdFx0bG4uZXN0ID0gVVBORy5xdWFudGl6ZS5lc3RhdHMoIGxuLmJzdCApO1xuXHRcdHZhciBybiA9IHtpMDpzMCwgaTE6bm9kZS5pMSwgYnN0Om51bGwsIGVzdDpudWxsLCB0ZHN0OjAsIGxlZnQ6bnVsbCwgcmlnaHQ6bnVsbCB9OyAgcm4uYnN0ID0ge1I6W10sIG06W10sIE46bm9kZS5ic3QuTi1sbi5ic3QuTn07XG5cdFx0Zm9yKHZhciBpPTA7IGk8MTY7IGkrKykgcm4uYnN0LlJbaV0gPSBub2RlLmJzdC5SW2ldLWxuLmJzdC5SW2ldO1xuXHRcdGZvcih2YXIgaT0wOyBpPCA0OyBpKyspIHJuLmJzdC5tW2ldID0gbm9kZS5ic3QubVtpXS1sbi5ic3QubVtpXTtcblx0XHRybi5lc3QgPSBVUE5HLnF1YW50aXplLmVzdGF0cyggcm4uYnN0ICk7XG5cdFx0XG5cdFx0bm9kZS5sZWZ0ID0gbG47ICBub2RlLnJpZ2h0ID0gcm47XG5cdFx0bGVhZnNbbWldPWxuOyAgbGVhZnMucHVzaChybik7XG5cdH1cblx0bGVhZnMuc29ydChmdW5jdGlvbihhLGIpIHsgIHJldHVybiBiLmJzdC5OLWEuYnN0Lk47ICB9KTtcblx0XG5cdGZvcih2YXIgaWk9MDsgaWk8aW1ncy5sZW5ndGg7IGlpKyspIHtcblx0XHR2YXIgcGxhbmVEc3QgPSBVUE5HLnF1YW50aXplLnBsYW5lRHN0O1xuXHRcdHZhciBzYiA9IG5ldyBVaW50OEFycmF5KGltZ3NbaWldLmJ1ZmZlciksIHRiID0gbmV3IFVpbnQzMkFycmF5KGltZ3NbaWldLmJ1ZmZlciksIGxlbiA9IHNiLmxlbmd0aDtcblx0XHRcblx0XHR2YXIgc3RhY2sgPSBbXSwgc2k9MDtcblx0XHRmb3IodmFyIGk9MDsgaTxsZW47IGkrPTQpIHtcblx0XHRcdHZhciByPXNiW2ldKigxLzI1NSksIGc9c2JbaSsxXSooMS8yNTUpLCBiPXNiW2krMl0qKDEvMjU1KSwgYT1zYltpKzNdKigxLzI1NSk7XG5cdFx0XHRcblx0XHRcdC8vICBleGFjdCwgYnV0IHRvbyBzbG93IDooXG5cdFx0XHQvL3ZhciBuZCA9IFVQTkcucXVhbnRpemUuZ2V0TmVhcmVzdChyb290LCByLCBnLCBiLCBhKTtcblx0XHRcdHZhciBuZCA9IHJvb3Q7XG5cdFx0XHR3aGlsZShuZC5sZWZ0KSBuZCA9IChwbGFuZURzdChuZC5lc3QscixnLGIsYSk8PTApID8gbmQubGVmdCA6IG5kLnJpZ2h0O1xuXHRcdFx0XG5cdFx0XHR0YltpPj4yXSA9IG5kLmVzdC5yZ2JhO1xuXHRcdH1cblx0XHRpbWdzW2lpXT10Yi5idWZmZXI7XG5cdH1cblx0cmV0dXJuIHsgIGJ1ZnM6aW1ncywgcGx0ZTpsZWFmcyAgfTtcbn1cblVQTkcucXVhbnRpemUuZ2V0TmVhcmVzdCA9IGZ1bmN0aW9uKG5kLCByLGcsYixhKVxue1xuXHRpZihuZC5sZWZ0PT1udWxsKSB7ICBuZC50ZHN0ID0gVVBORy5xdWFudGl6ZS5kaXN0KG5kLmVzdC5xLHIsZyxiLGEpOyAgcmV0dXJuIG5kOyAgfVxuXHR2YXIgcGxhbmVEc3QgPSBVUE5HLnF1YW50aXplLnBsYW5lRHN0KG5kLmVzdCxyLGcsYixhKTtcblx0XG5cdHZhciBub2RlMCA9IG5kLmxlZnQsIG5vZGUxID0gbmQucmlnaHQ7XG5cdGlmKHBsYW5lRHN0PjApIHsgIG5vZGUwPW5kLnJpZ2h0OyAgbm9kZTE9bmQubGVmdDsgIH1cblx0XG5cdHZhciBsbiA9IFVQTkcucXVhbnRpemUuZ2V0TmVhcmVzdChub2RlMCwgcixnLGIsYSk7XG5cdGlmKGxuLnRkc3Q8PXBsYW5lRHN0KnBsYW5lRHN0KSByZXR1cm4gbG47XG5cdHZhciBybiA9IFVQTkcucXVhbnRpemUuZ2V0TmVhcmVzdChub2RlMSwgcixnLGIsYSk7XG5cdHJldHVybiBybi50ZHN0PGxuLnRkc3QgPyBybiA6IGxuO1xufVxuVVBORy5xdWFudGl6ZS5wbGFuZURzdCA9IGZ1bmN0aW9uKGVzdCwgcixnLGIsYSkgeyAgdmFyIGUgPSBlc3QuZTsgIHJldHVybiBlWzBdKnIgKyBlWzFdKmcgKyBlWzJdKmIgKyBlWzNdKmEgLSBlc3QuZU1xOyAgfVxuVVBORy5xdWFudGl6ZS5kaXN0ICAgICA9IGZ1bmN0aW9uKHEsICAgcixnLGIsYSkgeyAgdmFyIGQwPXItcVswXSwgZDE9Zy1xWzFdLCBkMj1iLXFbMl0sIGQzPWEtcVszXTsgIHJldHVybiBkMCpkMCtkMSpkMStkMipkMitkMypkMzsgIH1cblxuVVBORy5xdWFudGl6ZS5zcGxpdFBpeGVscyA9IGZ1bmN0aW9uKG5pbWcsIG5pbWczMiwgaTAsIGkxLCBlLCBlTXEpXG57XG5cdHZhciB2ZWNEb3QgPSBVUE5HLnF1YW50aXplLnZlY0RvdDtcblx0aTEtPTQ7XG5cdHZhciBzaGZzID0gMDtcblx0d2hpbGUoaTA8aTEpXG5cdHtcblx0XHR3aGlsZSh2ZWNEb3QobmltZywgaTAsIGUpPD1lTXEpIGkwKz00O1xuXHRcdHdoaWxlKHZlY0RvdChuaW1nLCBpMSwgZSk+IGVNcSkgaTEtPTQ7XG5cdFx0aWYoaTA+PWkxKSBicmVhaztcblx0XHRcblx0XHR2YXIgdCA9IG5pbWczMltpMD4+Ml07ICBuaW1nMzJbaTA+PjJdID0gbmltZzMyW2kxPj4yXTsgIG5pbWczMltpMT4+Ml09dDtcblx0XHRcblx0XHRpMCs9NDsgIGkxLT00O1xuXHR9XG5cdHdoaWxlKHZlY0RvdChuaW1nLCBpMCwgZSk+ZU1xKSBpMC09NDtcblx0cmV0dXJuIGkwKzQ7XG59XG5VUE5HLnF1YW50aXplLnZlY0RvdCA9IGZ1bmN0aW9uKG5pbWcsIGksIGUpXG57XG5cdHJldHVybiBuaW1nW2ldKmVbMF0gKyBuaW1nW2krMV0qZVsxXSArIG5pbWdbaSsyXSplWzJdICsgbmltZ1tpKzNdKmVbM107XG59XG5VUE5HLnF1YW50aXplLnN0YXRzID0gZnVuY3Rpb24obmltZywgaTAsIGkxKXtcblx0dmFyIFIgPSBbMCwwLDAsMCwgIDAsMCwwLDAsICAwLDAsMCwwLCAgMCwwLDAsMF07XG5cdHZhciBtID0gWzAsMCwwLDBdO1xuXHR2YXIgTiA9IChpMS1pMCk+PjI7XG5cdGZvcih2YXIgaT1pMDsgaTxpMTsgaSs9NClcblx0e1xuXHRcdHZhciByID0gbmltZ1tpXSooMS8yNTUpLCBnID0gbmltZ1tpKzFdKigxLzI1NSksIGIgPSBuaW1nW2krMl0qKDEvMjU1KSwgYSA9IG5pbWdbaSszXSooMS8yNTUpO1xuXHRcdC8vdmFyIHIgPSBuaW1nW2ldLCBnID0gbmltZ1tpKzFdLCBiID0gbmltZ1tpKzJdLCBhID0gbmltZ1tpKzNdO1xuXHRcdG1bMF0rPXI7ICBtWzFdKz1nOyAgbVsyXSs9YjsgIG1bM10rPWE7XG5cdFx0XG5cdFx0UlsgMF0gKz0gcipyOyAgUlsgMV0gKz0gcipnOyAgUlsgMl0gKz0gcipiOyAgUlsgM10gKz0gciphOyAgXG5cdFx0ICAgICAgICAgICAgICAgUlsgNV0gKz0gZypnOyAgUlsgNl0gKz0gZypiOyAgUlsgN10gKz0gZyphOyBcblx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBSWzEwXSArPSBiKmI7ICBSWzExXSArPSBiKmE7ICBcblx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBSWzE1XSArPSBhKmE7ICBcblx0fVxuXHRSWzRdPVJbMV07ICBSWzhdPVJbMl07ICBSWzEyXT1SWzNdOyAgUls5XT1SWzZdOyAgUlsxM109Uls3XTsgIFJbMTRdPVJbMTFdO1xuXHRcblx0cmV0dXJuIHtSOlIsIG06bSwgTjpOfTtcbn1cblVQTkcucXVhbnRpemUuZXN0YXRzID0gZnVuY3Rpb24oc3RhdHMpe1xuXHR2YXIgUiA9IHN0YXRzLlIsIG0gPSBzdGF0cy5tLCBOID0gc3RhdHMuTjtcblx0XG5cdHZhciBtMCA9IG1bMF0sIG0xID0gbVsxXSwgbTIgPSBtWzJdLCBtMyA9IG1bM10sIGlOID0gKE49PTAgPyAwIDogMS9OKTtcblx0dmFyIFJqID0gW1xuXHRcdFJbIDBdIC0gbTAqbTAqaU4sICBSWyAxXSAtIG0wKm0xKmlOLCAgUlsgMl0gLSBtMCptMippTiwgIFJbIDNdIC0gbTAqbTMqaU4sICBcblx0XHRSWyA0XSAtIG0xKm0wKmlOLCAgUlsgNV0gLSBtMSptMSppTiwgIFJbIDZdIC0gbTEqbTIqaU4sICBSWyA3XSAtIG0xKm0zKmlOLFxuXHRcdFJbIDhdIC0gbTIqbTAqaU4sICBSWyA5XSAtIG0yKm0xKmlOLCAgUlsxMF0gLSBtMiptMippTiwgIFJbMTFdIC0gbTIqbTMqaU4sICBcblx0XHRSWzEyXSAtIG0zKm0wKmlOLCAgUlsxM10gLSBtMyptMSppTiwgIFJbMTRdIC0gbTMqbTIqaU4sICBSWzE1XSAtIG0zKm0zKmlOIFxuXHRdO1xuXHRcblx0dmFyIEEgPSBSaiwgTSA9IFVQTkcuTTQ7XG5cdHZhciBiID0gWzAuNSwwLjUsMC41LDAuNV0sIG1pID0gMCwgdG1pID0gMDtcblx0XG5cdGlmKE4hPTApXG5cdGZvcih2YXIgaT0wOyBpPDEwOyBpKyspIHtcblx0XHRiID0gTS5tdWx0VmVjKEEsIGIpOyAgdG1pID0gTWF0aC5zcXJ0KE0uZG90KGIsYikpOyAgYiA9IE0uc21sKDEvdG1pLCAgYik7XG5cdFx0aWYoTWF0aC5hYnModG1pLW1pKTwxZS05KSBicmVhazsgIG1pID0gdG1pO1xuXHR9XHRcblx0Ly9iID0gWzAsMCwxLDBdOyAgbWk9Tjtcblx0dmFyIHEgPSBbbTAqaU4sIG0xKmlOLCBtMippTiwgbTMqaU5dO1xuXHR2YXIgZU1xMjU1ID0gTS5kb3QoTS5zbWwoMjU1LHEpLGIpO1xuXHRcblx0dmFyIGlhID0gKHFbM108MC4wMDEpID8gMCA6IDEvcVszXTtcblx0XG5cdHJldHVybiB7ICBDb3Y6UmosIHE6cSwgZTpiLCBMOm1pLCAgZU1xMjU1OmVNcTI1NSwgZU1xIDogTS5kb3QoYixxKSxcblx0XHRcdFx0cmdiYTogKCgoTWF0aC5yb3VuZCgyNTUqcVszXSk8PDI0KSB8IChNYXRoLnJvdW5kKDI1NSpxWzJdKmlhKTw8MTYpIHwgIChNYXRoLnJvdW5kKDI1NSpxWzFdKmlhKTw8OCkgfCAoTWF0aC5yb3VuZCgyNTUqcVswXSppYSk8PDApKT4+PjApICB9O1xufVxuVVBORy5NNCA9IHtcblx0bXVsdFZlYyA6IGZ1bmN0aW9uKG0sdikge1xuXHRcdFx0cmV0dXJuIFtcblx0XHRcdFx0bVsgMF0qdlswXSArIG1bIDFdKnZbMV0gKyBtWyAyXSp2WzJdICsgbVsgM10qdlszXSxcblx0XHRcdFx0bVsgNF0qdlswXSArIG1bIDVdKnZbMV0gKyBtWyA2XSp2WzJdICsgbVsgN10qdlszXSxcblx0XHRcdFx0bVsgOF0qdlswXSArIG1bIDldKnZbMV0gKyBtWzEwXSp2WzJdICsgbVsxMV0qdlszXSxcblx0XHRcdFx0bVsxMl0qdlswXSArIG1bMTNdKnZbMV0gKyBtWzE0XSp2WzJdICsgbVsxNV0qdlszXVxuXHRcdFx0XTtcblx0fSxcblx0ZG90IDogZnVuY3Rpb24oeCx5KSB7ICByZXR1cm4gIHhbMF0qeVswXSt4WzFdKnlbMV0reFsyXSp5WzJdK3hbM10qeVszXTsgIH0sXG5cdHNtbCA6IGZ1bmN0aW9uKGEseSkgeyAgcmV0dXJuIFthKnlbMF0sYSp5WzFdLGEqeVsyXSxhKnlbM11dOyAgfVxufVxuXG5VUE5HLmVuY29kZS5hbHBoYU11bCA9IGZ1bmN0aW9uKGltZywgcm91bmRBKSB7XG5cdHZhciBuaW1nID0gbmV3IFVpbnQ4QXJyYXkoaW1nLmxlbmd0aCksIGFyZWEgPSBpbWcubGVuZ3RoPj4yOyBcblx0Zm9yKHZhciBpPTA7IGk8YXJlYTsgaSsrKSB7XG5cdFx0dmFyIHFpPWk8PDIsIGlhPWltZ1txaSszXTsgICBcblx0XHRpZihyb3VuZEEpIGlhID0gKChpYTwxMjgpKT8wOjI1NTtcblx0XHR2YXIgYSA9IGlhKigxLzI1NSk7XG5cdFx0bmltZ1txaSswXSA9IGltZ1txaSswXSphOyAgbmltZ1txaSsxXSA9IGltZ1txaSsxXSphOyAgbmltZ1txaSsyXSA9IGltZ1txaSsyXSphOyAgbmltZ1txaSszXSA9IGlhO1xuXHR9XG5cdHJldHVybiBuaW1nO1xufVxuXG5cdFxuXHRcblx0XG5cdFxuXHRcblxuXG59KShVUE5HLCBwYWtvKTtcbn0pKCk7XG5cbiIsICIvKiFcblxucGljYVxuaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9waWNhXG5cbiovXG5cbihmdW5jdGlvbihmKXtpZih0eXBlb2YgZXhwb3J0cz09PVwib2JqZWN0XCImJnR5cGVvZiBtb2R1bGUhPT1cInVuZGVmaW5lZFwiKXttb2R1bGUuZXhwb3J0cz1mKCl9ZWxzZSBpZih0eXBlb2YgZGVmaW5lPT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kKXtkZWZpbmUoW10sZil9ZWxzZXt2YXIgZztpZih0eXBlb2Ygd2luZG93IT09XCJ1bmRlZmluZWRcIil7Zz13aW5kb3d9ZWxzZSBpZih0eXBlb2YgZ2xvYmFsIT09XCJ1bmRlZmluZWRcIil7Zz1nbG9iYWx9ZWxzZSBpZih0eXBlb2Ygc2VsZiE9PVwidW5kZWZpbmVkXCIpe2c9c2VsZn1lbHNle2c9dGhpc31nLnBpY2EgPSBmKCl9fSkoZnVuY3Rpb24oKXt2YXIgZGVmaW5lLG1vZHVsZSxleHBvcnRzO3JldHVybiAoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpKHsxOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8vIENvbGxlY3Rpb24gb2YgbWF0aCBmdW5jdGlvbnNcbi8vXG4vLyAxLiBDb21iaW5lIGNvbXBvbmVudHMgdG9nZXRoZXJcbi8vIDIuIEhhcyBhc3luYyBpbml0IHRvIGxvYWQgd2FzbSBtb2R1bGVzXG4vL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgaW5oZXJpdHMgPSBfZGVyZXFfKCdpbmhlcml0cycpO1xuXG52YXIgTXVsdGltYXRoID0gX2RlcmVxXygnbXVsdGltYXRoJyk7XG5cbnZhciBtbV91bnNoYXJwX21hc2sgPSBfZGVyZXFfKCdtdWx0aW1hdGgvbGliL3Vuc2hhcnBfbWFzaycpO1xuXG52YXIgbW1fcmVzaXplID0gX2RlcmVxXygnLi9tbV9yZXNpemUnKTtcblxuZnVuY3Rpb24gTWF0aExpYihyZXF1ZXN0ZWRfZmVhdHVyZXMpIHtcbiAgdmFyIF9fcmVxdWVzdGVkX2ZlYXR1cmVzID0gcmVxdWVzdGVkX2ZlYXR1cmVzIHx8IFtdO1xuXG4gIHZhciBmZWF0dXJlcyA9IHtcbiAgICBqczogX19yZXF1ZXN0ZWRfZmVhdHVyZXMuaW5kZXhPZignanMnKSA+PSAwLFxuICAgIHdhc206IF9fcmVxdWVzdGVkX2ZlYXR1cmVzLmluZGV4T2YoJ3dhc20nKSA+PSAwXG4gIH07XG4gIE11bHRpbWF0aC5jYWxsKHRoaXMsIGZlYXR1cmVzKTtcbiAgdGhpcy5mZWF0dXJlcyA9IHtcbiAgICBqczogZmVhdHVyZXMuanMsXG4gICAgd2FzbTogZmVhdHVyZXMud2FzbSAmJiB0aGlzLmhhc193YXNtKClcbiAgfTtcbiAgdGhpcy51c2UobW1fdW5zaGFycF9tYXNrKTtcbiAgdGhpcy51c2UobW1fcmVzaXplKTtcbn1cblxuaW5oZXJpdHMoTWF0aExpYiwgTXVsdGltYXRoKTtcblxuTWF0aExpYi5wcm90b3R5cGUucmVzaXplQW5kVW5zaGFycCA9IGZ1bmN0aW9uIHJlc2l6ZUFuZFVuc2hhcnAob3B0aW9ucywgY2FjaGUpIHtcbiAgdmFyIHJlc3VsdCA9IHRoaXMucmVzaXplKG9wdGlvbnMsIGNhY2hlKTtcblxuICBpZiAob3B0aW9ucy51bnNoYXJwQW1vdW50KSB7XG4gICAgdGhpcy51bnNoYXJwX21hc2socmVzdWx0LCBvcHRpb25zLnRvV2lkdGgsIG9wdGlvbnMudG9IZWlnaHQsIG9wdGlvbnMudW5zaGFycEFtb3VudCwgb3B0aW9ucy51bnNoYXJwUmFkaXVzLCBvcHRpb25zLnVuc2hhcnBUaHJlc2hvbGQpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWF0aExpYjtcblxufSx7XCIuL21tX3Jlc2l6ZVwiOjQsXCJpbmhlcml0c1wiOjE1LFwibXVsdGltYXRoXCI6MTYsXCJtdWx0aW1hdGgvbGliL3Vuc2hhcnBfbWFza1wiOjE5fV0sMjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBSZXNpemUgY29udm9sdmVycywgcHVyZSBKUyBpbXBsZW1lbnRhdGlvblxuLy9cbid1c2Ugc3RyaWN0JzsgLy8gUHJlY2lzaW9uIG9mIGZpeGVkIEZQIHZhbHVlc1xuLy92YXIgRklYRURfRlJBQ19CSVRTID0gMTQ7XG5cbmZ1bmN0aW9uIGNsYW1wVG84KGkpIHtcbiAgcmV0dXJuIGkgPCAwID8gMCA6IGkgPiAyNTUgPyAyNTUgOiBpO1xufSAvLyBDb252b2x2ZSBpbWFnZSBpbiBob3Jpem9udGFsIGRpcmVjdGlvbnMgYW5kIHRyYW5zcG9zZSBvdXRwdXQuIEluIHRoZW9yeSxcbi8vIHRyYW5zcG9zZSBhbGxvdzpcbi8vXG4vLyAtIHVzZSB0aGUgc2FtZSBjb252b2x2ZXIgZm9yIGJvdGggcGFzc2VzICh0aGlzIGZhaWxzIGR1ZSBkaWZmZXJlbnRcbi8vICAgdHlwZXMgb2YgaW5wdXQgYXJyYXkgYW5kIHRlbXBvcmFyeSBidWZmZXIpXG4vLyAtIG1ha2luZyB2ZXJ0aWNhbCBwYXNzIGJ5IGhvcmlzb25sdGFsIGxpbmVzIGlucHJvdmUgQ1BVIGNhY2hlIHVzZS5cbi8vXG4vLyBCdXQgaW4gcmVhbCBsaWZlIHRoaXMgZG9lc24ndCB3b3JrIDopXG4vL1xuXG5cbmZ1bmN0aW9uIGNvbnZvbHZlSG9yaXpvbnRhbGx5KHNyYywgZGVzdCwgc3JjVywgc3JjSCwgZGVzdFcsIGZpbHRlcnMpIHtcbiAgdmFyIHIsIGcsIGIsIGE7XG4gIHZhciBmaWx0ZXJQdHIsIGZpbHRlclNoaWZ0LCBmaWx0ZXJTaXplO1xuICB2YXIgc3JjUHRyLCBzcmNZLCBkZXN0WCwgZmlsdGVyVmFsO1xuICB2YXIgc3JjT2Zmc2V0ID0gMCxcbiAgICAgIGRlc3RPZmZzZXQgPSAwOyAvLyBGb3IgZWFjaCByb3dcblxuICBmb3IgKHNyY1kgPSAwOyBzcmNZIDwgc3JjSDsgc3JjWSsrKSB7XG4gICAgZmlsdGVyUHRyID0gMDsgLy8gQXBwbHkgcHJlY29tcHV0ZWQgZmlsdGVycyB0byBlYWNoIGRlc3RpbmF0aW9uIHJvdyBwb2ludFxuXG4gICAgZm9yIChkZXN0WCA9IDA7IGRlc3RYIDwgZGVzdFc7IGRlc3RYKyspIHtcbiAgICAgIC8vIEdldCB0aGUgZmlsdGVyIHRoYXQgZGV0ZXJtaW5lcyB0aGUgY3VycmVudCBvdXRwdXQgcGl4ZWwuXG4gICAgICBmaWx0ZXJTaGlmdCA9IGZpbHRlcnNbZmlsdGVyUHRyKytdO1xuICAgICAgZmlsdGVyU2l6ZSA9IGZpbHRlcnNbZmlsdGVyUHRyKytdO1xuICAgICAgc3JjUHRyID0gc3JjT2Zmc2V0ICsgZmlsdGVyU2hpZnQgKiA0IHwgMDtcbiAgICAgIHIgPSBnID0gYiA9IGEgPSAwOyAvLyBBcHBseSB0aGUgZmlsdGVyIHRvIHRoZSByb3cgdG8gZ2V0IHRoZSBkZXN0aW5hdGlvbiBwaXhlbCByLCBnLCBiLCBhXG5cbiAgICAgIGZvciAoOyBmaWx0ZXJTaXplID4gMDsgZmlsdGVyU2l6ZS0tKSB7XG4gICAgICAgIGZpbHRlclZhbCA9IGZpbHRlcnNbZmlsdGVyUHRyKytdOyAvLyBVc2UgcmV2ZXJzZSBvcmRlciB0byB3b3JrYXJvdW5kIGRlb3B0cyBpbiBvbGQgdjggKG5vZGUgdi4xMClcbiAgICAgICAgLy8gQmlnIHRoYW5rcyB0byBAbXJhbGVwaCAoVnlhY2hlc2xhdiBFZ29yb3YpIGZvciB0aGUgdGlwLlxuXG4gICAgICAgIGEgPSBhICsgZmlsdGVyVmFsICogc3JjW3NyY1B0ciArIDNdIHwgMDtcbiAgICAgICAgYiA9IGIgKyBmaWx0ZXJWYWwgKiBzcmNbc3JjUHRyICsgMl0gfCAwO1xuICAgICAgICBnID0gZyArIGZpbHRlclZhbCAqIHNyY1tzcmNQdHIgKyAxXSB8IDA7XG4gICAgICAgIHIgPSByICsgZmlsdGVyVmFsICogc3JjW3NyY1B0cl0gfCAwO1xuICAgICAgICBzcmNQdHIgPSBzcmNQdHIgKyA0IHwgMDtcbiAgICAgIH0gLy8gQnJpbmcgdGhpcyB2YWx1ZSBiYWNrIGluIHJhbmdlLiBBbGwgb2YgdGhlIGZpbHRlciBzY2FsaW5nIGZhY3RvcnNcbiAgICAgIC8vIGFyZSBpbiBmaXhlZCBwb2ludCB3aXRoIEZJWEVEX0ZSQUNfQklUUyBiaXRzIG9mIGZyYWN0aW9uYWwgcGFydC5cbiAgICAgIC8vXG4gICAgICAvLyAoISkgQWRkIDEvMiBvZiB2YWx1ZSBiZWZvcmUgY2xhbXBpbmcgdG8gZ2V0IHByb3BlciByb3VuZGluZy4gSW4gb3RoZXJcbiAgICAgIC8vIGNhc2UgYnJpZ2h0bmVzcyBsb3NzIHdpbGwgYmUgbm90aWNlYWJsZSBpZiB5b3UgcmVzaXplIGltYWdlIHdpdGggd2hpdGVcbiAgICAgIC8vIGJvcmRlciBhbmQgcGxhY2UgaXQgb24gd2hpdGUgYmFja2dyb3VuZC5cbiAgICAgIC8vXG5cblxuICAgICAgZGVzdFtkZXN0T2Zmc2V0ICsgM10gPSBjbGFtcFRvOChhICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdFtkZXN0T2Zmc2V0ICsgMl0gPSBjbGFtcFRvOChiICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdFtkZXN0T2Zmc2V0ICsgMV0gPSBjbGFtcFRvOChnICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdFtkZXN0T2Zmc2V0XSA9IGNsYW1wVG84KHIgKyAoMSA8PCAxMykgPj4gMTRcbiAgICAgIC8qRklYRURfRlJBQ19CSVRTKi9cbiAgICAgICk7XG4gICAgICBkZXN0T2Zmc2V0ID0gZGVzdE9mZnNldCArIHNyY0ggKiA0IHwgMDtcbiAgICB9XG5cbiAgICBkZXN0T2Zmc2V0ID0gKHNyY1kgKyAxKSAqIDQgfCAwO1xuICAgIHNyY09mZnNldCA9IChzcmNZICsgMSkgKiBzcmNXICogNCB8IDA7XG4gIH1cbn0gLy8gVGVjaG5pY2FsbHksIGNvbnZvbHZlcnMgYXJlIHRoZSBzYW1lLiBCdXQgaW5wdXQgYXJyYXkgYW5kIHRlbXBvcmFyeVxuLy8gYnVmZmVyIGNhbiBiZSBvZiBkaWZmZXJlbnQgdHlwZSAoZXNwZWNpYWxseSwgaW4gb2xkIGJyb3dzZXJzKS4gU28sXG4vLyBrZWVwIGNvZGUgaW4gc2VwYXJhdGUgZnVuY3Rpb25zIHRvIGF2b2lkIGRlb3B0aW1pemF0aW9ucyAmIHNwZWVkIGxvc3MuXG5cblxuZnVuY3Rpb24gY29udm9sdmVWZXJ0aWNhbGx5KHNyYywgZGVzdCwgc3JjVywgc3JjSCwgZGVzdFcsIGZpbHRlcnMpIHtcbiAgdmFyIHIsIGcsIGIsIGE7XG4gIHZhciBmaWx0ZXJQdHIsIGZpbHRlclNoaWZ0LCBmaWx0ZXJTaXplO1xuICB2YXIgc3JjUHRyLCBzcmNZLCBkZXN0WCwgZmlsdGVyVmFsO1xuICB2YXIgc3JjT2Zmc2V0ID0gMCxcbiAgICAgIGRlc3RPZmZzZXQgPSAwOyAvLyBGb3IgZWFjaCByb3dcblxuICBmb3IgKHNyY1kgPSAwOyBzcmNZIDwgc3JjSDsgc3JjWSsrKSB7XG4gICAgZmlsdGVyUHRyID0gMDsgLy8gQXBwbHkgcHJlY29tcHV0ZWQgZmlsdGVycyB0byBlYWNoIGRlc3RpbmF0aW9uIHJvdyBwb2ludFxuXG4gICAgZm9yIChkZXN0WCA9IDA7IGRlc3RYIDwgZGVzdFc7IGRlc3RYKyspIHtcbiAgICAgIC8vIEdldCB0aGUgZmlsdGVyIHRoYXQgZGV0ZXJtaW5lcyB0aGUgY3VycmVudCBvdXRwdXQgcGl4ZWwuXG4gICAgICBmaWx0ZXJTaGlmdCA9IGZpbHRlcnNbZmlsdGVyUHRyKytdO1xuICAgICAgZmlsdGVyU2l6ZSA9IGZpbHRlcnNbZmlsdGVyUHRyKytdO1xuICAgICAgc3JjUHRyID0gc3JjT2Zmc2V0ICsgZmlsdGVyU2hpZnQgKiA0IHwgMDtcbiAgICAgIHIgPSBnID0gYiA9IGEgPSAwOyAvLyBBcHBseSB0aGUgZmlsdGVyIHRvIHRoZSByb3cgdG8gZ2V0IHRoZSBkZXN0aW5hdGlvbiBwaXhlbCByLCBnLCBiLCBhXG5cbiAgICAgIGZvciAoOyBmaWx0ZXJTaXplID4gMDsgZmlsdGVyU2l6ZS0tKSB7XG4gICAgICAgIGZpbHRlclZhbCA9IGZpbHRlcnNbZmlsdGVyUHRyKytdOyAvLyBVc2UgcmV2ZXJzZSBvcmRlciB0byB3b3JrYXJvdW5kIGRlb3B0cyBpbiBvbGQgdjggKG5vZGUgdi4xMClcbiAgICAgICAgLy8gQmlnIHRoYW5rcyB0byBAbXJhbGVwaCAoVnlhY2hlc2xhdiBFZ29yb3YpIGZvciB0aGUgdGlwLlxuXG4gICAgICAgIGEgPSBhICsgZmlsdGVyVmFsICogc3JjW3NyY1B0ciArIDNdIHwgMDtcbiAgICAgICAgYiA9IGIgKyBmaWx0ZXJWYWwgKiBzcmNbc3JjUHRyICsgMl0gfCAwO1xuICAgICAgICBnID0gZyArIGZpbHRlclZhbCAqIHNyY1tzcmNQdHIgKyAxXSB8IDA7XG4gICAgICAgIHIgPSByICsgZmlsdGVyVmFsICogc3JjW3NyY1B0cl0gfCAwO1xuICAgICAgICBzcmNQdHIgPSBzcmNQdHIgKyA0IHwgMDtcbiAgICAgIH0gLy8gQnJpbmcgdGhpcyB2YWx1ZSBiYWNrIGluIHJhbmdlLiBBbGwgb2YgdGhlIGZpbHRlciBzY2FsaW5nIGZhY3RvcnNcbiAgICAgIC8vIGFyZSBpbiBmaXhlZCBwb2ludCB3aXRoIEZJWEVEX0ZSQUNfQklUUyBiaXRzIG9mIGZyYWN0aW9uYWwgcGFydC5cbiAgICAgIC8vXG4gICAgICAvLyAoISkgQWRkIDEvMiBvZiB2YWx1ZSBiZWZvcmUgY2xhbXBpbmcgdG8gZ2V0IHByb3BlciByb3VuZGluZy4gSW4gb3RoZXJcbiAgICAgIC8vIGNhc2UgYnJpZ2h0bmVzcyBsb3NzIHdpbGwgYmUgbm90aWNlYWJsZSBpZiB5b3UgcmVzaXplIGltYWdlIHdpdGggd2hpdGVcbiAgICAgIC8vIGJvcmRlciBhbmQgcGxhY2UgaXQgb24gd2hpdGUgYmFja2dyb3VuZC5cbiAgICAgIC8vXG5cblxuICAgICAgZGVzdFtkZXN0T2Zmc2V0ICsgM10gPSBjbGFtcFRvOChhICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdFtkZXN0T2Zmc2V0ICsgMl0gPSBjbGFtcFRvOChiICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdFtkZXN0T2Zmc2V0ICsgMV0gPSBjbGFtcFRvOChnICsgKDEgPDwgMTMpID4+IDE0XG4gICAgICAvKkZJWEVEX0ZSQUNfQklUUyovXG4gICAgICApO1xuICAgICAgZGVzdFtkZXN0T2Zmc2V0XSA9IGNsYW1wVG84KHIgKyAoMSA8PCAxMykgPj4gMTRcbiAgICAgIC8qRklYRURfRlJBQ19CSVRTKi9cbiAgICAgICk7XG4gICAgICBkZXN0T2Zmc2V0ID0gZGVzdE9mZnNldCArIHNyY0ggKiA0IHwgMDtcbiAgICB9XG5cbiAgICBkZXN0T2Zmc2V0ID0gKHNyY1kgKyAxKSAqIDQgfCAwO1xuICAgIHNyY09mZnNldCA9IChzcmNZICsgMSkgKiBzcmNXICogNCB8IDA7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNvbnZvbHZlSG9yaXpvbnRhbGx5OiBjb252b2x2ZUhvcml6b250YWxseSxcbiAgY29udm9sdmVWZXJ0aWNhbGx5OiBjb252b2x2ZVZlcnRpY2FsbHlcbn07XG5cbn0se31dLDM6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gVGhpcyBpcyBhdXRvZ2VuZXJhdGVkIGZpbGUgZnJvbSBtYXRoLndhc20sIGRvbid0IGVkaXQuXG4vL1xuJ3VzZSBzdHJpY3QnO1xuLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9ICdBR0Z6YlFFQUFBQUJGQUpnQm45L2YzOS9md0JnQjM5L2YzOS9mMzhBQWc4QkEyVnVkZ1p0WlcxdmNua0NBQUVEQXdJQUFRUUVBWEFBQUFjWkFnaGpiMjUyYjJ4MlpRQUFDbU52Ym5admJIWmxTRllBQVFrQkFBcm1Bd0xCQXdFUWZ3SkFJQU5GRFFBZ0JFVU5BQ0FGUVFScUlSVkJBQ0VNUVFBaERRTkFJQTBoRGtFQUlSRkJBQ0VIQTBBZ0IwRUNhaUVTQW44Z0JTQUhRUUYwSWdkcUlnWkJBbW91QVFBaUV3UkFRUUFoQ0VFQUlCTnJJUlFnRlNBSGFpRVBJQUFnRENBR0xnRUFha0VDZEdvaEVFRUFJUWxCQUNFS1FRQWhDd05BSUJBb0FnQWlCMEVZZGlBUExnRUFJZ1pzSUF0cUlRc2dCMEgvQVhFZ0Jtd2dDR29oQ0NBSFFSQjJRZjhCY1NBR2JDQUthaUVLSUFkQkNIWkIvd0Z4SUFac0lBbHFJUWtnRDBFQ2FpRVBJQkJCQkdvaEVDQVVRUUZxSWhRTkFBc2dFaUFUYWd3QkMwRUFJUXRCQUNFS1FRQWhDVUVBSVFnZ0Vnc2hCeUFCSUE1QkFuUnFJQXBCZ01BQWFrRU9kU0lHUWY4QklBWkIvd0ZJRzBFUWRFR0FnUHdIY1VFQUlBWkJBRW9iSUF0QmdNQUFha0VPZFNJR1FmOEJJQVpCL3dGSUcwRVlkRUVBSUFaQkFFb2JjaUFKUVlEQUFHcEJEblVpQmtIL0FTQUdRZjhCU0J0QkNIUkJnUDREY1VFQUlBWkJBRW9iY2lBSVFZREFBR3BCRG5VaUJrSC9BU0FHUWY4QlNCdEIvd0Z4UVFBZ0JrRUFTaHR5TmdJQUlBNGdBMm9oRGlBUlFRRnFJaEVnQkVjTkFBc2dEQ0FDYWlFTUlBMUJBV29pRFNBRFJ3MEFDd3NMSVFBQ1FFRUFJQUlnQXlBRUlBVWdBQkFBSUFKQkFDQUVJQVVnQmlBQkVBQUxDdz09JztcblxufSx7fV0sNDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBuYW1lOiAncmVzaXplJyxcbiAgZm46IF9kZXJlcV8oJy4vcmVzaXplJyksXG4gIHdhc21fZm46IF9kZXJlcV8oJy4vcmVzaXplX3dhc20nKSxcbiAgd2FzbV9zcmM6IF9kZXJlcV8oJy4vY29udm9sdmVfd2FzbV9iYXNlNjQnKVxufTtcblxufSx7XCIuL2NvbnZvbHZlX3dhc21fYmFzZTY0XCI6MyxcIi4vcmVzaXplXCI6NSxcIi4vcmVzaXplX3dhc21cIjo4fV0sNTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBjcmVhdGVGaWx0ZXJzID0gX2RlcmVxXygnLi9yZXNpemVfZmlsdGVyX2dlbicpO1xuXG52YXIgY29udm9sdmVIb3Jpem9udGFsbHkgPSBfZGVyZXFfKCcuL2NvbnZvbHZlJykuY29udm9sdmVIb3Jpem9udGFsbHk7XG5cbnZhciBjb252b2x2ZVZlcnRpY2FsbHkgPSBfZGVyZXFfKCcuL2NvbnZvbHZlJykuY29udm9sdmVWZXJ0aWNhbGx5O1xuXG5mdW5jdGlvbiByZXNldEFscGhhKGRzdCwgd2lkdGgsIGhlaWdodCkge1xuICB2YXIgcHRyID0gMyxcbiAgICAgIGxlbiA9IHdpZHRoICogaGVpZ2h0ICogNCB8IDA7XG5cbiAgd2hpbGUgKHB0ciA8IGxlbikge1xuICAgIGRzdFtwdHJdID0gMHhGRjtcbiAgICBwdHIgPSBwdHIgKyA0IHwgMDtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJlc2l6ZShvcHRpb25zKSB7XG4gIHZhciBzcmMgPSBvcHRpb25zLnNyYztcbiAgdmFyIHNyY1cgPSBvcHRpb25zLndpZHRoO1xuICB2YXIgc3JjSCA9IG9wdGlvbnMuaGVpZ2h0O1xuICB2YXIgZGVzdFcgPSBvcHRpb25zLnRvV2lkdGg7XG4gIHZhciBkZXN0SCA9IG9wdGlvbnMudG9IZWlnaHQ7XG4gIHZhciBzY2FsZVggPSBvcHRpb25zLnNjYWxlWCB8fCBvcHRpb25zLnRvV2lkdGggLyBvcHRpb25zLndpZHRoO1xuICB2YXIgc2NhbGVZID0gb3B0aW9ucy5zY2FsZVkgfHwgb3B0aW9ucy50b0hlaWdodCAvIG9wdGlvbnMuaGVpZ2h0O1xuICB2YXIgb2Zmc2V0WCA9IG9wdGlvbnMub2Zmc2V0WCB8fCAwO1xuICB2YXIgb2Zmc2V0WSA9IG9wdGlvbnMub2Zmc2V0WSB8fCAwO1xuICB2YXIgZGVzdCA9IG9wdGlvbnMuZGVzdCB8fCBuZXcgVWludDhBcnJheShkZXN0VyAqIGRlc3RIICogNCk7XG4gIHZhciBxdWFsaXR5ID0gdHlwZW9mIG9wdGlvbnMucXVhbGl0eSA9PT0gJ3VuZGVmaW5lZCcgPyAzIDogb3B0aW9ucy5xdWFsaXR5O1xuICB2YXIgYWxwaGEgPSBvcHRpb25zLmFscGhhIHx8IGZhbHNlO1xuICB2YXIgZmlsdGVyc1ggPSBjcmVhdGVGaWx0ZXJzKHF1YWxpdHksIHNyY1csIGRlc3RXLCBzY2FsZVgsIG9mZnNldFgpLFxuICAgICAgZmlsdGVyc1kgPSBjcmVhdGVGaWx0ZXJzKHF1YWxpdHksIHNyY0gsIGRlc3RILCBzY2FsZVksIG9mZnNldFkpO1xuICB2YXIgdG1wID0gbmV3IFVpbnQ4QXJyYXkoZGVzdFcgKiBzcmNIICogNCk7IC8vIFRvIHVzZSBzaW5nbGUgZnVuY3Rpb24gd2UgbmVlZCBzcmMgJiB0bXAgb2YgdGhlIHNhbWUgdHlwZS5cbiAgLy8gQnV0IHNyYyBjYW4gYmUgQ2FudmFzUGl4ZWxBcnJheSwgYW5kIHRtcCAtIFVpbnQ4QXJyYXkuIFNvLCBrZWVwXG4gIC8vIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHBhc3NlcyBzZXBhcmF0ZWx5IHRvIGF2b2lkIGRlb3B0aW1pemF0aW9uLlxuXG4gIGNvbnZvbHZlSG9yaXpvbnRhbGx5KHNyYywgdG1wLCBzcmNXLCBzcmNILCBkZXN0VywgZmlsdGVyc1gpO1xuICBjb252b2x2ZVZlcnRpY2FsbHkodG1wLCBkZXN0LCBzcmNILCBkZXN0VywgZGVzdEgsIGZpbHRlcnNZKTsgLy8gVGhhdCdzIGZhc3RlciB0aGFuIGRvaW5nIGNoZWNrcyBpbiBjb252b2x2ZXIuXG4gIC8vICEhISBOb3RlLCBjYW52YXMgZGF0YSBpcyBub3QgcHJlbXVsdGlwbGVkLiBXZSBkb24ndCBuZWVkIG90aGVyXG4gIC8vIGFscGhhIGNvcnJlY3Rpb25zLlxuXG4gIGlmICghYWxwaGEpIHJlc2V0QWxwaGEoZGVzdCwgZGVzdFcsIGRlc3RIKTtcbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG59LHtcIi4vY29udm9sdmVcIjoyLFwiLi9yZXNpemVfZmlsdGVyX2dlblwiOjZ9XSw2OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8vIENhbGN1bGF0ZSBjb252b2x1dGlvbiBmaWx0ZXJzIGZvciBlYWNoIGRlc3RpbmF0aW9uIHBvaW50LFxuLy8gYW5kIHBhY2sgZGF0YSB0byBJbnQxNkFycmF5OlxuLy9cbi8vIFsgc2hpZnQsIGxlbmd0aCwgZGF0YS4uLiwgc2hpZnQyLCBsZW5ndGgyLCBkYXRhLi4uLCAuLi4gXVxuLy9cbi8vIC0gc2hpZnQgLSBvZmZzZXQgaW4gc3JjIGltYWdlXG4vLyAtIGxlbmd0aCAtIGZpbHRlciBsZW5ndGggKGluIHNyYyBwb2ludHMpXG4vLyAtIGRhdGEgLSBmaWx0ZXIgdmFsdWVzIHNlcXVlbmNlXG4vL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRklMVEVSX0lORk8gPSBfZGVyZXFfKCcuL3Jlc2l6ZV9maWx0ZXJfaW5mbycpOyAvLyBQcmVjaXNpb24gb2YgZml4ZWQgRlAgdmFsdWVzXG5cblxudmFyIEZJWEVEX0ZSQUNfQklUUyA9IDE0O1xuXG5mdW5jdGlvbiB0b0ZpeGVkUG9pbnQobnVtKSB7XG4gIHJldHVybiBNYXRoLnJvdW5kKG51bSAqICgoMSA8PCBGSVhFRF9GUkFDX0JJVFMpIC0gMSkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJlc2l6ZUZpbHRlckdlbihxdWFsaXR5LCBzcmNTaXplLCBkZXN0U2l6ZSwgc2NhbGUsIG9mZnNldCkge1xuICB2YXIgZmlsdGVyRnVuY3Rpb24gPSBGSUxURVJfSU5GT1txdWFsaXR5XS5maWx0ZXI7XG4gIHZhciBzY2FsZUludmVydGVkID0gMS4wIC8gc2NhbGU7XG4gIHZhciBzY2FsZUNsYW1wZWQgPSBNYXRoLm1pbigxLjAsIHNjYWxlKTsgLy8gRm9yIHVwc2NhbGVcbiAgLy8gRmlsdGVyIHdpbmRvdyAoYXZlcmFnaW5nIGludGVydmFsKSwgc2NhbGVkIHRvIHNyYyBpbWFnZVxuXG4gIHZhciBzcmNXaW5kb3cgPSBGSUxURVJfSU5GT1txdWFsaXR5XS53aW4gLyBzY2FsZUNsYW1wZWQ7XG4gIHZhciBkZXN0UGl4ZWwsIHNyY1BpeGVsLCBzcmNGaXJzdCwgc3JjTGFzdCwgZmlsdGVyRWxlbWVudFNpemUsIGZsb2F0RmlsdGVyLCBmeHBGaWx0ZXIsIHRvdGFsLCBweGwsIGlkeCwgZmxvYXRWYWwsIGZpbHRlclRvdGFsLCBmaWx0ZXJWYWw7XG4gIHZhciBsZWZ0Tm90RW1wdHksIHJpZ2h0Tm90RW1wdHksIGZpbHRlclNoaWZ0LCBmaWx0ZXJTaXplO1xuICB2YXIgbWF4RmlsdGVyRWxlbWVudFNpemUgPSBNYXRoLmZsb29yKChzcmNXaW5kb3cgKyAxKSAqIDIpO1xuICB2YXIgcGFja2VkRmlsdGVyID0gbmV3IEludDE2QXJyYXkoKG1heEZpbHRlckVsZW1lbnRTaXplICsgMikgKiBkZXN0U2l6ZSk7XG4gIHZhciBwYWNrZWRGaWx0ZXJQdHIgPSAwO1xuICB2YXIgc2xvd0NvcHkgPSAhcGFja2VkRmlsdGVyLnN1YmFycmF5IHx8ICFwYWNrZWRGaWx0ZXIuc2V0OyAvLyBGb3IgZWFjaCBkZXN0aW5hdGlvbiBwaXhlbCBjYWxjdWxhdGUgc291cmNlIHJhbmdlIGFuZCBidWlsdCBmaWx0ZXIgdmFsdWVzXG5cbiAgZm9yIChkZXN0UGl4ZWwgPSAwOyBkZXN0UGl4ZWwgPCBkZXN0U2l6ZTsgZGVzdFBpeGVsKyspIHtcbiAgICAvLyBTY2FsaW5nIHNob3VsZCBiZSBkb25lIHJlbGF0aXZlIHRvIGNlbnRyYWwgcGl4ZWwgcG9pbnRcbiAgICBzcmNQaXhlbCA9IChkZXN0UGl4ZWwgKyAwLjUpICogc2NhbGVJbnZlcnRlZCArIG9mZnNldDtcbiAgICBzcmNGaXJzdCA9IE1hdGgubWF4KDAsIE1hdGguZmxvb3Ioc3JjUGl4ZWwgLSBzcmNXaW5kb3cpKTtcbiAgICBzcmNMYXN0ID0gTWF0aC5taW4oc3JjU2l6ZSAtIDEsIE1hdGguY2VpbChzcmNQaXhlbCArIHNyY1dpbmRvdykpO1xuICAgIGZpbHRlckVsZW1lbnRTaXplID0gc3JjTGFzdCAtIHNyY0ZpcnN0ICsgMTtcbiAgICBmbG9hdEZpbHRlciA9IG5ldyBGbG9hdDMyQXJyYXkoZmlsdGVyRWxlbWVudFNpemUpO1xuICAgIGZ4cEZpbHRlciA9IG5ldyBJbnQxNkFycmF5KGZpbHRlckVsZW1lbnRTaXplKTtcbiAgICB0b3RhbCA9IDAuMDsgLy8gRmlsbCBmaWx0ZXIgdmFsdWVzIGZvciBjYWxjdWxhdGVkIHJhbmdlXG5cbiAgICBmb3IgKHB4bCA9IHNyY0ZpcnN0LCBpZHggPSAwOyBweGwgPD0gc3JjTGFzdDsgcHhsKyssIGlkeCsrKSB7XG4gICAgICBmbG9hdFZhbCA9IGZpbHRlckZ1bmN0aW9uKChweGwgKyAwLjUgLSBzcmNQaXhlbCkgKiBzY2FsZUNsYW1wZWQpO1xuICAgICAgdG90YWwgKz0gZmxvYXRWYWw7XG4gICAgICBmbG9hdEZpbHRlcltpZHhdID0gZmxvYXRWYWw7XG4gICAgfSAvLyBOb3JtYWxpemUgZmlsdGVyLCBjb252ZXJ0IHRvIGZpeGVkIHBvaW50IGFuZCBhY2N1bXVsYXRlIGNvbnZlcnNpb24gZXJyb3JcblxuXG4gICAgZmlsdGVyVG90YWwgPSAwO1xuXG4gICAgZm9yIChpZHggPSAwOyBpZHggPCBmbG9hdEZpbHRlci5sZW5ndGg7IGlkeCsrKSB7XG4gICAgICBmaWx0ZXJWYWwgPSBmbG9hdEZpbHRlcltpZHhdIC8gdG90YWw7XG4gICAgICBmaWx0ZXJUb3RhbCArPSBmaWx0ZXJWYWw7XG4gICAgICBmeHBGaWx0ZXJbaWR4XSA9IHRvRml4ZWRQb2ludChmaWx0ZXJWYWwpO1xuICAgIH0gLy8gQ29tcGVuc2F0ZSBub3JtYWxpemF0aW9uIGVycm9yLCB0byBtaW5pbWl6ZSBicmlnaHRuZXNzIGRyaWZ0XG5cblxuICAgIGZ4cEZpbHRlcltkZXN0U2l6ZSA+PiAxXSArPSB0b0ZpeGVkUG9pbnQoMS4wIC0gZmlsdGVyVG90YWwpOyAvL1xuICAgIC8vIE5vdyBwYWNrIGZpbHRlciB0byB1c2VhYmxlIGZvcm1cbiAgICAvL1xuICAgIC8vIDEuIFRyaW0gaGVhZGluZyBhbmQgdGFpbGluZyB6ZXJvIHZhbHVlcywgYW5kIGNvbXBlbnNhdGUgc2hpdGYvbGVuZ3RoXG4gICAgLy8gMi4gUHV0IGFsbCB0byBzaW5nbGUgYXJyYXkgaW4gdGhpcyBmb3JtYXQ6XG4gICAgLy9cbiAgICAvLyAgICBbIHBvcyBzaGlmdCwgZGF0YSBsZW5ndGgsIHZhbHVlMSwgdmFsdWUyLCB2YWx1ZTMsIC4uLiBdXG4gICAgLy9cblxuICAgIGxlZnROb3RFbXB0eSA9IDA7XG5cbiAgICB3aGlsZSAobGVmdE5vdEVtcHR5IDwgZnhwRmlsdGVyLmxlbmd0aCAmJiBmeHBGaWx0ZXJbbGVmdE5vdEVtcHR5XSA9PT0gMCkge1xuICAgICAgbGVmdE5vdEVtcHR5Kys7XG4gICAgfVxuXG4gICAgaWYgKGxlZnROb3RFbXB0eSA8IGZ4cEZpbHRlci5sZW5ndGgpIHtcbiAgICAgIHJpZ2h0Tm90RW1wdHkgPSBmeHBGaWx0ZXIubGVuZ3RoIC0gMTtcblxuICAgICAgd2hpbGUgKHJpZ2h0Tm90RW1wdHkgPiAwICYmIGZ4cEZpbHRlcltyaWdodE5vdEVtcHR5XSA9PT0gMCkge1xuICAgICAgICByaWdodE5vdEVtcHR5LS07XG4gICAgICB9XG5cbiAgICAgIGZpbHRlclNoaWZ0ID0gc3JjRmlyc3QgKyBsZWZ0Tm90RW1wdHk7XG4gICAgICBmaWx0ZXJTaXplID0gcmlnaHROb3RFbXB0eSAtIGxlZnROb3RFbXB0eSArIDE7XG4gICAgICBwYWNrZWRGaWx0ZXJbcGFja2VkRmlsdGVyUHRyKytdID0gZmlsdGVyU2hpZnQ7IC8vIHNoaWZ0XG5cbiAgICAgIHBhY2tlZEZpbHRlcltwYWNrZWRGaWx0ZXJQdHIrK10gPSBmaWx0ZXJTaXplOyAvLyBzaXplXG5cbiAgICAgIGlmICghc2xvd0NvcHkpIHtcbiAgICAgICAgcGFja2VkRmlsdGVyLnNldChmeHBGaWx0ZXIuc3ViYXJyYXkobGVmdE5vdEVtcHR5LCByaWdodE5vdEVtcHR5ICsgMSksIHBhY2tlZEZpbHRlclB0cik7XG4gICAgICAgIHBhY2tlZEZpbHRlclB0ciArPSBmaWx0ZXJTaXplO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZmFsbGJhY2sgZm9yIG9sZCBJRSA8IDExLCB3aXRob3V0IHN1YmFycmF5L3NldCBtZXRob2RzXG4gICAgICAgIGZvciAoaWR4ID0gbGVmdE5vdEVtcHR5OyBpZHggPD0gcmlnaHROb3RFbXB0eTsgaWR4KyspIHtcbiAgICAgICAgICBwYWNrZWRGaWx0ZXJbcGFja2VkRmlsdGVyUHRyKytdID0gZnhwRmlsdGVyW2lkeF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gemVybyBkYXRhLCB3cml0ZSBoZWFkZXIgb25seVxuICAgICAgcGFja2VkRmlsdGVyW3BhY2tlZEZpbHRlclB0cisrXSA9IDA7IC8vIHNoaWZ0XG5cbiAgICAgIHBhY2tlZEZpbHRlcltwYWNrZWRGaWx0ZXJQdHIrK10gPSAwOyAvLyBzaXplXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhY2tlZEZpbHRlcjtcbn07XG5cbn0se1wiLi9yZXNpemVfZmlsdGVyX2luZm9cIjo3fV0sNzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBGaWx0ZXIgZGVmaW5pdGlvbnMgdG8gYnVpbGQgdGFibGVzIGZvclxuLy8gcmVzaXppbmcgY29udm9sdmVycy5cbi8vXG4vLyBQcmVzZXRzIGZvciBxdWFsaXR5IDAuLjMuIEZpbHRlciBmdW5jdGlvbnMgKyB3aW5kb3cgc2l6ZVxuLy9cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBbe1xuICAvLyBOZWFyZXN0IG5laWJvciAoQm94KVxuICB3aW46IDAuNSxcbiAgZmlsdGVyOiBmdW5jdGlvbiBmaWx0ZXIoeCkge1xuICAgIHJldHVybiB4ID49IC0wLjUgJiYgeCA8IDAuNSA/IDEuMCA6IDAuMDtcbiAgfVxufSwge1xuICAvLyBIYW1taW5nXG4gIHdpbjogMS4wLFxuICBmaWx0ZXI6IGZ1bmN0aW9uIGZpbHRlcih4KSB7XG4gICAgaWYgKHggPD0gLTEuMCB8fCB4ID49IDEuMCkge1xuICAgICAgcmV0dXJuIDAuMDtcbiAgICB9XG5cbiAgICBpZiAoeCA+IC0xLjE5MjA5MjkwRS0wNyAmJiB4IDwgMS4xOTIwOTI5MEUtMDcpIHtcbiAgICAgIHJldHVybiAxLjA7XG4gICAgfVxuXG4gICAgdmFyIHhwaSA9IHggKiBNYXRoLlBJO1xuICAgIHJldHVybiBNYXRoLnNpbih4cGkpIC8geHBpICogKDAuNTQgKyAwLjQ2ICogTWF0aC5jb3MoeHBpIC8gMS4wKSk7XG4gIH1cbn0sIHtcbiAgLy8gTGFuY3pvcywgd2luID0gMlxuICB3aW46IDIuMCxcbiAgZmlsdGVyOiBmdW5jdGlvbiBmaWx0ZXIoeCkge1xuICAgIGlmICh4IDw9IC0yLjAgfHwgeCA+PSAyLjApIHtcbiAgICAgIHJldHVybiAwLjA7XG4gICAgfVxuXG4gICAgaWYgKHggPiAtMS4xOTIwOTI5MEUtMDcgJiYgeCA8IDEuMTkyMDkyOTBFLTA3KSB7XG4gICAgICByZXR1cm4gMS4wO1xuICAgIH1cblxuICAgIHZhciB4cGkgPSB4ICogTWF0aC5QSTtcbiAgICByZXR1cm4gTWF0aC5zaW4oeHBpKSAvIHhwaSAqIE1hdGguc2luKHhwaSAvIDIuMCkgLyAoeHBpIC8gMi4wKTtcbiAgfVxufSwge1xuICAvLyBMYW5jem9zLCB3aW4gPSAzXG4gIHdpbjogMy4wLFxuICBmaWx0ZXI6IGZ1bmN0aW9uIGZpbHRlcih4KSB7XG4gICAgaWYgKHggPD0gLTMuMCB8fCB4ID49IDMuMCkge1xuICAgICAgcmV0dXJuIDAuMDtcbiAgICB9XG5cbiAgICBpZiAoeCA+IC0xLjE5MjA5MjkwRS0wNyAmJiB4IDwgMS4xOTIwOTI5MEUtMDcpIHtcbiAgICAgIHJldHVybiAxLjA7XG4gICAgfVxuXG4gICAgdmFyIHhwaSA9IHggKiBNYXRoLlBJO1xuICAgIHJldHVybiBNYXRoLnNpbih4cGkpIC8geHBpICogTWF0aC5zaW4oeHBpIC8gMy4wKSAvICh4cGkgLyAzLjApO1xuICB9XG59XTtcblxufSx7fV0sODpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cbnZhciBjcmVhdGVGaWx0ZXJzID0gX2RlcmVxXygnLi9yZXNpemVfZmlsdGVyX2dlbicpO1xuXG5mdW5jdGlvbiByZXNldEFscGhhKGRzdCwgd2lkdGgsIGhlaWdodCkge1xuICB2YXIgcHRyID0gMyxcbiAgICAgIGxlbiA9IHdpZHRoICogaGVpZ2h0ICogNCB8IDA7XG5cbiAgd2hpbGUgKHB0ciA8IGxlbikge1xuICAgIGRzdFtwdHJdID0gMHhGRjtcbiAgICBwdHIgPSBwdHIgKyA0IHwgMDtcbiAgfVxufVxuXG5mdW5jdGlvbiBhc1VpbnQ4QXJyYXkoc3JjKSB7XG4gIHJldHVybiBuZXcgVWludDhBcnJheShzcmMuYnVmZmVyLCAwLCBzcmMuYnl0ZUxlbmd0aCk7XG59XG5cbnZhciBJU19MRSA9IHRydWU7IC8vIHNob3VsZCBub3QgY3Jhc2ggZXZlcnl0aGluZyBvbiBtb2R1bGUgbG9hZCBpbiBvbGQgYnJvd3NlcnNcblxudHJ5IHtcbiAgSVNfTEUgPSBuZXcgVWludDMyQXJyYXkobmV3IFVpbnQ4QXJyYXkoWzEsIDAsIDAsIDBdKS5idWZmZXIpWzBdID09PSAxO1xufSBjYXRjaCAoX18pIHt9XG5cbmZ1bmN0aW9uIGNvcHlJbnQxNmFzTEUoc3JjLCB0YXJnZXQsIHRhcmdldF9vZmZzZXQpIHtcbiAgaWYgKElTX0xFKSB7XG4gICAgdGFyZ2V0LnNldChhc1VpbnQ4QXJyYXkoc3JjKSwgdGFyZ2V0X29mZnNldCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZm9yICh2YXIgcHRyID0gdGFyZ2V0X29mZnNldCwgaSA9IDA7IGkgPCBzcmMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZGF0YSA9IHNyY1tpXTtcbiAgICB0YXJnZXRbcHRyKytdID0gZGF0YSAmIDB4RkY7XG4gICAgdGFyZ2V0W3B0cisrXSA9IGRhdGEgPj4gOCAmIDB4RkY7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiByZXNpemVfd2FzbShvcHRpb25zKSB7XG4gIHZhciBzcmMgPSBvcHRpb25zLnNyYztcbiAgdmFyIHNyY1cgPSBvcHRpb25zLndpZHRoO1xuICB2YXIgc3JjSCA9IG9wdGlvbnMuaGVpZ2h0O1xuICB2YXIgZGVzdFcgPSBvcHRpb25zLnRvV2lkdGg7XG4gIHZhciBkZXN0SCA9IG9wdGlvbnMudG9IZWlnaHQ7XG4gIHZhciBzY2FsZVggPSBvcHRpb25zLnNjYWxlWCB8fCBvcHRpb25zLnRvV2lkdGggLyBvcHRpb25zLndpZHRoO1xuICB2YXIgc2NhbGVZID0gb3B0aW9ucy5zY2FsZVkgfHwgb3B0aW9ucy50b0hlaWdodCAvIG9wdGlvbnMuaGVpZ2h0O1xuICB2YXIgb2Zmc2V0WCA9IG9wdGlvbnMub2Zmc2V0WCB8fCAwLjA7XG4gIHZhciBvZmZzZXRZID0gb3B0aW9ucy5vZmZzZXRZIHx8IDAuMDtcbiAgdmFyIGRlc3QgPSBvcHRpb25zLmRlc3QgfHwgbmV3IFVpbnQ4QXJyYXkoZGVzdFcgKiBkZXN0SCAqIDQpO1xuICB2YXIgcXVhbGl0eSA9IHR5cGVvZiBvcHRpb25zLnF1YWxpdHkgPT09ICd1bmRlZmluZWQnID8gMyA6IG9wdGlvbnMucXVhbGl0eTtcbiAgdmFyIGFscGhhID0gb3B0aW9ucy5hbHBoYSB8fCBmYWxzZTtcbiAgdmFyIGZpbHRlcnNYID0gY3JlYXRlRmlsdGVycyhxdWFsaXR5LCBzcmNXLCBkZXN0Vywgc2NhbGVYLCBvZmZzZXRYKSxcbiAgICAgIGZpbHRlcnNZID0gY3JlYXRlRmlsdGVycyhxdWFsaXR5LCBzcmNILCBkZXN0SCwgc2NhbGVZLCBvZmZzZXRZKTsgLy8gZGVzdGluYXRpb24gaXMgMCB0b28uXG5cbiAgdmFyIHNyY19vZmZzZXQgPSAwOyAvLyBidWZmZXIgYmV0d2VlbiBjb252b2x2ZSBwYXNzZXNcblxuICB2YXIgdG1wX29mZnNldCA9IHRoaXMuX19hbGlnbihzcmNfb2Zmc2V0ICsgTWF0aC5tYXgoc3JjLmJ5dGVMZW5ndGgsIGRlc3QuYnl0ZUxlbmd0aCkpO1xuXG4gIHZhciBmaWx0ZXJzWF9vZmZzZXQgPSB0aGlzLl9fYWxpZ24odG1wX29mZnNldCArIHNyY0ggKiBkZXN0VyAqIDQpO1xuXG4gIHZhciBmaWx0ZXJzWV9vZmZzZXQgPSB0aGlzLl9fYWxpZ24oZmlsdGVyc1hfb2Zmc2V0ICsgZmlsdGVyc1guYnl0ZUxlbmd0aCk7XG5cbiAgdmFyIGFsbG9jX2J5dGVzID0gZmlsdGVyc1lfb2Zmc2V0ICsgZmlsdGVyc1kuYnl0ZUxlbmd0aDtcblxuICB2YXIgaW5zdGFuY2UgPSB0aGlzLl9faW5zdGFuY2UoJ3Jlc2l6ZScsIGFsbG9jX2J5dGVzKTsgLy9cbiAgLy8gRmlsbCBtZW1vcnkgYmxvY2sgd2l0aCBkYXRhIHRvIHByb2Nlc3NcbiAgLy9cblxuXG4gIHZhciBtZW0gPSBuZXcgVWludDhBcnJheSh0aGlzLl9fbWVtb3J5LmJ1ZmZlcik7XG4gIHZhciBtZW0zMiA9IG5ldyBVaW50MzJBcnJheSh0aGlzLl9fbWVtb3J5LmJ1ZmZlcik7IC8vIDMyLWJpdCBjb3B5IGlzIG11Y2ggZmFzdGVyIGluIGNocm9tZVxuXG4gIHZhciBzcmMzMiA9IG5ldyBVaW50MzJBcnJheShzcmMuYnVmZmVyKTtcbiAgbWVtMzIuc2V0KHNyYzMyKTsgLy8gV2Ugc2hvdWxkIGd1YXJhbnRlZSBMRSBieXRlcyBvcmRlci4gRmlsdGVycyBhcmUgbm90IGJpZywgc29cbiAgLy8gc3BlZWQgZGlmZmVyZW5jZSBpcyBub3Qgc2lnbmlmaWNhbnQgdnMgZGlyZWN0IC5zZXQoKVxuXG4gIGNvcHlJbnQxNmFzTEUoZmlsdGVyc1gsIG1lbSwgZmlsdGVyc1hfb2Zmc2V0KTtcbiAgY29weUludDE2YXNMRShmaWx0ZXJzWSwgbWVtLCBmaWx0ZXJzWV9vZmZzZXQpOyAvL1xuICAvLyBOb3cgY2FsbCB3ZWJhc3NlbWJseSBtZXRob2RcbiAgLy8gZW1zZGsgZG9lcyBtZXRob2QgbmFtZXMgd2l0aCAnXydcblxuICB2YXIgZm4gPSBpbnN0YW5jZS5leHBvcnRzLmNvbnZvbHZlSFYgfHwgaW5zdGFuY2UuZXhwb3J0cy5fY29udm9sdmVIVjtcbiAgZm4oZmlsdGVyc1hfb2Zmc2V0LCBmaWx0ZXJzWV9vZmZzZXQsIHRtcF9vZmZzZXQsIHNyY1csIHNyY0gsIGRlc3RXLCBkZXN0SCk7IC8vXG4gIC8vIENvcHkgZGF0YSBiYWNrIHRvIHR5cGVkIGFycmF5XG4gIC8vXG4gIC8vIDMyLWJpdCBjb3B5IGlzIG11Y2ggZmFzdGVyIGluIGNocm9tZVxuXG4gIHZhciBkZXN0MzIgPSBuZXcgVWludDMyQXJyYXkoZGVzdC5idWZmZXIpO1xuICBkZXN0MzIuc2V0KG5ldyBVaW50MzJBcnJheSh0aGlzLl9fbWVtb3J5LmJ1ZmZlciwgMCwgZGVzdEggKiBkZXN0VykpOyAvLyBUaGF0J3MgZmFzdGVyIHRoYW4gZG9pbmcgY2hlY2tzIGluIGNvbnZvbHZlci5cbiAgLy8gISEhIE5vdGUsIGNhbnZhcyBkYXRhIGlzIG5vdCBwcmVtdWx0aXBsZWQuIFdlIGRvbid0IG5lZWQgb3RoZXJcbiAgLy8gYWxwaGEgY29ycmVjdGlvbnMuXG5cbiAgaWYgKCFhbHBoYSkgcmVzZXRBbHBoYShkZXN0LCBkZXN0VywgZGVzdEgpO1xuICByZXR1cm4gZGVzdDtcbn07XG5cbn0se1wiLi9yZXNpemVfZmlsdGVyX2dlblwiOjZ9XSw5OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbid1c2Ugc3RyaWN0JztcblxudmFyIEdDX0lOVEVSVkFMID0gMTAwO1xuXG5mdW5jdGlvbiBQb29sKGNyZWF0ZSwgaWRsZSkge1xuICB0aGlzLmNyZWF0ZSA9IGNyZWF0ZTtcbiAgdGhpcy5hdmFpbGFibGUgPSBbXTtcbiAgdGhpcy5hY3F1aXJlZCA9IHt9O1xuICB0aGlzLmxhc3RJZCA9IDE7XG4gIHRoaXMudGltZW91dElkID0gMDtcbiAgdGhpcy5pZGxlID0gaWRsZSB8fCAyMDAwO1xufVxuXG5Qb29sLnByb3RvdHlwZS5hY3F1aXJlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gIHZhciByZXNvdXJjZTtcblxuICBpZiAodGhpcy5hdmFpbGFibGUubGVuZ3RoICE9PSAwKSB7XG4gICAgcmVzb3VyY2UgPSB0aGlzLmF2YWlsYWJsZS5wb3AoKTtcbiAgfSBlbHNlIHtcbiAgICByZXNvdXJjZSA9IHRoaXMuY3JlYXRlKCk7XG4gICAgcmVzb3VyY2UuaWQgPSB0aGlzLmxhc3RJZCsrO1xuXG4gICAgcmVzb3VyY2UucmVsZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBfdGhpcy5yZWxlYXNlKHJlc291cmNlKTtcbiAgICB9O1xuICB9XG5cbiAgdGhpcy5hY3F1aXJlZFtyZXNvdXJjZS5pZF0gPSByZXNvdXJjZTtcbiAgcmV0dXJuIHJlc291cmNlO1xufTtcblxuUG9vbC5wcm90b3R5cGUucmVsZWFzZSA9IGZ1bmN0aW9uIChyZXNvdXJjZSkge1xuICB2YXIgX3RoaXMyID0gdGhpcztcblxuICBkZWxldGUgdGhpcy5hY3F1aXJlZFtyZXNvdXJjZS5pZF07XG4gIHJlc291cmNlLmxhc3RVc2VkID0gRGF0ZS5ub3coKTtcbiAgdGhpcy5hdmFpbGFibGUucHVzaChyZXNvdXJjZSk7XG5cbiAgaWYgKHRoaXMudGltZW91dElkID09PSAwKSB7XG4gICAgdGhpcy50aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBfdGhpczIuZ2MoKTtcbiAgICB9LCBHQ19JTlRFUlZBTCk7XG4gIH1cbn07XG5cblBvb2wucHJvdG90eXBlLmdjID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMzID0gdGhpcztcblxuICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgdGhpcy5hdmFpbGFibGUgPSB0aGlzLmF2YWlsYWJsZS5maWx0ZXIoZnVuY3Rpb24gKHJlc291cmNlKSB7XG4gICAgaWYgKG5vdyAtIHJlc291cmNlLmxhc3RVc2VkID4gX3RoaXMzLmlkbGUpIHtcbiAgICAgIHJlc291cmNlLmRlc3Ryb3koKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG5cbiAgaWYgKHRoaXMuYXZhaWxhYmxlLmxlbmd0aCAhPT0gMCkge1xuICAgIHRoaXMudGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMzLmdjKCk7XG4gICAgfSwgR0NfSU5URVJWQUwpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMudGltZW91dElkID0gMDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQb29sO1xuXG59LHt9XSwxMDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBBZGQgaW50ZXJtZWRpYXRlIHJlc2l6aW5nIHN0ZXBzIHdoZW4gc2NhbGluZyBkb3duIGJ5IGEgdmVyeSBsYXJnZSBmYWN0b3IuXG4vL1xuLy8gRm9yIGV4YW1wbGUsIHdoZW4gcmVzaXppbmcgMTAwMDB4MTAwMDAgZG93biB0byAxMHgxMCwgaXQnbGwgcmVzaXplIGl0IHRvXG4vLyAzMDB4MzAwIGZpcnN0LlxuLy9cbi8vIEl0J3MgbmVlZGVkIGJlY2F1c2UgdGlsZXIgaGFzIGlzc3VlcyB3aGVuIHRoZSBlbnRpcmUgdGlsZSBpcyBzY2FsZWQgZG93blxuLy8gdG8gYSBmZXcgcGl4ZWxzICgxMDI0cHggc291cmNlIHRpbGUgd2l0aCBib3JkZXIgc2l6ZSAzIHNob3VsZCByZXN1bHQgaW5cbi8vIGF0IGxlYXN0IDMrMysyID0gOHB4IHRhcmdldCB0aWxlLCBzbyBtYXggc2NhbGUgZmFjdG9yIGlzIDEyOCBoZXJlKS5cbi8vXG4vLyBBbHNvLCBhZGRpbmcgaW50ZXJtZWRpYXRlIHN0ZXBzIGNhbiBzcGVlZCB1cCBwcm9jZXNzaW5nIGlmIHdlIHVzZSBsb3dlclxuLy8gcXVhbGl0eSBhbGdvcml0aG1zIGZvciBmaXJzdCBzdGFnZXMuXG4vL1xuJ3VzZSBzdHJpY3QnOyAvLyBtaW4gc2l6ZSA9IDAgcmVzdWx0cyBpbiBpbmZpbml0ZSBsb29wLFxuLy8gbWluIHNpemUgPSAxIGNhbiBjb25zdW1lIGxhcmdlIGFtb3VudCBvZiBtZW1vcnlcblxudmFyIE1JTl9JTk5FUl9USUxFX1NJWkUgPSAyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGNyZWF0ZVN0YWdlcyhmcm9tV2lkdGgsIGZyb21IZWlnaHQsIHRvV2lkdGgsIHRvSGVpZ2h0LCBzcmNUaWxlU2l6ZSwgZGVzdFRpbGVCb3JkZXIpIHtcbiAgdmFyIHNjYWxlWCA9IHRvV2lkdGggLyBmcm9tV2lkdGg7XG4gIHZhciBzY2FsZVkgPSB0b0hlaWdodCAvIGZyb21IZWlnaHQ7IC8vIGRlcml2ZWQgZnJvbSBjcmVhdGVSZWdpb25zIGVxdWF0aW9uOlxuICAvLyBpbm5lclRpbGVXaWR0aCA9IHBpeGVsRmxvb3Ioc3JjVGlsZVNpemUgKiBzY2FsZVgpIC0gMiAqIGRlc3RUaWxlQm9yZGVyO1xuXG4gIHZhciBtaW5TY2FsZSA9ICgyICogZGVzdFRpbGVCb3JkZXIgKyBNSU5fSU5ORVJfVElMRV9TSVpFICsgMSkgLyBzcmNUaWxlU2l6ZTsgLy8gcmVmdXNlIHRvIHNjYWxlIGltYWdlIG11bHRpcGxlIHRpbWVzIGJ5IGxlc3MgdGhhbiB0d2ljZSBlYWNoIHRpbWUsXG4gIC8vIGl0IGNvdWxkIG9ubHkgaGFwcGVuIGJlY2F1c2Ugb2YgaW52YWxpZCBvcHRpb25zXG5cbiAgaWYgKG1pblNjYWxlID4gMC41KSByZXR1cm4gW1t0b1dpZHRoLCB0b0hlaWdodF1dO1xuICB2YXIgc3RhZ2VDb3VudCA9IE1hdGguY2VpbChNYXRoLmxvZyhNYXRoLm1pbihzY2FsZVgsIHNjYWxlWSkpIC8gTWF0aC5sb2cobWluU2NhbGUpKTsgLy8gbm8gYWRkaXRpb25hbCByZXNpemVzIGFyZSBuZWNlc3NhcnksXG4gIC8vIHN0YWdlQ291bnQgY2FuIGJlIHplcm8gb3IgYmUgbmVnYXRpdmUgd2hlbiBlbmxhcmdpbmcgdGhlIGltYWdlXG5cbiAgaWYgKHN0YWdlQ291bnQgPD0gMSkgcmV0dXJuIFtbdG9XaWR0aCwgdG9IZWlnaHRdXTtcbiAgdmFyIHJlc3VsdCA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RhZ2VDb3VudDsgaSsrKSB7XG4gICAgdmFyIHdpZHRoID0gTWF0aC5yb3VuZChNYXRoLnBvdyhNYXRoLnBvdyhmcm9tV2lkdGgsIHN0YWdlQ291bnQgLSBpIC0gMSkgKiBNYXRoLnBvdyh0b1dpZHRoLCBpICsgMSksIDEgLyBzdGFnZUNvdW50KSk7XG4gICAgdmFyIGhlaWdodCA9IE1hdGgucm91bmQoTWF0aC5wb3coTWF0aC5wb3coZnJvbUhlaWdodCwgc3RhZ2VDb3VudCAtIGkgLSAxKSAqIE1hdGgucG93KHRvSGVpZ2h0LCBpICsgMSksIDEgLyBzdGFnZUNvdW50KSk7XG4gICAgcmVzdWx0LnB1c2goW3dpZHRoLCBoZWlnaHRdKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG59LHt9XSwxMTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBTcGxpdCBvcmlnaW5hbCBpbWFnZSBpbnRvIG11bHRpcGxlIDEwMjR4MTAyNCBjaHVua3MgdG8gcmVkdWNlIG1lbW9yeSB1c2FnZVxuLy8gKGltYWdlcyBoYXZlIHRvIGJlIHVucGFja2VkIGludG8gdHlwZWQgYXJyYXlzIGZvciByZXNpemluZykgYW5kIGFsbG93XG4vLyBwYXJhbGxlbCBwcm9jZXNzaW5nIG9mIG11bHRpcGxlIHRpbGVzIGF0IGEgdGltZS5cbi8vXG4ndXNlIHN0cmljdCc7XG4vKlxuICogcGl4ZWxGbG9vciBhbmQgcGl4ZWxDZWlsIGFyZSBtb2RpZmllZCB2ZXJzaW9ucyBvZiBNYXRoLmZsb29yIGFuZCBNYXRoLmNlaWxcbiAqIGZ1bmN0aW9ucyB3aGljaCB0YWtlIGludG8gYWNjb3VudCBmbG9hdGluZyBwb2ludCBhcml0aG1ldGljIGVycm9ycy5cbiAqIFRob3NlIGVycm9ycyBjYW4gY2F1c2UgdW5kZXNpcmVkIGluY3JlbWVudHMvZGVjcmVtZW50cyBvZiBzaXplcyBhbmQgb2Zmc2V0czpcbiAqIE1hdGguY2VpbCgzNiAvICgzNiAvIDUwMCkpID0gNTAxXG4gKiBwaXhlbENlaWwoMzYgLyAoMzYgLyA1MDApKSA9IDUwMFxuICovXG5cbnZhciBQSVhFTF9FUFNJTE9OID0gMWUtNTtcblxuZnVuY3Rpb24gcGl4ZWxGbG9vcih4KSB7XG4gIHZhciBuZWFyZXN0ID0gTWF0aC5yb3VuZCh4KTtcblxuICBpZiAoTWF0aC5hYnMoeCAtIG5lYXJlc3QpIDwgUElYRUxfRVBTSUxPTikge1xuICAgIHJldHVybiBuZWFyZXN0O1xuICB9XG5cbiAgcmV0dXJuIE1hdGguZmxvb3IoeCk7XG59XG5cbmZ1bmN0aW9uIHBpeGVsQ2VpbCh4KSB7XG4gIHZhciBuZWFyZXN0ID0gTWF0aC5yb3VuZCh4KTtcblxuICBpZiAoTWF0aC5hYnMoeCAtIG5lYXJlc3QpIDwgUElYRUxfRVBTSUxPTikge1xuICAgIHJldHVybiBuZWFyZXN0O1xuICB9XG5cbiAgcmV0dXJuIE1hdGguY2VpbCh4KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjcmVhdGVSZWdpb25zKG9wdGlvbnMpIHtcbiAgdmFyIHNjYWxlWCA9IG9wdGlvbnMudG9XaWR0aCAvIG9wdGlvbnMud2lkdGg7XG4gIHZhciBzY2FsZVkgPSBvcHRpb25zLnRvSGVpZ2h0IC8gb3B0aW9ucy5oZWlnaHQ7XG4gIHZhciBpbm5lclRpbGVXaWR0aCA9IHBpeGVsRmxvb3Iob3B0aW9ucy5zcmNUaWxlU2l6ZSAqIHNjYWxlWCkgLSAyICogb3B0aW9ucy5kZXN0VGlsZUJvcmRlcjtcbiAgdmFyIGlubmVyVGlsZUhlaWdodCA9IHBpeGVsRmxvb3Iob3B0aW9ucy5zcmNUaWxlU2l6ZSAqIHNjYWxlWSkgLSAyICogb3B0aW9ucy5kZXN0VGlsZUJvcmRlcjsgLy8gcHJldmVudCBpbmZpbml0ZSBsb29wLCB0aGlzIHNob3VsZCBuZXZlciBoYXBwZW5cblxuICBpZiAoaW5uZXJUaWxlV2lkdGggPCAxIHx8IGlubmVyVGlsZUhlaWdodCA8IDEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludGVybmFsIGVycm9yIGluIHBpY2E6IHRhcmdldCB0aWxlIHdpZHRoL2hlaWdodCBpcyB0b28gc21hbGwuJyk7XG4gIH1cblxuICB2YXIgeCwgeTtcbiAgdmFyIGlubmVyWCwgaW5uZXJZLCB0b1RpbGVXaWR0aCwgdG9UaWxlSGVpZ2h0O1xuICB2YXIgdGlsZXMgPSBbXTtcbiAgdmFyIHRpbGU7IC8vIHdlIGdvIHRvcC10by1kb3duIGluc3RlYWQgb2YgbGVmdC10by1yaWdodCB0byBtYWtlIGltYWdlIGRpc3BsYXllZCBmcm9tIHRvcCB0b1xuICAvLyBkb2VzbiBpbiB0aGUgYnJvd3NlclxuXG4gIGZvciAoaW5uZXJZID0gMDsgaW5uZXJZIDwgb3B0aW9ucy50b0hlaWdodDsgaW5uZXJZICs9IGlubmVyVGlsZUhlaWdodCkge1xuICAgIGZvciAoaW5uZXJYID0gMDsgaW5uZXJYIDwgb3B0aW9ucy50b1dpZHRoOyBpbm5lclggKz0gaW5uZXJUaWxlV2lkdGgpIHtcbiAgICAgIHggPSBpbm5lclggLSBvcHRpb25zLmRlc3RUaWxlQm9yZGVyO1xuXG4gICAgICBpZiAoeCA8IDApIHtcbiAgICAgICAgeCA9IDA7XG4gICAgICB9XG5cbiAgICAgIHRvVGlsZVdpZHRoID0gaW5uZXJYICsgaW5uZXJUaWxlV2lkdGggKyBvcHRpb25zLmRlc3RUaWxlQm9yZGVyIC0geDtcblxuICAgICAgaWYgKHggKyB0b1RpbGVXaWR0aCA+PSBvcHRpb25zLnRvV2lkdGgpIHtcbiAgICAgICAgdG9UaWxlV2lkdGggPSBvcHRpb25zLnRvV2lkdGggLSB4O1xuICAgICAgfVxuXG4gICAgICB5ID0gaW5uZXJZIC0gb3B0aW9ucy5kZXN0VGlsZUJvcmRlcjtcblxuICAgICAgaWYgKHkgPCAwKSB7XG4gICAgICAgIHkgPSAwO1xuICAgICAgfVxuXG4gICAgICB0b1RpbGVIZWlnaHQgPSBpbm5lclkgKyBpbm5lclRpbGVIZWlnaHQgKyBvcHRpb25zLmRlc3RUaWxlQm9yZGVyIC0geTtcblxuICAgICAgaWYgKHkgKyB0b1RpbGVIZWlnaHQgPj0gb3B0aW9ucy50b0hlaWdodCkge1xuICAgICAgICB0b1RpbGVIZWlnaHQgPSBvcHRpb25zLnRvSGVpZ2h0IC0geTtcbiAgICAgIH1cblxuICAgICAgdGlsZSA9IHtcbiAgICAgICAgdG9YOiB4LFxuICAgICAgICB0b1k6IHksXG4gICAgICAgIHRvV2lkdGg6IHRvVGlsZVdpZHRoLFxuICAgICAgICB0b0hlaWdodDogdG9UaWxlSGVpZ2h0LFxuICAgICAgICB0b0lubmVyWDogaW5uZXJYLFxuICAgICAgICB0b0lubmVyWTogaW5uZXJZLFxuICAgICAgICB0b0lubmVyV2lkdGg6IGlubmVyVGlsZVdpZHRoLFxuICAgICAgICB0b0lubmVySGVpZ2h0OiBpbm5lclRpbGVIZWlnaHQsXG4gICAgICAgIG9mZnNldFg6IHggLyBzY2FsZVggLSBwaXhlbEZsb29yKHggLyBzY2FsZVgpLFxuICAgICAgICBvZmZzZXRZOiB5IC8gc2NhbGVZIC0gcGl4ZWxGbG9vcih5IC8gc2NhbGVZKSxcbiAgICAgICAgc2NhbGVYOiBzY2FsZVgsXG4gICAgICAgIHNjYWxlWTogc2NhbGVZLFxuICAgICAgICB4OiBwaXhlbEZsb29yKHggLyBzY2FsZVgpLFxuICAgICAgICB5OiBwaXhlbEZsb29yKHkgLyBzY2FsZVkpLFxuICAgICAgICB3aWR0aDogcGl4ZWxDZWlsKHRvVGlsZVdpZHRoIC8gc2NhbGVYKSxcbiAgICAgICAgaGVpZ2h0OiBwaXhlbENlaWwodG9UaWxlSGVpZ2h0IC8gc2NhbGVZKVxuICAgICAgfTtcbiAgICAgIHRpbGVzLnB1c2godGlsZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRpbGVzO1xufTtcblxufSx7fV0sMTI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBvYmpDbGFzcyhvYmopIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5pc0NhbnZhcyA9IGZ1bmN0aW9uIGlzQ2FudmFzKGVsZW1lbnQpIHtcbiAgdmFyIGNuYW1lID0gb2JqQ2xhc3MoZWxlbWVudCk7XG4gIHJldHVybiBjbmFtZSA9PT0gJ1tvYmplY3QgSFRNTENhbnZhc0VsZW1lbnRdJ1xuICAvKiBicm93c2VyICovXG4gIHx8IGNuYW1lID09PSAnW29iamVjdCBPZmZzY3JlZW5DYW52YXNdJyB8fCBjbmFtZSA9PT0gJ1tvYmplY3QgQ2FudmFzXSdcbiAgLyogbm9kZS1jYW52YXMgKi9cbiAgO1xufTtcblxubW9kdWxlLmV4cG9ydHMuaXNJbWFnZSA9IGZ1bmN0aW9uIGlzSW1hZ2UoZWxlbWVudCkge1xuICByZXR1cm4gb2JqQ2xhc3MoZWxlbWVudCkgPT09ICdbb2JqZWN0IEhUTUxJbWFnZUVsZW1lbnRdJztcbn07XG5cbm1vZHVsZS5leHBvcnRzLmlzSW1hZ2VCaXRtYXAgPSBmdW5jdGlvbiBpc0ltYWdlQml0bWFwKGVsZW1lbnQpIHtcbiAgcmV0dXJuIG9iakNsYXNzKGVsZW1lbnQpID09PSAnW29iamVjdCBJbWFnZUJpdG1hcF0nO1xufTtcblxubW9kdWxlLmV4cG9ydHMubGltaXRlciA9IGZ1bmN0aW9uIGxpbWl0ZXIoY29uY3VycmVuY3kpIHtcbiAgdmFyIGFjdGl2ZSA9IDAsXG4gICAgICBxdWV1ZSA9IFtdO1xuXG4gIGZ1bmN0aW9uIHJvbGwoKSB7XG4gICAgaWYgKGFjdGl2ZSA8IGNvbmN1cnJlbmN5ICYmIHF1ZXVlLmxlbmd0aCkge1xuICAgICAgYWN0aXZlKys7XG4gICAgICBxdWV1ZS5zaGlmdCgpKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGxpbWl0KGZuKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHF1ZXVlLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICBmbigpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICBhY3RpdmUtLTtcbiAgICAgICAgICByb2xsKCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICBhY3RpdmUtLTtcbiAgICAgICAgICByb2xsKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICByb2xsKCk7XG4gICAgfSk7XG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5jaWJfcXVhbGl0eV9uYW1lID0gZnVuY3Rpb24gY2liX3F1YWxpdHlfbmFtZShudW0pIHtcbiAgc3dpdGNoIChudW0pIHtcbiAgICBjYXNlIDA6XG4gICAgICByZXR1cm4gJ3BpeGVsYXRlZCc7XG5cbiAgICBjYXNlIDE6XG4gICAgICByZXR1cm4gJ2xvdyc7XG5cbiAgICBjYXNlIDI6XG4gICAgICByZXR1cm4gJ21lZGl1bSc7XG4gIH1cblxuICByZXR1cm4gJ2hpZ2gnO1xufTtcblxubW9kdWxlLmV4cG9ydHMuY2liX3N1cHBvcnQgPSBmdW5jdGlvbiBjaWJfc3VwcG9ydChjcmVhdGVDYW52YXMpIHtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgY3JlYXRlSW1hZ2VCaXRtYXAgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGMgPSBjcmVhdGVDYW52YXMoMTAwLCAxMDApO1xuICAgIHJldHVybiBjcmVhdGVJbWFnZUJpdG1hcChjLCAwLCAwLCAxMDAsIDEwMCwge1xuICAgICAgcmVzaXplV2lkdGg6IDEwLFxuICAgICAgcmVzaXplSGVpZ2h0OiAxMCxcbiAgICAgIHJlc2l6ZVF1YWxpdHk6ICdoaWdoJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24gKGJpdG1hcCkge1xuICAgICAgdmFyIHN0YXR1cyA9IGJpdG1hcC53aWR0aCA9PT0gMTA7IC8vIEJyYW5jaCBiZWxvdyBpcyBmaWx0ZXJlZCBvbiB1cHBlciBsZXZlbC4gV2UgZG8gbm90IGNhbGwgcmVzaXplXG4gICAgICAvLyBkZXRlY3Rpb24gZm9yIGJhc2ljIEltYWdlQml0bWFwLlxuICAgICAgLy9cbiAgICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9JbWFnZUJpdG1hcFxuICAgICAgLy8gb2xkIENyb21lIDUxIGhhcyBJbWFnZUJpdG1hcCB3aXRob3V0IC5jbG9zZSgpLiBUaGVuIHRoaXMgY29kZVxuICAgICAgLy8gd2lsbCB0aHJvdyBhbmQgcmV0dXJuICdmYWxzZScgYXMgZXhwZWN0ZWQuXG4gICAgICAvL1xuXG4gICAgICBiaXRtYXAuY2xvc2UoKTtcbiAgICAgIGMgPSBudWxsO1xuICAgICAgcmV0dXJuIHN0YXR1cztcbiAgICB9KTtcbiAgfSlbXCJjYXRjaFwiXShmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbn07XG5cbn0se31dLDEzOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8vIFdlYiBXb3JrZXIgd3JhcHBlciBmb3IgaW1hZ2UgcmVzaXplIGZ1bmN0aW9uXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgTWF0aExpYiA9IF9kZXJlcV8oJy4vbWF0aGxpYicpO1xuXG4gIHZhciBtYXRoTGliO1xuICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bmRlZiAqL1xuXG4gIG9ubWVzc2FnZSA9IGZ1bmN0aW9uIG9ubWVzc2FnZShldikge1xuICAgIHZhciBvcHRzID0gZXYuZGF0YS5vcHRzO1xuICAgIGlmICghbWF0aExpYikgbWF0aExpYiA9IG5ldyBNYXRoTGliKGV2LmRhdGEuZmVhdHVyZXMpOyAvLyBVc2UgbXVsdGltYXRoJ3Mgc3luYyBhdXRvLWluaXQuIEF2b2lkIFByb21pc2UgdXNlIGluIG9sZCBicm93c2VycyxcbiAgICAvLyBiZWNhdXNlIHBvbHlmaWxscyBhcmUgbm90IHByb3BhZ2F0ZWQgdG8gd2Vid29ya2VyLlxuXG4gICAgdmFyIHJlc3VsdCA9IG1hdGhMaWIucmVzaXplQW5kVW5zaGFycChvcHRzKTtcbiAgICBwb3N0TWVzc2FnZSh7XG4gICAgICByZXN1bHQ6IHJlc3VsdFxuICAgIH0sIFtyZXN1bHQuYnVmZmVyXSk7XG4gIH07XG59O1xuXG59LHtcIi4vbWF0aGxpYlwiOjF9XSwxNDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBDYWxjdWxhdGUgR2F1c3NpYW4gYmx1ciBvZiBhbiBpbWFnZSB1c2luZyBJSVIgZmlsdGVyXG4vLyBUaGUgbWV0aG9kIGlzIHRha2VuIGZyb20gSW50ZWwncyB3aGl0ZSBwYXBlciBhbmQgY29kZSBleGFtcGxlIGF0dGFjaGVkIHRvIGl0OlxuLy8gaHR0cHM6Ly9zb2Z0d2FyZS5pbnRlbC5jb20vZW4tdXMvYXJ0aWNsZXMvaWlyLWdhdXNzaWFuLWJsdXItZmlsdGVyXG4vLyAtaW1wbGVtZW50YXRpb24tdXNpbmctaW50ZWwtYWR2YW5jZWQtdmVjdG9yLWV4dGVuc2lvbnNcblxudmFyIGEwLCBhMSwgYTIsIGEzLCBiMSwgYjIsIGxlZnRfY29ybmVyLCByaWdodF9jb3JuZXI7XG5cbmZ1bmN0aW9uIGdhdXNzQ29lZihzaWdtYSkge1xuICBpZiAoc2lnbWEgPCAwLjUpIHtcbiAgICBzaWdtYSA9IDAuNTtcbiAgfVxuXG4gIHZhciBhID0gTWF0aC5leHAoMC43MjYgKiAwLjcyNikgLyBzaWdtYSxcbiAgICAgIGcxID0gTWF0aC5leHAoLWEpLFxuICAgICAgZzIgPSBNYXRoLmV4cCgtMiAqIGEpLFxuICAgICAgayA9ICgxIC0gZzEpICogKDEgLSBnMSkgLyAoMSArIDIgKiBhICogZzEgLSBnMik7XG5cbiAgYTAgPSBrO1xuICBhMSA9IGsgKiAoYSAtIDEpICogZzE7XG4gIGEyID0gayAqIChhICsgMSkgKiBnMTtcbiAgYTMgPSAtayAqIGcyO1xuICBiMSA9IDIgKiBnMTtcbiAgYjIgPSAtZzI7XG4gIGxlZnRfY29ybmVyID0gKGEwICsgYTEpIC8gKDEgLSBiMSAtIGIyKTtcbiAgcmlnaHRfY29ybmVyID0gKGEyICsgYTMpIC8gKDEgLSBiMSAtIGIyKTtcblxuICAvLyBBdHRlbXB0IHRvIGZvcmNlIHR5cGUgdG8gRlAzMi5cbiAgcmV0dXJuIG5ldyBGbG9hdDMyQXJyYXkoWyBhMCwgYTEsIGEyLCBhMywgYjEsIGIyLCBsZWZ0X2Nvcm5lciwgcmlnaHRfY29ybmVyIF0pO1xufVxuXG5mdW5jdGlvbiBjb252b2x2ZU1vbm8xNihzcmMsIG91dCwgbGluZSwgY29lZmYsIHdpZHRoLCBoZWlnaHQpIHtcbiAgLy8gdGFrZXMgc3JjIGltYWdlIGFuZCB3cml0ZXMgdGhlIGJsdXJyZWQgYW5kIHRyYW5zcG9zZWQgcmVzdWx0IGludG8gb3V0XG5cbiAgdmFyIHByZXZfc3JjLCBjdXJyX3NyYywgY3Vycl9vdXQsIHByZXZfb3V0LCBwcmV2X3ByZXZfb3V0O1xuICB2YXIgc3JjX2luZGV4LCBvdXRfaW5kZXgsIGxpbmVfaW5kZXg7XG4gIHZhciBpLCBqO1xuICB2YXIgY29lZmZfYTAsIGNvZWZmX2ExLCBjb2VmZl9iMSwgY29lZmZfYjI7XG5cbiAgZm9yIChpID0gMDsgaSA8IGhlaWdodDsgaSsrKSB7XG4gICAgc3JjX2luZGV4ID0gaSAqIHdpZHRoO1xuICAgIG91dF9pbmRleCA9IGk7XG4gICAgbGluZV9pbmRleCA9IDA7XG5cbiAgICAvLyBsZWZ0IHRvIHJpZ2h0XG4gICAgcHJldl9zcmMgPSBzcmNbc3JjX2luZGV4XTtcbiAgICBwcmV2X3ByZXZfb3V0ID0gcHJldl9zcmMgKiBjb2VmZls2XTtcbiAgICBwcmV2X291dCA9IHByZXZfcHJldl9vdXQ7XG5cbiAgICBjb2VmZl9hMCA9IGNvZWZmWzBdO1xuICAgIGNvZWZmX2ExID0gY29lZmZbMV07XG4gICAgY29lZmZfYjEgPSBjb2VmZls0XTtcbiAgICBjb2VmZl9iMiA9IGNvZWZmWzVdO1xuXG4gICAgZm9yIChqID0gMDsgaiA8IHdpZHRoOyBqKyspIHtcbiAgICAgIGN1cnJfc3JjID0gc3JjW3NyY19pbmRleF07XG5cbiAgICAgIGN1cnJfb3V0ID0gY3Vycl9zcmMgKiBjb2VmZl9hMCArXG4gICAgICAgICAgICAgICAgIHByZXZfc3JjICogY29lZmZfYTEgK1xuICAgICAgICAgICAgICAgICBwcmV2X291dCAqIGNvZWZmX2IxICtcbiAgICAgICAgICAgICAgICAgcHJldl9wcmV2X291dCAqIGNvZWZmX2IyO1xuXG4gICAgICBwcmV2X3ByZXZfb3V0ID0gcHJldl9vdXQ7XG4gICAgICBwcmV2X291dCA9IGN1cnJfb3V0O1xuICAgICAgcHJldl9zcmMgPSBjdXJyX3NyYztcblxuICAgICAgbGluZVtsaW5lX2luZGV4XSA9IHByZXZfb3V0O1xuICAgICAgbGluZV9pbmRleCsrO1xuICAgICAgc3JjX2luZGV4Kys7XG4gICAgfVxuXG4gICAgc3JjX2luZGV4LS07XG4gICAgbGluZV9pbmRleC0tO1xuICAgIG91dF9pbmRleCArPSBoZWlnaHQgKiAod2lkdGggLSAxKTtcblxuICAgIC8vIHJpZ2h0IHRvIGxlZnRcbiAgICBwcmV2X3NyYyA9IHNyY1tzcmNfaW5kZXhdO1xuICAgIHByZXZfcHJldl9vdXQgPSBwcmV2X3NyYyAqIGNvZWZmWzddO1xuICAgIHByZXZfb3V0ID0gcHJldl9wcmV2X291dDtcbiAgICBjdXJyX3NyYyA9IHByZXZfc3JjO1xuXG4gICAgY29lZmZfYTAgPSBjb2VmZlsyXTtcbiAgICBjb2VmZl9hMSA9IGNvZWZmWzNdO1xuXG4gICAgZm9yIChqID0gd2lkdGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgY3Vycl9vdXQgPSBjdXJyX3NyYyAqIGNvZWZmX2EwICtcbiAgICAgICAgICAgICAgICAgcHJldl9zcmMgKiBjb2VmZl9hMSArXG4gICAgICAgICAgICAgICAgIHByZXZfb3V0ICogY29lZmZfYjEgK1xuICAgICAgICAgICAgICAgICBwcmV2X3ByZXZfb3V0ICogY29lZmZfYjI7XG5cbiAgICAgIHByZXZfcHJldl9vdXQgPSBwcmV2X291dDtcbiAgICAgIHByZXZfb3V0ID0gY3Vycl9vdXQ7XG5cbiAgICAgIHByZXZfc3JjID0gY3Vycl9zcmM7XG4gICAgICBjdXJyX3NyYyA9IHNyY1tzcmNfaW5kZXhdO1xuXG4gICAgICBvdXRbb3V0X2luZGV4XSA9IGxpbmVbbGluZV9pbmRleF0gKyBwcmV2X291dDtcblxuICAgICAgc3JjX2luZGV4LS07XG4gICAgICBsaW5lX2luZGV4LS07XG4gICAgICBvdXRfaW5kZXggLT0gaGVpZ2h0O1xuICAgIH1cbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGJsdXJNb25vMTYoc3JjLCB3aWR0aCwgaGVpZ2h0LCByYWRpdXMpIHtcbiAgLy8gUXVpY2sgZXhpdCBvbiB6ZXJvIHJhZGl1c1xuICBpZiAoIXJhZGl1cykgeyByZXR1cm47IH1cblxuICB2YXIgb3V0ICAgICAgPSBuZXcgVWludDE2QXJyYXkoc3JjLmxlbmd0aCksXG4gICAgICB0bXBfbGluZSA9IG5ldyBGbG9hdDMyQXJyYXkoTWF0aC5tYXgod2lkdGgsIGhlaWdodCkpO1xuXG4gIHZhciBjb2VmZiA9IGdhdXNzQ29lZihyYWRpdXMpO1xuXG4gIGNvbnZvbHZlTW9ubzE2KHNyYywgb3V0LCB0bXBfbGluZSwgY29lZmYsIHdpZHRoLCBoZWlnaHQsIHJhZGl1cyk7XG4gIGNvbnZvbHZlTW9ubzE2KG91dCwgc3JjLCB0bXBfbGluZSwgY29lZmYsIGhlaWdodCwgd2lkdGgsIHJhZGl1cyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmx1ck1vbm8xNjtcblxufSx7fV0sMTU6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgaWYgKHN1cGVyQ3Rvcikge1xuICAgICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBpZiAoc3VwZXJDdG9yKSB7XG4gICAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICAgIH1cbiAgfVxufVxuXG59LHt9XSwxNjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cblxudmFyIGFzc2lnbiAgICAgICAgID0gX2RlcmVxXygnb2JqZWN0LWFzc2lnbicpO1xudmFyIGJhc2U2NGRlY29kZSAgID0gX2RlcmVxXygnLi9saWIvYmFzZTY0ZGVjb2RlJyk7XG52YXIgaGFzV2ViQXNzZW1ibHkgPSBfZGVyZXFfKCcuL2xpYi93YV9kZXRlY3QnKTtcblxuXG52YXIgREVGQVVMVF9PUFRJT05TID0ge1xuICBqczogdHJ1ZSxcbiAgd2FzbTogdHJ1ZVxufTtcblxuXG5mdW5jdGlvbiBNdWx0aU1hdGgob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTXVsdGlNYXRoKSkgcmV0dXJuIG5ldyBNdWx0aU1hdGgob3B0aW9ucyk7XG5cbiAgdmFyIG9wdHMgPSBhc3NpZ24oe30sIERFRkFVTFRfT1BUSU9OUywgb3B0aW9ucyB8fCB7fSk7XG5cbiAgdGhpcy5vcHRpb25zICAgICAgICAgPSBvcHRzO1xuXG4gIHRoaXMuX19jYWNoZSAgICAgICAgID0ge307XG5cbiAgdGhpcy5fX2luaXRfcHJvbWlzZSAgPSBudWxsO1xuICB0aGlzLl9fbW9kdWxlcyAgICAgICA9IG9wdHMubW9kdWxlcyB8fCB7fTtcbiAgdGhpcy5fX21lbW9yeSAgICAgICAgPSBudWxsO1xuICB0aGlzLl9fd2FzbSAgICAgICAgICA9IHt9O1xuXG4gIHRoaXMuX19pc0xFID0gKChuZXcgVWludDMyQXJyYXkoKG5ldyBVaW50OEFycmF5KFsgMSwgMCwgMCwgMCBdKSkuYnVmZmVyKSlbMF0gPT09IDEpO1xuXG4gIGlmICghdGhpcy5vcHRpb25zLmpzICYmICF0aGlzLm9wdGlvbnMud2FzbSkge1xuICAgIHRocm93IG5ldyBFcnJvcignbWF0aGxpYjogYXQgbGVhc3QgXCJqc1wiIG9yIFwid2FzbVwiIHNob3VsZCBiZSBlbmFibGVkJyk7XG4gIH1cbn1cblxuXG5NdWx0aU1hdGgucHJvdG90eXBlLmhhc193YXNtID0gaGFzV2ViQXNzZW1ibHk7XG5cblxuTXVsdGlNYXRoLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbiAobW9kdWxlKSB7XG4gIHRoaXMuX19tb2R1bGVzW21vZHVsZS5uYW1lXSA9IG1vZHVsZTtcblxuICAvLyBQaW4gdGhlIGJlc3QgcG9zc2libGUgaW1wbGVtZW50YXRpb25cbiAgaWYgKHRoaXMub3B0aW9ucy53YXNtICYmIHRoaXMuaGFzX3dhc20oKSAmJiBtb2R1bGUud2FzbV9mbikge1xuICAgIHRoaXNbbW9kdWxlLm5hbWVdID0gbW9kdWxlLndhc21fZm47XG4gIH0gZWxzZSB7XG4gICAgdGhpc1ttb2R1bGUubmFtZV0gPSBtb2R1bGUuZm47XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuTXVsdGlNYXRoLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5fX2luaXRfcHJvbWlzZSkgcmV0dXJuIHRoaXMuX19pbml0X3Byb21pc2U7XG5cbiAgaWYgKCF0aGlzLm9wdGlvbnMuanMgJiYgdGhpcy5vcHRpb25zLndhc20gJiYgIXRoaXMuaGFzX3dhc20oKSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ21hdGhsaWI6IG9ubHkgXCJ3YXNtXCIgd2FzIGVuYWJsZWQsIGJ1dCBpdFxcJ3Mgbm90IHN1cHBvcnRlZCcpKTtcbiAgfVxuXG4gIHZhciBzZWxmID0gdGhpcztcblxuICB0aGlzLl9faW5pdF9wcm9taXNlID0gUHJvbWlzZS5hbGwoT2JqZWN0LmtleXMoc2VsZi5fX21vZHVsZXMpLm1hcChmdW5jdGlvbiAobmFtZSkge1xuICAgIHZhciBtb2R1bGUgPSBzZWxmLl9fbW9kdWxlc1tuYW1lXTtcblxuICAgIGlmICghc2VsZi5vcHRpb25zLndhc20gfHwgIXNlbGYuaGFzX3dhc20oKSB8fCAhbW9kdWxlLndhc21fZm4pIHJldHVybiBudWxsO1xuXG4gICAgLy8gSWYgYWxyZWFkeSBjb21waWxlZCAtIGV4aXRcbiAgICBpZiAoc2VsZi5fX3dhc21bbmFtZV0pIHJldHVybiBudWxsO1xuXG4gICAgLy8gQ29tcGlsZSB3YXNtIHNvdXJjZVxuICAgIHJldHVybiBXZWJBc3NlbWJseS5jb21waWxlKHNlbGYuX19iYXNlNjRkZWNvZGUobW9kdWxlLndhc21fc3JjKSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uIChtKSB7IHNlbGYuX193YXNtW25hbWVdID0gbTsgfSk7XG4gIH0pKVxuICAgIC50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNlbGY7IH0pO1xuXG4gIHJldHVybiB0aGlzLl9faW5pdF9wcm9taXNlO1xufTtcblxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuLy8gTWV0aG9kcyBiZWxvdyBhcmUgZm9yIGludGVybmFsIHVzZSBmcm9tIHBsdWdpbnNcblxuXG4vLyBTaW1wbGUgZGVjb2RlIGJhc2U2NCB0byB0eXBlZCBhcnJheS4gVXNlZnVsIHRvIGxvYWQgZW1iZWRkZWQgd2ViYXNzZW1ibHlcbi8vIGNvZGUuIFlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBtZXRob2QgZGlyZWN0bHkuXG4vL1xuTXVsdGlNYXRoLnByb3RvdHlwZS5fX2Jhc2U2NGRlY29kZSA9IGJhc2U2NGRlY29kZTtcblxuXG4vLyBJbmNyZWFzZSBjdXJyZW50IG1lbW9yeSB0byBpbmNsdWRlIHNwZWNpZmllZCBudW1iZXIgb2YgYnl0ZXMuIERvIG5vdGhpbmcgaWZcbi8vIHNpemUgaXMgYWxyZWFkeSBvay4gWW91IHByb2JhYmx5IGRvbid0IG5lZWQgdG8gY2FsbCB0aGlzIG1ldGhvZCBkaXJlY3RseSxcbi8vIGJlY2F1c2UgaXQgd2lsbCBiZSBpbnZva2VkIGZyb20gYC5fX2luc3RhbmNlKClgLlxuLy9cbk11bHRpTWF0aC5wcm90b3R5cGUuX19yZWFsbG9jYXRlID0gZnVuY3Rpb24gbWVtX2dyb3dfdG8oYnl0ZXMpIHtcbiAgaWYgKCF0aGlzLl9fbWVtb3J5KSB7XG4gICAgdGhpcy5fX21lbW9yeSA9IG5ldyBXZWJBc3NlbWJseS5NZW1vcnkoe1xuICAgICAgaW5pdGlhbDogTWF0aC5jZWlsKGJ5dGVzIC8gKDY0ICogMTAyNCkpXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuX19tZW1vcnk7XG4gIH1cblxuICB2YXIgbWVtX3NpemUgPSB0aGlzLl9fbWVtb3J5LmJ1ZmZlci5ieXRlTGVuZ3RoO1xuXG4gIGlmIChtZW1fc2l6ZSA8IGJ5dGVzKSB7XG4gICAgdGhpcy5fX21lbW9yeS5ncm93KE1hdGguY2VpbCgoYnl0ZXMgLSBtZW1fc2l6ZSkgLyAoNjQgKiAxMDI0KSkpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX19tZW1vcnk7XG59O1xuXG5cbi8vIFJldHVybnMgaW5zdGFudGluYXRlZCB3ZWJhc3NlbWJseSBpdGVtIGJ5IG5hbWUsIHdpdGggc3BlY2lmaWVkIG1lbW9yeSBzaXplXG4vLyBhbmQgZW52aXJvbm1lbnQuXG4vLyAtIHVzZSBjYWNoZSBpZiBhdmFpbGFibGVcbi8vIC0gZG8gc3luYyBtb2R1bGUgaW5pdCwgaWYgYXN5bmMgaW5pdCB3YXMgbm90IGNhbGxlZCBlYXJsaWVyXG4vLyAtIGFsbG9jYXRlIG1lbW9yeSBpZiBub3QgZW5vdWd0aFxuLy8gLSBjYW4gZXhwb3J0IGZ1bmN0aW9ucyB0byB3ZWJhc3NlbWJseSB2aWEgXCJlbnZfZXh0cmFcIixcbi8vICAgZm9yIGV4YW1wbGUsIHsgZXhwOiBNYXRoLmV4cCB9XG4vL1xuTXVsdGlNYXRoLnByb3RvdHlwZS5fX2luc3RhbmNlID0gZnVuY3Rpb24gaW5zdGFuY2UobmFtZSwgbWVtc2l6ZSwgZW52X2V4dHJhKSB7XG4gIGlmIChtZW1zaXplKSB0aGlzLl9fcmVhbGxvY2F0ZShtZW1zaXplKTtcblxuICAvLyBJZiAuaW5pdCgpIHdhcyBub3QgY2FsbGVkLCBkbyBzeW5jIGNvbXBpbGVcbiAgaWYgKCF0aGlzLl9fd2FzbVtuYW1lXSkge1xuICAgIHZhciBtb2R1bGUgPSB0aGlzLl9fbW9kdWxlc1tuYW1lXTtcbiAgICB0aGlzLl9fd2FzbVtuYW1lXSA9IG5ldyBXZWJBc3NlbWJseS5Nb2R1bGUodGhpcy5fX2Jhc2U2NGRlY29kZShtb2R1bGUud2FzbV9zcmMpKTtcbiAgfVxuXG4gIGlmICghdGhpcy5fX2NhY2hlW25hbWVdKSB7XG4gICAgdmFyIGVudl9iYXNlID0ge1xuICAgICAgbWVtb3J5QmFzZTogMCxcbiAgICAgIG1lbW9yeTogdGhpcy5fX21lbW9yeSxcbiAgICAgIHRhYmxlQmFzZTogMCxcbiAgICAgIHRhYmxlOiBuZXcgV2ViQXNzZW1ibHkuVGFibGUoeyBpbml0aWFsOiAwLCBlbGVtZW50OiAnYW55ZnVuYycgfSlcbiAgICB9O1xuXG4gICAgdGhpcy5fX2NhY2hlW25hbWVdID0gbmV3IFdlYkFzc2VtYmx5Lkluc3RhbmNlKHRoaXMuX193YXNtW25hbWVdLCB7XG4gICAgICBlbnY6IGFzc2lnbihlbnZfYmFzZSwgZW52X2V4dHJhIHx8IHt9KVxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuX19jYWNoZVtuYW1lXTtcbn07XG5cblxuLy8gSGVscGVyIHRvIGNhbGN1bGF0ZSBtZW1vcnkgYWxpZ2ggZm9yIHBvaW50ZXJzLiBXZWJhc3NlbWJseSBkb2VzIG5vdCByZXF1aXJlXG4vLyB0aGlzLCBidXQgeW91IG1heSB3aXNoIHRvIGV4cGVyaW1lbnQuIERlZmF1bHQgYmFzZSA9IDg7XG4vL1xuTXVsdGlNYXRoLnByb3RvdHlwZS5fX2FsaWduID0gZnVuY3Rpb24gYWxpZ24obnVtYmVyLCBiYXNlKSB7XG4gIGJhc2UgPSBiYXNlIHx8IDg7XG4gIHZhciByZW1pbmRlciA9IG51bWJlciAlIGJhc2U7XG4gIHJldHVybiBudW1iZXIgKyAocmVtaW5kZXIgPyBiYXNlIC0gcmVtaW5kZXIgOiAwKTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNdWx0aU1hdGg7XG5cbn0se1wiLi9saWIvYmFzZTY0ZGVjb2RlXCI6MTcsXCIuL2xpYi93YV9kZXRlY3RcIjoyMyxcIm9iamVjdC1hc3NpZ25cIjoyNH1dLDE3OltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8vIGJhc2U2NCBkZWNvZGUgc3RyIC0+IFVpbnQ4QXJyYXksIHRvIGxvYWQgV0EgbW9kdWxlc1xuLy9cbid1c2Ugc3RyaWN0JztcblxuXG52YXIgQkFTRTY0X01BUCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJhc2U2NGRlY29kZShzdHIpIHtcbiAgdmFyIGlucHV0ID0gc3RyLnJlcGxhY2UoL1tcXHJcXG49XS9nLCAnJyksIC8vIHJlbW92ZSBDUi9MRiAmIHBhZGRpbmcgdG8gc2ltcGxpZnkgc2NhblxuICAgICAgbWF4ICAgPSBpbnB1dC5sZW5ndGg7XG5cbiAgdmFyIG91dCA9IG5ldyBVaW50OEFycmF5KChtYXggKiAzKSA+PiAyKTtcblxuICAvLyBDb2xsZWN0IGJ5IDYqNCBiaXRzICgzIGJ5dGVzKVxuXG4gIHZhciBiaXRzID0gMDtcbiAgdmFyIHB0ciAgPSAwO1xuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IG1heDsgaWR4KyspIHtcbiAgICBpZiAoKGlkeCAlIDQgPT09IDApICYmIGlkeCkge1xuICAgICAgb3V0W3B0cisrXSA9IChiaXRzID4+IDE2KSAmIDB4RkY7XG4gICAgICBvdXRbcHRyKytdID0gKGJpdHMgPj4gOCkgJiAweEZGO1xuICAgICAgb3V0W3B0cisrXSA9IGJpdHMgJiAweEZGO1xuICAgIH1cblxuICAgIGJpdHMgPSAoYml0cyA8PCA2KSB8IEJBU0U2NF9NQVAuaW5kZXhPZihpbnB1dC5jaGFyQXQoaWR4KSk7XG4gIH1cblxuICAvLyBEdW1wIHRhaWxcblxuICB2YXIgdGFpbGJpdHMgPSAobWF4ICUgNCkgKiA2O1xuXG4gIGlmICh0YWlsYml0cyA9PT0gMCkge1xuICAgIG91dFtwdHIrK10gPSAoYml0cyA+PiAxNikgJiAweEZGO1xuICAgIG91dFtwdHIrK10gPSAoYml0cyA+PiA4KSAmIDB4RkY7XG4gICAgb3V0W3B0cisrXSA9IGJpdHMgJiAweEZGO1xuICB9IGVsc2UgaWYgKHRhaWxiaXRzID09PSAxOCkge1xuICAgIG91dFtwdHIrK10gPSAoYml0cyA+PiAxMCkgJiAweEZGO1xuICAgIG91dFtwdHIrK10gPSAoYml0cyA+PiAyKSAmIDB4RkY7XG4gIH0gZWxzZSBpZiAodGFpbGJpdHMgPT09IDEyKSB7XG4gICAgb3V0W3B0cisrXSA9IChiaXRzID4+IDQpICYgMHhGRjtcbiAgfVxuXG4gIHJldHVybiBvdXQ7XG59O1xuXG59LHt9XSwxODpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBDYWxjdWxhdGVzIDE2LWJpdCBwcmVjaXNpb24gSFNMIGxpZ2h0bmVzcyBmcm9tIDgtYml0IHJnYmEgYnVmZmVyXG4vL1xuJ3VzZSBzdHJpY3QnO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaHNsX2wxNl9qcyhpbWcsIHdpZHRoLCBoZWlnaHQpIHtcbiAgdmFyIHNpemUgPSB3aWR0aCAqIGhlaWdodDtcbiAgdmFyIG91dCA9IG5ldyBVaW50MTZBcnJheShzaXplKTtcbiAgdmFyIHIsIGcsIGIsIG1pbiwgbWF4O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgIHIgPSBpbWdbNCAqIGldO1xuICAgIGcgPSBpbWdbNCAqIGkgKyAxXTtcbiAgICBiID0gaW1nWzQgKiBpICsgMl07XG4gICAgbWF4ID0gKHIgPj0gZyAmJiByID49IGIpID8gciA6IChnID49IGIgJiYgZyA+PSByKSA/IGcgOiBiO1xuICAgIG1pbiA9IChyIDw9IGcgJiYgciA8PSBiKSA/IHIgOiAoZyA8PSBiICYmIGcgPD0gcikgPyBnIDogYjtcbiAgICBvdXRbaV0gPSAobWF4ICsgbWluKSAqIDI1NyA+PiAxO1xuICB9XG4gIHJldHVybiBvdXQ7XG59O1xuXG59LHt9XSwxOTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBuYW1lOiAgICAgJ3Vuc2hhcnBfbWFzaycsXG4gIGZuOiAgICAgICBfZGVyZXFfKCcuL3Vuc2hhcnBfbWFzaycpLFxuICB3YXNtX2ZuOiAgX2RlcmVxXygnLi91bnNoYXJwX21hc2tfd2FzbScpLFxuICB3YXNtX3NyYzogX2RlcmVxXygnLi91bnNoYXJwX21hc2tfd2FzbV9iYXNlNjQnKVxufTtcblxufSx7XCIuL3Vuc2hhcnBfbWFza1wiOjIwLFwiLi91bnNoYXJwX21hc2tfd2FzbVwiOjIxLFwiLi91bnNoYXJwX21hc2tfd2FzbV9iYXNlNjRcIjoyMn1dLDIwOltmdW5jdGlvbihfZGVyZXFfLG1vZHVsZSxleHBvcnRzKXtcbi8vIFVuc2hhcnAgbWFzayBmaWx0ZXJcbi8vXG4vLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMzMyMjgyMC8xMDMxODA0XG4vLyBVU00oTykgPSBPICsgKDIgKiAoQW1vdW50IC8gMTAwKSAqIChPIC0gR0IpKVxuLy8gR0IgLSBnYXVzc2lhbiBibHVyLlxuLy9cbi8vIEltYWdlIGlzIGNvbnZlcnRlZCBmcm9tIFJHQiB0byBIU0wsIHVuc2hhcnAgbWFzayBpcyBhcHBsaWVkIHRvIHRoZVxuLy8gbGlnaHRuZXNzIGNoYW5uZWwgYW5kIHRoZW4gaW1hZ2UgaXMgY29udmVydGVkIGJhY2sgdG8gUkdCLlxuLy9cbid1c2Ugc3RyaWN0JztcblxuXG52YXIgZ2x1cl9tb25vMTYgPSBfZGVyZXFfKCdnbHVyL21vbm8xNicpO1xudmFyIGhzbF9sMTYgICAgID0gX2RlcmVxXygnLi9oc2xfbDE2Jyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB1bnNoYXJwKGltZywgd2lkdGgsIGhlaWdodCwgYW1vdW50LCByYWRpdXMsIHRocmVzaG9sZCkge1xuICB2YXIgciwgZywgYjtcbiAgdmFyIGgsIHMsIGw7XG4gIHZhciBtaW4sIG1heDtcbiAgdmFyIG0xLCBtMiwgaFNoaWZ0ZWQ7XG4gIHZhciBkaWZmLCBpVGltZXM0O1xuXG4gIGlmIChhbW91bnQgPT09IDAgfHwgcmFkaXVzIDwgMC41KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChyYWRpdXMgPiAyLjApIHtcbiAgICByYWRpdXMgPSAyLjA7XG4gIH1cblxuICB2YXIgbGlnaHRuZXNzID0gaHNsX2wxNihpbWcsIHdpZHRoLCBoZWlnaHQpO1xuXG4gIHZhciBibHVyZWQgPSBuZXcgVWludDE2QXJyYXkobGlnaHRuZXNzKTsgLy8gY29weSwgYmVjYXVzZSBibHVyIG1vZGlmeSBzcmNcblxuICBnbHVyX21vbm8xNihibHVyZWQsIHdpZHRoLCBoZWlnaHQsIHJhZGl1cyk7XG5cbiAgdmFyIGFtb3VudEZwID0gKGFtb3VudCAvIDEwMCAqIDB4MTAwMCArIDAuNSl8MDtcbiAgdmFyIHRocmVzaG9sZEZwID0gKHRocmVzaG9sZCAqIDI1Nyl8MDtcblxuICB2YXIgc2l6ZSA9IHdpZHRoICogaGVpZ2h0O1xuXG4gIC8qIGVzbGludC1kaXNhYmxlIGluZGVudCAqL1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgIGRpZmYgPSAyICogKGxpZ2h0bmVzc1tpXSAtIGJsdXJlZFtpXSk7XG5cbiAgICBpZiAoTWF0aC5hYnMoZGlmZikgPj0gdGhyZXNob2xkRnApIHtcbiAgICAgIGlUaW1lczQgPSBpICogNDtcbiAgICAgIHIgPSBpbWdbaVRpbWVzNF07XG4gICAgICBnID0gaW1nW2lUaW1lczQgKyAxXTtcbiAgICAgIGIgPSBpbWdbaVRpbWVzNCArIDJdO1xuXG4gICAgICAvLyBjb252ZXJ0IFJHQiB0byBIU0xcbiAgICAgIC8vIHRha2UgUkdCLCA4LWJpdCB1bnNpZ25lZCBpbnRlZ2VyIHBlciBlYWNoIGNoYW5uZWxcbiAgICAgIC8vIHNhdmUgSFNMLCBIIGFuZCBMIGFyZSAxNi1iaXQgdW5zaWduZWQgaW50ZWdlcnMsIFMgaXMgMTItYml0IHVuc2lnbmVkIGludGVnZXJcbiAgICAgIC8vIG1hdGggaXMgdGFrZW4gZnJvbSBoZXJlOiBodHRwOi8vd3d3LmVhc3lyZ2IuY29tL2luZGV4LnBocD9YPU1BVEgmSD0xOFxuICAgICAgLy8gYW5kIGFkb3B0ZWQgdG8gYmUgaW50ZWdlciAoZml4ZWQgcG9pbnQgaW4gZmFjdCkgZm9yIHNha2Ugb2YgcGVyZm9ybWFuY2VcbiAgICAgIG1heCA9IChyID49IGcgJiYgciA+PSBiKSA/IHIgOiAoZyA+PSByICYmIGcgPj0gYikgPyBnIDogYjsgLy8gbWluIGFuZCBtYXggYXJlIGluIFswLi4weGZmXVxuICAgICAgbWluID0gKHIgPD0gZyAmJiByIDw9IGIpID8gciA6IChnIDw9IHIgJiYgZyA8PSBiKSA/IGcgOiBiO1xuICAgICAgbCA9IChtYXggKyBtaW4pICogMjU3ID4+IDE7IC8vIGwgaXMgaW4gWzAuLjB4ZmZmZl0gdGhhdCBpcyBjYXVzZWQgYnkgbXVsdGlwbGljYXRpb24gYnkgMjU3XG5cbiAgICAgIGlmIChtaW4gPT09IG1heCkge1xuICAgICAgICBoID0gcyA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzID0gKGwgPD0gMHg3ZmZmKSA/XG4gICAgICAgICAgKCgobWF4IC0gbWluKSAqIDB4ZmZmKSAvIChtYXggKyBtaW4pKXwwIDpcbiAgICAgICAgICAoKChtYXggLSBtaW4pICogMHhmZmYpIC8gKDIgKiAweGZmIC0gbWF4IC0gbWluKSl8MDsgLy8gcyBpcyBpbiBbMC4uMHhmZmZdXG4gICAgICAgIC8vIGggY291bGQgYmUgbGVzcyAwLCBpdCB3aWxsIGJlIGZpeGVkIGluIGJhY2t3YXJkIGNvbnZlcnNpb24gdG8gUkdCLCB8aHwgPD0gMHhmZmZmIC8gNlxuICAgICAgICBoID0gKHIgPT09IG1heCkgPyAoKChnIC0gYikgKiAweGZmZmYpIC8gKDYgKiAobWF4IC0gbWluKSkpfDBcbiAgICAgICAgICA6IChnID09PSBtYXgpID8gMHg1NTU1ICsgKCgoKGIgLSByKSAqIDB4ZmZmZikgLyAoNiAqIChtYXggLSBtaW4pKSl8MCkgLy8gMHg1NTU1ID09IDB4ZmZmZiAvIDNcbiAgICAgICAgICA6IDB4YWFhYSArICgoKChyIC0gZykgKiAweGZmZmYpIC8gKDYgKiAobWF4IC0gbWluKSkpfDApOyAvLyAweGFhYWEgPT0gMHhmZmZmICogMiAvIDNcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHVuc2hhcnAgbWFzayBtYXNrIHRvIHRoZSBsaWdodG5lc3MgY2hhbm5lbFxuICAgICAgbCArPSAoYW1vdW50RnAgKiBkaWZmICsgMHg4MDApID4+IDEyO1xuICAgICAgaWYgKGwgPiAweGZmZmYpIHtcbiAgICAgICAgbCA9IDB4ZmZmZjtcbiAgICAgIH0gZWxzZSBpZiAobCA8IDApIHtcbiAgICAgICAgbCA9IDA7XG4gICAgICB9XG5cbiAgICAgIC8vIGNvbnZlcnQgSFNMIGJhY2sgdG8gUkdCXG4gICAgICAvLyBmb3IgaW5mb3JtYXRpb24gYWJvdXQgbWF0aCBsb29rIGFib3ZlXG4gICAgICBpZiAocyA9PT0gMCkge1xuICAgICAgICByID0gZyA9IGIgPSBsID4+IDg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtMiA9IChsIDw9IDB4N2ZmZikgPyAobCAqICgweDEwMDAgKyBzKSArIDB4ODAwKSA+PiAxMiA6XG4gICAgICAgICAgbCAgKyAoKCgweGZmZmYgLSBsKSAqIHMgKyAweDgwMCkgPj4gIDEyKTtcbiAgICAgICAgbTEgPSAyICogbCAtIG0yID4+IDg7XG4gICAgICAgIG0yID4+PSA4O1xuICAgICAgICAvLyBzYXZlIHJlc3VsdCB0byBSR0IgY2hhbm5lbHNcbiAgICAgICAgLy8gUiBjaGFubmVsXG4gICAgICAgIGhTaGlmdGVkID0gKGggKyAweDU1NTUpICYgMHhmZmZmOyAvLyAweDU1NTUgPT0gMHhmZmZmIC8gM1xuICAgICAgICByID0gKGhTaGlmdGVkID49IDB4YWFhYSkgPyBtMSAvLyAweGFhYWEgPT0gMHhmZmZmICogMiAvIDNcbiAgICAgICAgICA6IChoU2hpZnRlZCA+PSAweDdmZmYpID8gIG0xICsgKChtMiAtIG0xKSAqIDYgKiAoMHhhYWFhIC0gaFNoaWZ0ZWQpICsgMHg4MDAwID4+IDE2KVxuICAgICAgICAgIDogKGhTaGlmdGVkID49IDB4MmFhYSkgPyBtMiAvLyAweDJhYWEgPT0gMHhmZmZmIC8gNlxuICAgICAgICAgIDogbTEgKyAoKG0yIC0gbTEpICogNiAqIGhTaGlmdGVkICsgMHg4MDAwID4+IDE2KTtcbiAgICAgICAgLy8gRyBjaGFubmVsXG4gICAgICAgIGhTaGlmdGVkID0gaCAmIDB4ZmZmZjtcbiAgICAgICAgZyA9IChoU2hpZnRlZCA+PSAweGFhYWEpID8gbTEgLy8gMHhhYWFhID09IDB4ZmZmZiAqIDIgLyAzXG4gICAgICAgICAgOiAoaFNoaWZ0ZWQgPj0gMHg3ZmZmKSA/ICBtMSArICgobTIgLSBtMSkgKiA2ICogKDB4YWFhYSAtIGhTaGlmdGVkKSArIDB4ODAwMCA+PiAxNilcbiAgICAgICAgICA6IChoU2hpZnRlZCA+PSAweDJhYWEpID8gbTIgLy8gMHgyYWFhID09IDB4ZmZmZiAvIDZcbiAgICAgICAgICA6IG0xICsgKChtMiAtIG0xKSAqIDYgKiBoU2hpZnRlZCArIDB4ODAwMCA+PiAxNik7XG4gICAgICAgIC8vIEIgY2hhbm5lbFxuICAgICAgICBoU2hpZnRlZCA9IChoIC0gMHg1NTU1KSAmIDB4ZmZmZjtcbiAgICAgICAgYiA9IChoU2hpZnRlZCA+PSAweGFhYWEpID8gbTEgLy8gMHhhYWFhID09IDB4ZmZmZiAqIDIgLyAzXG4gICAgICAgICAgOiAoaFNoaWZ0ZWQgPj0gMHg3ZmZmKSA/ICBtMSArICgobTIgLSBtMSkgKiA2ICogKDB4YWFhYSAtIGhTaGlmdGVkKSArIDB4ODAwMCA+PiAxNilcbiAgICAgICAgICA6IChoU2hpZnRlZCA+PSAweDJhYWEpID8gbTIgLy8gMHgyYWFhID09IDB4ZmZmZiAvIDZcbiAgICAgICAgICA6IG0xICsgKChtMiAtIG0xKSAqIDYgKiBoU2hpZnRlZCArIDB4ODAwMCA+PiAxNik7XG4gICAgICB9XG5cbiAgICAgIGltZ1tpVGltZXM0XSA9IHI7XG4gICAgICBpbWdbaVRpbWVzNCArIDFdID0gZztcbiAgICAgIGltZ1tpVGltZXM0ICsgMl0gPSBiO1xuICAgIH1cbiAgfVxufTtcblxufSx7XCIuL2hzbF9sMTZcIjoxOCxcImdsdXIvbW9ubzE2XCI6MTR9XSwyMTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB1bnNoYXJwKGltZywgd2lkdGgsIGhlaWdodCwgYW1vdW50LCByYWRpdXMsIHRocmVzaG9sZCkge1xuICBpZiAoYW1vdW50ID09PSAwIHx8IHJhZGl1cyA8IDAuNSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChyYWRpdXMgPiAyLjApIHtcbiAgICByYWRpdXMgPSAyLjA7XG4gIH1cblxuICB2YXIgcGl4ZWxzID0gd2lkdGggKiBoZWlnaHQ7XG5cbiAgdmFyIGltZ19ieXRlc19jbnQgICAgICAgID0gcGl4ZWxzICogNDtcbiAgdmFyIGhzbF9ieXRlc19jbnQgICAgICAgID0gcGl4ZWxzICogMjtcbiAgdmFyIGJsdXJfYnl0ZXNfY250ICAgICAgID0gcGl4ZWxzICogMjtcbiAgdmFyIGJsdXJfbGluZV9ieXRlX2NudCAgID0gTWF0aC5tYXgod2lkdGgsIGhlaWdodCkgKiA0OyAvLyBmbG9hdDMyIGFycmF5XG4gIHZhciBibHVyX2NvZWZmc19ieXRlX2NudCA9IDggKiA0OyAvLyBmbG9hdDMyIGFycmF5XG5cbiAgdmFyIGltZ19vZmZzZXQgICAgICAgICA9IDA7XG4gIHZhciBoc2xfb2Zmc2V0ICAgICAgICAgPSBpbWdfYnl0ZXNfY250O1xuICB2YXIgYmx1cl9vZmZzZXQgICAgICAgID0gaHNsX29mZnNldCArIGhzbF9ieXRlc19jbnQ7XG4gIHZhciBibHVyX3RtcF9vZmZzZXQgICAgPSBibHVyX29mZnNldCArIGJsdXJfYnl0ZXNfY250O1xuICB2YXIgYmx1cl9saW5lX29mZnNldCAgID0gYmx1cl90bXBfb2Zmc2V0ICsgYmx1cl9ieXRlc19jbnQ7XG4gIHZhciBibHVyX2NvZWZmc19vZmZzZXQgPSBibHVyX2xpbmVfb2Zmc2V0ICsgYmx1cl9saW5lX2J5dGVfY250O1xuXG4gIHZhciBpbnN0YW5jZSA9IHRoaXMuX19pbnN0YW5jZShcbiAgICAndW5zaGFycF9tYXNrJyxcbiAgICBpbWdfYnl0ZXNfY250ICsgaHNsX2J5dGVzX2NudCArIGJsdXJfYnl0ZXNfY250ICogMiArIGJsdXJfbGluZV9ieXRlX2NudCArIGJsdXJfY29lZmZzX2J5dGVfY250LFxuICAgIHsgZXhwOiBNYXRoLmV4cCB9XG4gICk7XG5cbiAgLy8gMzItYml0IGNvcHkgaXMgbXVjaCBmYXN0ZXIgaW4gY2hyb21lXG4gIHZhciBpbWczMiA9IG5ldyBVaW50MzJBcnJheShpbWcuYnVmZmVyKTtcbiAgdmFyIG1lbTMyID0gbmV3IFVpbnQzMkFycmF5KHRoaXMuX19tZW1vcnkuYnVmZmVyKTtcbiAgbWVtMzIuc2V0KGltZzMyKTtcblxuICAvLyBIU0xcbiAgdmFyIGZuID0gaW5zdGFuY2UuZXhwb3J0cy5oc2xfbDE2IHx8IGluc3RhbmNlLmV4cG9ydHMuX2hzbF9sMTY7XG4gIGZuKGltZ19vZmZzZXQsIGhzbF9vZmZzZXQsIHdpZHRoLCBoZWlnaHQpO1xuXG4gIC8vIEJMVVJcbiAgZm4gPSBpbnN0YW5jZS5leHBvcnRzLmJsdXJNb25vMTYgfHwgaW5zdGFuY2UuZXhwb3J0cy5fYmx1ck1vbm8xNjtcbiAgZm4oaHNsX29mZnNldCwgYmx1cl9vZmZzZXQsIGJsdXJfdG1wX29mZnNldCxcbiAgICBibHVyX2xpbmVfb2Zmc2V0LCBibHVyX2NvZWZmc19vZmZzZXQsIHdpZHRoLCBoZWlnaHQsIHJhZGl1cyk7XG5cbiAgLy8gVU5TSEFSUFxuICBmbiA9IGluc3RhbmNlLmV4cG9ydHMudW5zaGFycCB8fCBpbnN0YW5jZS5leHBvcnRzLl91bnNoYXJwO1xuICBmbihpbWdfb2Zmc2V0LCBpbWdfb2Zmc2V0LCBoc2xfb2Zmc2V0LFxuICAgIGJsdXJfb2Zmc2V0LCB3aWR0aCwgaGVpZ2h0LCBhbW91bnQsIHRocmVzaG9sZCk7XG5cbiAgLy8gMzItYml0IGNvcHkgaXMgbXVjaCBmYXN0ZXIgaW4gY2hyb21lXG4gIGltZzMyLnNldChuZXcgVWludDMyQXJyYXkodGhpcy5fX21lbW9yeS5idWZmZXIsIDAsIHBpeGVscykpO1xufTtcblxufSx7fV0sMjI6W2Z1bmN0aW9uKF9kZXJlcV8sbW9kdWxlLGV4cG9ydHMpe1xuLy8gVGhpcyBpcyBhdXRvZ2VuZXJhdGVkIGZpbGUgZnJvbSBtYXRoLndhc20sIGRvbid0IGVkaXQuXG4vL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5tb2R1bGUuZXhwb3J0cyA9ICdBR0Z6YlFFQUFBQUJNUVpnQVh3QmZHQUNmWDhBWUFaL2YzOS9mMzhBWUFoL2YzOS9mMzkvZlFCZ0JIOS9mMzhBWUFoL2YzOS9mMzkvZndBQ0dRSURaVzUyQTJWNGNBQUFBMlZ1ZGdadFpXMXZjbmtDQUFFREJnVUJBZ01FQlFRRUFYQUFBQWRNQlJaZlgySjFhV3hrWDJkaGRYTnphV0Z1WDJOdlpXWnpBQUVPWDE5bllYVnpjekUyWDJ4cGJtVUFBZ3BpYkhWeVRXOXViekUyQUFNSGFITnNYMnd4TmdBRUIzVnVjMmhoY25BQUJRa0JBQXFKRUFYWkFRRUdmQUpBSUFGRTI0YTZRNElhK3o4Z0FMdWpJZ09hRUFBaUJDQUVvQ0lHdGpnQ0VDQUJJQU5FQUFBQUFBQUFBTUNpRUFBaUJiYU1PQUlVSUFGRUFBQUFBQUFBOEQ4Z0JLRWlBaUFDb2lBRUlBTWdBNkNpUkFBQUFBQUFBUEEvb0NBRm9hTWlBclk0QWdBZ0FTQUVJQU5FQUFBQUFBQUE4TCtnSUFLaW9pSUh0amdDQkNBQklBUWdBMFFBQUFBQUFBRHdQNkFnQXFLaUlnTzJPQUlJSUFFZ0JTQUNvaUlFdG93NEFnd2dBU0FDSUFlZ0lBVkVBQUFBQUFBQThEOGdCcUdnSWdLanRqZ0NHQ0FCSUFNZ0JLRWdBcU8yT0FJY0N3dTNBd01EZndSOUNId0NRQ0FES2dJVUlRa2dBeW9DRUNFS0lBTXFBZ3doQ3lBREtnSUlJUXdDUUNBRVFYOXFJZ2RCQUVnaUNBMEFJQUlnQUM4QkFMZ2lEU0FES2dJWXU2SWlEaUFKdXlJUW9pQU9JQXE3SWhHaUlBMGdBeW9DQkxzaUVxSWdBeW9DQUxzaUV5QU5vcUNnb0NJUHRqZ0NBQ0FDUVFScUlRSWdBRUVDYWlFQUlBZEZEUUFnQkNFR0EwQWdBaUFPSUJDaUlBOGlEaUFSb2lBTklCS2lJQk1nQUM4QkFMZ2lEYUtnb0tBaUQ3WTRBZ0FnQWtFRWFpRUNJQUJCQW1vaEFDQUdRWDlxSWdaQkFVb05BQXNMQWtBZ0NBMEFJQUVnQnlBRmJFRUJkR29nQUVGK2FpOEJBQ0lJdUNJTklBdTdJaEdpSUEwZ0RMc2lFcUtnSUEwZ0F5b0NITHVpSWc0Z0Nyc2lFNktnSUE0Z0Nic2lGS0tnSWc4Z0FrRjhhaW9DQUx1Z3F6c0JBQ0FIUlEwQUlBSkJlR29oQWlBQVFYeHFJUUJCQUNBRlFRRjBheUVISUFFZ0JTQUVRUUYwUVh4cWJHb2hCZ05BSUFnaEF5QUFMd0VBSVFnZ0JpQU5JQkdpSUFPNElnMGdFcUtnSUE4aUVDQVRvcUFnRGlBVW9xQWlEeUFDS2dJQXU2Q3JPd0VBSUFZZ0Iyb2hCaUFBUVg1cUlRQWdBa0Y4YWlFQ0lCQWhEaUFFUVg5cUlnUkJBVW9OQUFzTEN3dmZBZ0lEZndaOEFrQWdCME1BQUFBQVd3MEFJQVJFMjRhNlE0SWErejhnQjBNQUFBQS9sN3VqSWd5YUVBQWlEU0FOb0NJUHRqZ0NFQ0FFSUF4RUFBQUFBQUFBQU1DaUVBQWlEcmFNT0FJVUlBUkVBQUFBQUFBQThEOGdEYUVpQ3lBTG9pQU5JQXdnREtDaVJBQUFBQUFBQVBBL29DQU9vYU1pQzdZNEFnQWdCQ0FOSUF4RUFBQUFBQUFBOEwrZ0lBdWlvaUlRdGpnQ0JDQUVJQTBnREVRQUFBQUFBQUR3UDZBZ0M2S2lJZ3kyT0FJSUlBUWdEaUFMb2lJTnRvdzRBZ3dnQkNBTElCQ2dJQTVFQUFBQUFBQUE4RDhnRDZHZ0lndWp0amdDR0NBRUlBd2dEYUVnQzZPMk9BSWNJQVlFUUNBRlFRRjBJUW9nQmlFSklBSWhDQU5BSUFBZ0NDQURJQVFnQlNBR0VBSWdBQ0FLYWlFQUlBaEJBbW9oQ0NBSlFYOXFJZ2tOQUFzTElBVkZEUUFnQmtFQmRDRUlJQVVoQUFOQUlBSWdBU0FESUFRZ0JpQUZFQUlnQWlBSWFpRUNJQUZCQW1vaEFTQUFRWDlxSWdBTkFBc0xDN3dCQVFWL0lBTWdBbXdpQXdSQVFRQWdBMnNoQmdOQUlBQW9BZ0FpQkVFSWRpSUhRZjhCY1NFQ0FuOGdCRUgvQVhFaUF5QUVRUkIySWdSQi93RnhJZ1ZQQkVBZ0F5SUlJQU1nQWs4TkFSb0xJQVFnQkNBSElBSWdBMGtiSUFJZ0JVa2JRZjhCY1FzaENBSkFJQU1nQWswRVFDQURJQVZORFFFTElBUWdCeUFFSUFNZ0FrOGJJQUlnQlVzYlFmOEJjU0VEQ3lBQVFRUnFJUUFnQVNBRElBaHFRWUVDYkVFQmRqc0JBQ0FCUVFKcUlRRWdCa0VCYWlJR0RRQUxDd3ZUQmdFS2Z3SkFJQWF6UXdBQWdFV1VRd0FBeUVLVnUwUUFBQUFBQUFEZ1A2Q3FJUTBnQlNBRWJDSUxCRUFnQjBHQkFtd2hEZ05BUVFBZ0FpOEJBQ0FETHdFQWF5SUdRUUYwSWdkcklBY2dCa0VBU0JzZ0RrOEVRQ0FBUVFKcUxRQUFJUVVDZnlBQUxRQUFJZ1lnQUVFQmFpMEFBQ0lFU1NJSlJRUkFJQVlpQ0NBR0lBVlBEUUVhQ3lBRklBVWdCQ0FFSUFWSkd5QUdJQVJMR3dzaENBSi9JQVlnQkUwRVFDQUdJZ29nQmlBRlRRMEJHZ3NnQlNBRklBUWdCQ0FGU3hzZ0NSc0xJZ29nQ0dvaUQwR0JBbXdpRUVFQmRpRVJRUUFoREFKL1FRQWlDU0FJSUFwR0RRQWFJQWdnQ21zaUNVSC9IMndnRDBIK0F5QUlheUFLYXlBUVFZQ0FCRWtiYlNFTUlBWWdDRVlFUUNBRUlBVnJRZi8vQTJ3Z0NVRUdiRzBNQVFzZ0JTQUdheUFHSUFScklBUWdDRVlpQmh0Qi8vOERiQ0FKUVFac2JVSFZxZ0ZCcXRVQ0lBWWJhZ3NoQ1NBUklBY2dEV3hCZ0JCcVFReDFhaUlHUVFBZ0JrRUFTaHNpQmtILy93TWdCa0gvL3dOSUd5RUdBa0FDZndKQUlBeEIvLzhEY1NJRkJFQWdCa0gvL3dGS0RRRWdCVUdBSUdvZ0JteEJnQkJxUVF4MkRBSUxJQVpCQ0hZaUJpRUZJQVloQkF3Q0N5QUZJQVpCLy84RGMyeEJnQkJxUVF4MklBWnFDeUlGUVFoMklRY2dCa0VCZENBRmEwRUlkaUlHSVFRQ1FDQUpRZFdxQVdwQi8vOERjU0lGUWFuVkFrc05BQ0FGUWYvL0FVOEVRRUdxMVFJZ0JXc2dCeUFHYTJ4QkJteEJnSUFDYWtFUWRpQUdhaUVFREFFTElBY2hCQ0FGUWFuVkFFc05BQ0FGSUFjZ0JtdHNRUVpzUVlDQUFtcEJFSFlnQm1vaEJBc0NmeUFHSWdVZ0NVSC8vd054SWdoQnFkVUNTdzBBR2tHcTFRSWdDR3NnQnlBR2EyeEJCbXhCZ0lBQ2FrRVFkaUFHYWlBSVFmLy9BVThOQUJvZ0J5SUZJQWhCcWRVQVN3MEFHaUFJSUFjZ0JtdHNRUVpzUVlDQUFtcEJFSFlnQm1vTElRVWdDVUdyMVFKcVFmLy9BM0VpQ0VHcDFRSkxEUUFnQ0VILy93RlBCRUJCcXRVQ0lBaHJJQWNnQm10c1FRWnNRWUNBQW1wQkVIWWdCbW9oQmd3QkN5QUlRYW5WQUVzRVFDQUhJUVlNQVFzZ0NDQUhJQVpyYkVFR2JFR0FnQUpxUVJCMklBWnFJUVlMSUFFZ0JEb0FBQ0FCUVFGcUlBVTZBQUFnQVVFQ2FpQUdPZ0FBQ3lBRFFRSnFJUU1nQWtFQ2FpRUNJQUJCQkdvaEFDQUJRUVJxSVFFZ0MwRi9haUlMRFFBTEN3c0wnO1xuXG59LHt9XSwyMzpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vLyBEZXRlY3QgV2ViQXNzZW1ibHkgc3VwcG9ydC5cbi8vIC0gQ2hlY2sgZ2xvYmFsIFdlYkFzc2VtYmx5IG9iamVjdFxuLy8gLSBUcnkgdG8gbG9hZCBzaW1wbGUgbW9kdWxlIChjYW4gYmUgZGlzYWJsZWQgdmlhIENTUClcbi8vXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIHdhO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaGFzV2ViQXNzZW1ibHkoKSB7XG4gIC8vIHVzZSBjYWNoZSBpZiBjYWxsZWQgYmVmb3JlO1xuICBpZiAodHlwZW9mIHdhICE9PSAndW5kZWZpbmVkJykgcmV0dXJuIHdhO1xuXG4gIHdhID0gZmFsc2U7XG5cbiAgaWYgKHR5cGVvZiBXZWJBc3NlbWJseSA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiB3YTtcblxuICAvLyBJZiBXZWJBc3NlbmJseSBpcyBkaXNhYmxlZCwgY29kZSBjYW4gdGhyb3cgb24gY29tcGlsZVxuICB0cnkge1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9icmlvbi9taW4td2FzbS1mYWlsL2Jsb2IvbWFzdGVyL21pbi13YXNtLWZhaWwuaW4uanNcbiAgICAvLyBBZGRpdGlvbmFsIGNoZWNrIHRoYXQgV0EgaW50ZXJuYWxzIGFyZSBjb3JyZWN0XG5cbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBjb21tYS1zcGFjaW5nLCBtYXgtbGVuICovXG4gICAgdmFyIGJpbiAgICAgID0gbmV3IFVpbnQ4QXJyYXkoWyAwLDk3LDExNSwxMDksMSwwLDAsMCwxLDYsMSw5NiwxLDEyNywxLDEyNywzLDIsMSwwLDUsMywxLDAsMSw3LDgsMSw0LDExNiwxMDEsMTE1LDExNiwwLDAsMTAsMTYsMSwxNCwwLDMyLDAsNjUsMSw1NCwyLDAsMzIsMCw0MCwyLDAsMTEgXSk7XG4gICAgdmFyIG1vZHVsZSAgID0gbmV3IFdlYkFzc2VtYmx5Lk1vZHVsZShiaW4pO1xuICAgIHZhciBpbnN0YW5jZSA9IG5ldyBXZWJBc3NlbWJseS5JbnN0YW5jZShtb2R1bGUsIHt9KTtcblxuICAgIC8vIHRlc3Qgc3RvcmluZyB0byBhbmQgbG9hZGluZyBmcm9tIGEgbm9uLXplcm8gbG9jYXRpb24gdmlhIGEgcGFyYW1ldGVyLlxuICAgIC8vIFNhZmFyaSBvbiBpT1MgMTEuMi41IHJldHVybnMgMCB1bmV4cGVjdGVkbHkgYXQgbm9uLXplcm8gbG9jYXRpb25zXG4gICAgaWYgKGluc3RhbmNlLmV4cG9ydHMudGVzdCg0KSAhPT0gMCkgd2EgPSB0cnVlO1xuXG4gICAgcmV0dXJuIHdhO1xuICB9IGNhdGNoIChfXykge31cblxuICByZXR1cm4gd2E7XG59O1xuXG59LHt9XSwyNDpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4vKlxub2JqZWN0LWFzc2lnblxuKGMpIFNpbmRyZSBTb3JodXNcbkBsaWNlbnNlIE1JVFxuKi9cblxuJ3VzZSBzdHJpY3QnO1xuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbnZhciBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRVc2VOYXRpdmUoKSB7XG5cdHRyeSB7XG5cdFx0aWYgKCFPYmplY3QuYXNzaWduKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZWN0IGJ1Z2d5IHByb3BlcnR5IGVudW1lcmF0aW9uIG9yZGVyIGluIG9sZGVyIFY4IHZlcnNpb25zLlxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9NDExOFxuXHRcdHZhciB0ZXN0MSA9IG5ldyBTdHJpbmcoJ2FiYycpOyAgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1uZXctd3JhcHBlcnNcblx0XHR0ZXN0MVs1XSA9ICdkZSc7XG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QxKVswXSA9PT0gJzUnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MiA9IHt9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0dGVzdDJbJ18nICsgU3RyaW5nLmZyb21DaGFyQ29kZShpKV0gPSBpO1xuXHRcdH1cblx0XHR2YXIgb3JkZXIyID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbiAobikge1xuXHRcdFx0cmV0dXJuIHRlc3QyW25dO1xuXHRcdH0pO1xuXHRcdGlmIChvcmRlcjIuam9pbignJykgIT09ICcwMTIzNDU2Nzg5Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDMgPSB7fTtcblx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIpIHtcblx0XHRcdHRlc3QzW2xldHRlcl0gPSBsZXR0ZXI7XG5cdFx0fSk7XG5cdFx0aWYgKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sIHRlc3QzKSkuam9pbignJykgIT09XG5cdFx0XHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Ly8gV2UgZG9uJ3QgZXhwZWN0IGFueSBvZiB0aGUgYWJvdmUgdG8gdGhyb3csIGJ1dCBiZXR0ZXIgdG8gYmUgc2FmZS5cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzaG91bGRVc2VOYXRpdmUoKSA/IE9iamVjdC5hc3NpZ24gOiBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuXG59LHt9XSwyNTpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG52YXIgYnVuZGxlRm4gPSBhcmd1bWVudHNbM107XG52YXIgc291cmNlcyA9IGFyZ3VtZW50c1s0XTtcbnZhciBjYWNoZSA9IGFyZ3VtZW50c1s1XTtcblxudmFyIHN0cmluZ2lmeSA9IEpTT04uc3RyaW5naWZ5O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChmbiwgb3B0aW9ucykge1xuICAgIHZhciB3a2V5O1xuICAgIHZhciBjYWNoZUtleXMgPSBPYmplY3Qua2V5cyhjYWNoZSk7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNhY2hlS2V5cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIGtleSA9IGNhY2hlS2V5c1tpXTtcbiAgICAgICAgdmFyIGV4cCA9IGNhY2hlW2tleV0uZXhwb3J0cztcbiAgICAgICAgLy8gVXNpbmcgYmFiZWwgYXMgYSB0cmFuc3BpbGVyIHRvIHVzZSBlc21vZHVsZSwgdGhlIGV4cG9ydCB3aWxsIGFsd2F5c1xuICAgICAgICAvLyBiZSBhbiBvYmplY3Qgd2l0aCB0aGUgZGVmYXVsdCBleHBvcnQgYXMgYSBwcm9wZXJ0eSBvZiBpdC4gVG8gZW5zdXJlXG4gICAgICAgIC8vIHRoZSBleGlzdGluZyBhcGkgYW5kIGJhYmVsIGVzbW9kdWxlIGV4cG9ydHMgYXJlIGJvdGggc3VwcG9ydGVkIHdlXG4gICAgICAgIC8vIGNoZWNrIGZvciBib3RoXG4gICAgICAgIGlmIChleHAgPT09IGZuIHx8IGV4cCAmJiBleHAuZGVmYXVsdCA9PT0gZm4pIHtcbiAgICAgICAgICAgIHdrZXkgPSBrZXk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICghd2tleSkge1xuICAgICAgICB3a2V5ID0gTWF0aC5mbG9vcihNYXRoLnBvdygxNiwgOCkgKiBNYXRoLnJhbmRvbSgpKS50b1N0cmluZygxNik7XG4gICAgICAgIHZhciB3Y2FjaGUgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjYWNoZUtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gY2FjaGVLZXlzW2ldO1xuICAgICAgICAgICAgd2NhY2hlW2tleV0gPSBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgc291cmNlc1t3a2V5XSA9IFtcbiAgICAgICAgICAgICdmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsnICsgZm4gKyAnKHNlbGYpOyB9JyxcbiAgICAgICAgICAgIHdjYWNoZVxuICAgICAgICBdO1xuICAgIH1cbiAgICB2YXIgc2tleSA9IE1hdGguZmxvb3IoTWF0aC5wb3coMTYsIDgpICogTWF0aC5yYW5kb20oKSkudG9TdHJpbmcoMTYpO1xuXG4gICAgdmFyIHNjYWNoZSA9IHt9OyBzY2FjaGVbd2tleV0gPSB3a2V5O1xuICAgIHNvdXJjZXNbc2tleV0gPSBbXG4gICAgICAgICdmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXsnICtcbiAgICAgICAgICAgIC8vIHRyeSB0byBjYWxsIGRlZmF1bHQgaWYgZGVmaW5lZCB0byBhbHNvIHN1cHBvcnQgYmFiZWwgZXNtb2R1bGUgZXhwb3J0c1xuICAgICAgICAgICAgJ3ZhciBmID0gcmVxdWlyZSgnICsgc3RyaW5naWZ5KHdrZXkpICsgJyk7JyArXG4gICAgICAgICAgICAnKGYuZGVmYXVsdCA/IGYuZGVmYXVsdCA6IGYpKHNlbGYpOycgK1xuICAgICAgICAnfScsXG4gICAgICAgIHNjYWNoZVxuICAgIF07XG5cbiAgICB2YXIgd29ya2VyU291cmNlcyA9IHt9O1xuICAgIHJlc29sdmVTb3VyY2VzKHNrZXkpO1xuXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVNvdXJjZXMoa2V5KSB7XG4gICAgICAgIHdvcmtlclNvdXJjZXNba2V5XSA9IHRydWU7XG5cbiAgICAgICAgZm9yICh2YXIgZGVwUGF0aCBpbiBzb3VyY2VzW2tleV1bMV0pIHtcbiAgICAgICAgICAgIHZhciBkZXBLZXkgPSBzb3VyY2VzW2tleV1bMV1bZGVwUGF0aF07XG4gICAgICAgICAgICBpZiAoIXdvcmtlclNvdXJjZXNbZGVwS2V5XSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmVTb3VyY2VzKGRlcEtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc3JjID0gJygnICsgYnVuZGxlRm4gKyAnKSh7J1xuICAgICAgICArIE9iamVjdC5rZXlzKHdvcmtlclNvdXJjZXMpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gc3RyaW5naWZ5KGtleSkgKyAnOlsnXG4gICAgICAgICAgICAgICAgKyBzb3VyY2VzW2tleV1bMF1cbiAgICAgICAgICAgICAgICArICcsJyArIHN0cmluZ2lmeShzb3VyY2VzW2tleV1bMV0pICsgJ10nXG4gICAgICAgICAgICA7XG4gICAgICAgIH0pLmpvaW4oJywnKVxuICAgICAgICArICd9LHt9LFsnICsgc3RyaW5naWZ5KHNrZXkpICsgJ10pJ1xuICAgIDtcblxuICAgIHZhciBVUkwgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwgfHwgd2luZG93Lm1velVSTCB8fCB3aW5kb3cubXNVUkw7XG5cbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFtzcmNdLCB7IHR5cGU6ICd0ZXh0L2phdmFzY3JpcHQnIH0pO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMuYmFyZSkgeyByZXR1cm4gYmxvYjsgfVxuICAgIHZhciB3b3JrZXJVcmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKHdvcmtlclVybCk7XG4gICAgd29ya2VyLm9iamVjdFVSTCA9IHdvcmtlclVybDtcbiAgICByZXR1cm4gd29ya2VyO1xufTtcblxufSx7fV0sXCIvaW5kZXguanNcIjpbZnVuY3Rpb24oX2RlcmVxXyxtb2R1bGUsZXhwb3J0cyl7XG4ndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIF9zbGljZWRUb0FycmF5KGFyciwgaSkgeyByZXR1cm4gX2FycmF5V2l0aEhvbGVzKGFycikgfHwgX2l0ZXJhYmxlVG9BcnJheUxpbWl0KGFyciwgaSkgfHwgX3Vuc3VwcG9ydGVkSXRlcmFibGVUb0FycmF5KGFyciwgaSkgfHwgX25vbkl0ZXJhYmxlUmVzdCgpOyB9XG5cbmZ1bmN0aW9uIF9ub25JdGVyYWJsZVJlc3QoKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIGF0dGVtcHQgdG8gZGVzdHJ1Y3R1cmUgbm9uLWl0ZXJhYmxlIGluc3RhbmNlLlxcbkluIG9yZGVyIHRvIGJlIGl0ZXJhYmxlLCBub24tYXJyYXkgb2JqZWN0cyBtdXN0IGhhdmUgYSBbU3ltYm9sLml0ZXJhdG9yXSgpIG1ldGhvZC5cIik7IH1cblxuZnVuY3Rpb24gX3Vuc3VwcG9ydGVkSXRlcmFibGVUb0FycmF5KG8sIG1pbkxlbikgeyBpZiAoIW8pIHJldHVybjsgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSByZXR1cm4gX2FycmF5TGlrZVRvQXJyYXkobywgbWluTGVuKTsgdmFyIG4gPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykuc2xpY2UoOCwgLTEpOyBpZiAobiA9PT0gXCJPYmplY3RcIiAmJiBvLmNvbnN0cnVjdG9yKSBuID0gby5jb25zdHJ1Y3Rvci5uYW1lOyBpZiAobiA9PT0gXCJNYXBcIiB8fCBuID09PSBcIlNldFwiKSByZXR1cm4gQXJyYXkuZnJvbShvKTsgaWYgKG4gPT09IFwiQXJndW1lbnRzXCIgfHwgL14oPzpVaXxJKW50KD86OHwxNnwzMikoPzpDbGFtcGVkKT9BcnJheSQvLnRlc3QobikpIHJldHVybiBfYXJyYXlMaWtlVG9BcnJheShvLCBtaW5MZW4pOyB9XG5cbmZ1bmN0aW9uIF9hcnJheUxpa2VUb0FycmF5KGFyciwgbGVuKSB7IGlmIChsZW4gPT0gbnVsbCB8fCBsZW4gPiBhcnIubGVuZ3RoKSBsZW4gPSBhcnIubGVuZ3RoOyBmb3IgKHZhciBpID0gMCwgYXJyMiA9IG5ldyBBcnJheShsZW4pOyBpIDwgbGVuOyBpKyspIHsgYXJyMltpXSA9IGFycltpXTsgfSByZXR1cm4gYXJyMjsgfVxuXG5mdW5jdGlvbiBfaXRlcmFibGVUb0FycmF5TGltaXQoYXJyLCBpKSB7IGlmICh0eXBlb2YgU3ltYm9sID09PSBcInVuZGVmaW5lZFwiIHx8ICEoU3ltYm9sLml0ZXJhdG9yIGluIE9iamVjdChhcnIpKSkgcmV0dXJuOyB2YXIgX2FyciA9IFtdOyB2YXIgX24gPSB0cnVlOyB2YXIgX2QgPSBmYWxzZTsgdmFyIF9lID0gdW5kZWZpbmVkOyB0cnkgeyBmb3IgKHZhciBfaSA9IGFycltTeW1ib2wuaXRlcmF0b3JdKCksIF9zOyAhKF9uID0gKF9zID0gX2kubmV4dCgpKS5kb25lKTsgX24gPSB0cnVlKSB7IF9hcnIucHVzaChfcy52YWx1ZSk7IGlmIChpICYmIF9hcnIubGVuZ3RoID09PSBpKSBicmVhazsgfSB9IGNhdGNoIChlcnIpIHsgX2QgPSB0cnVlOyBfZSA9IGVycjsgfSBmaW5hbGx5IHsgdHJ5IHsgaWYgKCFfbiAmJiBfaVtcInJldHVyblwiXSAhPSBudWxsKSBfaVtcInJldHVyblwiXSgpOyB9IGZpbmFsbHkgeyBpZiAoX2QpIHRocm93IF9lOyB9IH0gcmV0dXJuIF9hcnI7IH1cblxuZnVuY3Rpb24gX2FycmF5V2l0aEhvbGVzKGFycikgeyBpZiAoQXJyYXkuaXNBcnJheShhcnIpKSByZXR1cm4gYXJyOyB9XG5cbnZhciBhc3NpZ24gPSBfZGVyZXFfKCdvYmplY3QtYXNzaWduJyk7XG5cbnZhciB3ZWJ3b3JraWZ5ID0gX2RlcmVxXygnd2Vid29ya2lmeScpO1xuXG52YXIgTWF0aExpYiA9IF9kZXJlcV8oJy4vbGliL21hdGhsaWInKTtcblxudmFyIFBvb2wgPSBfZGVyZXFfKCcuL2xpYi9wb29sJyk7XG5cbnZhciB1dGlscyA9IF9kZXJlcV8oJy4vbGliL3V0aWxzJyk7XG5cbnZhciB3b3JrZXIgPSBfZGVyZXFfKCcuL2xpYi93b3JrZXInKTtcblxudmFyIGNyZWF0ZVN0YWdlcyA9IF9kZXJlcV8oJy4vbGliL3N0ZXBwZXInKTtcblxudmFyIGNyZWF0ZVJlZ2lvbnMgPSBfZGVyZXFfKCcuL2xpYi90aWxlcicpOyAvLyBEZWR1cGxpY2F0ZSBwb29scyAmIGxpbWl0ZXJzIHdpdGggdGhlIHNhbWUgY29uZmlnc1xuLy8gd2hlbiB1c2VyIGNyZWF0ZXMgbXVsdGlwbGUgcGljYSBpbnN0YW5jZXMuXG5cblxudmFyIHNpbmdsZXRvbmVzID0ge307XG52YXIgTkVFRF9TQUZBUklfRklYID0gZmFsc2U7XG5cbnRyeSB7XG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IudXNlckFnZW50KSB7XG4gICAgTkVFRF9TQUZBUklfRklYID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdTYWZhcmknKSA+PSAwO1xuICB9XG59IGNhdGNoIChlKSB7fVxuXG52YXIgY29uY3VycmVuY3kgPSAxO1xuXG5pZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgY29uY3VycmVuY3kgPSBNYXRoLm1pbihuYXZpZ2F0b3IuaGFyZHdhcmVDb25jdXJyZW5jeSB8fCAxLCA0KTtcbn1cblxudmFyIERFRkFVTFRfUElDQV9PUFRTID0ge1xuICB0aWxlOiAxMDI0LFxuICBjb25jdXJyZW5jeTogY29uY3VycmVuY3ksXG4gIGZlYXR1cmVzOiBbJ2pzJywgJ3dhc20nLCAnd3cnXSxcbiAgaWRsZTogMjAwMCxcbiAgY3JlYXRlQ2FudmFzOiBmdW5jdGlvbiBjcmVhdGVDYW52YXMod2lkdGgsIGhlaWdodCkge1xuICAgIHZhciB0bXBDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0bXBDYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICB0bXBDYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIHJldHVybiB0bXBDYW52YXM7XG4gIH1cbn07XG52YXIgREVGQVVMVF9SRVNJWkVfT1BUUyA9IHtcbiAgcXVhbGl0eTogMyxcbiAgYWxwaGE6IGZhbHNlLFxuICB1bnNoYXJwQW1vdW50OiAwLFxuICB1bnNoYXJwUmFkaXVzOiAwLjAsXG4gIHVuc2hhcnBUaHJlc2hvbGQ6IDBcbn07XG52YXIgQ0FOX05FV19JTUFHRV9EQVRBO1xudmFyIENBTl9DUkVBVEVfSU1BR0VfQklUTUFQO1xuXG5mdW5jdGlvbiB3b3JrZXJGYWJyaWMoKSB7XG4gIHJldHVybiB7XG4gICAgdmFsdWU6IHdlYndvcmtpZnkod29ya2VyKSxcbiAgICBkZXN0cm95OiBmdW5jdGlvbiBkZXN0cm95KCkge1xuICAgICAgdGhpcy52YWx1ZS50ZXJtaW5hdGUoKTtcblxuICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciB1cmwgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwgfHwgd2luZG93Lm1velVSTCB8fCB3aW5kb3cubXNVUkw7XG5cbiAgICAgICAgaWYgKHVybCAmJiB1cmwucmV2b2tlT2JqZWN0VVJMICYmIHRoaXMudmFsdWUub2JqZWN0VVJMKSB7XG4gICAgICAgICAgdXJsLnJldm9rZU9iamVjdFVSTCh0aGlzLnZhbHVlLm9iamVjdFVSTCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG59IC8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBBUEkgbWV0aG9kc1xuXG5cbmZ1bmN0aW9uIFBpY2Eob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUGljYSkpIHJldHVybiBuZXcgUGljYShvcHRpb25zKTtcbiAgdGhpcy5vcHRpb25zID0gYXNzaWduKHt9LCBERUZBVUxUX1BJQ0FfT1BUUywgb3B0aW9ucyB8fCB7fSk7XG4gIHZhciBsaW1pdGVyX2tleSA9IFwibGtfXCIuY29uY2F0KHRoaXMub3B0aW9ucy5jb25jdXJyZW5jeSk7IC8vIFNoYXJlIGxpbWl0ZXJzIHRvIGF2b2lkIG11bHRpcGxlIHBhcmFsbGVsIHdvcmtlcnMgd2hlbiB1c2VyIGNyZWF0ZXNcbiAgLy8gbXVsdGlwbGUgcGljYSBpbnN0YW5jZXMuXG5cbiAgdGhpcy5fX2xpbWl0ID0gc2luZ2xldG9uZXNbbGltaXRlcl9rZXldIHx8IHV0aWxzLmxpbWl0ZXIodGhpcy5vcHRpb25zLmNvbmN1cnJlbmN5KTtcbiAgaWYgKCFzaW5nbGV0b25lc1tsaW1pdGVyX2tleV0pIHNpbmdsZXRvbmVzW2xpbWl0ZXJfa2V5XSA9IHRoaXMuX19saW1pdDsgLy8gTGlzdCBvZiBzdXBwb3J0ZWQgZmVhdHVyZXMsIGFjY29yZGluZyB0byBvcHRpb25zICYgYnJvd3Nlci9ub2RlLmpzXG5cbiAgdGhpcy5mZWF0dXJlcyA9IHtcbiAgICBqczogZmFsc2UsXG4gICAgLy8gcHVyZSBKUyBpbXBsZW1lbnRhdGlvbiwgY2FuIGJlIGRpc2FibGVkIGZvciB0ZXN0aW5nXG4gICAgd2FzbTogZmFsc2UsXG4gICAgLy8gd2ViYXNzZW1ibHkgaW1wbGVtZW50YXRpb24gZm9yIGhlYXZ5IGZ1bmN0aW9uc1xuICAgIGNpYjogZmFsc2UsXG4gICAgLy8gcmVzaXplIHZpYSBjcmVhdGVJbWFnZUJpdG1hcCAob25seSBGRiBhdCB0aGlzIG1vbWVudClcbiAgICB3dzogZmFsc2UgLy8gd2Vid29ya2Vyc1xuXG4gIH07XG4gIHRoaXMuX193b3JrZXJzUG9vbCA9IG51bGw7IC8vIFN0b3JlIHJlcXVlc3RlZCBmZWF0dXJlcyBmb3Igd2Vid29ya2Vyc1xuXG4gIHRoaXMuX19yZXF1ZXN0ZWRfZmVhdHVyZXMgPSBbXTtcbiAgdGhpcy5fX21hdGhsaWIgPSBudWxsO1xufVxuXG5QaWNhLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gIGlmICh0aGlzLl9faW5pdFByb21pc2UpIHJldHVybiB0aGlzLl9faW5pdFByb21pc2U7IC8vIFRlc3QgaWYgd2UgY2FuIGNyZWF0ZSBJbWFnZURhdGEgd2l0aG91dCBjYW52YXMgYW5kIG1lbW9yeSBjb3B5XG5cbiAgaWYgKENBTl9ORVdfSU1BR0VfREFUQSAhPT0gZmFsc2UgJiYgQ0FOX05FV19JTUFHRV9EQVRBICE9PSB0cnVlKSB7XG4gICAgQ0FOX05FV19JTUFHRV9EQVRBID0gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIEltYWdlRGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tbmV3ICovXG4gICAgICAgIG5ldyBJbWFnZURhdGEobmV3IFVpbnQ4Q2xhbXBlZEFycmF5KDQwMCksIDEwLCAxMCk7XG4gICAgICAgIENBTl9ORVdfSU1BR0VfREFUQSA9IHRydWU7XG4gICAgICB9IGNhdGNoIChfXykge31cbiAgICB9XG4gIH0gLy8gSW1hZ2VCaXRtYXAgY2FuIGJlIGVmZmVjdGl2ZSBpbiAyIHBsYWNlczpcbiAgLy9cbiAgLy8gMS4gVGhyZWFkZWQganBlZyB1bnBhY2sgKGJhc2ljKVxuICAvLyAyLiBCdWlsdC1pbiByZXNpemUgKGJsb2NrZWQgZHVlIHByb2JsZW0gaW4gY2hyb21lLCBzZWUgaXNzdWUgIzg5KVxuICAvL1xuICAvLyBGb3IgYmFzaWMgdXNlIHdlIGFsc28gbmVlZCBJbWFnZUJpdG1hcCB3byBzdXBwb3J0IC5jbG9zZSgpIG1ldGhvZCxcbiAgLy8gc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL3J1L2RvY3MvV2ViL0FQSS9JbWFnZUJpdG1hcFxuXG5cbiAgaWYgKENBTl9DUkVBVEVfSU1BR0VfQklUTUFQICE9PSBmYWxzZSAmJiBDQU5fQ1JFQVRFX0lNQUdFX0JJVE1BUCAhPT0gdHJ1ZSkge1xuICAgIENBTl9DUkVBVEVfSU1BR0VfQklUTUFQID0gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIEltYWdlQml0bWFwICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaWYgKEltYWdlQml0bWFwLnByb3RvdHlwZSAmJiBJbWFnZUJpdG1hcC5wcm90b3R5cGUuY2xvc2UpIHtcbiAgICAgICAgQ0FOX0NSRUFURV9JTUFHRV9CSVRNQVAgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kZWJ1ZygnSW1hZ2VCaXRtYXAgZG9lcyBub3Qgc3VwcG9ydCAuY2xvc2UoKSwgZGlzYWJsZWQnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2YXIgZmVhdHVyZXMgPSB0aGlzLm9wdGlvbnMuZmVhdHVyZXMuc2xpY2UoKTtcblxuICBpZiAoZmVhdHVyZXMuaW5kZXhPZignYWxsJykgPj0gMCkge1xuICAgIGZlYXR1cmVzID0gWydjaWInLCAnd2FzbScsICdqcycsICd3dyddO1xuICB9XG5cbiAgdGhpcy5fX3JlcXVlc3RlZF9mZWF0dXJlcyA9IGZlYXR1cmVzO1xuICB0aGlzLl9fbWF0aGxpYiA9IG5ldyBNYXRoTGliKGZlYXR1cmVzKTsgLy8gQ2hlY2sgV2ViV29ya2VyIHN1cHBvcnQgaWYgcmVxdWVzdGVkXG5cbiAgaWYgKGZlYXR1cmVzLmluZGV4T2YoJ3d3JykgPj0gMCkge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiAnV29ya2VyJyBpbiB3aW5kb3cpIHtcbiAgICAgIC8vIElFIDw9IDExIGRvbid0IGFsbG93IHRvIGNyZWF0ZSB3ZWJ3b3JrZXJzIGZyb20gc3RyaW5nLiBXZSBzaG91bGQgY2hlY2sgaXQuXG4gICAgICAvLyBodHRwczovL2Nvbm5lY3QubWljcm9zb2Z0LmNvbS9JRS9mZWVkYmFjay9kZXRhaWxzLzgwMTgxMC93ZWItd29ya2Vycy1mcm9tLWJsb2ItdXJscy1pbi1pZS0xMC1hbmQtMTFcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciB3a3IgPSBfZGVyZXFfKCd3ZWJ3b3JraWZ5JykoZnVuY3Rpb24gKCkge30pO1xuXG4gICAgICAgIHdrci50ZXJtaW5hdGUoKTtcbiAgICAgICAgdGhpcy5mZWF0dXJlcy53dyA9IHRydWU7IC8vIHBvb2wgdW5pcXVlbmVzcyBkZXBlbmRzIG9uIHBvb2wgY29uZmlnICsgd2Vid29ya2VyIGNvbmZpZ1xuXG4gICAgICAgIHZhciB3cG9vbF9rZXkgPSBcIndwX1wiLmNvbmNhdChKU09OLnN0cmluZ2lmeSh0aGlzLm9wdGlvbnMpKTtcblxuICAgICAgICBpZiAoc2luZ2xldG9uZXNbd3Bvb2xfa2V5XSkge1xuICAgICAgICAgIHRoaXMuX193b3JrZXJzUG9vbCA9IHNpbmdsZXRvbmVzW3dwb29sX2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5fX3dvcmtlcnNQb29sID0gbmV3IFBvb2wod29ya2VyRmFicmljLCB0aGlzLm9wdGlvbnMuaWRsZSk7XG4gICAgICAgICAgc2luZ2xldG9uZXNbd3Bvb2xfa2V5XSA9IHRoaXMuX193b3JrZXJzUG9vbDtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoX18pIHt9XG4gICAgfVxuICB9XG5cbiAgdmFyIGluaXRNYXRoID0gdGhpcy5fX21hdGhsaWIuaW5pdCgpLnRoZW4oZnVuY3Rpb24gKG1hdGhsaWIpIHtcbiAgICAvLyBDb3B5IGRldGVjdGVkIGZlYXR1cmVzXG4gICAgYXNzaWduKF90aGlzLmZlYXR1cmVzLCBtYXRobGliLmZlYXR1cmVzKTtcbiAgfSk7XG5cbiAgdmFyIGNoZWNrQ2liUmVzaXplO1xuXG4gIGlmICghQ0FOX0NSRUFURV9JTUFHRV9CSVRNQVApIHtcbiAgICBjaGVja0NpYlJlc2l6ZSA9IFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gIH0gZWxzZSB7XG4gICAgY2hlY2tDaWJSZXNpemUgPSB1dGlscy5jaWJfc3VwcG9ydCh0aGlzLm9wdGlvbnMuY3JlYXRlQ2FudmFzKS50aGVuKGZ1bmN0aW9uIChzdGF0dXMpIHtcbiAgICAgIGlmIChfdGhpcy5mZWF0dXJlcy5jaWIgJiYgZmVhdHVyZXMuaW5kZXhPZignY2liJykgPCAwKSB7XG4gICAgICAgIF90aGlzLmRlYnVnKCdjcmVhdGVJbWFnZUJpdG1hcCgpIHJlc2l6ZSBzdXBwb3J0ZWQsIGJ1dCBkaXNhYmxlZCBieSBjb25maWcnKTtcblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChmZWF0dXJlcy5pbmRleE9mKCdjaWInKSA+PSAwKSBfdGhpcy5mZWF0dXJlcy5jaWIgPSBzdGF0dXM7XG4gICAgfSk7XG4gIH0gLy8gSW5pdCBtYXRoIGxpYi4gVGhhdCdzIGFzeW5jIGJlY2F1c2UgY2FuIGxvYWQgc29tZVxuXG5cbiAgdGhpcy5fX2luaXRQcm9taXNlID0gUHJvbWlzZS5hbGwoW2luaXRNYXRoLCBjaGVja0NpYlJlc2l6ZV0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBfdGhpcztcbiAgfSk7XG4gIHJldHVybiB0aGlzLl9faW5pdFByb21pc2U7XG59O1xuXG5QaWNhLnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbiAoZnJvbSwgdG8sIG9wdGlvbnMpIHtcbiAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgdGhpcy5kZWJ1ZygnU3RhcnQgcmVzaXplLi4uJyk7XG4gIHZhciBvcHRzID0gYXNzaWduKHt9LCBERUZBVUxUX1JFU0laRV9PUFRTKTtcblxuICBpZiAoIWlzTmFOKG9wdGlvbnMpKSB7XG4gICAgb3B0cyA9IGFzc2lnbihvcHRzLCB7XG4gICAgICBxdWFsaXR5OiBvcHRpb25zXG4gICAgfSk7XG4gIH0gZWxzZSBpZiAob3B0aW9ucykge1xuICAgIG9wdHMgPSBhc3NpZ24ob3B0cywgb3B0aW9ucyk7XG4gIH1cblxuICBvcHRzLnRvV2lkdGggPSB0by53aWR0aDtcbiAgb3B0cy50b0hlaWdodCA9IHRvLmhlaWdodDtcbiAgb3B0cy53aWR0aCA9IGZyb20ubmF0dXJhbFdpZHRoIHx8IGZyb20ud2lkdGg7XG4gIG9wdHMuaGVpZ2h0ID0gZnJvbS5uYXR1cmFsSGVpZ2h0IHx8IGZyb20uaGVpZ2h0OyAvLyBQcmV2ZW50IHN0ZXBwZXIgZnJvbSBpbmZpbml0ZSBsb29wXG5cbiAgaWYgKHRvLndpZHRoID09PSAwIHx8IHRvLmhlaWdodCA9PT0gMCkge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoXCJJbnZhbGlkIG91dHB1dCBzaXplOiBcIi5jb25jYXQodG8ud2lkdGgsIFwieFwiKS5jb25jYXQodG8uaGVpZ2h0KSkpO1xuICB9XG5cbiAgaWYgKG9wdHMudW5zaGFycFJhZGl1cyA+IDIpIG9wdHMudW5zaGFycFJhZGl1cyA9IDI7XG4gIHZhciBjYW5jZWxlZCA9IGZhbHNlO1xuICB2YXIgY2FuY2VsVG9rZW4gPSBudWxsO1xuXG4gIGlmIChvcHRzLmNhbmNlbFRva2VuKSB7XG4gICAgLy8gV3JhcCBjYW5jZWxUb2tlbiB0byBhdm9pZCBzdWNjZXNzaXZlIHJlc29sdmUgJiBzZXQgZmxhZ1xuICAgIGNhbmNlbFRva2VuID0gb3B0cy5jYW5jZWxUb2tlbi50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICBjYW5jZWxlZCA9IHRydWU7XG4gICAgICB0aHJvdyBkYXRhO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIGNhbmNlbGVkID0gdHJ1ZTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9KTtcbiAgfVxuXG4gIHZhciBERVNUX1RJTEVfQk9SREVSID0gMzsgLy8gTWF4IHBvc3NpYmxlIGZpbHRlciB3aW5kb3cgc2l6ZVxuXG4gIHZhciBkZXN0VGlsZUJvcmRlciA9IE1hdGguY2VpbChNYXRoLm1heChERVNUX1RJTEVfQk9SREVSLCAyLjUgKiBvcHRzLnVuc2hhcnBSYWRpdXMgfCAwKSk7XG4gIHJldHVybiB0aGlzLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoY2FuY2VsZWQpIHJldHVybiBjYW5jZWxUb2tlbjsgLy8gaWYgY3JlYXRlSW1hZ2VCaXRtYXAgc3VwcG9ydHMgcmVzaXplLCBqdXN0IGRvIGl0IGFuZCByZXR1cm5cblxuICAgIGlmIChfdGhpczIuZmVhdHVyZXMuY2liKSB7XG4gICAgICB2YXIgdG9DdHggPSB0by5nZXRDb250ZXh0KCcyZCcsIHtcbiAgICAgICAgYWxwaGE6IEJvb2xlYW4ob3B0cy5hbHBoYSlcbiAgICAgIH0pO1xuXG4gICAgICBfdGhpczIuZGVidWcoJ1Jlc2l6ZSB2aWEgY3JlYXRlSW1hZ2VCaXRtYXAoKScpO1xuXG4gICAgICByZXR1cm4gY3JlYXRlSW1hZ2VCaXRtYXAoZnJvbSwge1xuICAgICAgICByZXNpemVXaWR0aDogb3B0cy50b1dpZHRoLFxuICAgICAgICByZXNpemVIZWlnaHQ6IG9wdHMudG9IZWlnaHQsXG4gICAgICAgIHJlc2l6ZVF1YWxpdHk6IHV0aWxzLmNpYl9xdWFsaXR5X25hbWUob3B0cy5xdWFsaXR5KVxuICAgICAgfSkudGhlbihmdW5jdGlvbiAoaW1hZ2VCaXRtYXApIHtcbiAgICAgICAgaWYgKGNhbmNlbGVkKSByZXR1cm4gY2FuY2VsVG9rZW47IC8vIGlmIG5vIHVuc2hhcnAgLSBkcmF3IGRpcmVjdGx5IHRvIG91dHB1dCBjYW52YXNcblxuICAgICAgICBpZiAoIW9wdHMudW5zaGFycEFtb3VudCkge1xuICAgICAgICAgIHRvQ3R4LmRyYXdJbWFnZShpbWFnZUJpdG1hcCwgMCwgMCk7XG4gICAgICAgICAgaW1hZ2VCaXRtYXAuY2xvc2UoKTtcbiAgICAgICAgICB0b0N0eCA9IG51bGw7XG5cbiAgICAgICAgICBfdGhpczIuZGVidWcoJ0ZpbmlzaGVkIScpO1xuXG4gICAgICAgICAgcmV0dXJuIHRvO1xuICAgICAgICB9XG5cbiAgICAgICAgX3RoaXMyLmRlYnVnKCdVbnNoYXJwIHJlc3VsdCcpO1xuXG4gICAgICAgIHZhciB0bXBDYW52YXMgPSBfdGhpczIub3B0aW9ucy5jcmVhdGVDYW52YXMob3B0cy50b1dpZHRoLCBvcHRzLnRvSGVpZ2h0KTtcblxuICAgICAgICB2YXIgdG1wQ3R4ID0gdG1wQ2FudmFzLmdldENvbnRleHQoJzJkJywge1xuICAgICAgICAgIGFscGhhOiBCb29sZWFuKG9wdHMuYWxwaGEpXG4gICAgICAgIH0pO1xuICAgICAgICB0bXBDdHguZHJhd0ltYWdlKGltYWdlQml0bWFwLCAwLCAwKTtcbiAgICAgICAgaW1hZ2VCaXRtYXAuY2xvc2UoKTtcbiAgICAgICAgdmFyIGlEYXRhID0gdG1wQ3R4LmdldEltYWdlRGF0YSgwLCAwLCBvcHRzLnRvV2lkdGgsIG9wdHMudG9IZWlnaHQpO1xuXG4gICAgICAgIF90aGlzMi5fX21hdGhsaWIudW5zaGFycF9tYXNrKGlEYXRhLmRhdGEsIG9wdHMudG9XaWR0aCwgb3B0cy50b0hlaWdodCwgb3B0cy51bnNoYXJwQW1vdW50LCBvcHRzLnVuc2hhcnBSYWRpdXMsIG9wdHMudW5zaGFycFRocmVzaG9sZCk7XG5cbiAgICAgICAgdG9DdHgucHV0SW1hZ2VEYXRhKGlEYXRhLCAwLCAwKTtcbiAgICAgICAgaURhdGEgPSB0bXBDdHggPSB0bXBDYW52YXMgPSB0b0N0eCA9IG51bGw7XG5cbiAgICAgICAgX3RoaXMyLmRlYnVnKCdGaW5pc2hlZCEnKTtcblxuICAgICAgICByZXR1cm4gdG87XG4gICAgICB9KTtcbiAgICB9IC8vXG4gICAgLy8gTm8gZWFzeSB3YXksIGxldCdzIHJlc2l6ZSBtYW51YWxseSB2aWEgYXJyYXlzXG4gICAgLy9cbiAgICAvLyBTaGFyZSBjYWNoZSBiZXR3ZWVuIGNhbGxzOlxuICAgIC8vXG4gICAgLy8gLSB3YXNtIGluc3RhbmNlXG4gICAgLy8gLSB3YXNtIG1lbW9yeSBvYmplY3RcbiAgICAvL1xuXG5cbiAgICB2YXIgY2FjaGUgPSB7fTsgLy8gQ2FsbCByZXNpemVyIGluIHdlYndvcmtlciBvciBsb2NhbGx5LCBkZXBlbmRpbmcgb24gY29uZmlnXG5cbiAgICB2YXIgaW52b2tlUmVzaXplID0gZnVuY3Rpb24gaW52b2tlUmVzaXplKG9wdHMpIHtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFfdGhpczIuZmVhdHVyZXMud3cpIHJldHVybiBfdGhpczIuX19tYXRobGliLnJlc2l6ZUFuZFVuc2hhcnAob3B0cywgY2FjaGUpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIHZhciB3ID0gX3RoaXMyLl9fd29ya2Vyc1Bvb2wuYWNxdWlyZSgpO1xuXG4gICAgICAgICAgaWYgKGNhbmNlbFRva2VuKSBjYW5jZWxUb2tlbltcImNhdGNoXCJdKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHcudmFsdWUub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB3LnJlbGVhc2UoKTtcbiAgICAgICAgICAgIGlmIChldi5kYXRhLmVycikgcmVqZWN0KGV2LmRhdGEuZXJyKTtlbHNlIHJlc29sdmUoZXYuZGF0YS5yZXN1bHQpO1xuICAgICAgICAgIH07XG5cbiAgICAgICAgICB3LnZhbHVlLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIG9wdHM6IG9wdHMsXG4gICAgICAgICAgICBmZWF0dXJlczogX3RoaXMyLl9fcmVxdWVzdGVkX2ZlYXR1cmVzLFxuICAgICAgICAgICAgcHJlbG9hZDoge1xuICAgICAgICAgICAgICB3YXNtX25vZHVsZTogX3RoaXMyLl9fbWF0aGxpYi5fX1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIFtvcHRzLnNyYy5idWZmZXJdKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHRpbGVBbmRSZXNpemUgPSBmdW5jdGlvbiB0aWxlQW5kUmVzaXplKGZyb20sIHRvLCBvcHRzKSB7XG4gICAgICB2YXIgc3JjQ3R4O1xuICAgICAgdmFyIHNyY0ltYWdlQml0bWFwO1xuICAgICAgdmFyIGlzSW1hZ2VCaXRtYXBSZXVzZWQgPSBmYWxzZTtcbiAgICAgIHZhciB0b0N0eDtcblxuICAgICAgdmFyIHByb2Nlc3NUaWxlID0gZnVuY3Rpb24gcHJvY2Vzc1RpbGUodGlsZSkge1xuICAgICAgICByZXR1cm4gX3RoaXMyLl9fbGltaXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGlmIChjYW5jZWxlZCkgcmV0dXJuIGNhbmNlbFRva2VuO1xuICAgICAgICAgIHZhciBzcmNJbWFnZURhdGE7IC8vIEV4dHJhY3QgdGlsZSBSR0JBIGJ1ZmZlciwgZGVwZW5kaW5nIG9uIGlucHV0IHR5cGVcblxuICAgICAgICAgIGlmICh1dGlscy5pc0NhbnZhcyhmcm9tKSkge1xuICAgICAgICAgICAgX3RoaXMyLmRlYnVnKCdHZXQgdGlsZSBwaXhlbCBkYXRhJyk7IC8vIElmIGlucHV0IGlzIENhbnZhcyAtIGV4dHJhY3QgcmVnaW9uIGRhdGEgZGlyZWN0bHlcblxuXG4gICAgICAgICAgICBzcmNJbWFnZURhdGEgPSBzcmNDdHguZ2V0SW1hZ2VEYXRhKHRpbGUueCwgdGlsZS55LCB0aWxlLndpZHRoLCB0aWxlLmhlaWdodCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIElmIGlucHV0IGlzIEltYWdlIG9yIGRlY29kZWQgdG8gSW1hZ2VCaXRtYXAsXG4gICAgICAgICAgICAvLyBkcmF3IHJlZ2lvbiB0byB0ZW1wb3JhcnkgY2FudmFzIGFuZCBleHRyYWN0IGRhdGEgZnJvbSBpdFxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIE5vdGUhIEF0dGVtcHQgdG8gcmV1c2UgdGhpcyBjYW52YXMgY2F1c2VzIHNpZ25pZmljYW50IHNsb3dkb3duIGluIGNocm9tZVxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIF90aGlzMi5kZWJ1ZygnRHJhdyB0aWxlIGltYWdlQml0bWFwL2ltYWdlIHRvIHRlbXBvcmFyeSBjYW52YXMnKTtcblxuICAgICAgICAgICAgdmFyIHRtcENhbnZhcyA9IF90aGlzMi5vcHRpb25zLmNyZWF0ZUNhbnZhcyh0aWxlLndpZHRoLCB0aWxlLmhlaWdodCk7XG5cbiAgICAgICAgICAgIHZhciB0bXBDdHggPSB0bXBDYW52YXMuZ2V0Q29udGV4dCgnMmQnLCB7XG4gICAgICAgICAgICAgIGFscGhhOiBCb29sZWFuKG9wdHMuYWxwaGEpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRtcEN0eC5nbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gPSAnY29weSc7XG4gICAgICAgICAgICB0bXBDdHguZHJhd0ltYWdlKHNyY0ltYWdlQml0bWFwIHx8IGZyb20sIHRpbGUueCwgdGlsZS55LCB0aWxlLndpZHRoLCB0aWxlLmhlaWdodCwgMCwgMCwgdGlsZS53aWR0aCwgdGlsZS5oZWlnaHQpO1xuXG4gICAgICAgICAgICBfdGhpczIuZGVidWcoJ0dldCB0aWxlIHBpeGVsIGRhdGEnKTtcblxuICAgICAgICAgICAgc3JjSW1hZ2VEYXRhID0gdG1wQ3R4LmdldEltYWdlRGF0YSgwLCAwLCB0aWxlLndpZHRoLCB0aWxlLmhlaWdodCk7XG4gICAgICAgICAgICB0bXBDdHggPSB0bXBDYW52YXMgPSBudWxsO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBvID0ge1xuICAgICAgICAgICAgc3JjOiBzcmNJbWFnZURhdGEuZGF0YSxcbiAgICAgICAgICAgIHdpZHRoOiB0aWxlLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0OiB0aWxlLmhlaWdodCxcbiAgICAgICAgICAgIHRvV2lkdGg6IHRpbGUudG9XaWR0aCxcbiAgICAgICAgICAgIHRvSGVpZ2h0OiB0aWxlLnRvSGVpZ2h0LFxuICAgICAgICAgICAgc2NhbGVYOiB0aWxlLnNjYWxlWCxcbiAgICAgICAgICAgIHNjYWxlWTogdGlsZS5zY2FsZVksXG4gICAgICAgICAgICBvZmZzZXRYOiB0aWxlLm9mZnNldFgsXG4gICAgICAgICAgICBvZmZzZXRZOiB0aWxlLm9mZnNldFksXG4gICAgICAgICAgICBxdWFsaXR5OiBvcHRzLnF1YWxpdHksXG4gICAgICAgICAgICBhbHBoYTogb3B0cy5hbHBoYSxcbiAgICAgICAgICAgIHVuc2hhcnBBbW91bnQ6IG9wdHMudW5zaGFycEFtb3VudCxcbiAgICAgICAgICAgIHVuc2hhcnBSYWRpdXM6IG9wdHMudW5zaGFycFJhZGl1cyxcbiAgICAgICAgICAgIHVuc2hhcnBUaHJlc2hvbGQ6IG9wdHMudW5zaGFycFRocmVzaG9sZFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBfdGhpczIuZGVidWcoJ0ludm9rZSByZXNpemUgbWF0aCcpO1xuXG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGludm9rZVJlc2l6ZShvKTtcbiAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChjYW5jZWxlZCkgcmV0dXJuIGNhbmNlbFRva2VuO1xuICAgICAgICAgICAgc3JjSW1hZ2VEYXRhID0gbnVsbDtcbiAgICAgICAgICAgIHZhciB0b0ltYWdlRGF0YTtcblxuICAgICAgICAgICAgX3RoaXMyLmRlYnVnKCdDb252ZXJ0IHJhdyByZ2JhIHRpbGUgcmVzdWx0IHRvIEltYWdlRGF0YScpO1xuXG4gICAgICAgICAgICBpZiAoQ0FOX05FV19JTUFHRV9EQVRBKSB7XG4gICAgICAgICAgICAgIC8vIHRoaXMgYnJhbmNoIGlzIGZvciBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgICAgICAgLy8gSWYgYG5ldyBJbWFnZURhdGEoKWAgJiBVaW50OENsYW1wZWRBcnJheSBzdXBvcnRlZFxuICAgICAgICAgICAgICB0b0ltYWdlRGF0YSA9IG5ldyBJbWFnZURhdGEobmV3IFVpbnQ4Q2xhbXBlZEFycmF5KHJlc3VsdCksIHRpbGUudG9XaWR0aCwgdGlsZS50b0hlaWdodCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBmYWxsYmFjayBmb3IgYG5vZGUtY2FudmFzYCBhbmQgb2xkIGJyb3dzZXJzXG4gICAgICAgICAgICAgIC8vIChJRTExIGhhcyBJbWFnZURhdGEgYnV0IGRvZXMgbm90IHN1cHBvcnQgYG5ldyBJbWFnZURhdGEoKWApXG4gICAgICAgICAgICAgIHRvSW1hZ2VEYXRhID0gdG9DdHguY3JlYXRlSW1hZ2VEYXRhKHRpbGUudG9XaWR0aCwgdGlsZS50b0hlaWdodCk7XG5cbiAgICAgICAgICAgICAgaWYgKHRvSW1hZ2VEYXRhLmRhdGEuc2V0KSB7XG4gICAgICAgICAgICAgICAgdG9JbWFnZURhdGEuZGF0YS5zZXQocmVzdWx0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJRTkgZG9uJ3QgaGF2ZSBgLnNldCgpYFxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSB0b0ltYWdlRGF0YS5kYXRhLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICAgICAgICB0b0ltYWdlRGF0YS5kYXRhW2ldID0gcmVzdWx0W2ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBfdGhpczIuZGVidWcoJ0RyYXcgdGlsZScpO1xuXG4gICAgICAgICAgICBpZiAoTkVFRF9TQUZBUklfRklYKSB7XG4gICAgICAgICAgICAgIC8vIFNhZmFyaSBkcmF3cyB0aGluIHdoaXRlIHN0cmlwZXMgYmV0d2VlbiB0aWxlcyB3aXRob3V0IHRoaXMgZml4XG4gICAgICAgICAgICAgIHRvQ3R4LnB1dEltYWdlRGF0YSh0b0ltYWdlRGF0YSwgdGlsZS50b1gsIHRpbGUudG9ZLCB0aWxlLnRvSW5uZXJYIC0gdGlsZS50b1gsIHRpbGUudG9Jbm5lclkgLSB0aWxlLnRvWSwgdGlsZS50b0lubmVyV2lkdGggKyAxZS01LCB0aWxlLnRvSW5uZXJIZWlnaHQgKyAxZS01KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRvQ3R4LnB1dEltYWdlRGF0YSh0b0ltYWdlRGF0YSwgdGlsZS50b1gsIHRpbGUudG9ZLCB0aWxlLnRvSW5uZXJYIC0gdGlsZS50b1gsIHRpbGUudG9Jbm5lclkgLSB0aWxlLnRvWSwgdGlsZS50b0lubmVyV2lkdGgsIHRpbGUudG9Jbm5lckhlaWdodCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH07IC8vIE5lZWQgdG8gbm9ybWFsaXplIGRhdGEgc291cmNlIGZpcnN0LiBJdCBjYW4gYmUgY2FudmFzIG9yIGltYWdlLlxuICAgICAgLy8gSWYgaW1hZ2UgLSB0cnkgdG8gZGVjb2RlIGluIGJhY2tncm91bmQgaWYgcG9zc2libGVcblxuXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRvQ3R4ID0gdG8uZ2V0Q29udGV4dCgnMmQnLCB7XG4gICAgICAgICAgYWxwaGE6IEJvb2xlYW4ob3B0cy5hbHBoYSlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHV0aWxzLmlzQ2FudmFzKGZyb20pKSB7XG4gICAgICAgICAgc3JjQ3R4ID0gZnJvbS5nZXRDb250ZXh0KCcyZCcsIHtcbiAgICAgICAgICAgIGFscGhhOiBCb29sZWFuKG9wdHMuYWxwaGEpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXRpbHMuaXNJbWFnZUJpdG1hcChmcm9tKSkge1xuICAgICAgICAgIHNyY0ltYWdlQml0bWFwID0gZnJvbTtcbiAgICAgICAgICBpc0ltYWdlQml0bWFwUmV1c2VkID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc0ltYWdlKGZyb20pKSB7XG4gICAgICAgICAgLy8gdHJ5IGRvIGRlY29kZSBpbWFnZSBpbiBiYWNrZ3JvdW5kIGZvciBmYXN0ZXIgbmV4dCBvcGVyYXRpb25zXG4gICAgICAgICAgaWYgKCFDQU5fQ1JFQVRFX0lNQUdFX0JJVE1BUCkgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgICBfdGhpczIuZGVidWcoJ0RlY29kZSBpbWFnZSB2aWEgY3JlYXRlSW1hZ2VCaXRtYXAnKTtcblxuICAgICAgICAgIHJldHVybiBjcmVhdGVJbWFnZUJpdG1hcChmcm9tKS50aGVuKGZ1bmN0aW9uIChpbWFnZUJpdG1hcCkge1xuICAgICAgICAgICAgc3JjSW1hZ2VCaXRtYXAgPSBpbWFnZUJpdG1hcDtcbiAgICAgICAgICB9KSAvLyBTdXBwcmVzcyBlcnJvciB0byB1c2UgZmFsbGJhY2ssIGlmIG1ldGhvZCBmYWlsc1xuICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlY2EvcGljYS9pc3N1ZXMvMTkwXG5cbiAgICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xuICAgICAgICAgIFtcImNhdGNoXCJdKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUGljYTogXCIuZnJvbVwiIHNob3VsZCBiZSBJbWFnZSwgQ2FudmFzIG9yIEltYWdlQml0bWFwJyk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGNhbmNlbGVkKSByZXR1cm4gY2FuY2VsVG9rZW47XG5cbiAgICAgICAgX3RoaXMyLmRlYnVnKCdDYWxjdWxhdGUgdGlsZXMnKTsgLy9cbiAgICAgICAgLy8gSGVyZSB3ZSBhcmUgd2l0aCBcIm5vcm1hbGl6ZWRcIiBzb3VyY2UsXG4gICAgICAgIC8vIGZvbGxvdyB0byB0aWxpbmdcbiAgICAgICAgLy9cblxuXG4gICAgICAgIHZhciByZWdpb25zID0gY3JlYXRlUmVnaW9ucyh7XG4gICAgICAgICAgd2lkdGg6IG9wdHMud2lkdGgsXG4gICAgICAgICAgaGVpZ2h0OiBvcHRzLmhlaWdodCxcbiAgICAgICAgICBzcmNUaWxlU2l6ZTogX3RoaXMyLm9wdGlvbnMudGlsZSxcbiAgICAgICAgICB0b1dpZHRoOiBvcHRzLnRvV2lkdGgsXG4gICAgICAgICAgdG9IZWlnaHQ6IG9wdHMudG9IZWlnaHQsXG4gICAgICAgICAgZGVzdFRpbGVCb3JkZXI6IGRlc3RUaWxlQm9yZGVyXG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgam9icyA9IHJlZ2lvbnMubWFwKGZ1bmN0aW9uICh0aWxlKSB7XG4gICAgICAgICAgcmV0dXJuIHByb2Nlc3NUaWxlKHRpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiBjbGVhbnVwKCkge1xuICAgICAgICAgIGlmIChzcmNJbWFnZUJpdG1hcCkge1xuICAgICAgICAgICAgaWYgKCFpc0ltYWdlQml0bWFwUmV1c2VkKSBzcmNJbWFnZUJpdG1hcC5jbG9zZSgpO1xuICAgICAgICAgICAgc3JjSW1hZ2VCaXRtYXAgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIF90aGlzMi5kZWJ1ZygnUHJvY2VzcyB0aWxlcycpO1xuXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChqb2JzKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBfdGhpczIuZGVidWcoJ0ZpbmlzaGVkIScpO1xuXG4gICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgIHJldHVybiB0bztcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBwcm9jZXNzU3RhZ2VzID0gZnVuY3Rpb24gcHJvY2Vzc1N0YWdlcyhzdGFnZXMsIGZyb20sIHRvLCBvcHRzKSB7XG4gICAgICBpZiAoY2FuY2VsZWQpIHJldHVybiBjYW5jZWxUb2tlbjtcblxuICAgICAgdmFyIF9zdGFnZXMkc2hpZnQgPSBzdGFnZXMuc2hpZnQoKSxcbiAgICAgICAgICBfc3RhZ2VzJHNoaWZ0MiA9IF9zbGljZWRUb0FycmF5KF9zdGFnZXMkc2hpZnQsIDIpLFxuICAgICAgICAgIHRvV2lkdGggPSBfc3RhZ2VzJHNoaWZ0MlswXSxcbiAgICAgICAgICB0b0hlaWdodCA9IF9zdGFnZXMkc2hpZnQyWzFdO1xuXG4gICAgICB2YXIgaXNMYXN0U3RhZ2UgPSBzdGFnZXMubGVuZ3RoID09PSAwO1xuICAgICAgb3B0cyA9IGFzc2lnbih7fSwgb3B0cywge1xuICAgICAgICB0b1dpZHRoOiB0b1dpZHRoLFxuICAgICAgICB0b0hlaWdodDogdG9IZWlnaHQsXG4gICAgICAgIC8vIG9ubHkgdXNlIHVzZXItZGVmaW5lZCBxdWFsaXR5IGZvciB0aGUgbGFzdCBzdGFnZSxcbiAgICAgICAgLy8gdXNlIHNpbXBsZXIgKEhhbW1pbmcpIGZpbHRlciBmb3IgdGhlIGZpcnN0IHN0YWdlcyB3aGVyZVxuICAgICAgICAvLyBzY2FsZSBmYWN0b3IgaXMgbGFyZ2UgZW5vdWdoIChtb3JlIHRoYW4gMi0zKVxuICAgICAgICBxdWFsaXR5OiBpc0xhc3RTdGFnZSA/IG9wdHMucXVhbGl0eSA6IE1hdGgubWluKDEsIG9wdHMucXVhbGl0eSlcbiAgICAgIH0pO1xuICAgICAgdmFyIHRtcENhbnZhcztcblxuICAgICAgaWYgKCFpc0xhc3RTdGFnZSkge1xuICAgICAgICAvLyBjcmVhdGUgdGVtcG9yYXJ5IGNhbnZhc1xuICAgICAgICB0bXBDYW52YXMgPSBfdGhpczIub3B0aW9ucy5jcmVhdGVDYW52YXModG9XaWR0aCwgdG9IZWlnaHQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlsZUFuZFJlc2l6ZShmcm9tLCBpc0xhc3RTdGFnZSA/IHRvIDogdG1wQ2FudmFzLCBvcHRzKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGlzTGFzdFN0YWdlKSByZXR1cm4gdG87XG4gICAgICAgIG9wdHMud2lkdGggPSB0b1dpZHRoO1xuICAgICAgICBvcHRzLmhlaWdodCA9IHRvSGVpZ2h0O1xuICAgICAgICByZXR1cm4gcHJvY2Vzc1N0YWdlcyhzdGFnZXMsIHRtcENhbnZhcywgdG8sIG9wdHMpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBzdGFnZXMgPSBjcmVhdGVTdGFnZXMob3B0cy53aWR0aCwgb3B0cy5oZWlnaHQsIG9wdHMudG9XaWR0aCwgb3B0cy50b0hlaWdodCwgX3RoaXMyLm9wdGlvbnMudGlsZSwgZGVzdFRpbGVCb3JkZXIpO1xuICAgIHJldHVybiBwcm9jZXNzU3RhZ2VzKHN0YWdlcywgZnJvbSwgdG8sIG9wdHMpO1xuICB9KTtcbn07IC8vIFJHQkEgYnVmZmVyIHJlc2l6ZVxuLy9cblxuXG5QaWNhLnByb3RvdHlwZS5yZXNpemVCdWZmZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgX3RoaXMzID0gdGhpcztcblxuICB2YXIgb3B0cyA9IGFzc2lnbih7fSwgREVGQVVMVF9SRVNJWkVfT1BUUywgb3B0aW9ucyk7XG4gIHJldHVybiB0aGlzLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX3RoaXMzLl9fbWF0aGxpYi5yZXNpemVBbmRVbnNoYXJwKG9wdHMpO1xuICB9KTtcbn07XG5cblBpY2EucHJvdG90eXBlLnRvQmxvYiA9IGZ1bmN0aW9uIChjYW52YXMsIG1pbWVUeXBlLCBxdWFsaXR5KSB7XG4gIG1pbWVUeXBlID0gbWltZVR5cGUgfHwgJ2ltYWdlL3BuZyc7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgIGlmIChjYW52YXMudG9CbG9iKSB7XG4gICAgICBjYW52YXMudG9CbG9iKGZ1bmN0aW9uIChibG9iKSB7XG4gICAgICAgIHJldHVybiByZXNvbHZlKGJsb2IpO1xuICAgICAgfSwgbWltZVR5cGUsIHF1YWxpdHkpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChjYW52YXMuY29udmVydFRvQmxvYikge1xuICAgICAgcmVzb2x2ZShjYW52YXMuY29udmVydFRvQmxvYih7XG4gICAgICAgIHR5cGU6IG1pbWVUeXBlLFxuICAgICAgICBxdWFsaXR5OiBxdWFsaXR5XG4gICAgICB9KSk7XG4gICAgICByZXR1cm47XG4gICAgfSAvLyBGYWxsYmFjayBmb3Igb2xkIGJyb3dzZXJzXG5cblxuICAgIHZhciBhc1N0cmluZyA9IGF0b2IoY2FudmFzLnRvRGF0YVVSTChtaW1lVHlwZSwgcXVhbGl0eSkuc3BsaXQoJywnKVsxXSk7XG4gICAgdmFyIGxlbiA9IGFzU3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgYXNCdWZmZXIgPSBuZXcgVWludDhBcnJheShsZW4pO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXNCdWZmZXJbaV0gPSBhc1N0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgIH1cblxuICAgIHJlc29sdmUobmV3IEJsb2IoW2FzQnVmZmVyXSwge1xuICAgICAgdHlwZTogbWltZVR5cGVcbiAgICB9KSk7XG4gIH0pO1xufTtcblxuUGljYS5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiAoKSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBQaWNhO1xuXG59LHtcIi4vbGliL21hdGhsaWJcIjoxLFwiLi9saWIvcG9vbFwiOjksXCIuL2xpYi9zdGVwcGVyXCI6MTAsXCIuL2xpYi90aWxlclwiOjExLFwiLi9saWIvdXRpbHNcIjoxMixcIi4vbGliL3dvcmtlclwiOjEzLFwib2JqZWN0LWFzc2lnblwiOjI0LFwid2Vid29ya2lmeVwiOjI1fV19LHt9LFtdKShcIi9pbmRleC5qc1wiKVxufSk7XG4iLCAiZXhwb3J0IGVudW0gU1RBR0VTIHtcbiAgQ0hPT1NFX0ZSQU1FUyxcbiAgUFJFVklFV19PVVRQVVQsXG4gIFJFU1BPTlNJVkVfUFJFVklFVyxcbiAgU0FWRV9PVVRQVVQsXG59XG5cbmV4cG9ydCBlbnVtIE1TR19FVkVOVFMge1xuICBGT1VORF9GUkFNRVMsXG4gIE5PX0ZSQU1FUyxcbiAgUkVOREVSLFxuICBDTE9TRSxcbiAgRVJST1IsXG4gIFVQREFURV9IRUFETElORVMsXG4gIENPTVBSRVNTX0lNQUdFLFxuICBHRVRfUk9PVF9GUkFNRVMsXG59XG5cbmV4cG9ydCBlbnVtIE9VVFBVVF9GT1JNQVRTIHtcbiAgSU5MSU5FLFxuICBJRlJBTUUsXG59XG5cbmV4cG9ydCBjb25zdCBVSV9URVhUID0ge1xuICBFUlJPUl9VTkVYUEVDVEVEOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIixcbiAgRVJST1JfTUlTU0lOR19GUkFNRVM6IFwiTm8gZnJhbWVzIGZvdW5kLiBQbGVhc2UgYWRkIHNvbWUgZnJhbWVzIHRvIHRoZSBwYWdlLlwiLFxuICBXQVJOX05PX1RBUkdFVFM6IFwiU3RhbmRhcmQgZnJhbWVzIG5vdCBmb3VuZC4gUGxlYXNlIHNlbGVjdCB0YXJnZXQgZnJhbWVzLlwiLFxuICBXQVJOX1RPT19NQU5ZX1RBUkdFVFM6IFwiUGxlYXNlIHNlbGVjdCB0aHJlZSB0YXJnZXQgZnJhbWVzXCIsXG4gIElORk9fUFJFVklFVzogXCJQcmV2aWV3IGVhY2ggZnJhbWUgb3V0cHV0XCIsXG4gIFRJVExFX0NIT09TRV9GUkFNRTogXCJDaG9vc2Ugd2hpY2ggZnJhbWVzIHRvIGV4cG9ydFwiLFxuICBUSVRMRV9QUkVWSUVXOiBcIlByZXZpZXdcIixcbiAgVElUTEVfUkVTUE9OU0lWRV9QUkVWSUVXOiBcIlJlc3BvbnNpdmUgcHJldmlld1wiLFxuICBUSUxFX09VVFBVVDogXCJFeHBvcnRcIixcbiAgQlVUVE9OX05FWFQ6IFwiTmV4dFwiLFxuICBCVVRUT05fRE9XTkxPQUQ6IFwiRG93bmxvYWRcIixcbiAgQlVUVE9OX1BSRVZJT1VTOiBcIkJhY2tcIixcbn07XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1VJX1NJWkUgPSB7XG4gIHdpZHRoOiA0ODAsXG4gIGhlaWdodDogNTAwLFxuICBtYXhXaWR0aDogMTIwMCxcbiAgbWF4SGVpZ2h0OiA5MDAsXG4gIG1pbldpZHRoOiA0MjAsXG4gIG1pbkhlaWdodDogNDgwLFxufTtcblxuZXhwb3J0IGNvbnN0IEZSQU1FX1dBUk5JTkdfU0laRSA9IDMwMDtcblxuZXhwb3J0IGVudW0gSEVBRExJTkVfTk9ERV9OQU1FUyB7XG4gIEhFQURMSU5FID0gXCJoZWFkbGluZVwiLFxuICBTVUJIRUFEID0gXCJzdWJoZWFkXCIsXG4gIFNPVVJDRSA9IFwic291cmNlXCIsXG59XG4iLCAiaW1wb3J0IHsgTVNHX0VWRU5UUyB9IGZyb20gXCIuLi9jb25zdGFudHNcIjtcblxuaW50ZXJmYWNlIElQb3N0bWFuTWVzc2FnZSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdWlkOiBzdHJpbmc7XG4gIHdvcmtsb2FkOiBNU0dfRVZFTlRTO1xuICBkYXRhOiBhbnk7XG4gIHJldHVybmluZz86IGJvb2xlYW47XG4gIGVycj86IHN0cmluZztcbn1cblxuY2xhc3MgUG9zdG1hbiB7XG4gIHByaXZhdGUgbmFtZTogc3RyaW5nO1xuICBwcml2YXRlIGluRmlnbWFTYW5kYm94OiBib29sZWFuO1xuICBwcml2YXRlIGNhbGxiYWNrU3RvcmU6IHsgW2lkOiBzdHJpbmddOiBGdW5jdGlvbiB9O1xuICBwcml2YXRlIHdvcmtlcnM6IHsgW2lkOiBzdHJpbmddOiBGdW5jdGlvbiB9O1xuXG4gIHByaXZhdGUgVElNRU9VVCA9IDMwMDAwO1xuXG4gIGNvbnN0cnVjdG9yKHByb3BzPzogeyBtZXNzYWdlTmFtZT86IHN0cmluZzsgc2NvcGU6IG51bGwgfSkge1xuICAgIHRoaXMubmFtZSA9IHByb3BzPy5tZXNzYWdlTmFtZSB8fCBcIlBPU1RNQU5cIjtcbiAgICB0aGlzLmluRmlnbWFTYW5kYm94ID0gdHlwZW9mIGZpZ21hID09PSBcIm9iamVjdFwiO1xuICAgIHRoaXMuY2FsbGJhY2tTdG9yZSA9IHt9O1xuICAgIHRoaXMud29ya2VycyA9IHt9O1xuXG4gICAgLy8gQWRkIG1lc3NhZ2UgZXZlbnQgbGlzdGVuZXJcbiAgICB0aGlzLmluRmlnbWFTYW5kYm94XG4gICAgICA/IGZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCB0aGlzLnJlY2VpdmUpXG4gICAgICA6IHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCB0aGlzLnJlY2VpdmUpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNlaXZlID0gYXN5bmMgKGV2ZW50OiBNZXNzYWdlRXZlbnQ8SVBvc3RtYW5NZXNzYWdlPikgPT4ge1xuICAgIGNvbnN0IG1zZ0JvZHkgPSB0aGlzLmluRmlnbWFTYW5kYm94ID8gZXZlbnQgOiBldmVudD8uZGF0YT8ucGx1Z2luTWVzc2FnZTtcbiAgICBjb25zdCB7IGRhdGEsIHdvcmtsb2FkLCBuYW1lLCB1aWQsIHJldHVybmluZywgZXJyIH0gPSBtc2dCb2R5IHx8IHt9O1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIERvIG5vdGhpbmcgaWQgcG9zdCBtZXNzYWdlIGlzbid0IGZvciB1c1xuICAgICAgaWYgKHRoaXMubmFtZSAhPT0gbmFtZSkgcmV0dXJuO1xuXG4gICAgICBpZiAocmV0dXJuaW5nICYmICF0aGlzLmNhbGxiYWNrU3RvcmVbdWlkXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgY2FsbGJhY2s6ICR7dWlkfWApO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXJldHVybmluZyAmJiAhdGhpcy53b3JrZXJzW3dvcmtsb2FkXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIHdvcmtsb2FkIHJlZ2lzdGVyZWQ6ICR7d29ya2xvYWR9YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXR1cm5pbmcpIHtcbiAgICAgICAgdGhpcy5jYWxsYmFja1N0b3JlW3VpZF0oZGF0YSwgZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHdvcmtsb2FkUmVzdWx0ID0gYXdhaXQgdGhpcy53b3JrZXJzW3dvcmtsb2FkXShkYXRhKTtcbiAgICAgICAgdGhpcy5wb3N0QmFjayh7IGRhdGE6IHdvcmtsb2FkUmVzdWx0LCB1aWQgfSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICB0aGlzLnBvc3RCYWNrKHsgdWlkLCBlcnI6IFwiUG9zdG1hbiBmYWlsZWRcIiB9KTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJQb3N0bWFuIGZhaWxlZFwiLCBlcnIpO1xuICAgIH1cbiAgfTtcblxuICBwdWJsaWMgcmVnaXN0ZXJXb3JrZXIgPSAoZXZlbnRUeXBlOiBNU0dfRVZFTlRTLCBmbjogRnVuY3Rpb24pID0+IHtcbiAgICB0aGlzLndvcmtlcnNbZXZlbnRUeXBlXSA9IGZuO1xuICB9O1xuXG4gIHByaXZhdGUgcG9zdEJhY2sgPSAocHJvcHM6IHsgdWlkOiBzdHJpbmc7IGRhdGE/OiBhbnk7IGVycj86IHN0cmluZyB9KSA9PlxuICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgdWlkOiBwcm9wcy51aWQsXG4gICAgICBkYXRhOiBwcm9wcy5kYXRhLFxuICAgICAgcmV0dXJuaW5nOiB0cnVlLFxuICAgICAgZXJyOiBwcm9wcy5lcnIsXG4gICAgfSk7XG5cbiAgcHJpdmF0ZSBwb3N0TWVzc2FnZSA9IChtZXNzYWdlQm9keSkgPT5cbiAgICB0aGlzLmluRmlnbWFTYW5kYm94XG4gICAgICA/IGZpZ21hLnVpLnBvc3RNZXNzYWdlKG1lc3NhZ2VCb2R5KVxuICAgICAgOiBwYXJlbnQucG9zdE1lc3NhZ2UoeyBwbHVnaW5NZXNzYWdlOiBtZXNzYWdlQm9keSB9LCBcIipcIik7XG5cbiAgcHVibGljIHNlbmQgPSAocHJvcHM6IHsgd29ya2xvYWQ6IE1TR19FVkVOVFM7IGRhdGE/OiBhbnkgfSk6IFByb21pc2U8YW55PiA9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHsgd29ya2xvYWQsIGRhdGEgfSA9IHByb3BzO1xuXG4gICAgICBjb25zdCByYW5kb21JZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cig1KTtcblxuICAgICAgdGhpcy5wb3N0TWVzc2FnZSh7XG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgdWlkOiByYW5kb21JZCxcbiAgICAgICAgd29ya2xvYWQsXG4gICAgICAgIGRhdGEsXG4gICAgICB9IGFzIElQb3N0bWFuTWVzc2FnZSk7XG5cbiAgICAgIHRoaXMuY2FsbGJhY2tTdG9yZVtyYW5kb21JZF0gPSAocmVzdWx0OiBhbnksIGVycj86IHN0cmluZykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJUaW1lZCBvdXRcIikpLCB0aGlzLlRJTUVPVVQpO1xuICAgIH0pO1xuICB9O1xufVxuXG5leHBvcnQgY29uc3QgcG9zdE1hbiA9IG5ldyBQb3N0bWFuKCk7XG4iLCAiaW1wb3J0IHsgdGV4dERhdGEsIHNldEhlYWRsaW5lc0FuZFNvdXJjZVByb3BzLCBJRnJhbWVEYXRhIH0gZnJvbSBcInR5cGVzXCI7XG5pbXBvcnQgeyBIRUFETElORV9OT0RFX05BTUVTLCBNU0dfRVZFTlRTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBwb3N0TWFuIH0gZnJvbSBcInV0aWxzL21lc3NhZ2VzXCI7XG5pbXBvcnQgVVBORyBmcm9tIFwidXBuZy1qc1wiO1xuaW1wb3J0IFBpY2EgZnJvbSBcInBpY2FcIjtcblxuY29uc3QgSlBFR19NQUdJQ19CWVRFUyA9IFtcbiAgWzB4ZmYsIDB4ZDgsIDB4ZmYsIDB4ZGJdLFxuICBbMHhmZiwgMHhkOCwgMHhmZiwgMHhlZV0sXG4gIFsweGZmLCAweGQ4LCAweGZmLCAweGUxXSxcbiAgWzB4ZmYsIDB4ZDgsIDB4ZmYsIDB4ZTAsIDB4MDAsIDB4MTAsIDB4NGEsIDB4NDYsIDB4NDksIDB4NDYsIDB4MDAsIDB4MDFdLFxuXTtcbmNvbnN0IFBOR19NQUdJQ19CWVRFUyA9IFsweDg5LCAweDUwLCAweDRlLCAweDQ3LCAweDBkLCAweDBhLCAweDFhLCAweDBhXTtcbmNvbnN0IEdJRl9NQUdJQ19CWVRFUyA9IFtcbiAgWzB4NDcsIDB4NDksIDB4NDYsIDB4MzgsIDB4MzcsIDB4NjFdLFxuICBbMHg0NywgMHg0OSwgMHg0NiwgMHgzOCwgMHgzOSwgMHg2MV0sXG5dO1xuZW51bSBJTUFHRV9GT1JNQVRTIHtcbiAgUE5HLFxuICBKUEVHLFxuICBHSUYsXG4gIFVOS05PV04sXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpZGVudGlmeUltYWdlRm9ybWF0KGltYWdlRGF0YTogVWludDhBcnJheSk6IElNQUdFX0ZPUk1BVFMge1xuICBjb25zdCBpc1BuZyA9IFBOR19NQUdJQ19CWVRFUy5ldmVyeSgodmFsLCBpKSA9PiB2YWwgPT09IGltYWdlRGF0YVtpXSk7XG4gIGlmIChpc1BuZykge1xuICAgIHJldHVybiBJTUFHRV9GT1JNQVRTLlBORztcbiAgfVxuXG4gIGNvbnN0IGlzSnBlZyA9IEpQRUdfTUFHSUNfQllURVMuc29tZSgoYnl0ZXMpID0+XG4gICAgYnl0ZXMuZXZlcnkoKHZhbCwgaSkgPT4gdmFsID09PSBpbWFnZURhdGFbaV0pXG4gICk7XG4gIGlmIChpc0pwZWcpIHtcbiAgICByZXR1cm4gSU1BR0VfRk9STUFUUy5KUEVHO1xuICB9XG5cbiAgY29uc3QgaXNHaWYgPSBHSUZfTUFHSUNfQllURVMuc29tZSgoYnl0ZXMpID0+XG4gICAgYnl0ZXMuZXZlcnkoKHZhbCwgaSkgPT4gdmFsID09PSBpbWFnZURhdGFbaV0pXG4gICk7XG4gIGlmIChpc0dpZikge1xuICAgIHJldHVybiBJTUFHRV9GT1JNQVRTLkdJRjtcbiAgfVxuXG4gIHJldHVybiBJTUFHRV9GT1JNQVRTLlVOS05PV047XG59XG5cbmludGVyZmFjZSBJcmVzaXplSW1hZ2Uge1xuICBpbWc6IEhUTUxJbWFnZUVsZW1lbnQ7XG4gIGltZ0RhdGE6IFVpbnQ4QXJyYXk7XG4gIG5vZGVEaW1lbnNpb25zOiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH1bXTtcbiAgcmVzb2x2ZTogKGRhdGE6IFVpbnQ4QXJyYXkpID0+IHZvaWQ7XG4gIHJlamVjdDogKGU6IEVycm9yKSA9PiB2b2lkO1xufVxuXG4vLyBVaW50OEFycmF5XG5cbmFzeW5jIGZ1bmN0aW9uIHJlc2l6ZUltYWdlKHByb3BzOiBJcmVzaXplSW1hZ2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyBpbWcsIGltZ0RhdGEsIG5vZGVEaW1lbnNpb25zLCByZXNvbHZlLCByZWplY3QgfSA9IHByb3BzO1xuICAvLyBTY2FsZSB0byBsYXJnZXN0IGRpbWVuc2lvblxuICBjb25zdCBhc3BlY3RSYXRpbyA9IGltZy53aWR0aCAvIGltZy5oZWlnaHQ7XG5cbiAgLy8gV09SSyBPVVQgTUFYIE5PREUgU0laRVxuICBsZXQgd2lkdGggPSAyMDA7XG4gIGxldCBoZWlnaHQgPSAyMDA7XG5cbiAgaWYgKGFzcGVjdFJhdGlvIDwgMSkge1xuICAgIC8vIDIwMHgzMDAgcG9ydHJhaXQgID0gMi8zID0gMC42NlxuICAgIGNvbnN0IG1heEFzcGVjdEhlaWdodCA9IE1hdGgubWF4KFxuICAgICAgLi4ubm9kZURpbWVuc2lvbnMuZmxhdE1hcCgoZCkgPT4gZC53aWR0aCAvIGFzcGVjdFJhdGlvKVxuICAgICk7XG4gICAgY29uc3QgbWF4Tm9kZUhlaWdodCA9IE1hdGgubWF4KC4uLm5vZGVEaW1lbnNpb25zLmZsYXRNYXAoKGQpID0+IGQuaGVpZ2h0KSk7XG5cbiAgICBoZWlnaHQgPSBNYXRoLm1heChtYXhOb2RlSGVpZ2h0LCBtYXhBc3BlY3RIZWlnaHQpO1xuICAgIHdpZHRoID0gaGVpZ2h0ICogYXNwZWN0UmF0aW87XG5cbiAgICAvLyB3aWR0aCA9IE1hdGgubWF4KC4uLm5vZGVEaW1lbnNpb25zLmZsYXRNYXAoKGQpID0+IGQud2lkdGgpKTtcbiAgICAvLyBoZWlnaHQgPSB3aWR0aCAvIGFzcGVjdFJhdGlvO1xuICB9IGVsc2Uge1xuICAgIC8vIDMwMHgyMDAgcG9ydHJhaXQgID0gMy8yID0gMS41XG4gICAgLy8gTGFuZHNjYXBlIG9yIHNxdWFyZVxuICAgIGNvbnN0IG1heEFzcGVjdFdpZHRoID0gTWF0aC5tYXgoXG4gICAgICAuLi5ub2RlRGltZW5zaW9ucy5mbGF0TWFwKChkKSA9PiBkLmhlaWdodCAqIGFzcGVjdFJhdGlvKVxuICAgICk7XG4gICAgY29uc3QgbWF4Tm9kZVdpZHRoID0gTWF0aC5tYXgoLi4ubm9kZURpbWVuc2lvbnMuZmxhdE1hcCgoZCkgPT4gZC53aWR0aCkpO1xuXG4gICAgd2lkdGggPSBNYXRoLm1heChtYXhOb2RlV2lkdGgsIG1heEFzcGVjdFdpZHRoKTtcbiAgICBoZWlnaHQgPSB3aWR0aCAvIGFzcGVjdFJhdGlvO1xuICB9XG5cbiAgbGV0IHRhcmdldFdpZHRoID0gMDtcbiAgbGV0IHRhcmdldEhlaWdodCA9IDA7XG5cbiAgLy8gRG9uJ3Qgc2NhbGUgaW1hZ2UgdXAgaWYgbm9kZSBpcyBsYXJnZXIgdGhhbiBpbWFnZVxuICBpZiAod2lkdGggPiBpbWcud2lkdGggfHwgaGVpZ2h0ID4gaW1nLmhlaWdodCkge1xuICAgIHRhcmdldFdpZHRoID0gaW1nLndpZHRoO1xuICAgIHRhcmdldEhlaWdodCA9IGltZy5oZWlnaHQ7XG4gIH0gZWxzZSB7XG4gICAgdGFyZ2V0V2lkdGggPSBNYXRoLnJvdW5kKHdpZHRoKTtcbiAgICB0YXJnZXRIZWlnaHQgPSBNYXRoLnJvdW5kKGhlaWdodCk7XG4gIH1cblxuICBjb25zdCBjYW52YXMgPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKHRhcmdldFdpZHRoLCB0YXJnZXRIZWlnaHQpO1xuICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG4gIGlmICghY3R4KSB7XG4gICAgcmVqZWN0KG5ldyBFcnJvcihcIlVuYWJsZSB0byBnZXQgMmQgY29udGV4dFwiKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRW5hYmxlIGhpZ2gtcXVhbGl0eSBzY2FsaW5nXG4gIGN0eC5pbWFnZVNtb290aGluZ1F1YWxpdHkgPSBcImhpZ2hcIjtcblxuICAvLyBVc2UgaW1hZ2UgcmVzaXppbmcgbGlicmFyeSB0byBjcmVhdGUgYSBzaGFycGVyIGRvd25zY2FsZWQgaW1hZ2VcbiAgY29uc3QgcGljYSA9IG5ldyBQaWNhKCk7XG4gIGF3YWl0IHBpY2EucmVzaXplKGltZywgKGNhbnZhcyBhcyB1bmtub3duKSBhcyBIVE1MQ2FudmFzRWxlbWVudCwge1xuICAgIHVuc2hhcnBBbW91bnQ6IDUwLFxuICAgIGFscGhhOiB0cnVlLFxuICB9KTtcblxuICAvLyBPcmlnaW5hbCBpbWFnZSBmb3JtYXRcbiAgY29uc3QgaW1hZ2VGb3JtYXQgPSBpZGVudGlmeUltYWdlRm9ybWF0KGltZ0RhdGEpO1xuXG4gIGlmIChpbWFnZUZvcm1hdCA9PT0gSU1BR0VfRk9STUFUUy5QTkcgfHwgaW1hZ2VGb3JtYXQgPT09IElNQUdFX0ZPUk1BVFMuR0lGKSB7XG4gICAgLy8gUmVzaXplICYgY29udmVydCB0byBibG9iXG4gICAgY29uc3QgZGF0YSA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGFyZ2V0V2lkdGgsIHRhcmdldEhlaWdodCkuZGF0YTtcblxuICAgIGNvbnN0IHRpbnlQbmcgPSBVUE5HLmVuY29kZShbZGF0YS5idWZmZXJdLCB0YXJnZXRXaWR0aCwgdGFyZ2V0SGVpZ2h0LCA2NCk7XG4gICAgcmVzb2x2ZShuZXcgVWludDhBcnJheSh0aW55UG5nKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKFxuICAgIGltYWdlRm9ybWF0ID09PSBJTUFHRV9GT1JNQVRTLkpQRUcgfHxcbiAgICBpbWFnZUZvcm1hdCA9PT0gSU1BR0VfRk9STUFUUy5VTktOT1dOXG4gICkge1xuICAgIGNvbnN0IGJsb2IgPSBhd2FpdCBjYW52YXMuY29udmVydFRvQmxvYih7XG4gICAgICB0eXBlOiBcImltYWdlL2pwZWdcIixcbiAgICAgIHF1YWxpdHk6IDAuODUsXG4gICAgfSk7XG4gICAgY29uc3QgYnVmZiA9IGF3YWl0IGJsb2IuYXJyYXlCdWZmZXIoKTtcbiAgICByZXNvbHZlKG5ldyBVaW50OEFycmF5KGJ1ZmYpKTtcbiAgICByZXR1cm47XG4gIH1cbn1cblxuLy8gQ29udGV4dDogVUlcbmV4cG9ydCBmdW5jdGlvbiBjb21wcmVzc0ltYWdlKHByb3BzOiB7XG4gIGltZ0RhdGE6IFVpbnQ4QXJyYXk7XG4gIG5vZGVEaW1lbnNpb25zOiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH1bXTtcbn0pOiBQcm9taXNlPFVpbnQ4QXJyYXk+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICBjb25zdCB7IGltZ0RhdGEsIG5vZGVEaW1lbnNpb25zIH0gPSBwcm9wcztcblxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCAoKSA9PiB7XG4gICAgICByZXNpemVJbWFnZSh7XG4gICAgICAgIGltZyxcbiAgICAgICAgaW1nRGF0YSxcbiAgICAgICAgbm9kZURpbWVuc2lvbnMsXG4gICAgICAgIHJlc29sdmUsXG4gICAgICAgIHJlamVjdCxcbiAgICAgIH0pLmNhdGNoKChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICB9KTtcblxuICAgIGltZy5hZGRFdmVudExpc3RlbmVyKFwiZXJyb3JcIiwgKGVycikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGxvYWRpbmcgY29tcHJlc3NlZCBpbWFnZVwiKTtcbiAgICAgIHJlamVjdChlcnIpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtpbWdEYXRhXSwgeyB0eXBlOiBcImltYWdlL3BuZ1wiIH0pO1xuICAgIGNvbnN0IGltZ1VybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgaW1nLnNyYyA9IGltZ1VybDtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHN1cHBvcnRzRmlsbHMoXG4gIG5vZGU6IFNjZW5lTm9kZVxuKTogbm9kZSBpcyBFeGNsdWRlPFNjZW5lTm9kZSwgU2xpY2VOb2RlIHwgR3JvdXBOb2RlPiB7XG4gIHJldHVybiBub2RlLnR5cGUgIT09IFwiU0xJQ0VcIiAmJiBub2RlLnR5cGUgIT09IFwiR1JPVVBcIjtcbn1cblxuLyoqXG4gKiBSZW5kZXIgYWxsIHNwZWNpZmllZCBmcmFtZXMgb3V0IGFzIFNWRyBlbGVtZW50LlxuICogSW1hZ2VzIGFyZSBvcHRpbWlzZWQgZm9yIHNpemUgYW5kIGltYWdlIHR5cGUgY29tcHJlc3Npb24gdmlhIHRoZSBmcm9udGVuZCBVSVxuICpcbiAqIEBjb250ZXh0IGZpZ21hXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXJGcmFtZXMoZnJhbWVJZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gIGNvbnN0IG91dHB1dE5vZGUgPSBmaWdtYS5jcmVhdGVGcmFtZSgpO1xuICBvdXRwdXROb2RlLm5hbWUgPSBcIm91dHB1dFwiO1xuXG4gIHRyeSB7XG4gICAgLy8gQ2xvbmUgZWFjaCBzZWxlY3RlZCBmcmFtZSBhZGRpbmcgdGhlbSB0byB0aGUgdGVtcG9yYXJ5IGNvbnRhaW5lciBmcmFtZVxuICAgIGNvbnN0IGZyYW1lcyA9IGZpZ21hLmN1cnJlbnRQYWdlLmNoaWxkcmVuLmZpbHRlcigoeyBpZCB9KSA9PlxuICAgICAgZnJhbWVJZHMuaW5jbHVkZXMoaWQpXG4gICAgKTtcblxuICAgIC8vIENhbGN1bGF0ZSB0aGUgbWF4IGRpbWVuc2lvbnMgZm9yIG91dHB1dCBjb250YWluZXIgZnJhbWVcbiAgICBjb25zdCBtYXhXaWR0aCA9IE1hdGgubWF4KC4uLmZyYW1lcy5tYXAoKGYpID0+IGYud2lkdGgpKTtcbiAgICBjb25zdCBtYXhIZWlnaHQgPSBNYXRoLm1heCguLi5mcmFtZXMubWFwKChmKSA9PiBmLmhlaWdodCkpO1xuICAgIG91dHB1dE5vZGUucmVzaXplV2l0aG91dENvbnN0cmFpbnRzKG1heFdpZHRoLCBtYXhIZWlnaHQpO1xuXG4gICAgZm9yIChjb25zdCBmcmFtZSBvZiBmcmFtZXMpIHtcbiAgICAgIGNvbnN0IGNsb25lID0gZnJhbWU/LmNsb25lKCkgYXMgRnJhbWVOb2RlO1xuXG4gICAgICAvLyBGaW5kIGFuZCByZW1vdmUgYWxsIHRleHQgbm9kZXNcbiAgICAgIGNsb25lLmZpbmRBbGwoKG4pID0+IG4udHlwZSA9PT0gXCJURVhUXCIpLmZvckVhY2goKG4pID0+IG4ucmVtb3ZlKCkpO1xuXG4gICAgICAvLyBBcHBlbmQgY2xvbmVkIGZyYW1lIHRvIHRlbXAgb3V0cHV0IGZyYW1lIGFuZCBwb3NpdGlvbiBpbiB0b3AgbGVmdFxuICAgICAgb3V0cHV0Tm9kZS5hcHBlbmRDaGlsZChjbG9uZSk7XG4gICAgICBjbG9uZS54ID0gMDtcbiAgICAgIGNsb25lLnkgPSAwO1xuXG4gICAgICAvLyBTdG9yZSB0aGUgZnJhbWUgSUQgYXMgbm9kZSBuYW1lIChleHBvcnRlZCBpbiBTVkcgcHJvcHMpXG4gICAgICBjbG9uZS5uYW1lID0gZnJhbWUuaWQ7XG4gICAgfVxuXG4gICAgLy8gRmluZCBhbGwgbm9kZXMgd2l0aCBpbWFnZSBmaWxsc1xuICAgIGNvbnN0IG5vZGVzV2l0aEltYWdlcyA9IG91dHB1dE5vZGUuZmluZEFsbChcbiAgICAgIChub2RlKSA9PlxuICAgICAgICBzdXBwb3J0c0ZpbGxzKG5vZGUpICYmXG4gICAgICAgIG5vZGUuZmlsbHMgIT09IGZpZ21hLm1peGVkICYmXG4gICAgICAgIG5vZGUuZmlsbHMuc29tZSgoZmlsbCkgPT4gZmlsbC50eXBlID09PSBcIklNQUdFXCIpXG4gICAgKTtcblxuICAgIC8vIEEgc2luZ2xlIGltYWdlIGNhbiBiZSB1c2VkIG11bHRpcGxlIHRpbWVzIG9uIGRpZmZlcmVudCBub2RlcyBpbiBkaWZmZXJlbnRcbiAgICAvLyBmcmFtZXMuIFRvIGVuc3VyZSBpbWFnZXMgYXJlIG9ubHkgb3B0aW1pc2VkIG9uY2UgYSBjYWNoZSBpcyBjcmVhdGVkXG4gICAgLy8gb2YgdW5pcXVlIGltYWdlcyBhbmQgdXNlZCB0byByZXBsYWNlIG9yaWdpbmFsIGFmdGVyIHRoZSBhc3luYyBwcm9jZXNzaW5nXG4gICAgLy8gaXMgY29tcGxldGVkLlxuICAgIGNvbnN0IGltYWdlQ2FjaGU6IHtcbiAgICAgIFtpZDogc3RyaW5nXTogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlcjsgaWQ6IHN0cmluZyB9W107XG4gICAgfSA9IHt9O1xuXG4gICAgZm9yIChjb25zdCBub2RlIG9mIG5vZGVzV2l0aEltYWdlcykge1xuICAgICAgaWYgKHN1cHBvcnRzRmlsbHMobm9kZSkgJiYgbm9kZS5maWxscyAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgLy8gVGhlIGZyb250ZW5kIFVJIHdoaWNoIGhhbmRsZXMgdGhlIGltYWdlIG9wdGltaXNhdGlvbiBuZWVkcyB0byBrbm93XG4gICAgICAgIC8vIHRoZSBzaXplcyBvZiBlYWNoIG5vZGUgdGhhdCB1c2VzIHRoZSBpbWFnZS4gVGhlIGRpbWVuc2lvbnMgYXJlIHN0b3JlZFxuICAgICAgICAvLyB3aXRoIHRoZSBpbWFnZSBoYXNoIElEIGluIHRoZSBjYWNoZSBmb3IgbGF0ZXIgdXNlLlxuICAgICAgICBjb25zdCBkaW1lbnNpb25zID0ge1xuICAgICAgICAgIHdpZHRoOiBub2RlLndpZHRoLFxuICAgICAgICAgIGhlaWdodDogbm9kZS5oZWlnaHQsXG4gICAgICAgICAgaWQ6IG5vZGUuaWQsXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGltZ1BhaW50ID0gWy4uLm5vZGUuZmlsbHNdLmZpbmQoKHApID0+IHAudHlwZSA9PT0gXCJJTUFHRVwiKTtcblxuICAgICAgICBpZiAoaW1nUGFpbnQ/LnR5cGUgPT09IFwiSU1BR0VcIiAmJiBpbWdQYWludC5pbWFnZUhhc2gpIHtcbiAgICAgICAgICAvLyBBZGQgdGhlIGltYWdlIGRpbWVuc2lvbnMgdG8gdGhlIGNhY2hlLCBvciB1cGRhdGUgYW5kIGV4aXN0aW5nIGNhY2hlXG4gICAgICAgICAgLy8gaXRlbSB3aXRoIGFub3RoZXIgbm9kZXMgZGltZW5zaW9uc1xuICAgICAgICAgIGlmIChpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0pIHtcbiAgICAgICAgICAgIGltYWdlQ2FjaGVbaW1nUGFpbnQuaW1hZ2VIYXNoXS5wdXNoKGRpbWVuc2lvbnMpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbWFnZUNhY2hlW2ltZ1BhaW50LmltYWdlSGFzaF0gPSBbZGltZW5zaW9uc107XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gU2VuZCBlYWNoIGltYWdlIGZyb20gdGhlIGltYWdlQ2FjaGUgdG8gdGhlIGZyb250ZW5kIGZvciBvcHRpbWlzYXRpb24uXG4gICAgLy8gVGhlIG9wZXJhdGlvbiBpcyBhc3luYyBhbmQgY2FuIHRha2Ugc29tZSB0aW1lIGlmIHRoZSBpbWFnZXMgYXJlIGxhcmdlLlxuICAgIGZvciAoY29uc3QgaW1hZ2VIYXNoIGluIGltYWdlQ2FjaGUpIHtcbiAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgZmlnbWEuZ2V0SW1hZ2VCeUhhc2goaW1hZ2VIYXNoKS5nZXRCeXRlc0FzeW5jKCk7XG4gICAgICBjb25zdCBjb21wcmVzc2VkSW1hZ2U6IFVpbnQ4QXJyYXkgPSBhd2FpdCBwb3N0TWFuLnNlbmQoe1xuICAgICAgICB3b3JrbG9hZDogTVNHX0VWRU5UUy5DT01QUkVTU19JTUFHRSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGltZ0RhdGE6IGJ5dGVzLFxuICAgICAgICAgIG5vZGVEaW1lbnNpb25zOiBpbWFnZUNhY2hlW2ltYWdlSGFzaF0sXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgLy8gU3RvcmUgdGhlIG5ldyBpbWFnZSBpbiBmaWdtYSBhbmQgZ2V0IHRoZSBuZXcgaW1hZ2UgaGFzaFxuICAgICAgY29uc3QgbmV3SW1hZ2VIYXNoID0gZmlnbWEuY3JlYXRlSW1hZ2UoY29tcHJlc3NlZEltYWdlKS5oYXNoO1xuXG4gICAgICAvLyBVcGRhdGUgbm9kZXMgd2lsbCBuZXcgaW1hZ2UgcGFpbnQgZmlsbFxuICAgICAgbm9kZXNXaXRoSW1hZ2VzLmZvckVhY2goKG5vZGUpID0+IHtcbiAgICAgICAgaWYgKHN1cHBvcnRzRmlsbHMobm9kZSkgJiYgbm9kZS5maWxscyAhPT0gZmlnbWEubWl4ZWQpIHtcbiAgICAgICAgICBjb25zdCBpbWdQYWludCA9IFsuLi5ub2RlLmZpbGxzXS5maW5kKFxuICAgICAgICAgICAgKHApID0+IHAudHlwZSA9PT0gXCJJTUFHRVwiICYmIHAuaW1hZ2VIYXNoID09PSBpbWFnZUhhc2hcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgaWYgKGltZ1BhaW50KSB7XG4gICAgICAgICAgICBjb25zdCBuZXdQYWludCA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaW1nUGFpbnQpKTtcbiAgICAgICAgICAgIG5ld1BhaW50LmltYWdlSGFzaCA9IG5ld0ltYWdlSGFzaDtcbiAgICAgICAgICAgIG5vZGUuZmlsbHMgPSBbbmV3UGFpbnRdO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSEFDSyEgRmlnbWEgdGFrZXMgc29tZSB0aW1lIHRvIHVwZGF0ZSB0aGUgaW1hZ2UgZmlsbHMuIFdhaXRpbmcgc29tZVxuICAgIC8vIGFtb3VudCBpcyByZXF1aXJlZCBvdGhlcndpc2UgdGhlIGltYWdlcyBhcHBlYXIgYmxhbmsuXG4gICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwKSk7XG5cbiAgICAvLyBSZW5kZXIgb3V0cHV0IGNvbnRhaW5lciBmcmFtZXMgdG8gU1ZHIG1hcmstdXAgKGluIGEgdWludDggYnl0ZSBhcnJheSlcbiAgICBjb25zdCBzdmcgPSBhd2FpdCBvdXRwdXROb2RlLmV4cG9ydEFzeW5jKHtcbiAgICAgIGZvcm1hdDogXCJTVkdcIixcbiAgICAgIHN2Z1NpbXBsaWZ5U3Ryb2tlOiB0cnVlLFxuICAgICAgc3ZnT3V0bGluZVRleHQ6IGZhbHNlLFxuICAgICAgc3ZnSWRBdHRyaWJ1dGU6IHRydWUsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3ZnO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoZXJyKTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyBSZW1vdmUgdGhlIG91dHB1dCBmcmFtZSB3aGF0ZXZlciBoYXBwZW5zXG4gICAgb3V0cHV0Tm9kZS5yZW1vdmUoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0SGVhZGxpbmVzQW5kU291cmNlKHByb3BzOiBzZXRIZWFkbGluZXNBbmRTb3VyY2VQcm9wcyk6IHZvaWQge1xuICBjb25zdCBwYWdlTm9kZSA9IGZpZ21hLmN1cnJlbnRQYWdlO1xuICBjb25zdCBmcmFtZXMgPSBwYWdlTm9kZS5maW5kQ2hpbGRyZW4oKG5vZGUpID0+IG5vZGUudHlwZSA9PT0gXCJGUkFNRVwiKTtcbiAgY29uc3QgbW9zdExlZnRQb3MgPSBNYXRoLm1pbiguLi5mcmFtZXMubWFwKChub2RlKSA9PiBub2RlLngpKTtcbiAgY29uc3QgbW9zdFRvcFBvcyA9IE1hdGgubWluKC4uLmZyYW1lcy5tYXAoKG5vZGUpID0+IG5vZGUueSkpO1xuXG4gIC8vIExvb3AgdGhyb3VnaCBlYWNoIGhlYWRsaW5lIG5vZGUgbmFtZXNcbiAgZm9yIChjb25zdCBuYW1lIG9mIE9iamVjdC52YWx1ZXMoSEVBRExJTkVfTk9ERV9OQU1FUykpIHtcbiAgICBsZXQgbm9kZSA9XG4gICAgICAocGFnZU5vZGUuZmluZENoaWxkKFxuICAgICAgICAobm9kZSkgPT4gbm9kZS5uYW1lID09PSBuYW1lICYmIG5vZGUudHlwZSA9PT0gXCJURVhUXCJcbiAgICAgICkgYXMgVGV4dE5vZGUpIHx8IG51bGw7XG4gICAgY29uc3QgdGV4dENvbnRlbnQgPSBwcm9wc1tuYW1lXTtcblxuICAgIC8vIFJlbW92ZSBub2RlIGlmIHRoZXJlJ3Mgbm8gdGV4dCBjb250ZW50XG4gICAgaWYgKG5vZGUgJiYgIXRleHRDb250ZW50KSB7XG4gICAgICBub2RlLnJlbW92ZSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICghdGV4dENvbnRlbnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgbm9kZSBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICBub2RlID0gZmlnbWEuY3JlYXRlVGV4dCgpO1xuICAgICAgbm9kZS5uYW1lID0gbmFtZTtcblxuICAgICAgbGV0IHkgPSBtb3N0VG9wUG9zIC0gNjA7XG4gICAgICBpZiAobmFtZSA9PT0gSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSkge1xuICAgICAgICB5IC09IDYwO1xuICAgICAgfSBlbHNlIGlmIChuYW1lID09PSBIRUFETElORV9OT0RFX05BTUVTLlNVQkhFQUQpIHtcbiAgICAgICAgeSAtPSAzMDtcbiAgICAgIH1cblxuICAgICAgbm9kZS5yZWxhdGl2ZVRyYW5zZm9ybSA9IFtcbiAgICAgICAgWzEsIDAsIG1vc3RMZWZ0UG9zXSxcbiAgICAgICAgWzAsIDEsIHldLFxuICAgICAgXTtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGV4dCBub2RlIGlzIGxvY2tlZFxuICAgIG5vZGUubG9ja2VkID0gdHJ1ZTtcblxuICAgIC8vIExvYWQgZm9udFxuICAgIGNvbnN0IGZvbnROYW1lID1cbiAgICAgIG5vZGUuZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gbm9kZS5mb250TmFtZS5mYW1pbHkgOiBcIlJvYm90b1wiO1xuICAgIGNvbnN0IGZvbnRTdHlsZSA9XG4gICAgICBub2RlLmZvbnROYW1lICE9PSBmaWdtYS5taXhlZCA/IG5vZGUuZm9udE5hbWUuc3R5bGUgOiBcIlJlZ3VsYXJcIjtcbiAgICBmaWdtYVxuICAgICAgLmxvYWRGb250QXN5bmMoeyBmYW1pbHk6IGZvbnROYW1lLCBzdHlsZTogZm9udFN0eWxlIH0pXG4gICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIFNldCB0ZXh0IG5vZGUgY29udGVudFxuICAgICAgICBub2RlLmNoYXJhY3RlcnMgPSBwcm9wc1tuYW1lXSB8fCBcIlwiO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gbG9hZCBmb250XCIsIGVycik7XG4gICAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUZXh0Tm9kZXMoZnJhbWU6IEZyYW1lTm9kZSk6IHRleHREYXRhW10ge1xuICBjb25zdCB0ZXh0Tm9kZXMgPSBmcmFtZS5maW5kQWxsKCh7IHR5cGUgfSkgPT4gdHlwZSA9PT0gXCJURVhUXCIpIGFzIFRleHROb2RlW107XG4gIGNvbnN0IHsgYWJzb2x1dGVUcmFuc2Zvcm0gfSA9IGZyYW1lO1xuICBjb25zdCByb290WCA9IGFic29sdXRlVHJhbnNmb3JtWzBdWzJdO1xuICBjb25zdCByb290WSA9IGFic29sdXRlVHJhbnNmb3JtWzFdWzJdO1xuXG4gIHJldHVybiB0ZXh0Tm9kZXMubWFwKFxuICAgIChub2RlKTogdGV4dERhdGEgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBhYnNvbHV0ZVRyYW5zZm9ybSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgZm9udFNpemU6IGZvbnRTaXplRGF0YSxcbiAgICAgICAgZm9udE5hbWUsXG4gICAgICAgIGZpbGxzLFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgICBsaW5lSGVpZ2h0LFxuICAgICAgICBsZXR0ZXJTcGFjaW5nLFxuICAgICAgICB0ZXh0QWxpZ25Ib3Jpem9udGFsLFxuICAgICAgICB0ZXh0QWxpZ25WZXJ0aWNhbCxcbiAgICAgIH0gPSBub2RlO1xuXG4gICAgICAvLyBOT1RFOiBGaWdtYSBub2RlIHgsIHkgYXJlIHJlbGF0aXZlIHRvIGZpcnN0IHBhcmVudCwgd2Ugd2FudCB0aGVtXG4gICAgICAvLyByZWxhdGl2ZSB0byB0aGUgcm9vdCBmcmFtZVxuICAgICAgY29uc3QgdGV4dFggPSBhYnNvbHV0ZVRyYW5zZm9ybVswXVsyXTtcbiAgICAgIGNvbnN0IHRleHRZID0gYWJzb2x1dGVUcmFuc2Zvcm1bMV1bMl07XG4gICAgICBjb25zdCB4ID0gdGV4dFggLSByb290WDtcbiAgICAgIGNvbnN0IHkgPSB0ZXh0WSAtIHJvb3RZO1xuXG4gICAgICAvLyBFeHRyYWN0IGJhc2ljIGZpbGwgY29sb3VyXG4gICAgICBjb25zdCBbZmlsbF0gPSBmaWxscyA9PT0gZmlnbWEubWl4ZWQgPyBbXSA6IGZpbGxzO1xuICAgICAgbGV0IGNvbG91ciA9IHsgcjogMCwgZzogMCwgYjogMCwgYTogMSB9O1xuICAgICAgaWYgKGZpbGwudHlwZSA9PT0gXCJTT0xJRFwiKSB7XG4gICAgICAgIGNvbG91ciA9IHsgLi4uY29sb3VyLCBhOiBmaWxsLm9wYWNpdHkgfHwgMSB9O1xuICAgICAgfVxuXG4gICAgICAvLyBFeHRyYWN0IGZvbnQgaW5mb1xuICAgICAgLy8gVE9ETzogQ29uZmlybSBmYWxsYmFjayBmb250c1xuICAgICAgY29uc3QgZm9udFNpemUgPSBmb250U2l6ZURhdGEgIT09IGZpZ21hLm1peGVkID8gZm9udFNpemVEYXRhIDogMTY7XG4gICAgICBjb25zdCBmb250RmFtaWx5ID0gZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gZm9udE5hbWUuZmFtaWx5IDogXCJBcmlhbFwiO1xuICAgICAgY29uc3QgZm9udFN0eWxlID0gZm9udE5hbWUgIT09IGZpZ21hLm1peGVkID8gZm9udE5hbWUuc3R5bGUgOiBcIlJlZ3VsYXJcIjtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgeCxcbiAgICAgICAgeSxcbiAgICAgICAgd2lkdGgsXG4gICAgICAgIGhlaWdodCxcbiAgICAgICAgZm9udFNpemUsXG4gICAgICAgIGZvbnRGYW1pbHksXG4gICAgICAgIGZvbnRTdHlsZSxcbiAgICAgICAgY29sb3VyLFxuICAgICAgICBjaGFyYWN0ZXJzLFxuICAgICAgICBsaW5lSGVpZ2h0LFxuICAgICAgICBsZXR0ZXJTcGFjaW5nLFxuICAgICAgICB0ZXh0QWxpZ25Ib3Jpem9udGFsLFxuICAgICAgICB0ZXh0QWxpZ25WZXJ0aWNhbCxcbiAgICAgIH07XG4gICAgfVxuICApO1xufVxuXG5mdW5jdGlvbiBnZXROb2RlVGV4dChyb290Tm9kZTogUGFnZU5vZGUsIG5vZGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICBjb25zdCBmb3VuZE5vZGUgPSByb290Tm9kZS5maW5kQ2hpbGQoKG5vZGUpID0+IG5vZGUubmFtZSA9PT0gbm9kZU5hbWUpO1xuICByZXR1cm4gZm91bmROb2RlICYmIGZvdW5kTm9kZS50eXBlID09PSBcIlRFWFRcIlxuICAgID8gZm91bmROb2RlLmNoYXJhY3RlcnNcbiAgICA6IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJvb3RGcmFtZXMoKTogSUZyYW1lRGF0YSB7XG4gIGNvbnN0IHsgY3VycmVudFBhZ2UgfSA9IGZpZ21hO1xuICBjb25zdCByb290RnJhbWVzID0gY3VycmVudFBhZ2UuY2hpbGRyZW4uZmlsdGVyKFxuICAgIChub2RlKSA9PiBub2RlLnR5cGUgPT09IFwiRlJBTUVcIlxuICApIGFzIEZyYW1lTm9kZVtdO1xuXG4gIGNvbnN0IGZyYW1lc0RhdGEgPSByb290RnJhbWVzLm1hcCgoZnJhbWUpID0+IHtcbiAgICBjb25zdCB7IG5hbWUsIHdpZHRoLCBoZWlnaHQsIGlkIH0gPSBmcmFtZTtcbiAgICBjb25zdCB0ZXh0Tm9kZXMgPSBnZXRUZXh0Tm9kZXMoZnJhbWUpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGlkLFxuICAgICAgdGV4dE5vZGVzLFxuICAgIH07XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgZnJhbWVzOiBmcmFtZXNEYXRhLFxuICAgIGhlYWRsaW5lOiBnZXROb2RlVGV4dChjdXJyZW50UGFnZSwgSEVBRExJTkVfTk9ERV9OQU1FUy5IRUFETElORSksXG4gICAgc3ViaGVhZDogZ2V0Tm9kZVRleHQoY3VycmVudFBhZ2UsIEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpLFxuICAgIHNvdXJjZTogZ2V0Tm9kZVRleHQoY3VycmVudFBhZ2UsIEhFQURMSU5FX05PREVfTkFNRVMuSEVBRExJTkUpLFxuICB9O1xufVxuIiwgImltcG9ydCB7IE1TR19FVkVOVFMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcbmltcG9ydCB7IHBvc3RNYW4gfSBmcm9tIFwiLi91dGlscy9tZXNzYWdlc1wiO1xuaW1wb3J0IHsgZ2V0Um9vdEZyYW1lcywgcmVuZGVyRnJhbWVzLCBzZXRIZWFkbGluZXNBbmRTb3VyY2UgfSBmcm9tIFwiLi9oZWxwZXJzXCI7XG5cbi8vIFJlZ2lzdGVyIG1lc3NlbmdlciBldmVudCBmdW5jdGlvbnNcbnBvc3RNYW4ucmVnaXN0ZXJXb3JrZXIoTVNHX0VWRU5UUy5HRVRfUk9PVF9GUkFNRVMsIGdldFJvb3RGcmFtZXMpO1xucG9zdE1hbi5yZWdpc3RlcldvcmtlcihNU0dfRVZFTlRTLlJFTkRFUiwgcmVuZGVyRnJhbWVzKTtcbnBvc3RNYW4ucmVnaXN0ZXJXb3JrZXIoTVNHX0VWRU5UUy5VUERBVEVfSEVBRExJTkVTLCBzZXRIZWFkbGluZXNBbmRTb3VyY2UpO1xuXG4vLyBSZW5kZXIgdGhlIERPTVxuZmlnbWEuc2hvd1VJKF9faHRtbF9fKTtcblxuLy8gUmVzaXplIFVJIHRvIG1heCB2aWV3cG9ydCBkaW1lbnNpb25zXG5jb25zdCB7IHdpZHRoLCBoZWlnaHQgfSA9IGZpZ21hLnZpZXdwb3J0LmJvdW5kcztcbmNvbnN0IHsgem9vbSB9ID0gZmlnbWEudmlld3BvcnQ7XG5jb25zdCBpbml0aWFsV2luZG93V2lkdGggPSBNYXRoLnJvdW5kKHdpZHRoICogem9vbSk7XG5jb25zdCBpbml0aWFsV2luZG93SGVpZ2h0ID0gTWF0aC5yb3VuZChoZWlnaHQgKiB6b29tKTtcbmZpZ21hLnVpLnJlc2l6ZShpbml0aWFsV2luZG93V2lkdGgsIGluaXRpYWxXaW5kb3dIZWlnaHQpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUdBLFFBQUksV0FBYSxPQUFPLGVBQWUsZUFDdEIsT0FBTyxnQkFBZ0IsZUFDdkIsT0FBTyxlQUFlO0FBRXZDLGtCQUFjLEtBQUs7QUFDakIsYUFBTyxPQUFPLFVBQVUsZUFBZSxLQUFLLEtBQUs7QUFBQTtBQUduRCxZQUFRLFNBQVMsU0FBVTtBQUN6QixVQUFJLFVBQVUsTUFBTSxVQUFVLE1BQU0sS0FBSyxXQUFXO0FBQ3BELGFBQU8sUUFBUTtBQUNiLFlBQUksU0FBUyxRQUFRO0FBQ3JCLFlBQUksQ0FBQztBQUFVO0FBQUE7QUFFZixZQUFJLE9BQU8sV0FBVztBQUNwQixnQkFBTSxJQUFJLFVBQVUsU0FBUztBQUFBO0FBRy9CLGlCQUFTLEtBQUs7QUFDWixjQUFJLEtBQUssUUFBUTtBQUNmLGdCQUFJLEtBQUssT0FBTztBQUFBO0FBQUE7QUFBQTtBQUt0QixhQUFPO0FBQUE7QUFLVCxZQUFRLFlBQVksU0FBVSxLQUFLO0FBQ2pDLFVBQUksSUFBSSxXQUFXO0FBQVEsZUFBTztBQUFBO0FBQ2xDLFVBQUksSUFBSTtBQUFZLGVBQU8sSUFBSSxTQUFTLEdBQUc7QUFBQTtBQUMzQyxVQUFJLFNBQVM7QUFDYixhQUFPO0FBQUE7QUFJVCxRQUFJLFVBQVU7QUFBQSxNQUNaLFVBQVUsU0FBVSxNQUFNLEtBQUssVUFBVSxLQUFLO0FBQzVDLFlBQUksSUFBSSxZQUFZLEtBQUs7QUFDdkIsZUFBSyxJQUFJLElBQUksU0FBUyxVQUFVLFdBQVcsTUFBTTtBQUNqRDtBQUFBO0FBR0YsaUJBQVMsSUFBSSxHQUFHLElBQUksS0FBSztBQUN2QixlQUFLLFlBQVksS0FBSyxJQUFJLFdBQVc7QUFBQTtBQUFBO0FBQUEsTUFJekMsZUFBZSxTQUFVO0FBQ3ZCLFlBQUksR0FBRyxHQUFHLEtBQUssS0FBSyxPQUFPO0FBRzNCLGNBQU07QUFDTixhQUFLLElBQUksR0FBRyxJQUFJLE9BQU8sUUFBUSxJQUFJLEdBQUc7QUFDcEMsaUJBQU8sT0FBTyxHQUFHO0FBQUE7QUFJbkIsaUJBQVMsSUFBSSxXQUFXO0FBQ3hCLGNBQU07QUFDTixhQUFLLElBQUksR0FBRyxJQUFJLE9BQU8sUUFBUSxJQUFJLEdBQUc7QUFDcEMsa0JBQVEsT0FBTztBQUNmLGlCQUFPLElBQUksT0FBTztBQUNsQixpQkFBTyxNQUFNO0FBQUE7QUFHZixlQUFPO0FBQUE7QUFBQTtBQUlYLFFBQUksWUFBWTtBQUFBLE1BQ2QsVUFBVSxTQUFVLE1BQU0sS0FBSyxVQUFVLEtBQUs7QUFDNUMsaUJBQVMsSUFBSSxHQUFHLElBQUksS0FBSztBQUN2QixlQUFLLFlBQVksS0FBSyxJQUFJLFdBQVc7QUFBQTtBQUFBO0FBQUEsTUFJekMsZUFBZSxTQUFVO0FBQ3ZCLGVBQU8sR0FBRyxPQUFPLE1BQU0sSUFBSTtBQUFBO0FBQUE7QUFPL0IsWUFBUSxXQUFXLFNBQVU7QUFDM0IsVUFBSTtBQUNGLGdCQUFRLE9BQVE7QUFDaEIsZ0JBQVEsUUFBUTtBQUNoQixnQkFBUSxRQUFRO0FBQ2hCLGdCQUFRLE9BQU8sU0FBUztBQUFBO0FBRXhCLGdCQUFRLE9BQVE7QUFDaEIsZ0JBQVEsUUFBUTtBQUNoQixnQkFBUSxRQUFRO0FBQ2hCLGdCQUFRLE9BQU8sU0FBUztBQUFBO0FBQUE7QUFJNUIsWUFBUSxTQUFTO0FBQUE7OztBQ3hHakI7QUFBQTtBQXVCQSxRQUFJLFFBQVE7QUFTWixRQUFJLFVBQXdCO0FBSTVCLFFBQUksV0FBd0I7QUFDNUIsUUFBSSxTQUF3QjtBQUU1QixRQUFJLFlBQXdCO0FBSzVCLGtCQUFjO0FBQU8sVUFBSSxNQUFNLElBQUk7QUFBUSxhQUFPLEVBQUUsT0FBTztBQUFLLFlBQUksT0FBTztBQUFBO0FBQUE7QUFJM0UsUUFBSSxlQUFlO0FBQ25CLFFBQUksZUFBZTtBQUNuQixRQUFJLFlBQWU7QUFHbkIsUUFBSSxZQUFlO0FBQ25CLFFBQUksWUFBZTtBQVFuQixRQUFJLGVBQWdCO0FBR3BCLFFBQUksV0FBZ0I7QUFHcEIsUUFBSSxVQUFnQixXQUFXLElBQUk7QUFHbkMsUUFBSSxVQUFnQjtBQUdwQixRQUFJLFdBQWdCO0FBR3BCLFFBQUksWUFBZ0IsSUFBSSxVQUFVO0FBR2xDLFFBQUksV0FBZ0I7QUFHcEIsUUFBSSxXQUFnQjtBQVFwQixRQUFJLGNBQWM7QUFHbEIsUUFBSSxZQUFjO0FBR2xCLFFBQUksVUFBYztBQUdsQixRQUFJLFlBQWM7QUFHbEIsUUFBSSxjQUFjO0FBSWxCLFFBQUksY0FDRixDQUFDLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUU7QUFFM0QsUUFBSSxjQUNGLENBQUMsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxJQUFHLElBQUcsSUFBRyxJQUFHLElBQUcsSUFBRyxJQUFHO0FBRXBFLFFBQUksZUFDRixDQUFDLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxHQUFFO0FBRXZDLFFBQUksV0FDRixDQUFDLElBQUcsSUFBRyxJQUFHLEdBQUUsR0FBRSxHQUFFLEdBQUUsR0FBRSxJQUFHLEdBQUUsSUFBRyxHQUFFLElBQUcsR0FBRSxJQUFHLEdBQUUsSUFBRyxHQUFFO0FBYS9DLFFBQUksZ0JBQWdCO0FBR3BCLFFBQUksZUFBZ0IsSUFBSSxNQUFPLFdBQVUsS0FBSztBQUM5QyxTQUFLO0FBT0wsUUFBSSxlQUFnQixJQUFJLE1BQU0sVUFBVTtBQUN4QyxTQUFLO0FBS0wsUUFBSSxhQUFnQixJQUFJLE1BQU07QUFDOUIsU0FBSztBQU1MLFFBQUksZUFBZ0IsSUFBSSxNQUFNLFlBQVksWUFBWTtBQUN0RCxTQUFLO0FBR0wsUUFBSSxjQUFnQixJQUFJLE1BQU07QUFDOUIsU0FBSztBQUdMLFFBQUksWUFBZ0IsSUFBSSxNQUFNO0FBQzlCLFNBQUs7QUFJTCw0QkFBd0IsYUFBYSxZQUFZLFlBQVksT0FBTztBQUVsRSxXQUFLLGNBQWU7QUFDcEIsV0FBSyxhQUFlO0FBQ3BCLFdBQUssYUFBZTtBQUNwQixXQUFLLFFBQWU7QUFDcEIsV0FBSyxhQUFlO0FBR3BCLFdBQUssWUFBZSxlQUFlLFlBQVk7QUFBQTtBQUlqRCxRQUFJO0FBQ0osUUFBSTtBQUNKLFFBQUk7QUFHSixzQkFBa0IsVUFBVTtBQUMxQixXQUFLLFdBQVc7QUFDaEIsV0FBSyxXQUFXO0FBQ2hCLFdBQUssWUFBWTtBQUFBO0FBS25CLG9CQUFnQjtBQUNkLGFBQU8sT0FBTyxNQUFNLFdBQVcsUUFBUSxXQUFXLE1BQU8sVUFBUztBQUFBO0FBUXBFLHVCQUFtQixHQUFHO0FBR3BCLFFBQUUsWUFBWSxFQUFFLGFBQWMsSUFBSztBQUNuQyxRQUFFLFlBQVksRUFBRSxhQUFjLE1BQU0sSUFBSztBQUFBO0FBUTNDLHVCQUFtQixHQUFHLE9BQU87QUFDM0IsVUFBSSxFQUFFLFdBQVksV0FBVztBQUMzQixVQUFFLFVBQVcsU0FBUyxFQUFFLFdBQVk7QUFDcEMsa0JBQVUsR0FBRyxFQUFFO0FBQ2YsVUFBRSxTQUFTLFNBQVUsV0FBVyxFQUFFO0FBQ2xDLFVBQUUsWUFBWSxTQUFTO0FBQUE7QUFFdkIsVUFBRSxVQUFXLFNBQVMsRUFBRSxXQUFZO0FBQ3BDLFVBQUUsWUFBWTtBQUFBO0FBQUE7QUFLbEIsdUJBQW1CLEdBQUcsR0FBRztBQUN2QixnQkFBVSxHQUFHLEtBQUssSUFBSSxJQUFhLEtBQUssSUFBSSxJQUFJO0FBQUE7QUFTbEQsd0JBQW9CLE1BQU07QUFDeEIsVUFBSSxNQUFNO0FBQ1Y7QUFDRSxlQUFPLE9BQU87QUFDZCxrQkFBVTtBQUNWLGdCQUFRO0FBQUEsZUFDRCxFQUFFLE1BQU07QUFDakIsYUFBTyxRQUFRO0FBQUE7QUFPakIsc0JBQWtCO0FBQ2hCLFVBQUksRUFBRSxhQUFhO0FBQ2pCLGtCQUFVLEdBQUcsRUFBRTtBQUNmLFVBQUUsU0FBUztBQUNYLFVBQUUsV0FBVztBQUFBLGlCQUVKLEVBQUUsWUFBWTtBQUN2QixVQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsU0FBUztBQUN4QyxVQUFFLFdBQVc7QUFDYixVQUFFLFlBQVk7QUFBQTtBQUFBO0FBZWxCLHdCQUFvQixHQUFHO0FBSXJCLFVBQUksT0FBa0IsS0FBSztBQUMzQixVQUFJLFdBQWtCLEtBQUs7QUFDM0IsVUFBSSxRQUFrQixLQUFLLFVBQVU7QUFDckMsVUFBSSxZQUFrQixLQUFLLFVBQVU7QUFDckMsVUFBSSxRQUFrQixLQUFLLFVBQVU7QUFDckMsVUFBSSxPQUFrQixLQUFLLFVBQVU7QUFDckMsVUFBSSxhQUFrQixLQUFLLFVBQVU7QUFDckMsVUFBSTtBQUNKLFVBQUksR0FBRztBQUNQLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUksV0FBVztBQUVmLFdBQUssT0FBTyxHQUFHLFFBQVEsVUFBVTtBQUMvQixVQUFFLFNBQVMsUUFBUTtBQUFBO0FBTXJCLFdBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxJQUFJLEtBQWE7QUFFM0MsV0FBSyxJQUFJLEVBQUUsV0FBVyxHQUFHLElBQUksV0FBVztBQUN0QyxZQUFJLEVBQUUsS0FBSztBQUNYLGVBQU8sS0FBSyxLQUFLLElBQUksSUFBSSxLQUFhLElBQUksS0FBYTtBQUN2RCxZQUFJLE9BQU87QUFDVCxpQkFBTztBQUNQO0FBQUE7QUFFRixhQUFLLElBQUksSUFBSSxLQUFhO0FBRzFCLFlBQUksSUFBSTtBQUFZO0FBQUE7QUFFcEIsVUFBRSxTQUFTO0FBQ1gsZ0JBQVE7QUFDUixZQUFJLEtBQUs7QUFDUCxrQkFBUSxNQUFNLElBQUk7QUFBQTtBQUVwQixZQUFJLEtBQUssSUFBSTtBQUNiLFVBQUUsV0FBVyxJQUFLLFFBQU87QUFDekIsWUFBSTtBQUNGLFlBQUUsY0FBYyxJQUFLLE9BQU0sSUFBSSxJQUFJLEtBQWE7QUFBQTtBQUFBO0FBR3BELFVBQUksYUFBYTtBQUFLO0FBQUE7QUFNdEI7QUFDRSxlQUFPLGFBQWE7QUFDcEIsZUFBTyxFQUFFLFNBQVMsVUFBVTtBQUFLO0FBQUE7QUFDakMsVUFBRSxTQUFTO0FBQ1gsVUFBRSxTQUFTLE9BQU8sTUFBTTtBQUN4QixVQUFFLFNBQVM7QUFJWCxvQkFBWTtBQUFBLGVBQ0wsV0FBVztBQU9wQixXQUFLLE9BQU8sWUFBWSxTQUFTLEdBQUc7QUFDbEMsWUFBSSxFQUFFLFNBQVM7QUFDZixlQUFPLE1BQU07QUFDWCxjQUFJLEVBQUUsS0FBSyxFQUFFO0FBQ2IsY0FBSSxJQUFJO0FBQVk7QUFBQTtBQUNwQixjQUFJLEtBQUssSUFBSSxJQUFJLE9BQWU7QUFFOUIsY0FBRSxXQUFZLFFBQU8sS0FBSyxJQUFJLElBQUksTUFBYyxLQUFLLElBQUk7QUFDekQsaUJBQUssSUFBSSxJQUFJLEtBQWE7QUFBQTtBQUU1QjtBQUFBO0FBQUE7QUFBQTtBQWNOLHVCQUFtQixNQUFNLFVBQVU7QUFLakMsVUFBSSxZQUFZLElBQUksTUFBTSxXQUFXO0FBQ3JDLFVBQUksT0FBTztBQUNYLFVBQUk7QUFDSixVQUFJO0FBS0osV0FBSyxPQUFPLEdBQUcsUUFBUSxVQUFVO0FBQy9CLGtCQUFVLFFBQVEsT0FBUSxPQUFPLFNBQVMsT0FBTyxNQUFPO0FBQUE7QUFTMUQsV0FBSyxJQUFJLEdBQUksS0FBSyxVQUFVO0FBQzFCLFlBQUksTUFBTSxLQUFLLElBQUksSUFBSTtBQUN2QixZQUFJLFFBQVE7QUFBSztBQUFBO0FBRWpCLGFBQUssSUFBSSxLQUFjLFdBQVcsVUFBVSxRQUFRO0FBQUE7QUFBQTtBQVd4RDtBQUNFLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSSxXQUFXLElBQUksTUFBTSxXQUFXO0FBZ0JwQyxlQUFTO0FBQ1QsV0FBSyxPQUFPLEdBQUcsT0FBTyxlQUFlLEdBQUc7QUFDdEMsb0JBQVksUUFBUTtBQUNwQixhQUFLLElBQUksR0FBRyxJQUFLLEtBQUssWUFBWSxPQUFRO0FBQ3hDLHVCQUFhLFlBQVk7QUFBQTtBQUFBO0FBUTdCLG1CQUFhLFNBQVMsS0FBSztBQUczQixhQUFPO0FBQ1AsV0FBSyxPQUFPLEdBQUcsT0FBTyxJQUFJO0FBQ3hCLGtCQUFVLFFBQVE7QUFDbEIsYUFBSyxJQUFJLEdBQUcsSUFBSyxLQUFLLFlBQVksT0FBUTtBQUN4QyxxQkFBVyxVQUFVO0FBQUE7QUFBQTtBQUl6QixlQUFTO0FBQ1QsYUFBTyxPQUFPLFNBQVM7QUFDckIsa0JBQVUsUUFBUSxRQUFRO0FBQzFCLGFBQUssSUFBSSxHQUFHLElBQUssS0FBTSxZQUFZLFFBQVEsR0FBSztBQUM5QyxxQkFBVyxNQUFNLFVBQVU7QUFBQTtBQUFBO0FBTS9CLFdBQUssT0FBTyxHQUFHLFFBQVEsVUFBVTtBQUMvQixpQkFBUyxRQUFRO0FBQUE7QUFHbkIsVUFBSTtBQUNKLGFBQU8sS0FBSztBQUNWLHFCQUFhLElBQUksSUFBSSxLQUFhO0FBQ2xDO0FBQ0EsaUJBQVM7QUFBQTtBQUVYLGFBQU8sS0FBSztBQUNWLHFCQUFhLElBQUksSUFBSSxLQUFhO0FBQ2xDO0FBQ0EsaUJBQVM7QUFBQTtBQUVYLGFBQU8sS0FBSztBQUNWLHFCQUFhLElBQUksSUFBSSxLQUFhO0FBQ2xDO0FBQ0EsaUJBQVM7QUFBQTtBQUVYLGFBQU8sS0FBSztBQUNWLHFCQUFhLElBQUksSUFBSSxLQUFhO0FBQ2xDO0FBQ0EsaUJBQVM7QUFBQTtBQU1YLGdCQUFVLGNBQWMsVUFBVSxHQUFHO0FBR3JDLFdBQUssSUFBSSxHQUFHLElBQUksU0FBUztBQUN2QixxQkFBYSxJQUFJLElBQUksS0FBYTtBQUNsQyxxQkFBYSxJQUFJLEtBQWMsV0FBVyxHQUFHO0FBQUE7QUFJL0Msc0JBQWdCLElBQUksZUFBZSxjQUFjLGFBQWEsV0FBVyxHQUFHLFNBQVM7QUFDckYsc0JBQWdCLElBQUksZUFBZSxjQUFjLGFBQWEsR0FBWSxTQUFTO0FBQ25GLHVCQUFpQixJQUFJLGVBQWUsSUFBSSxNQUFNLElBQUksY0FBYyxHQUFXLFVBQVU7QUFBQTtBQVN2Rix3QkFBb0I7QUFDbEIsVUFBSTtBQUdKLFdBQUssSUFBSSxHQUFHLElBQUksU0FBVTtBQUFPLFVBQUUsVUFBVSxJQUFJLEtBQWM7QUFBQTtBQUMvRCxXQUFLLElBQUksR0FBRyxJQUFJLFNBQVU7QUFBTyxVQUFFLFVBQVUsSUFBSSxLQUFjO0FBQUE7QUFDL0QsV0FBSyxJQUFJLEdBQUcsSUFBSSxVQUFVO0FBQU8sVUFBRSxRQUFRLElBQUksS0FBYztBQUFBO0FBRTdELFFBQUUsVUFBVSxZQUFZLEtBQWM7QUFDdEMsUUFBRSxVQUFVLEVBQUUsYUFBYTtBQUMzQixRQUFFLFdBQVcsRUFBRSxVQUFVO0FBQUE7QUFPM0IsdUJBQW1CO0FBRWpCLFVBQUksRUFBRSxXQUFXO0FBQ2Ysa0JBQVUsR0FBRyxFQUFFO0FBQUEsaUJBQ04sRUFBRSxXQUFXO0FBRXRCLFVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRTtBQUFBO0FBRWpDLFFBQUUsU0FBUztBQUNYLFFBQUUsV0FBVztBQUFBO0FBT2Ysd0JBQW9CLEdBQUcsS0FBSyxLQUFLO0FBTS9CLGdCQUFVO0FBRVYsVUFBSTtBQUNGLGtCQUFVLEdBQUc7QUFDYixrQkFBVSxHQUFHLENBQUM7QUFBQTtBQUtoQixZQUFNLFNBQVMsRUFBRSxhQUFhLEVBQUUsUUFBUSxLQUFLLEtBQUssRUFBRTtBQUNwRCxRQUFFLFdBQVc7QUFBQTtBQU9mLHFCQUFpQixNQUFNLEdBQUcsR0FBRztBQUMzQixVQUFJLE1BQU0sSUFBSTtBQUNkLFVBQUksTUFBTSxJQUFJO0FBQ2QsYUFBUSxLQUFLLE9BQWdCLEtBQUssUUFDMUIsS0FBSyxTQUFrQixLQUFLLFFBQWlCLE1BQU0sTUFBTSxNQUFNO0FBQUE7QUFTekUsd0JBQW9CLEdBQUcsTUFBTTtBQUszQixVQUFJLElBQUksRUFBRSxLQUFLO0FBQ2YsVUFBSSxJQUFJLEtBQUs7QUFDYixhQUFPLEtBQUssRUFBRTtBQUVaLFlBQUksSUFBSSxFQUFFLFlBQ1IsUUFBUSxNQUFNLEVBQUUsS0FBSyxJQUFJLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTtBQUMxQztBQUFBO0FBR0YsWUFBSSxRQUFRLE1BQU0sR0FBRyxFQUFFLEtBQUssSUFBSSxFQUFFO0FBQVU7QUFBQTtBQUc1QyxVQUFFLEtBQUssS0FBSyxFQUFFLEtBQUs7QUFDbkIsWUFBSTtBQUdKLGNBQU07QUFBQTtBQUVSLFFBQUUsS0FBSyxLQUFLO0FBQUE7QUFVZCw0QkFBd0IsR0FBRyxPQUFPO0FBS2hDLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSSxLQUFLO0FBQ1QsVUFBSTtBQUNKLFVBQUk7QUFFSixVQUFJLEVBQUUsYUFBYTtBQUNqQjtBQUNFLGlCQUFRLEVBQUUsWUFBWSxFQUFFLFFBQVEsS0FBSyxNQUFNLElBQU0sRUFBRSxZQUFZLEVBQUUsUUFBUSxLQUFLLElBQUk7QUFDbEYsZUFBSyxFQUFFLFlBQVksRUFBRSxRQUFRO0FBQzdCO0FBRUEsY0FBSSxTQUFTO0FBQ1gsc0JBQVUsR0FBRyxJQUFJO0FBQUE7QUFJakIsbUJBQU8sYUFBYTtBQUNwQixzQkFBVSxHQUFHLE9BQU8sV0FBVyxHQUFHO0FBQ2xDLG9CQUFRLFlBQVk7QUFDcEIsZ0JBQUksVUFBVTtBQUNaLG9CQUFNLFlBQVk7QUFDbEIsd0JBQVUsR0FBRyxJQUFJO0FBQUE7QUFFbkI7QUFDQSxtQkFBTyxPQUFPO0FBR2Qsc0JBQVUsR0FBRyxNQUFNO0FBQ25CLG9CQUFRLFlBQVk7QUFDcEIsZ0JBQUksVUFBVTtBQUNaLHNCQUFRLFVBQVU7QUFDbEIsd0JBQVUsR0FBRyxNQUFNO0FBQUE7QUFBQTtBQUFBLGlCQVFoQixLQUFLLEVBQUU7QUFBQTtBQUdsQixnQkFBVSxHQUFHLFdBQVc7QUFBQTtBQVkxQix3QkFBb0IsR0FBRztBQUlyQixVQUFJLE9BQVcsS0FBSztBQUNwQixVQUFJLFFBQVcsS0FBSyxVQUFVO0FBQzlCLFVBQUksWUFBWSxLQUFLLFVBQVU7QUFDL0IsVUFBSSxRQUFXLEtBQUssVUFBVTtBQUM5QixVQUFJLEdBQUc7QUFDUCxVQUFJLFdBQVc7QUFDZixVQUFJO0FBTUosUUFBRSxXQUFXO0FBQ2IsUUFBRSxXQUFXO0FBRWIsV0FBSyxJQUFJLEdBQUcsSUFBSSxPQUFPO0FBQ3JCLFlBQUksS0FBSyxJQUFJLE9BQWdCO0FBQzNCLFlBQUUsS0FBSyxFQUFFLEVBQUUsWUFBWSxXQUFXO0FBQ2xDLFlBQUUsTUFBTSxLQUFLO0FBQUE7QUFHYixlQUFLLElBQUksSUFBSSxLQUFhO0FBQUE7QUFBQTtBQVM5QixhQUFPLEVBQUUsV0FBVztBQUNsQixlQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsWUFBYSxXQUFXLElBQUksRUFBRSxXQUFXO0FBQzNELGFBQUssT0FBTyxLQUFjO0FBQzFCLFVBQUUsTUFBTSxRQUFRO0FBQ2hCLFVBQUU7QUFFRixZQUFJO0FBQ0YsWUFBRSxjQUFjLE1BQU0sT0FBTyxJQUFJO0FBQUE7QUFBQTtBQUlyQyxXQUFLLFdBQVc7QUFLaEIsV0FBSyxJQUFLLEVBQUUsWUFBWSxHQUFjLEtBQUssR0FBRztBQUFPLG1CQUFXLEdBQUcsTUFBTTtBQUFBO0FBS3pFLGFBQU87QUFDUDtBQUdFLFlBQUksRUFBRSxLQUFLO0FBQ1gsVUFBRSxLQUFLLEtBQWlCLEVBQUUsS0FBSyxFQUFFO0FBQ2pDLG1CQUFXLEdBQUcsTUFBTTtBQUdwQixZQUFJLEVBQUUsS0FBSztBQUVYLFVBQUUsS0FBSyxFQUFFLEVBQUUsWUFBWTtBQUN2QixVQUFFLEtBQUssRUFBRSxFQUFFLFlBQVk7QUFHdkIsYUFBSyxPQUFPLEtBQWMsS0FBSyxJQUFJLEtBQWMsS0FBSyxJQUFJO0FBQzFELFVBQUUsTUFBTSxRQUFTLEdBQUUsTUFBTSxNQUFNLEVBQUUsTUFBTSxLQUFLLEVBQUUsTUFBTSxLQUFLLEVBQUUsTUFBTSxNQUFNO0FBQ3ZFLGFBQUssSUFBSSxJQUFJLEtBQWEsS0FBSyxJQUFJLElBQUksS0FBYTtBQUdwRCxVQUFFLEtBQUssS0FBaUI7QUFDeEIsbUJBQVcsR0FBRyxNQUFNO0FBQUEsZUFFYixFQUFFLFlBQVk7QUFFdkIsUUFBRSxLQUFLLEVBQUUsRUFBRSxZQUFZLEVBQUUsS0FBSztBQUs5QixpQkFBVyxHQUFHO0FBR2QsZ0JBQVUsTUFBTSxVQUFVLEVBQUU7QUFBQTtBQVE5Qix1QkFBbUIsR0FBRyxNQUFNO0FBSzFCLFVBQUk7QUFDSixVQUFJLFVBQVU7QUFDZCxVQUFJO0FBRUosVUFBSSxVQUFVLEtBQUssSUFBSSxJQUFJO0FBRTNCLFVBQUksUUFBUTtBQUNaLFVBQUksWUFBWTtBQUNoQixVQUFJLFlBQVk7QUFFaEIsVUFBSSxZQUFZO0FBQ2Qsb0JBQVk7QUFDWixvQkFBWTtBQUFBO0FBRWQsV0FBTSxZQUFXLEtBQUssSUFBSSxLQUFhO0FBRXZDLFdBQUssSUFBSSxHQUFHLEtBQUssVUFBVTtBQUN6QixpQkFBUztBQUNULGtCQUFVLEtBQU0sS0FBSSxLQUFLLElBQUk7QUFFN0IsWUFBSSxFQUFFLFFBQVEsYUFBYSxXQUFXO0FBQ3BDO0FBQUEsbUJBRVMsUUFBUTtBQUNqQixZQUFFLFFBQVEsU0FBUyxNQUFlO0FBQUEsbUJBRXpCLFdBQVc7QUFFcEIsY0FBSSxXQUFXO0FBQVcsY0FBRSxRQUFRLFNBQVM7QUFBQTtBQUM3QyxZQUFFLFFBQVEsVUFBVTtBQUFBLG1CQUVYLFNBQVM7QUFDbEIsWUFBRSxRQUFRLFlBQVk7QUFBQTtBQUd0QixZQUFFLFFBQVEsY0FBYztBQUFBO0FBRzFCLGdCQUFRO0FBQ1Isa0JBQVU7QUFFVixZQUFJLFlBQVk7QUFDZCxzQkFBWTtBQUNaLHNCQUFZO0FBQUEsbUJBRUgsV0FBVztBQUNwQixzQkFBWTtBQUNaLHNCQUFZO0FBQUE7QUFHWixzQkFBWTtBQUNaLHNCQUFZO0FBQUE7QUFBQTtBQUFBO0FBVWxCLHVCQUFtQixHQUFHLE1BQU07QUFLMUIsVUFBSTtBQUNKLFVBQUksVUFBVTtBQUNkLFVBQUk7QUFFSixVQUFJLFVBQVUsS0FBSyxJQUFJLElBQUk7QUFFM0IsVUFBSSxRQUFRO0FBQ1osVUFBSSxZQUFZO0FBQ2hCLFVBQUksWUFBWTtBQUdoQixVQUFJLFlBQVk7QUFDZCxvQkFBWTtBQUNaLG9CQUFZO0FBQUE7QUFHZCxXQUFLLElBQUksR0FBRyxLQUFLLFVBQVU7QUFDekIsaUJBQVM7QUFDVCxrQkFBVSxLQUFNLEtBQUksS0FBSyxJQUFJO0FBRTdCLFlBQUksRUFBRSxRQUFRLGFBQWEsV0FBVztBQUNwQztBQUFBLG1CQUVTLFFBQVE7QUFDakI7QUFBSyxzQkFBVSxHQUFHLFFBQVEsRUFBRTtBQUFBLG1CQUFtQixFQUFFLFVBQVU7QUFBQSxtQkFFbEQsV0FBVztBQUNwQixjQUFJLFdBQVc7QUFDYixzQkFBVSxHQUFHLFFBQVEsRUFBRTtBQUN2QjtBQUFBO0FBR0Ysb0JBQVUsR0FBRyxTQUFTLEVBQUU7QUFDeEIsb0JBQVUsR0FBRyxRQUFRLEdBQUc7QUFBQSxtQkFFZixTQUFTO0FBQ2xCLG9CQUFVLEdBQUcsV0FBVyxFQUFFO0FBQzFCLG9CQUFVLEdBQUcsUUFBUSxHQUFHO0FBQUE7QUFHeEIsb0JBQVUsR0FBRyxhQUFhLEVBQUU7QUFDNUIsb0JBQVUsR0FBRyxRQUFRLElBQUk7QUFBQTtBQUczQixnQkFBUTtBQUNSLGtCQUFVO0FBQ1YsWUFBSSxZQUFZO0FBQ2Qsc0JBQVk7QUFDWixzQkFBWTtBQUFBLG1CQUVILFdBQVc7QUFDcEIsc0JBQVk7QUFDWixzQkFBWTtBQUFBO0FBR1osc0JBQVk7QUFDWixzQkFBWTtBQUFBO0FBQUE7QUFBQTtBQVVsQiwyQkFBdUI7QUFDckIsVUFBSTtBQUdKLGdCQUFVLEdBQUcsRUFBRSxXQUFXLEVBQUUsT0FBTztBQUNuQyxnQkFBVSxHQUFHLEVBQUUsV0FBVyxFQUFFLE9BQU87QUFHbkMsaUJBQVcsR0FBRyxFQUFFO0FBU2hCLFdBQUssY0FBYyxXQUFXLEdBQUcsZUFBZSxHQUFHO0FBQ2pELFlBQUksRUFBRSxRQUFRLFNBQVMsZUFBZSxJQUFJLE9BQWU7QUFDdkQ7QUFBQTtBQUFBO0FBSUosUUFBRSxXQUFXLElBQUssZUFBYyxLQUFLLElBQUksSUFBSTtBQUk3QyxhQUFPO0FBQUE7QUFTVCw0QkFBd0IsR0FBRyxRQUFRLFFBQVE7QUFJekMsVUFBSTtBQU1KLGdCQUFVLEdBQUcsU0FBUyxLQUFLO0FBQzNCLGdCQUFVLEdBQUcsU0FBUyxHQUFLO0FBQzNCLGdCQUFVLEdBQUcsVUFBVSxHQUFJO0FBQzNCLFdBQUssT0FBTyxHQUFHLE9BQU8sU0FBUztBQUU3QixrQkFBVSxHQUFHLEVBQUUsUUFBUSxTQUFTLFFBQVEsSUFBSSxJQUFZO0FBQUE7QUFJMUQsZ0JBQVUsR0FBRyxFQUFFLFdBQVcsU0FBUztBQUduQyxnQkFBVSxHQUFHLEVBQUUsV0FBVyxTQUFTO0FBQUE7QUFrQnJDLDhCQUEwQjtBQUt4QixVQUFJLGFBQWE7QUFDakIsVUFBSTtBQUdKLFdBQUssSUFBSSxHQUFHLEtBQUssSUFBSSxLQUFLLGdCQUFnQjtBQUN4QyxZQUFLLGFBQWEsS0FBTyxFQUFFLFVBQVUsSUFBSSxPQUFnQjtBQUN2RCxpQkFBTztBQUFBO0FBQUE7QUFLWCxVQUFJLEVBQUUsVUFBVSxJQUFJLE9BQWdCLEtBQUssRUFBRSxVQUFVLEtBQUssT0FBZ0IsS0FDdEUsRUFBRSxVQUFVLEtBQUssT0FBZ0I7QUFDbkMsZUFBTztBQUFBO0FBRVQsV0FBSyxJQUFJLElBQUksSUFBSSxVQUFVO0FBQ3pCLFlBQUksRUFBRSxVQUFVLElBQUksT0FBZ0I7QUFDbEMsaUJBQU87QUFBQTtBQUFBO0FBT1gsYUFBTztBQUFBO0FBSVQsUUFBSSxtQkFBbUI7QUFLdkIsc0JBQWtCO0FBR2hCLFVBQUksQ0FBQztBQUNIO0FBQ0EsMkJBQW1CO0FBQUE7QUFHckIsUUFBRSxTQUFVLElBQUksU0FBUyxFQUFFLFdBQVc7QUFDdEMsUUFBRSxTQUFVLElBQUksU0FBUyxFQUFFLFdBQVc7QUFDdEMsUUFBRSxVQUFVLElBQUksU0FBUyxFQUFFLFNBQVM7QUFFcEMsUUFBRSxTQUFTO0FBQ1gsUUFBRSxXQUFXO0FBR2IsaUJBQVc7QUFBQTtBQU9iLDhCQUEwQixHQUFHLEtBQUssWUFBWTtBQU01QyxnQkFBVSxHQUFJLGlCQUFnQixLQUFNLFFBQU8sSUFBSSxJQUFJO0FBQ25ELGlCQUFXLEdBQUcsS0FBSyxZQUFZO0FBQUE7QUFRakMsdUJBQW1CO0FBQ2pCLGdCQUFVLEdBQUcsZ0JBQWdCLEdBQUc7QUFDaEMsZ0JBQVUsR0FBRyxXQUFXO0FBQ3hCLGVBQVM7QUFBQTtBQVFYLDZCQUF5QixHQUFHLEtBQUssWUFBWTtBQU0zQyxVQUFJLFVBQVU7QUFDZCxVQUFJLGNBQWM7QUFHbEIsVUFBSSxFQUFFLFFBQVE7QUFHWixZQUFJLEVBQUUsS0FBSyxjQUFjO0FBQ3ZCLFlBQUUsS0FBSyxZQUFZLGlCQUFpQjtBQUFBO0FBSXRDLG1CQUFXLEdBQUcsRUFBRTtBQUloQixtQkFBVyxHQUFHLEVBQUU7QUFVaEIsc0JBQWMsY0FBYztBQUc1QixtQkFBWSxFQUFFLFVBQVUsSUFBSSxNQUFPO0FBQ25DLHNCQUFlLEVBQUUsYUFBYSxJQUFJLE1BQU87QUFNekMsWUFBSSxlQUFlO0FBQVkscUJBQVc7QUFBQTtBQUFBO0FBSTFDLG1CQUFXLGNBQWMsYUFBYTtBQUFBO0FBR3hDLFVBQUssYUFBYSxLQUFLLFlBQWMsUUFBUTtBQVMzQyx5QkFBaUIsR0FBRyxLQUFLLFlBQVk7QUFBQSxpQkFFNUIsRUFBRSxhQUFhLFdBQVcsZ0JBQWdCO0FBRW5ELGtCQUFVLEdBQUksaUJBQWdCLEtBQU0sUUFBTyxJQUFJLElBQUk7QUFDbkQsdUJBQWUsR0FBRyxjQUFjO0FBQUE7QUFHaEMsa0JBQVUsR0FBSSxjQUFhLEtBQU0sUUFBTyxJQUFJLElBQUk7QUFDaEQsdUJBQWUsR0FBRyxFQUFFLE9BQU8sV0FBVyxHQUFHLEVBQUUsT0FBTyxXQUFXLEdBQUcsY0FBYztBQUM5RSx1QkFBZSxHQUFHLEVBQUUsV0FBVyxFQUFFO0FBQUE7QUFNbkMsaUJBQVc7QUFFWCxVQUFJO0FBQ0Ysa0JBQVU7QUFBQTtBQUFBO0FBVWQsdUJBQW1CLEdBQUcsTUFBTTtBQU8xQixRQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsV0FBVyxLQUFVLFNBQVMsSUFBSztBQUM3RCxRQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsV0FBVyxJQUFJLEtBQUssT0FBTztBQUVyRCxRQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsWUFBWSxLQUFLO0FBQzNDLFFBQUU7QUFFRixVQUFJLFNBQVM7QUFFWCxVQUFFLFVBQVUsS0FBSztBQUFBO0FBRWpCLFVBQUU7QUFFRjtBQUtBLFVBQUUsVUFBVyxjQUFhLE1BQU0sV0FBVyxLQUFLO0FBQ2hELFVBQUUsVUFBVSxPQUFPLFFBQVE7QUFBQTtBQTBCN0IsYUFBUSxFQUFFLGFBQWEsRUFBRSxjQUFjO0FBQUE7QUFPekMsWUFBUSxXQUFZO0FBQ3BCLFlBQVEsbUJBQW1CO0FBQzNCLFlBQVEsa0JBQW1CO0FBQzNCLFlBQVEsWUFBWTtBQUNwQixZQUFRLFlBQVk7QUFBQTs7O0FDcnNDcEI7QUFBQTtBQXlCQSxxQkFBaUIsT0FBTyxLQUFLLEtBQUs7QUFDaEMsVUFBSSxLQUFNLFFBQVEsUUFBUyxHQUN2QixLQUFPLFVBQVUsS0FBTSxRQUFTLEdBQ2hDLElBQUk7QUFFUixhQUFPLFFBQVE7QUFJYixZQUFJLE1BQU0sTUFBTyxNQUFPO0FBQ3hCLGVBQU87QUFFUDtBQUNFLGVBQU0sS0FBSyxJQUFJLFNBQVM7QUFDeEIsZUFBTSxLQUFLLEtBQUs7QUFBQSxpQkFDVCxFQUFFO0FBRVgsY0FBTTtBQUNOLGNBQU07QUFBQTtBQUdSLGFBQVEsS0FBTSxNQUFNLEtBQU07QUFBQTtBQUk1QixXQUFPLFVBQVU7QUFBQTs7O0FDbERqQjtBQUFBO0FBMEJBO0FBQ0UsVUFBSSxHQUFHLFFBQVE7QUFFZixlQUFTLElBQUksR0FBRyxJQUFJLEtBQUs7QUFDdkIsWUFBSTtBQUNKLGlCQUFTLElBQUksR0FBRyxJQUFJLEdBQUc7QUFDckIsY0FBTSxJQUFJLElBQU0sYUFBYyxNQUFNLElBQU8sTUFBTTtBQUFBO0FBRW5ELGNBQU0sS0FBSztBQUFBO0FBR2IsYUFBTztBQUFBO0FBSVQsUUFBSSxXQUFXO0FBR2YsbUJBQWUsS0FBSyxLQUFLLEtBQUs7QUFDNUIsVUFBSSxJQUFJLFVBQ0osTUFBTSxNQUFNO0FBRWhCLGFBQU87QUFFUCxlQUFTLElBQUksS0FBSyxJQUFJLEtBQUs7QUFDekIsY0FBTyxRQUFRLElBQUssRUFBRyxPQUFNLElBQUksTUFBTTtBQUFBO0FBR3pDLGFBQVEsTUFBTztBQUFBO0FBSWpCLFdBQU8sVUFBVTtBQUFBOzs7QUMxRGpCO0FBQUE7QUFxQkEsV0FBTyxVQUFVO0FBQUEsTUFDZixHQUFRO0FBQUEsTUFDUixHQUFRO0FBQUEsTUFDUixHQUFRO0FBQUEsTUFDUixNQUFRO0FBQUEsTUFDUixNQUFRO0FBQUEsTUFDUixNQUFRO0FBQUEsTUFDUixNQUFRO0FBQUEsTUFDUixNQUFRO0FBQUEsTUFDUixNQUFRO0FBQUE7QUFBQTs7O0FDOUJWO0FBQUE7QUFxQkEsUUFBSSxRQUFVO0FBQ2QsUUFBSSxRQUFVO0FBQ2QsUUFBSSxVQUFVO0FBQ2QsUUFBSSxRQUFVO0FBQ2QsUUFBSSxNQUFVO0FBT2QsUUFBSSxhQUFrQjtBQUN0QixRQUFJLGtCQUFrQjtBQUV0QixRQUFJLGVBQWtCO0FBQ3RCLFFBQUksV0FBa0I7QUFDdEIsUUFBSSxVQUFrQjtBQU90QixRQUFJLE9BQWtCO0FBQ3RCLFFBQUksZUFBa0I7QUFHdEIsUUFBSSxpQkFBa0I7QUFDdEIsUUFBSSxlQUFrQjtBQUV0QixRQUFJLGNBQWtCO0FBUXRCLFFBQUksd0JBQXdCO0FBRzVCLFFBQUksYUFBd0I7QUFDNUIsUUFBSSxpQkFBd0I7QUFDNUIsUUFBSSxRQUF3QjtBQUM1QixRQUFJLFVBQXdCO0FBQzVCLFFBQUkscUJBQXdCO0FBTTVCLFFBQUksWUFBd0I7QUFJNUIsUUFBSSxhQUFjO0FBS2xCLFFBQUksZ0JBQWdCO0FBRXBCLFFBQUksWUFBWTtBQUVoQixRQUFJLGdCQUFnQjtBQUdwQixRQUFJLGVBQWdCO0FBRXBCLFFBQUksV0FBZ0I7QUFFcEIsUUFBSSxVQUFnQixXQUFXLElBQUk7QUFFbkMsUUFBSSxVQUFnQjtBQUVwQixRQUFJLFdBQWdCO0FBRXBCLFFBQUksWUFBZ0IsSUFBSSxVQUFVO0FBRWxDLFFBQUksV0FBWTtBQUdoQixRQUFJLFlBQVk7QUFDaEIsUUFBSSxZQUFZO0FBQ2hCLFFBQUksZ0JBQWlCLFlBQVksWUFBWTtBQUU3QyxRQUFJLGNBQWM7QUFFbEIsUUFBSSxhQUFhO0FBQ2pCLFFBQUksY0FBYztBQUNsQixRQUFJLGFBQWE7QUFDakIsUUFBSSxnQkFBZ0I7QUFDcEIsUUFBSSxhQUFhO0FBQ2pCLFFBQUksYUFBYTtBQUNqQixRQUFJLGVBQWU7QUFFbkIsUUFBSSxlQUFvQjtBQUN4QixRQUFJLGdCQUFvQjtBQUN4QixRQUFJLG9CQUFvQjtBQUN4QixRQUFJLGlCQUFvQjtBQUV4QixRQUFJLFVBQVU7QUFFZCxpQkFBYSxNQUFNO0FBQ2pCLFdBQUssTUFBTSxJQUFJO0FBQ2YsYUFBTztBQUFBO0FBR1Qsa0JBQWM7QUFDWixhQUFTLE1BQU0sS0FBTyxLQUFLLElBQUksSUFBSTtBQUFBO0FBR3JDLGtCQUFjO0FBQU8sVUFBSSxNQUFNLElBQUk7QUFBUSxhQUFPLEVBQUUsT0FBTztBQUFLLFlBQUksT0FBTztBQUFBO0FBQUE7QUFTM0UsMkJBQXVCO0FBQ3JCLFVBQUksSUFBSSxLQUFLO0FBR2IsVUFBSSxNQUFNLEVBQUU7QUFDWixVQUFJLE1BQU0sS0FBSztBQUNiLGNBQU0sS0FBSztBQUFBO0FBRWIsVUFBSSxRQUFRO0FBQUs7QUFBQTtBQUVqQixZQUFNLFNBQVMsS0FBSyxRQUFRLEVBQUUsYUFBYSxFQUFFLGFBQWEsS0FBSyxLQUFLO0FBQ3BFLFdBQUssWUFBWTtBQUNqQixRQUFFLGVBQWU7QUFDakIsV0FBSyxhQUFhO0FBQ2xCLFdBQUssYUFBYTtBQUNsQixRQUFFLFdBQVc7QUFDYixVQUFJLEVBQUUsWUFBWTtBQUNoQixVQUFFLGNBQWM7QUFBQTtBQUFBO0FBS3BCLDhCQUEwQixHQUFHO0FBQzNCLFlBQU0sZ0JBQWdCLEdBQUksRUFBRSxlQUFlLElBQUksRUFBRSxjQUFjLElBQUssRUFBRSxXQUFXLEVBQUUsYUFBYTtBQUNoRyxRQUFFLGNBQWMsRUFBRTtBQUNsQixvQkFBYyxFQUFFO0FBQUE7QUFJbEIsc0JBQWtCLEdBQUc7QUFDbkIsUUFBRSxZQUFZLEVBQUUsYUFBYTtBQUFBO0FBUy9CLHlCQUFxQixHQUFHO0FBR3RCLFFBQUUsWUFBWSxFQUFFLGFBQWMsTUFBTSxJQUFLO0FBQ3pDLFFBQUUsWUFBWSxFQUFFLGFBQWEsSUFBSTtBQUFBO0FBV25DLHNCQUFrQixNQUFNLEtBQUssT0FBTztBQUNsQyxVQUFJLE1BQU0sS0FBSztBQUVmLFVBQUksTUFBTTtBQUFRLGNBQU07QUFBQTtBQUN4QixVQUFJLFFBQVE7QUFBSyxlQUFPO0FBQUE7QUFFeEIsV0FBSyxZQUFZO0FBR2pCLFlBQU0sU0FBUyxLQUFLLEtBQUssT0FBTyxLQUFLLFNBQVMsS0FBSztBQUNuRCxVQUFJLEtBQUssTUFBTSxTQUFTO0FBQ3RCLGFBQUssUUFBUSxRQUFRLEtBQUssT0FBTyxLQUFLLEtBQUs7QUFBQSxpQkFHcEMsS0FBSyxNQUFNLFNBQVM7QUFDM0IsYUFBSyxRQUFRLE1BQU0sS0FBSyxPQUFPLEtBQUssS0FBSztBQUFBO0FBRzNDLFdBQUssV0FBVztBQUNoQixXQUFLLFlBQVk7QUFFakIsYUFBTztBQUFBO0FBYVQsMkJBQXVCLEdBQUc7QUFDeEIsVUFBSSxlQUFlLEVBQUU7QUFDckIsVUFBSSxPQUFPLEVBQUU7QUFDYixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUksV0FBVyxFQUFFO0FBQ2pCLFVBQUksYUFBYSxFQUFFO0FBQ25CLFVBQUksUUFBUyxFQUFFLFdBQVksRUFBRSxTQUFTLGdCQUNsQyxFQUFFLFdBQVksR0FBRSxTQUFTLGlCQUFpQjtBQUU5QyxVQUFJLE9BQU8sRUFBRTtBQUViLFVBQUksUUFBUSxFQUFFO0FBQ2QsVUFBSSxPQUFRLEVBQUU7QUFNZCxVQUFJLFNBQVMsRUFBRSxXQUFXO0FBQzFCLFVBQUksWUFBYSxLQUFLLE9BQU8sV0FBVztBQUN4QyxVQUFJLFdBQWEsS0FBSyxPQUFPO0FBUTdCLFVBQUksRUFBRSxlQUFlLEVBQUU7QUFDckIseUJBQWlCO0FBQUE7QUFLbkIsVUFBSSxhQUFhLEVBQUU7QUFBYSxxQkFBYSxFQUFFO0FBQUE7QUFJL0M7QUFFRSxnQkFBUTtBQVdSLFlBQUksS0FBSyxRQUFRLGNBQWtCLFlBQy9CLEtBQUssUUFBUSxXQUFXLE9BQU8sYUFDL0IsS0FBSyxXQUEwQixLQUFLLFNBQ3BDLEtBQUssRUFBRSxXQUF3QixLQUFLLE9BQU87QUFDN0M7QUFBQTtBQVNGLGdCQUFRO0FBQ1I7QUFNQTtBQUFBLGlCQUVTLEtBQUssRUFBRSxVQUFVLEtBQUssRUFBRSxVQUFVLEtBQUssRUFBRSxVQUFVLEtBQUssRUFBRSxVQUMxRCxLQUFLLEVBQUUsVUFBVSxLQUFLLEVBQUUsVUFBVSxLQUFLLEVBQUUsVUFBVSxLQUFLLEVBQUUsVUFDMUQsS0FBSyxFQUFFLFVBQVUsS0FBSyxFQUFFLFVBQVUsS0FBSyxFQUFFLFVBQVUsS0FBSyxFQUFFLFVBQzFELEtBQUssRUFBRSxVQUFVLEtBQUssRUFBRSxVQUFVLEtBQUssRUFBRSxVQUFVLEtBQUssRUFBRSxVQUMxRCxPQUFPO0FBSWhCLGNBQU0sWUFBYSxVQUFTO0FBQzVCLGVBQU8sU0FBUztBQUVoQixZQUFJLE1BQU07QUFDUixZQUFFLGNBQWM7QUFDaEIscUJBQVc7QUFDWCxjQUFJLE9BQU87QUFDVDtBQUFBO0FBRUYsc0JBQWEsS0FBSyxPQUFPLFdBQVc7QUFDcEMscUJBQWEsS0FBSyxPQUFPO0FBQUE7QUFBQSxlQUVuQixhQUFZLEtBQUssWUFBWSxVQUFVLFNBQVMsRUFBRSxpQkFBaUI7QUFFN0UsVUFBSSxZQUFZLEVBQUU7QUFDaEIsZUFBTztBQUFBO0FBRVQsYUFBTyxFQUFFO0FBQUE7QUFjWCx5QkFBcUI7QUFDbkIsVUFBSSxVQUFVLEVBQUU7QUFDaEIsVUFBSSxHQUFHLEdBQUcsR0FBRyxNQUFNO0FBSW5CO0FBQ0UsZUFBTyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUU7QUFvQnZDLFlBQUksRUFBRSxZQUFZLFVBQVcsV0FBVTtBQUVyQyxnQkFBTSxTQUFTLEVBQUUsUUFBUSxFQUFFLFFBQVEsU0FBUyxTQUFTO0FBQ3JELFlBQUUsZUFBZTtBQUNqQixZQUFFLFlBQVk7QUFFZCxZQUFFLGVBQWU7QUFTakIsY0FBSSxFQUFFO0FBQ04sY0FBSTtBQUNKO0FBQ0UsZ0JBQUksRUFBRSxLQUFLLEVBQUU7QUFDYixjQUFFLEtBQUssS0FBTSxLQUFLLFVBQVUsSUFBSSxVQUFVO0FBQUEsbUJBQ25DLEVBQUU7QUFFWCxjQUFJO0FBQ0osY0FBSTtBQUNKO0FBQ0UsZ0JBQUksRUFBRSxLQUFLLEVBQUU7QUFDYixjQUFFLEtBQUssS0FBTSxLQUFLLFVBQVUsSUFBSSxVQUFVO0FBQUEsbUJBSW5DLEVBQUU7QUFFWCxrQkFBUTtBQUFBO0FBRVYsWUFBSSxFQUFFLEtBQUssYUFBYTtBQUN0QjtBQUFBO0FBZUYsWUFBSSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsV0FBVztBQUN6RCxVQUFFLGFBQWE7QUFHZixZQUFJLEVBQUUsWUFBWSxFQUFFLFVBQVU7QUFDNUIsZ0JBQU0sRUFBRSxXQUFXLEVBQUU7QUFDckIsWUFBRSxRQUFRLEVBQUUsT0FBTztBQUduQixZQUFFLFFBQVUsR0FBRSxTQUFTLEVBQUUsYUFBYyxFQUFFLE9BQU8sTUFBTSxNQUFNLEVBQUU7QUFJOUQsaUJBQU8sRUFBRTtBQUVQLGNBQUUsUUFBVSxHQUFFLFNBQVMsRUFBRSxhQUFjLEVBQUUsT0FBTyxNQUFNLFlBQVksTUFBTSxFQUFFO0FBRTFFLGNBQUUsS0FBSyxNQUFNLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtBQUNsQyxjQUFFLEtBQUssRUFBRSxTQUFTO0FBQ2xCO0FBQ0EsY0FBRTtBQUNGLGdCQUFJLEVBQUUsWUFBWSxFQUFFLFNBQVM7QUFDM0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVFDLEVBQUUsWUFBWSxpQkFBaUIsRUFBRSxLQUFLLGFBQWE7QUFBQTtBQWlEOUQsNEJBQXdCLEdBQUc7QUFJekIsVUFBSSxpQkFBaUI7QUFFckIsVUFBSSxpQkFBaUIsRUFBRSxtQkFBbUI7QUFDeEMseUJBQWlCLEVBQUUsbUJBQW1CO0FBQUE7QUFJeEM7QUFFRSxZQUFJLEVBQUUsYUFBYTtBQVNqQixzQkFBWTtBQUNaLGNBQUksRUFBRSxjQUFjLEtBQUssVUFBVTtBQUNqQyxtQkFBTztBQUFBO0FBR1QsY0FBSSxFQUFFLGNBQWM7QUFDbEI7QUFBQTtBQUFBO0FBT0osVUFBRSxZQUFZLEVBQUU7QUFDaEIsVUFBRSxZQUFZO0FBR2QsWUFBSSxZQUFZLEVBQUUsY0FBYztBQUVoQyxZQUFJLEVBQUUsYUFBYSxLQUFLLEVBQUUsWUFBWTtBQUVwQyxZQUFFLFlBQVksRUFBRSxXQUFXO0FBQzNCLFlBQUUsV0FBVztBQUViLDJCQUFpQixHQUFHO0FBQ3BCLGNBQUksRUFBRSxLQUFLLGNBQWM7QUFDdkIsbUJBQU87QUFBQTtBQUFBO0FBU1gsWUFBSSxFQUFFLFdBQVcsRUFBRSxlQUFnQixFQUFFLFNBQVM7QUFFNUMsMkJBQWlCLEdBQUc7QUFDcEIsY0FBSSxFQUFFLEtBQUssY0FBYztBQUN2QixtQkFBTztBQUFBO0FBQUE7QUFBQTtBQU1iLFFBQUUsU0FBUztBQUVYLFVBQUksVUFBVTtBQUVaLHlCQUFpQixHQUFHO0FBQ3BCLFlBQUksRUFBRSxLQUFLLGNBQWM7QUFDdkIsaUJBQU87QUFBQTtBQUdULGVBQU87QUFBQTtBQUdULFVBQUksRUFBRSxXQUFXLEVBQUU7QUFFakIseUJBQWlCLEdBQUc7QUFDcEIsWUFBSSxFQUFFLEtBQUssY0FBYztBQUN2QixpQkFBTztBQUFBO0FBQUE7QUFLWCxhQUFPO0FBQUE7QUFVVCwwQkFBc0IsR0FBRztBQUN2QixVQUFJO0FBQ0osVUFBSTtBQUVKO0FBTUUsWUFBSSxFQUFFLFlBQVk7QUFDaEIsc0JBQVk7QUFDWixjQUFJLEVBQUUsWUFBWSxpQkFBaUIsVUFBVTtBQUMzQyxtQkFBTztBQUFBO0FBRVQsY0FBSSxFQUFFLGNBQWM7QUFDbEI7QUFBQTtBQUFBO0FBT0osb0JBQVk7QUFDWixZQUFJLEVBQUUsYUFBYTtBQUVqQixZQUFFLFFBQVUsR0FBRSxTQUFTLEVBQUUsYUFBYyxFQUFFLE9BQU8sRUFBRSxXQUFXLFlBQVksTUFBTSxFQUFFO0FBQ2pGLHNCQUFZLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFO0FBQ3JELFlBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRTtBQUFBO0FBT3RCLFlBQUksY0FBYyxLQUFjLEVBQUUsV0FBVyxhQUFlLEVBQUUsU0FBUztBQUtyRSxZQUFFLGVBQWUsY0FBYyxHQUFHO0FBQUE7QUFHcEMsWUFBSSxFQUFFLGdCQUFnQjtBQUtwQixtQkFBUyxNQUFNLFVBQVUsR0FBRyxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsZUFBZTtBQUV6RSxZQUFFLGFBQWEsRUFBRTtBQUtqQixjQUFJLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQXVDLEVBQUUsYUFBYTtBQUM1RSxjQUFFO0FBQ0Y7QUFDRSxnQkFBRTtBQUVGLGdCQUFFLFFBQVUsR0FBRSxTQUFTLEVBQUUsYUFBYyxFQUFFLE9BQU8sRUFBRSxXQUFXLFlBQVksTUFBTSxFQUFFO0FBQ2pGLDBCQUFZLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFO0FBQ3JELGdCQUFFLEtBQUssRUFBRSxTQUFTLEVBQUU7QUFBQSxxQkFLYixFQUFFLEVBQUUsaUJBQWlCO0FBQzlCLGNBQUU7QUFBQTtBQUdGLGNBQUUsWUFBWSxFQUFFO0FBQ2hCLGNBQUUsZUFBZTtBQUNqQixjQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUU7QUFFckIsY0FBRSxRQUFVLEdBQUUsU0FBUyxFQUFFLGFBQWMsRUFBRSxPQUFPLEVBQUUsV0FBVyxNQUFNLEVBQUU7QUFBQTtBQUFBO0FBYXZFLG1CQUFTLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRSxPQUFPLEVBQUU7QUFFMUMsWUFBRTtBQUNGLFlBQUU7QUFBQTtBQUVKLFlBQUk7QUFFRiwyQkFBaUIsR0FBRztBQUNwQixjQUFJLEVBQUUsS0FBSyxjQUFjO0FBQ3ZCLG1CQUFPO0FBQUE7QUFBQTtBQUFBO0FBS2IsUUFBRSxTQUFXLEVBQUUsV0FBWSxZQUFZLElBQU0sRUFBRSxXQUFXLFlBQVk7QUFDdEUsVUFBSSxVQUFVO0FBRVoseUJBQWlCLEdBQUc7QUFDcEIsWUFBSSxFQUFFLEtBQUssY0FBYztBQUN2QixpQkFBTztBQUFBO0FBR1QsZUFBTztBQUFBO0FBRVQsVUFBSSxFQUFFO0FBRUoseUJBQWlCLEdBQUc7QUFDcEIsWUFBSSxFQUFFLEtBQUssY0FBYztBQUN2QixpQkFBTztBQUFBO0FBQUE7QUFJWCxhQUFPO0FBQUE7QUFRVCwwQkFBc0IsR0FBRztBQUN2QixVQUFJO0FBQ0osVUFBSTtBQUVKLFVBQUk7QUFHSjtBQU1FLFlBQUksRUFBRSxZQUFZO0FBQ2hCLHNCQUFZO0FBQ1osY0FBSSxFQUFFLFlBQVksaUJBQWlCLFVBQVU7QUFDM0MsbUJBQU87QUFBQTtBQUVULGNBQUksRUFBRSxjQUFjO0FBQUs7QUFBQTtBQUFBO0FBTTNCLG9CQUFZO0FBQ1osWUFBSSxFQUFFLGFBQWE7QUFFakIsWUFBRSxRQUFVLEdBQUUsU0FBUyxFQUFFLGFBQWMsRUFBRSxPQUFPLEVBQUUsV0FBVyxZQUFZLE1BQU0sRUFBRTtBQUNqRixzQkFBWSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtBQUNyRCxZQUFFLEtBQUssRUFBRSxTQUFTLEVBQUU7QUFBQTtBQU10QixVQUFFLGNBQWMsRUFBRTtBQUNsQixVQUFFLGFBQWEsRUFBRTtBQUNqQixVQUFFLGVBQWUsWUFBWTtBQUU3QixZQUFJLGNBQWMsS0FBWSxFQUFFLGNBQWMsRUFBRSxrQkFDNUMsRUFBRSxXQUFXLGFBQWMsRUFBRSxTQUFTO0FBS3hDLFlBQUUsZUFBZSxjQUFjLEdBQUc7QUFHbEMsY0FBSSxFQUFFLGdCQUFnQixLQUNsQixHQUFFLGFBQWEsY0FBZSxFQUFFLGlCQUFpQixhQUFhLEVBQUUsV0FBVyxFQUFFLGNBQWM7QUFLN0YsY0FBRSxlQUFlLFlBQVk7QUFBQTtBQUFBO0FBTWpDLFlBQUksRUFBRSxlQUFlLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRTtBQUNwRCx1QkFBYSxFQUFFLFdBQVcsRUFBRSxZQUFZO0FBT3hDLG1CQUFTLE1BQU0sVUFBVSxHQUFHLEVBQUUsV0FBVyxJQUFJLEVBQUUsWUFBWSxFQUFFLGNBQWM7QUFNM0UsWUFBRSxhQUFhLEVBQUUsY0FBYztBQUMvQixZQUFFLGVBQWU7QUFDakI7QUFDRSxnQkFBSSxFQUFFLEVBQUUsWUFBWTtBQUVsQixnQkFBRSxRQUFVLEdBQUUsU0FBUyxFQUFFLGFBQWMsRUFBRSxPQUFPLEVBQUUsV0FBVyxZQUFZLE1BQU0sRUFBRTtBQUNqRiwwQkFBWSxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRTtBQUNyRCxnQkFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFO0FBQUE7QUFBQSxtQkFHZixFQUFFLEVBQUUsZ0JBQWdCO0FBQzdCLFlBQUUsa0JBQWtCO0FBQ3BCLFlBQUUsZUFBZSxZQUFZO0FBQzdCLFlBQUU7QUFFRixjQUFJO0FBRUYsNkJBQWlCLEdBQUc7QUFDcEIsZ0JBQUksRUFBRSxLQUFLLGNBQWM7QUFDdkIscUJBQU87QUFBQTtBQUFBO0FBQUEsbUJBS0YsRUFBRTtBQU9YLG1CQUFTLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRSxPQUFPLEVBQUUsV0FBVztBQUVyRCxjQUFJO0FBRUYsNkJBQWlCLEdBQUc7QUFBQTtBQUd0QixZQUFFO0FBQ0YsWUFBRTtBQUNGLGNBQUksRUFBRSxLQUFLLGNBQWM7QUFDdkIsbUJBQU87QUFBQTtBQUFBO0FBTVQsWUFBRSxrQkFBa0I7QUFDcEIsWUFBRTtBQUNGLFlBQUU7QUFBQTtBQUFBO0FBSU4sVUFBSSxFQUFFO0FBR0osaUJBQVMsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFLE9BQU8sRUFBRSxXQUFXO0FBRXJELFVBQUUsa0JBQWtCO0FBQUE7QUFFdEIsUUFBRSxTQUFTLEVBQUUsV0FBVyxZQUFZLElBQUksRUFBRSxXQUFXLFlBQVk7QUFDakUsVUFBSSxVQUFVO0FBRVoseUJBQWlCLEdBQUc7QUFDcEIsWUFBSSxFQUFFLEtBQUssY0FBYztBQUN2QixpQkFBTztBQUFBO0FBR1QsZUFBTztBQUFBO0FBRVQsVUFBSSxFQUFFO0FBRUoseUJBQWlCLEdBQUc7QUFDcEIsWUFBSSxFQUFFLEtBQUssY0FBYztBQUN2QixpQkFBTztBQUFBO0FBQUE7QUFLWCxhQUFPO0FBQUE7QUFTVCx5QkFBcUIsR0FBRztBQUN0QixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUksTUFBTTtBQUVWLFVBQUksT0FBTyxFQUFFO0FBRWI7QUFLRSxZQUFJLEVBQUUsYUFBYTtBQUNqQixzQkFBWTtBQUNaLGNBQUksRUFBRSxhQUFhLGFBQWEsVUFBVTtBQUN4QyxtQkFBTztBQUFBO0FBRVQsY0FBSSxFQUFFLGNBQWM7QUFBSztBQUFBO0FBQUE7QUFJM0IsVUFBRSxlQUFlO0FBQ2pCLFlBQUksRUFBRSxhQUFhLGFBQWEsRUFBRSxXQUFXO0FBQzNDLGlCQUFPLEVBQUUsV0FBVztBQUNwQixpQkFBTyxLQUFLO0FBQ1osY0FBSSxTQUFTLEtBQUssRUFBRSxTQUFTLFNBQVMsS0FBSyxFQUFFLFNBQVMsU0FBUyxLQUFLLEVBQUU7QUFDcEUscUJBQVMsRUFBRSxXQUFXO0FBQ3RCO0FBQUEscUJBRVMsU0FBUyxLQUFLLEVBQUUsU0FBUyxTQUFTLEtBQUssRUFBRSxTQUN6QyxTQUFTLEtBQUssRUFBRSxTQUFTLFNBQVMsS0FBSyxFQUFFLFNBQ3pDLFNBQVMsS0FBSyxFQUFFLFNBQVMsU0FBUyxLQUFLLEVBQUUsU0FDekMsU0FBUyxLQUFLLEVBQUUsU0FBUyxTQUFTLEtBQUssRUFBRSxTQUN6QyxPQUFPO0FBQ2hCLGNBQUUsZUFBZSxZQUFhLFVBQVM7QUFDdkMsZ0JBQUksRUFBRSxlQUFlLEVBQUU7QUFDckIsZ0JBQUUsZUFBZSxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBT3pCLFlBQUksRUFBRSxnQkFBZ0I7QUFJcEIsbUJBQVMsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFLGVBQWU7QUFFaEQsWUFBRSxhQUFhLEVBQUU7QUFDakIsWUFBRSxZQUFZLEVBQUU7QUFDaEIsWUFBRSxlQUFlO0FBQUE7QUFLakIsbUJBQVMsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFLE9BQU8sRUFBRTtBQUUxQyxZQUFFO0FBQ0YsWUFBRTtBQUFBO0FBRUosWUFBSTtBQUVGLDJCQUFpQixHQUFHO0FBQ3BCLGNBQUksRUFBRSxLQUFLLGNBQWM7QUFDdkIsbUJBQU87QUFBQTtBQUFBO0FBQUE7QUFLYixRQUFFLFNBQVM7QUFDWCxVQUFJLFVBQVU7QUFFWix5QkFBaUIsR0FBRztBQUNwQixZQUFJLEVBQUUsS0FBSyxjQUFjO0FBQ3ZCLGlCQUFPO0FBQUE7QUFHVCxlQUFPO0FBQUE7QUFFVCxVQUFJLEVBQUU7QUFFSix5QkFBaUIsR0FBRztBQUNwQixZQUFJLEVBQUUsS0FBSyxjQUFjO0FBQ3ZCLGlCQUFPO0FBQUE7QUFBQTtBQUlYLGFBQU87QUFBQTtBQU9ULDBCQUFzQixHQUFHO0FBQ3ZCLFVBQUk7QUFFSjtBQUVFLFlBQUksRUFBRSxjQUFjO0FBQ2xCLHNCQUFZO0FBQ1osY0FBSSxFQUFFLGNBQWM7QUFDbEIsZ0JBQUksVUFBVTtBQUNaLHFCQUFPO0FBQUE7QUFFVDtBQUFBO0FBQUE7QUFLSixVQUFFLGVBQWU7QUFHakIsaUJBQVMsTUFBTSxVQUFVLEdBQUcsR0FBRyxFQUFFLE9BQU8sRUFBRTtBQUMxQyxVQUFFO0FBQ0YsVUFBRTtBQUNGLFlBQUk7QUFFRiwyQkFBaUIsR0FBRztBQUNwQixjQUFJLEVBQUUsS0FBSyxjQUFjO0FBQ3ZCLG1CQUFPO0FBQUE7QUFBQTtBQUFBO0FBS2IsUUFBRSxTQUFTO0FBQ1gsVUFBSSxVQUFVO0FBRVoseUJBQWlCLEdBQUc7QUFDcEIsWUFBSSxFQUFFLEtBQUssY0FBYztBQUN2QixpQkFBTztBQUFBO0FBR1QsZUFBTztBQUFBO0FBRVQsVUFBSSxFQUFFO0FBRUoseUJBQWlCLEdBQUc7QUFDcEIsWUFBSSxFQUFFLEtBQUssY0FBYztBQUN2QixpQkFBTztBQUFBO0FBQUE7QUFJWCxhQUFPO0FBQUE7QUFRVCxvQkFBZ0IsYUFBYSxVQUFVLGFBQWEsV0FBVztBQUM3RCxXQUFLLGNBQWM7QUFDbkIsV0FBSyxXQUFXO0FBQ2hCLFdBQUssY0FBYztBQUNuQixXQUFLLFlBQVk7QUFDakIsV0FBSyxPQUFPO0FBQUE7QUFHZCxRQUFJO0FBRUosMEJBQXNCO0FBQUEsTUFFcEIsSUFBSSxPQUFPLEdBQUcsR0FBRyxHQUFHLEdBQUc7QUFBQSxNQUN2QixJQUFJLE9BQU8sR0FBRyxHQUFHLEdBQUcsR0FBRztBQUFBLE1BQ3ZCLElBQUksT0FBTyxHQUFHLEdBQUcsSUFBSSxHQUFHO0FBQUEsTUFDeEIsSUFBSSxPQUFPLEdBQUcsR0FBRyxJQUFJLElBQUk7QUFBQSxNQUV6QixJQUFJLE9BQU8sR0FBRyxHQUFHLElBQUksSUFBSTtBQUFBLE1BQ3pCLElBQUksT0FBTyxHQUFHLElBQUksSUFBSSxJQUFJO0FBQUEsTUFDMUIsSUFBSSxPQUFPLEdBQUcsSUFBSSxLQUFLLEtBQUs7QUFBQSxNQUM1QixJQUFJLE9BQU8sR0FBRyxJQUFJLEtBQUssS0FBSztBQUFBLE1BQzVCLElBQUksT0FBTyxJQUFJLEtBQUssS0FBSyxNQUFNO0FBQUEsTUFDL0IsSUFBSSxPQUFPLElBQUksS0FBSyxLQUFLLE1BQU07QUFBQTtBQU9qQyxxQkFBaUI7QUFDZixRQUFFLGNBQWMsSUFBSSxFQUFFO0FBR3RCLFdBQUssRUFBRTtBQUlQLFFBQUUsaUJBQWlCLG9CQUFvQixFQUFFLE9BQU87QUFDaEQsUUFBRSxhQUFhLG9CQUFvQixFQUFFLE9BQU87QUFDNUMsUUFBRSxhQUFhLG9CQUFvQixFQUFFLE9BQU87QUFDNUMsUUFBRSxtQkFBbUIsb0JBQW9CLEVBQUUsT0FBTztBQUVsRCxRQUFFLFdBQVc7QUFDYixRQUFFLGNBQWM7QUFDaEIsUUFBRSxZQUFZO0FBQ2QsUUFBRSxTQUFTO0FBQ1gsUUFBRSxlQUFlLEVBQUUsY0FBYyxZQUFZO0FBQzdDLFFBQUUsa0JBQWtCO0FBQ3BCLFFBQUUsUUFBUTtBQUFBO0FBSVo7QUFDRSxXQUFLLE9BQU87QUFDWixXQUFLLFNBQVM7QUFDZCxXQUFLLGNBQWM7QUFDbkIsV0FBSyxtQkFBbUI7QUFDeEIsV0FBSyxjQUFjO0FBQ25CLFdBQUssVUFBVTtBQUNmLFdBQUssT0FBTztBQUNaLFdBQUssU0FBUztBQUNkLFdBQUssVUFBVTtBQUNmLFdBQUssU0FBUztBQUNkLFdBQUssYUFBYTtBQUVsQixXQUFLLFNBQVM7QUFDZCxXQUFLLFNBQVM7QUFDZCxXQUFLLFNBQVM7QUFFZCxXQUFLLFNBQVM7QUFRZCxXQUFLLGNBQWM7QUFLbkIsV0FBSyxPQUFPO0FBTVosV0FBSyxPQUFPO0FBRVosV0FBSyxRQUFRO0FBQ2IsV0FBSyxZQUFZO0FBQ2pCLFdBQUssWUFBWTtBQUNqQixXQUFLLFlBQVk7QUFFakIsV0FBSyxhQUFhO0FBT2xCLFdBQUssY0FBYztBQUtuQixXQUFLLGVBQWU7QUFDcEIsV0FBSyxhQUFhO0FBQ2xCLFdBQUssa0JBQWtCO0FBQ3ZCLFdBQUssV0FBVztBQUNoQixXQUFLLGNBQWM7QUFDbkIsV0FBSyxZQUFZO0FBRWpCLFdBQUssY0FBYztBQUtuQixXQUFLLG1CQUFtQjtBQU14QixXQUFLLGlCQUFpQjtBQVl0QixXQUFLLFFBQVE7QUFDYixXQUFLLFdBQVc7QUFFaEIsV0FBSyxhQUFhO0FBR2xCLFdBQUssYUFBYTtBQVlsQixXQUFLLFlBQWEsSUFBSSxNQUFNLE1BQU0sWUFBWTtBQUM5QyxXQUFLLFlBQWEsSUFBSSxNQUFNLE1BQU8sS0FBSSxVQUFVLEtBQUs7QUFDdEQsV0FBSyxVQUFhLElBQUksTUFBTSxNQUFPLEtBQUksV0FBVyxLQUFLO0FBQ3ZELFdBQUssS0FBSztBQUNWLFdBQUssS0FBSztBQUNWLFdBQUssS0FBSztBQUVWLFdBQUssU0FBVztBQUNoQixXQUFLLFNBQVc7QUFDaEIsV0FBSyxVQUFXO0FBR2hCLFdBQUssV0FBVyxJQUFJLE1BQU0sTUFBTSxXQUFXO0FBSTNDLFdBQUssT0FBTyxJQUFJLE1BQU0sTUFBTSxJQUFJLFVBQVU7QUFDMUMsV0FBSyxLQUFLO0FBRVYsV0FBSyxXQUFXO0FBQ2hCLFdBQUssV0FBVztBQUtoQixXQUFLLFFBQVEsSUFBSSxNQUFNLE1BQU0sSUFBSSxVQUFVO0FBQzNDLFdBQUssS0FBSztBQUlWLFdBQUssUUFBUTtBQUViLFdBQUssY0FBYztBQW9CbkIsV0FBSyxXQUFXO0FBRWhCLFdBQUssUUFBUTtBQU1iLFdBQUssVUFBVTtBQUNmLFdBQUssYUFBYTtBQUNsQixXQUFLLFVBQVU7QUFDZixXQUFLLFNBQVM7QUFHZCxXQUFLLFNBQVM7QUFJZCxXQUFLLFdBQVc7QUFBQTtBQWdCbEIsOEJBQTBCO0FBQ3hCLFVBQUk7QUFFSixVQUFJLENBQUMsUUFBUSxDQUFDLEtBQUs7QUFDakIsZUFBTyxJQUFJLE1BQU07QUFBQTtBQUduQixXQUFLLFdBQVcsS0FBSyxZQUFZO0FBQ2pDLFdBQUssWUFBWTtBQUVqQixVQUFJLEtBQUs7QUFDVCxRQUFFLFVBQVU7QUFDWixRQUFFLGNBQWM7QUFFaEIsVUFBSSxFQUFFLE9BQU87QUFDWCxVQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQUE7QUFHZCxRQUFFLFNBQVUsRUFBRSxPQUFPLGFBQWE7QUFDbEMsV0FBSyxRQUFTLEVBQUUsU0FBUyxJQUN2QixJQUVBO0FBQ0YsUUFBRSxhQUFhO0FBQ2YsWUFBTSxTQUFTO0FBQ2YsYUFBTztBQUFBO0FBSVQsMEJBQXNCO0FBQ3BCLFVBQUksTUFBTSxpQkFBaUI7QUFDM0IsVUFBSSxRQUFRO0FBQ1YsZ0JBQVEsS0FBSztBQUFBO0FBRWYsYUFBTztBQUFBO0FBSVQsOEJBQTBCLE1BQU07QUFDOUIsVUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO0FBQVMsZUFBTztBQUFBO0FBQ25DLFVBQUksS0FBSyxNQUFNLFNBQVM7QUFBSyxlQUFPO0FBQUE7QUFDcEMsV0FBSyxNQUFNLFNBQVM7QUFDcEIsYUFBTztBQUFBO0FBSVQsMEJBQXNCLE1BQU0sT0FBTyxRQUFRLFlBQVksVUFBVTtBQUMvRCxVQUFJLENBQUM7QUFDSCxlQUFPO0FBQUE7QUFFVCxVQUFJLE9BQU87QUFFWCxVQUFJLFVBQVU7QUFDWixnQkFBUTtBQUFBO0FBR1YsVUFBSSxhQUFhO0FBQ2YsZUFBTztBQUNQLHFCQUFhLENBQUM7QUFBQSxpQkFHUCxhQUFhO0FBQ3BCLGVBQU87QUFDUCxzQkFBYztBQUFBO0FBSWhCLFVBQUksV0FBVyxLQUFLLFdBQVcsaUJBQWlCLFdBQVcsY0FDekQsYUFBYSxLQUFLLGFBQWEsTUFBTSxRQUFRLEtBQUssUUFBUSxLQUMxRCxXQUFXLEtBQUssV0FBVztBQUMzQixlQUFPLElBQUksTUFBTTtBQUFBO0FBSW5CLFVBQUksZUFBZTtBQUNqQixxQkFBYTtBQUFBO0FBSWYsVUFBSSxJQUFJLElBQUk7QUFFWixXQUFLLFFBQVE7QUFDYixRQUFFLE9BQU87QUFFVCxRQUFFLE9BQU87QUFDVCxRQUFFLFNBQVM7QUFDWCxRQUFFLFNBQVM7QUFDWCxRQUFFLFNBQVMsS0FBSyxFQUFFO0FBQ2xCLFFBQUUsU0FBUyxFQUFFLFNBQVM7QUFFdEIsUUFBRSxZQUFZLFdBQVc7QUFDekIsUUFBRSxZQUFZLEtBQUssRUFBRTtBQUNyQixRQUFFLFlBQVksRUFBRSxZQUFZO0FBQzVCLFFBQUUsYUFBYSxDQUFDLENBQUcsSUFBRSxZQUFZLFlBQVksS0FBSztBQUVsRCxRQUFFLFNBQVMsSUFBSSxNQUFNLEtBQUssRUFBRSxTQUFTO0FBQ3JDLFFBQUUsT0FBTyxJQUFJLE1BQU0sTUFBTSxFQUFFO0FBQzNCLFFBQUUsT0FBTyxJQUFJLE1BQU0sTUFBTSxFQUFFO0FBSzNCLFFBQUUsY0FBYyxLQUFNLFdBQVc7QUFFakMsUUFBRSxtQkFBbUIsRUFBRSxjQUFjO0FBSXJDLFFBQUUsY0FBYyxJQUFJLE1BQU0sS0FBSyxFQUFFO0FBSWpDLFFBQUUsUUFBUSxJQUFJLEVBQUU7QUFHaEIsUUFBRSxRQUFTLEtBQUksS0FBSyxFQUFFO0FBRXRCLFFBQUUsUUFBUTtBQUNWLFFBQUUsV0FBVztBQUNiLFFBQUUsU0FBUztBQUVYLGFBQU8sYUFBYTtBQUFBO0FBR3RCLHlCQUFxQixNQUFNO0FBQ3pCLGFBQU8sYUFBYSxNQUFNLE9BQU8sWUFBWSxXQUFXLGVBQWU7QUFBQTtBQUl6RSxxQkFBaUIsTUFBTTtBQUNyQixVQUFJLFdBQVc7QUFDZixVQUFJLEtBQUs7QUFFVCxVQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssU0FDakIsUUFBUSxXQUFXLFFBQVE7QUFDM0IsZUFBTyxPQUFPLElBQUksTUFBTSxrQkFBa0I7QUFBQTtBQUc1QyxVQUFJLEtBQUs7QUFFVCxVQUFJLENBQUMsS0FBSyxVQUNMLENBQUMsS0FBSyxTQUFTLEtBQUssYUFBYSxLQUNqQyxFQUFFLFdBQVcsZ0JBQWdCLFVBQVU7QUFDMUMsZUFBTyxJQUFJLE1BQU8sS0FBSyxjQUFjLElBQUssY0FBYztBQUFBO0FBRzFELFFBQUUsT0FBTztBQUNULGtCQUFZLEVBQUU7QUFDZCxRQUFFLGFBQWE7QUFHZixVQUFJLEVBQUUsV0FBVztBQUVmLFlBQUksRUFBRSxTQUFTO0FBQ2IsZUFBSyxRQUFRO0FBQ2IsbUJBQVMsR0FBRztBQUNaLG1CQUFTLEdBQUc7QUFDWixtQkFBUyxHQUFHO0FBQ1osY0FBSSxDQUFDLEVBQUU7QUFDTCxxQkFBUyxHQUFHO0FBQ1oscUJBQVMsR0FBRztBQUNaLHFCQUFTLEdBQUc7QUFDWixxQkFBUyxHQUFHO0FBQ1oscUJBQVMsR0FBRztBQUNaLHFCQUFTLEdBQUcsRUFBRSxVQUFVLElBQUksSUFDZixFQUFFLFlBQVksa0JBQWtCLEVBQUUsUUFBUSxJQUMxQyxJQUFJO0FBQ2pCLHFCQUFTLEdBQUc7QUFDWixjQUFFLFNBQVM7QUFBQTtBQUdYLHFCQUFTLEdBQUksR0FBRSxPQUFPLE9BQU8sSUFBSSxLQUNwQixHQUFFLE9BQU8sT0FBTyxJQUFJLEtBQ3BCLEVBQUMsRUFBRSxPQUFPLFFBQVEsSUFBSSxLQUN0QixFQUFDLEVBQUUsT0FBTyxPQUFPLElBQUksS0FDckIsRUFBQyxFQUFFLE9BQU8sVUFBVSxJQUFJO0FBRXJDLHFCQUFTLEdBQUcsRUFBRSxPQUFPLE9BQU87QUFDNUIscUJBQVMsR0FBSSxFQUFFLE9BQU8sUUFBUSxJQUFLO0FBQ25DLHFCQUFTLEdBQUksRUFBRSxPQUFPLFFBQVEsS0FBTTtBQUNwQyxxQkFBUyxHQUFJLEVBQUUsT0FBTyxRQUFRLEtBQU07QUFDcEMscUJBQVMsR0FBRyxFQUFFLFVBQVUsSUFBSSxJQUNmLEVBQUUsWUFBWSxrQkFBa0IsRUFBRSxRQUFRLElBQzFDLElBQUk7QUFDakIscUJBQVMsR0FBRyxFQUFFLE9BQU8sS0FBSztBQUMxQixnQkFBSSxFQUFFLE9BQU8sU0FBUyxFQUFFLE9BQU8sTUFBTTtBQUNuQyx1QkFBUyxHQUFHLEVBQUUsT0FBTyxNQUFNLFNBQVM7QUFDcEMsdUJBQVMsR0FBSSxFQUFFLE9BQU8sTUFBTSxVQUFVLElBQUs7QUFBQTtBQUU3QyxnQkFBSSxFQUFFLE9BQU87QUFDWCxtQkFBSyxRQUFRLE1BQU0sS0FBSyxPQUFPLEVBQUUsYUFBYSxFQUFFLFNBQVM7QUFBQTtBQUUzRCxjQUFFLFVBQVU7QUFDWixjQUFFLFNBQVM7QUFBQTtBQUFBO0FBS2IsY0FBSSxTQUFVLGFBQWUsR0FBRSxTQUFTLEtBQU0sTUFBTztBQUNyRCxjQUFJLGNBQWM7QUFFbEIsY0FBSSxFQUFFLFlBQVksa0JBQWtCLEVBQUUsUUFBUTtBQUM1QywwQkFBYztBQUFBLHFCQUNMLEVBQUUsUUFBUTtBQUNuQiwwQkFBYztBQUFBLHFCQUNMLEVBQUUsVUFBVTtBQUNyQiwwQkFBYztBQUFBO0FBRWQsMEJBQWM7QUFBQTtBQUVoQixvQkFBVyxlQUFlO0FBQzFCLGNBQUksRUFBRSxhQUFhO0FBQUssc0JBQVU7QUFBQTtBQUNsQyxvQkFBVSxLQUFNLFNBQVM7QUFFekIsWUFBRSxTQUFTO0FBQ1gsc0JBQVksR0FBRztBQUdmLGNBQUksRUFBRSxhQUFhO0FBQ2pCLHdCQUFZLEdBQUcsS0FBSyxVQUFVO0FBQzlCLHdCQUFZLEdBQUcsS0FBSyxRQUFRO0FBQUE7QUFFOUIsZUFBSyxRQUFRO0FBQUE7QUFBQTtBQUtqQixVQUFJLEVBQUUsV0FBVztBQUNmLFlBQUksRUFBRSxPQUFPO0FBQ1gsZ0JBQU0sRUFBRTtBQUVSLGlCQUFPLEVBQUUsVUFBVyxHQUFFLE9BQU8sTUFBTSxTQUFTO0FBQzFDLGdCQUFJLEVBQUUsWUFBWSxFQUFFO0FBQ2xCLGtCQUFJLEVBQUUsT0FBTyxRQUFRLEVBQUUsVUFBVTtBQUMvQixxQkFBSyxRQUFRLE1BQU0sS0FBSyxPQUFPLEVBQUUsYUFBYSxFQUFFLFVBQVUsS0FBSztBQUFBO0FBRWpFLDRCQUFjO0FBQ2Qsb0JBQU0sRUFBRTtBQUNSLGtCQUFJLEVBQUUsWUFBWSxFQUFFO0FBQ2xCO0FBQUE7QUFBQTtBQUdKLHFCQUFTLEdBQUcsRUFBRSxPQUFPLE1BQU0sRUFBRSxXQUFXO0FBQ3hDLGNBQUU7QUFBQTtBQUVKLGNBQUksRUFBRSxPQUFPLFFBQVEsRUFBRSxVQUFVO0FBQy9CLGlCQUFLLFFBQVEsTUFBTSxLQUFLLE9BQU8sRUFBRSxhQUFhLEVBQUUsVUFBVSxLQUFLO0FBQUE7QUFFakUsY0FBSSxFQUFFLFlBQVksRUFBRSxPQUFPLE1BQU07QUFDL0IsY0FBRSxVQUFVO0FBQ1osY0FBRSxTQUFTO0FBQUE7QUFBQTtBQUliLFlBQUUsU0FBUztBQUFBO0FBQUE7QUFHZixVQUFJLEVBQUUsV0FBVztBQUNmLFlBQUksRUFBRSxPQUFPO0FBQ1gsZ0JBQU0sRUFBRTtBQUdSO0FBQ0UsZ0JBQUksRUFBRSxZQUFZLEVBQUU7QUFDbEIsa0JBQUksRUFBRSxPQUFPLFFBQVEsRUFBRSxVQUFVO0FBQy9CLHFCQUFLLFFBQVEsTUFBTSxLQUFLLE9BQU8sRUFBRSxhQUFhLEVBQUUsVUFBVSxLQUFLO0FBQUE7QUFFakUsNEJBQWM7QUFDZCxvQkFBTSxFQUFFO0FBQ1Isa0JBQUksRUFBRSxZQUFZLEVBQUU7QUFDbEIsc0JBQU07QUFDTjtBQUFBO0FBQUE7QUFJSixnQkFBSSxFQUFFLFVBQVUsRUFBRSxPQUFPLEtBQUs7QUFDNUIsb0JBQU0sRUFBRSxPQUFPLEtBQUssV0FBVyxFQUFFLGFBQWE7QUFBQTtBQUU5QyxvQkFBTTtBQUFBO0FBRVIscUJBQVMsR0FBRztBQUFBLG1CQUNMLFFBQVE7QUFFakIsY0FBSSxFQUFFLE9BQU8sUUFBUSxFQUFFLFVBQVU7QUFDL0IsaUJBQUssUUFBUSxNQUFNLEtBQUssT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEtBQUs7QUFBQTtBQUVqRSxjQUFJLFFBQVE7QUFDVixjQUFFLFVBQVU7QUFDWixjQUFFLFNBQVM7QUFBQTtBQUFBO0FBSWIsWUFBRSxTQUFTO0FBQUE7QUFBQTtBQUdmLFVBQUksRUFBRSxXQUFXO0FBQ2YsWUFBSSxFQUFFLE9BQU87QUFDWCxnQkFBTSxFQUFFO0FBR1I7QUFDRSxnQkFBSSxFQUFFLFlBQVksRUFBRTtBQUNsQixrQkFBSSxFQUFFLE9BQU8sUUFBUSxFQUFFLFVBQVU7QUFDL0IscUJBQUssUUFBUSxNQUFNLEtBQUssT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEtBQUs7QUFBQTtBQUVqRSw0QkFBYztBQUNkLG9CQUFNLEVBQUU7QUFDUixrQkFBSSxFQUFFLFlBQVksRUFBRTtBQUNsQixzQkFBTTtBQUNOO0FBQUE7QUFBQTtBQUlKLGdCQUFJLEVBQUUsVUFBVSxFQUFFLE9BQU8sUUFBUTtBQUMvQixvQkFBTSxFQUFFLE9BQU8sUUFBUSxXQUFXLEVBQUUsYUFBYTtBQUFBO0FBRWpELG9CQUFNO0FBQUE7QUFFUixxQkFBUyxHQUFHO0FBQUEsbUJBQ0wsUUFBUTtBQUVqQixjQUFJLEVBQUUsT0FBTyxRQUFRLEVBQUUsVUFBVTtBQUMvQixpQkFBSyxRQUFRLE1BQU0sS0FBSyxPQUFPLEVBQUUsYUFBYSxFQUFFLFVBQVUsS0FBSztBQUFBO0FBRWpFLGNBQUksUUFBUTtBQUNWLGNBQUUsU0FBUztBQUFBO0FBQUE7QUFJYixZQUFFLFNBQVM7QUFBQTtBQUFBO0FBR2YsVUFBSSxFQUFFLFdBQVc7QUFDZixZQUFJLEVBQUUsT0FBTztBQUNYLGNBQUksRUFBRSxVQUFVLElBQUksRUFBRTtBQUNwQiwwQkFBYztBQUFBO0FBRWhCLGNBQUksRUFBRSxVQUFVLEtBQUssRUFBRTtBQUNyQixxQkFBUyxHQUFHLEtBQUssUUFBUTtBQUN6QixxQkFBUyxHQUFJLEtBQUssU0FBUyxJQUFLO0FBQ2hDLGlCQUFLLFFBQVE7QUFDYixjQUFFLFNBQVM7QUFBQTtBQUFBO0FBSWIsWUFBRSxTQUFTO0FBQUE7QUFBQTtBQU1mLFVBQUksRUFBRSxZQUFZO0FBQ2hCLHNCQUFjO0FBQ2QsWUFBSSxLQUFLLGNBQWM7QUFPckIsWUFBRSxhQUFhO0FBQ2YsaUJBQU87QUFBQTtBQUFBLGlCQU9BLEtBQUssYUFBYSxLQUFLLEtBQUssVUFBVSxLQUFLLGNBQ3BELFVBQVU7QUFDVixlQUFPLElBQUksTUFBTTtBQUFBO0FBSW5CLFVBQUksRUFBRSxXQUFXLGdCQUFnQixLQUFLLGFBQWE7QUFDakQsZUFBTyxJQUFJLE1BQU07QUFBQTtBQUtuQixVQUFJLEtBQUssYUFBYSxLQUFLLEVBQUUsY0FBYyxLQUN4QyxVQUFVLGNBQWMsRUFBRSxXQUFXO0FBQ3RDLFlBQUksU0FBVSxFQUFFLGFBQWEsaUJBQWtCLGFBQWEsR0FBRyxTQUM1RCxFQUFFLGFBQWEsUUFBUSxZQUFZLEdBQUcsU0FDckMsb0JBQW9CLEVBQUUsT0FBTyxLQUFLLEdBQUc7QUFFekMsWUFBSSxXQUFXLHFCQUFxQixXQUFXO0FBQzdDLFlBQUUsU0FBUztBQUFBO0FBRWIsWUFBSSxXQUFXLGdCQUFnQixXQUFXO0FBQ3hDLGNBQUksS0FBSyxjQUFjO0FBQ3JCLGNBQUUsYUFBYTtBQUFBO0FBR2pCLGlCQUFPO0FBQUE7QUFTVCxZQUFJLFdBQVc7QUFDYixjQUFJLFVBQVU7QUFDWixrQkFBTSxVQUFVO0FBQUEscUJBRVQsVUFBVTtBQUVqQixrQkFBTSxpQkFBaUIsR0FBRyxHQUFHLEdBQUc7QUFJaEMsZ0JBQUksVUFBVTtBQUVaLG1CQUFLLEVBQUU7QUFFUCxrQkFBSSxFQUFFLGNBQWM7QUFDbEIsa0JBQUUsV0FBVztBQUNiLGtCQUFFLGNBQWM7QUFDaEIsa0JBQUUsU0FBUztBQUFBO0FBQUE7QUFBQTtBQUlqQix3QkFBYztBQUNkLGNBQUksS0FBSyxjQUFjO0FBQ3JCLGNBQUUsYUFBYTtBQUNmLG1CQUFPO0FBQUE7QUFBQTtBQUFBO0FBT2IsVUFBSSxVQUFVO0FBQVksZUFBTztBQUFBO0FBQ2pDLFVBQUksRUFBRSxRQUFRO0FBQUssZUFBTztBQUFBO0FBRzFCLFVBQUksRUFBRSxTQUFTO0FBQ2IsaUJBQVMsR0FBRyxLQUFLLFFBQVE7QUFDekIsaUJBQVMsR0FBSSxLQUFLLFNBQVMsSUFBSztBQUNoQyxpQkFBUyxHQUFJLEtBQUssU0FBUyxLQUFNO0FBQ2pDLGlCQUFTLEdBQUksS0FBSyxTQUFTLEtBQU07QUFDakMsaUJBQVMsR0FBRyxLQUFLLFdBQVc7QUFDNUIsaUJBQVMsR0FBSSxLQUFLLFlBQVksSUFBSztBQUNuQyxpQkFBUyxHQUFJLEtBQUssWUFBWSxLQUFNO0FBQ3BDLGlCQUFTLEdBQUksS0FBSyxZQUFZLEtBQU07QUFBQTtBQUlwQyxvQkFBWSxHQUFHLEtBQUssVUFBVTtBQUM5QixvQkFBWSxHQUFHLEtBQUssUUFBUTtBQUFBO0FBRzlCLG9CQUFjO0FBSWQsVUFBSSxFQUFFLE9BQU87QUFBSyxVQUFFLE9BQU8sQ0FBQyxFQUFFO0FBQUE7QUFFOUIsYUFBTyxFQUFFLFlBQVksSUFBSSxPQUFPO0FBQUE7QUFHbEMsd0JBQW9CO0FBQ2xCLFVBQUk7QUFFSixVQUFJLENBQUMsUUFBcUIsQ0FBQyxLQUFLO0FBQzlCLGVBQU87QUFBQTtBQUdULGVBQVMsS0FBSyxNQUFNO0FBQ3BCLFVBQUksV0FBVyxjQUNiLFdBQVcsZUFDWCxXQUFXLGNBQ1gsV0FBVyxpQkFDWCxXQUFXLGNBQ1gsV0FBVyxjQUNYLFdBQVc7QUFFWCxlQUFPLElBQUksTUFBTTtBQUFBO0FBR25CLFdBQUssUUFBUTtBQUViLGFBQU8sV0FBVyxhQUFhLElBQUksTUFBTSxnQkFBZ0I7QUFBQTtBQVEzRCxrQ0FBOEIsTUFBTTtBQUNsQyxVQUFJLGFBQWEsV0FBVztBQUU1QixVQUFJO0FBQ0osVUFBSSxLQUFLO0FBQ1QsVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFFSixVQUFJLENBQUMsUUFBcUIsQ0FBQyxLQUFLO0FBQzlCLGVBQU87QUFBQTtBQUdULFVBQUksS0FBSztBQUNULGFBQU8sRUFBRTtBQUVULFVBQUksU0FBUyxLQUFNLFNBQVMsS0FBSyxFQUFFLFdBQVcsY0FBZSxFQUFFO0FBQzdELGVBQU87QUFBQTtBQUlULFVBQUksU0FBUztBQUVYLGFBQUssUUFBUSxRQUFRLEtBQUssT0FBTyxZQUFZLFlBQVk7QUFBQTtBQUczRCxRQUFFLE9BQU87QUFHVCxVQUFJLGNBQWMsRUFBRTtBQUNsQixZQUFJLFNBQVM7QUFFWCxlQUFLLEVBQUU7QUFDUCxZQUFFLFdBQVc7QUFDYixZQUFFLGNBQWM7QUFDaEIsWUFBRSxTQUFTO0FBQUE7QUFJYixrQkFBVSxJQUFJLE1BQU0sS0FBSyxFQUFFO0FBQzNCLGNBQU0sU0FBUyxTQUFTLFlBQVksYUFBYSxFQUFFLFFBQVEsRUFBRSxRQUFRO0FBQ3JFLHFCQUFhO0FBQ2IscUJBQWEsRUFBRTtBQUFBO0FBR2pCLGNBQVEsS0FBSztBQUNiLGFBQU8sS0FBSztBQUNaLGNBQVEsS0FBSztBQUNiLFdBQUssV0FBVztBQUNoQixXQUFLLFVBQVU7QUFDZixXQUFLLFFBQVE7QUFDYixrQkFBWTtBQUNaLGFBQU8sRUFBRSxhQUFhO0FBQ3BCLGNBQU0sRUFBRTtBQUNSLFlBQUksRUFBRSxZQUFhLGFBQVk7QUFDL0I7QUFFRSxZQUFFLFFBQVUsR0FBRSxTQUFTLEVBQUUsYUFBYyxFQUFFLE9BQU8sTUFBTSxZQUFZLE1BQU0sRUFBRTtBQUUxRSxZQUFFLEtBQUssTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUU7QUFFbEMsWUFBRSxLQUFLLEVBQUUsU0FBUztBQUNsQjtBQUFBLGlCQUNPLEVBQUU7QUFDWCxVQUFFLFdBQVc7QUFDYixVQUFFLFlBQVksWUFBWTtBQUMxQixvQkFBWTtBQUFBO0FBRWQsUUFBRSxZQUFZLEVBQUU7QUFDaEIsUUFBRSxjQUFjLEVBQUU7QUFDbEIsUUFBRSxTQUFTLEVBQUU7QUFDYixRQUFFLFlBQVk7QUFDZCxRQUFFLGVBQWUsRUFBRSxjQUFjLFlBQVk7QUFDN0MsUUFBRSxrQkFBa0I7QUFDcEIsV0FBSyxVQUFVO0FBQ2YsV0FBSyxRQUFRO0FBQ2IsV0FBSyxXQUFXO0FBQ2hCLFFBQUUsT0FBTztBQUNULGFBQU87QUFBQTtBQUlULFlBQVEsY0FBYztBQUN0QixZQUFRLGVBQWU7QUFDdkIsWUFBUSxlQUFlO0FBQ3ZCLFlBQVEsbUJBQW1CO0FBQzNCLFlBQVEsbUJBQW1CO0FBQzNCLFlBQVEsVUFBVTtBQUNsQixZQUFRLGFBQWE7QUFDckIsWUFBUSx1QkFBdUI7QUFDL0IsWUFBUSxjQUFjO0FBQUE7OztBQ3gwRHRCO0FBQ0E7QUFHQSxRQUFJLFFBQVE7QUFRWixRQUFJLGVBQWU7QUFDbkIsUUFBSSxtQkFBbUI7QUFFdkI7QUFBTSxhQUFPLGFBQWEsTUFBTSxNQUFNLENBQUU7QUFBQSxhQUFlO0FBQU0scUJBQWU7QUFBQTtBQUM1RTtBQUFNLGFBQU8sYUFBYSxNQUFNLE1BQU0sSUFBSSxXQUFXO0FBQUEsYUFBYztBQUFNLHlCQUFtQjtBQUFBO0FBTTVGLFFBQUksV0FBVyxJQUFJLE1BQU0sS0FBSztBQUM5QixhQUFTLElBQUksR0FBRyxJQUFJLEtBQUs7QUFDdkIsZUFBUyxLQUFNLEtBQUssTUFBTSxJQUFJLEtBQUssTUFBTSxJQUFJLEtBQUssTUFBTSxJQUFJLEtBQUssTUFBTSxJQUFJLEtBQUssTUFBTSxJQUFJO0FBQUE7QUFFNUYsYUFBUyxPQUFPLFNBQVMsT0FBTztBQUloQyxZQUFRLGFBQWEsU0FBVTtBQUM3QixVQUFJLEtBQUssR0FBRyxJQUFJLE9BQU8sR0FBRyxVQUFVLElBQUksUUFBUSxVQUFVO0FBRzFELFdBQUssUUFBUSxHQUFHLFFBQVEsU0FBUztBQUMvQixZQUFJLElBQUksV0FBVztBQUNuQixZQUFLLEtBQUksV0FBWSxTQUFXLFFBQVEsSUFBSTtBQUMxQyxlQUFLLElBQUksV0FBVyxRQUFRO0FBQzVCLGNBQUssTUFBSyxXQUFZO0FBQ3BCLGdCQUFJLFFBQVksS0FBSSxTQUFXLE1BQU8sTUFBSztBQUMzQztBQUFBO0FBQUE7QUFHSixtQkFBVyxJQUFJLE1BQU8sSUFBSSxJQUFJLE9BQVEsSUFBSSxJQUFJLFFBQVUsSUFBSTtBQUFBO0FBSTlELFlBQU0sSUFBSSxNQUFNLEtBQUs7QUFHckIsV0FBSyxJQUFJLEdBQUcsUUFBUSxHQUFHLElBQUksU0FBUztBQUNsQyxZQUFJLElBQUksV0FBVztBQUNuQixZQUFLLEtBQUksV0FBWSxTQUFXLFFBQVEsSUFBSTtBQUMxQyxlQUFLLElBQUksV0FBVyxRQUFRO0FBQzVCLGNBQUssTUFBSyxXQUFZO0FBQ3BCLGdCQUFJLFFBQVksS0FBSSxTQUFXLE1BQU8sTUFBSztBQUMzQztBQUFBO0FBQUE7QUFHSixZQUFJLElBQUk7QUFFTixjQUFJLE9BQU87QUFBQSxtQkFDRixJQUFJO0FBRWIsY0FBSSxPQUFPLE1BQVEsTUFBTTtBQUN6QixjQUFJLE9BQU8sTUFBUSxJQUFJO0FBQUEsbUJBQ2QsSUFBSTtBQUViLGNBQUksT0FBTyxNQUFRLE1BQU07QUFDekIsY0FBSSxPQUFPLE1BQVEsTUFBTSxJQUFJO0FBQzdCLGNBQUksT0FBTyxNQUFRLElBQUk7QUFBQTtBQUd2QixjQUFJLE9BQU8sTUFBUSxNQUFNO0FBQ3pCLGNBQUksT0FBTyxNQUFRLE1BQU0sS0FBSztBQUM5QixjQUFJLE9BQU8sTUFBUSxNQUFNLElBQUk7QUFDN0IsY0FBSSxPQUFPLE1BQVEsSUFBSTtBQUFBO0FBQUE7QUFJM0IsYUFBTztBQUFBO0FBSVQsMkJBQXVCLEtBQUs7QUFJMUIsVUFBSSxNQUFNO0FBQ1IsWUFBSyxJQUFJLFlBQVksb0JBQXNCLENBQUMsSUFBSSxZQUFZO0FBQzFELGlCQUFPLE9BQU8sYUFBYSxNQUFNLE1BQU0sTUFBTSxVQUFVLEtBQUs7QUFBQTtBQUFBO0FBSWhFLFVBQUksU0FBUztBQUNiLGVBQVMsSUFBSSxHQUFHLElBQUksS0FBSztBQUN2QixrQkFBVSxPQUFPLGFBQWEsSUFBSTtBQUFBO0FBRXBDLGFBQU87QUFBQTtBQUtULFlBQVEsZ0JBQWdCLFNBQVU7QUFDaEMsYUFBTyxjQUFjLEtBQUssSUFBSTtBQUFBO0FBS2hDLFlBQVEsZ0JBQWdCLFNBQVU7QUFDaEMsVUFBSSxNQUFNLElBQUksTUFBTSxLQUFLLElBQUk7QUFDN0IsZUFBUyxJQUFJLEdBQUcsTUFBTSxJQUFJLFFBQVEsSUFBSSxLQUFLO0FBQ3pDLFlBQUksS0FBSyxJQUFJLFdBQVc7QUFBQTtBQUUxQixhQUFPO0FBQUE7QUFLVCxZQUFRLGFBQWEsU0FBVSxLQUFLO0FBQ2xDLFVBQUksR0FBRyxLQUFLLEdBQUc7QUFDZixVQUFJLE1BQU0sT0FBTyxJQUFJO0FBS3JCLFVBQUksV0FBVyxJQUFJLE1BQU0sTUFBTTtBQUUvQixXQUFLLE1BQU0sR0FBRyxJQUFJLEdBQUcsSUFBSTtBQUN2QixZQUFJLElBQUk7QUFFUixZQUFJLElBQUk7QUFBUSxtQkFBUyxTQUFTO0FBQUc7QUFBQTtBQUVyQyxnQkFBUSxTQUFTO0FBRWpCLFlBQUksUUFBUTtBQUFLLG1CQUFTLFNBQVM7QUFBUSxlQUFLLFFBQVE7QUFBRztBQUFBO0FBRzNELGFBQUssVUFBVSxJQUFJLEtBQU8sVUFBVSxJQUFJLEtBQU87QUFFL0MsZUFBTyxRQUFRLEtBQUssSUFBSTtBQUN0QixjQUFLLEtBQUssSUFBTSxJQUFJLE9BQU87QUFDM0I7QUFBQTtBQUlGLFlBQUksUUFBUTtBQUFLLG1CQUFTLFNBQVM7QUFBUTtBQUFBO0FBRTNDLFlBQUksSUFBSTtBQUNOLG1CQUFTLFNBQVM7QUFBQTtBQUVsQixlQUFLO0FBQ0wsbUJBQVMsU0FBUyxRQUFXLEtBQUssS0FBTTtBQUN4QyxtQkFBUyxTQUFTLFFBQVUsSUFBSTtBQUFBO0FBQUE7QUFJcEMsYUFBTyxjQUFjLFVBQVU7QUFBQTtBQVVqQyxZQUFRLGFBQWEsU0FBVSxLQUFLO0FBQ2xDLFVBQUk7QUFFSixZQUFNLE9BQU8sSUFBSTtBQUNqQixVQUFJLE1BQU0sSUFBSTtBQUFVLGNBQU0sSUFBSTtBQUFBO0FBR2xDLFlBQU0sTUFBTTtBQUNaLGFBQU8sT0FBTyxLQUFNLEtBQUksT0FBTyxTQUFVO0FBQVE7QUFBQTtBQUlqRCxVQUFJLE1BQU07QUFBSyxlQUFPO0FBQUE7QUFJdEIsVUFBSSxRQUFRO0FBQUssZUFBTztBQUFBO0FBRXhCLGFBQVEsTUFBTSxTQUFTLElBQUksUUFBUSxNQUFPLE1BQU07QUFBQTtBQUFBOzs7QUN6TGxEO0FBQUE7QUFxQkE7QUFFRSxXQUFLLFFBQVE7QUFDYixXQUFLLFVBQVU7QUFFZixXQUFLLFdBQVc7QUFFaEIsV0FBSyxXQUFXO0FBRWhCLFdBQUssU0FBUztBQUNkLFdBQUssV0FBVztBQUVoQixXQUFLLFlBQVk7QUFFakIsV0FBSyxZQUFZO0FBRWpCLFdBQUssTUFBTTtBQUVYLFdBQUssUUFBUTtBQUViLFdBQUssWUFBWTtBQUVqQixXQUFLLFFBQVE7QUFBQTtBQUdmLFdBQU8sVUFBVTtBQUFBOzs7QUM5Q2pCO0FBQUE7QUFHQSxRQUFJLGVBQWU7QUFDbkIsUUFBSSxRQUFlO0FBQ25CLFFBQUksVUFBZTtBQUNuQixRQUFJLE1BQWU7QUFDbkIsUUFBSSxVQUFlO0FBRW5CLFFBQUksV0FBVyxPQUFPLFVBQVU7QUFLaEMsUUFBSSxhQUFrQjtBQUN0QixRQUFJLFdBQWtCO0FBRXRCLFFBQUksT0FBa0I7QUFDdEIsUUFBSSxlQUFrQjtBQUN0QixRQUFJLGVBQWtCO0FBRXRCLFFBQUksd0JBQXdCO0FBRTVCLFFBQUkscUJBQXdCO0FBRTVCLFFBQUksYUFBYztBQThGbEIscUJBQWlCO0FBQ2YsVUFBSSxDQUFFLGlCQUFnQjtBQUFVLGVBQU8sSUFBSSxRQUFRO0FBRW5ELFdBQUssVUFBVSxNQUFNLE9BQU87QUFBQSxRQUMxQixPQUFPO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixXQUFXO0FBQUEsUUFDWCxZQUFZO0FBQUEsUUFDWixVQUFVO0FBQUEsUUFDVixVQUFVO0FBQUEsUUFDVixJQUFJO0FBQUEsU0FDSCxXQUFXO0FBRWQsVUFBSSxNQUFNLEtBQUs7QUFFZixVQUFJLElBQUksT0FBUSxJQUFJLGFBQWE7QUFDL0IsWUFBSSxhQUFhLENBQUMsSUFBSTtBQUFBLGlCQUdmLElBQUksUUFBUyxJQUFJLGFBQWEsS0FBTyxJQUFJLGFBQWE7QUFDN0QsWUFBSSxjQUFjO0FBQUE7QUFHcEIsV0FBSyxNQUFTO0FBQ2QsV0FBSyxNQUFTO0FBQ2QsV0FBSyxRQUFTO0FBQ2QsV0FBSyxTQUFTO0FBRWQsV0FBSyxPQUFPLElBQUk7QUFDaEIsV0FBSyxLQUFLLFlBQVk7QUFFdEIsVUFBSSxTQUFTLGFBQWEsYUFDeEIsS0FBSyxNQUNMLElBQUksT0FDSixJQUFJLFFBQ0osSUFBSSxZQUNKLElBQUksVUFDSixJQUFJO0FBR04sVUFBSSxXQUFXO0FBQ2IsY0FBTSxJQUFJLE1BQU0sSUFBSTtBQUFBO0FBR3RCLFVBQUksSUFBSTtBQUNOLHFCQUFhLGlCQUFpQixLQUFLLE1BQU0sSUFBSTtBQUFBO0FBRy9DLFVBQUksSUFBSTtBQUNOLFlBQUk7QUFFSixZQUFJLE9BQU8sSUFBSSxlQUFlO0FBRTVCLGlCQUFPLFFBQVEsV0FBVyxJQUFJO0FBQUEsbUJBQ3JCLFNBQVMsS0FBSyxJQUFJLGdCQUFnQjtBQUMzQyxpQkFBTyxJQUFJLFdBQVcsSUFBSTtBQUFBO0FBRTFCLGlCQUFPLElBQUk7QUFBQTtBQUdiLGlCQUFTLGFBQWEscUJBQXFCLEtBQUssTUFBTTtBQUV0RCxZQUFJLFdBQVc7QUFDYixnQkFBTSxJQUFJLE1BQU0sSUFBSTtBQUFBO0FBR3RCLGFBQUssWUFBWTtBQUFBO0FBQUE7QUFpQ3JCLFlBQVEsVUFBVSxPQUFPLFNBQVUsTUFBTTtBQUN2QyxVQUFJLE9BQU8sS0FBSztBQUNoQixVQUFJLFlBQVksS0FBSyxRQUFRO0FBQzdCLFVBQUksUUFBUTtBQUVaLFVBQUksS0FBSztBQUFTLGVBQU87QUFBQTtBQUV6QixjQUFTLFNBQVMsQ0FBQyxDQUFDLE9BQVEsT0FBUyxTQUFTLE9BQVEsV0FBVztBQUdqRSxVQUFJLE9BQU8sU0FBUztBQUVsQixhQUFLLFFBQVEsUUFBUSxXQUFXO0FBQUEsaUJBQ3ZCLFNBQVMsS0FBSyxVQUFVO0FBQ2pDLGFBQUssUUFBUSxJQUFJLFdBQVc7QUFBQTtBQUU1QixhQUFLLFFBQVE7QUFBQTtBQUdmLFdBQUssVUFBVTtBQUNmLFdBQUssV0FBVyxLQUFLLE1BQU07QUFFM0I7QUFDRSxZQUFJLEtBQUssY0FBYztBQUNyQixlQUFLLFNBQVMsSUFBSSxNQUFNLEtBQUs7QUFDN0IsZUFBSyxXQUFXO0FBQ2hCLGVBQUssWUFBWTtBQUFBO0FBRW5CLGlCQUFTLGFBQWEsUUFBUSxNQUFNO0FBRXBDLFlBQUksV0FBVyxnQkFBZ0IsV0FBVztBQUN4QyxlQUFLLE1BQU07QUFDWCxlQUFLLFFBQVE7QUFDYixpQkFBTztBQUFBO0FBRVQsWUFBSSxLQUFLLGNBQWMsS0FBTSxLQUFLLGFBQWEsS0FBTSxXQUFVLFlBQVksVUFBVTtBQUNuRixjQUFJLEtBQUssUUFBUSxPQUFPO0FBQ3RCLGlCQUFLLE9BQU8sUUFBUSxjQUFjLE1BQU0sVUFBVSxLQUFLLFFBQVEsS0FBSztBQUFBO0FBRXBFLGlCQUFLLE9BQU8sTUFBTSxVQUFVLEtBQUssUUFBUSxLQUFLO0FBQUE7QUFBQTtBQUFBLGVBRzFDLE1BQUssV0FBVyxLQUFLLEtBQUssY0FBYyxNQUFNLFdBQVc7QUFHbkUsVUFBSSxVQUFVO0FBQ1osaUJBQVMsYUFBYSxXQUFXLEtBQUs7QUFDdEMsYUFBSyxNQUFNO0FBQ1gsYUFBSyxRQUFRO0FBQ2IsZUFBTyxXQUFXO0FBQUE7QUFJcEIsVUFBSSxVQUFVO0FBQ1osYUFBSyxNQUFNO0FBQ1gsYUFBSyxZQUFZO0FBQ2pCLGVBQU87QUFBQTtBQUdULGFBQU87QUFBQTtBQWFULFlBQVEsVUFBVSxTQUFTLFNBQVU7QUFDbkMsV0FBSyxPQUFPLEtBQUs7QUFBQTtBQWNuQixZQUFRLFVBQVUsUUFBUSxTQUFVO0FBRWxDLFVBQUksV0FBVztBQUNiLFlBQUksS0FBSyxRQUFRLE9BQU87QUFDdEIsZUFBSyxTQUFTLEtBQUssT0FBTyxLQUFLO0FBQUE7QUFFL0IsZUFBSyxTQUFTLE1BQU0sY0FBYyxLQUFLO0FBQUE7QUFBQTtBQUczQyxXQUFLLFNBQVM7QUFDZCxXQUFLLE1BQU07QUFDWCxXQUFLLE1BQU0sS0FBSyxLQUFLO0FBQUE7QUFzQ3ZCLHFCQUFpQixPQUFPO0FBQ3RCLFVBQUksV0FBVyxJQUFJLFFBQVE7QUFFM0IsZUFBUyxLQUFLLE9BQU87QUFHckIsVUFBSSxTQUFTO0FBQU8sY0FBTSxTQUFTLE9BQU8sSUFBSSxTQUFTO0FBQUE7QUFFdkQsYUFBTyxTQUFTO0FBQUE7QUFZbEIsd0JBQW9CLE9BQU87QUFDekIsZ0JBQVUsV0FBVztBQUNyQixjQUFRLE1BQU07QUFDZCxhQUFPLFFBQVEsT0FBTztBQUFBO0FBWXhCLGtCQUFjLE9BQU87QUFDbkIsZ0JBQVUsV0FBVztBQUNyQixjQUFRLE9BQU87QUFDZixhQUFPLFFBQVEsT0FBTztBQUFBO0FBSXhCLFlBQVEsVUFBVTtBQUNsQixZQUFRLFVBQVU7QUFDbEIsWUFBUSxhQUFhO0FBQ3JCLFlBQVEsT0FBTztBQUFBOzs7QUMvWWY7QUFBQTtBQXNCQSxRQUFJLE1BQU07QUFDVixRQUFJLE9BQU87QUFxQ1gsV0FBTyxVQUFVLHNCQUFzQixNQUFNO0FBQzNDLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUVKLFVBQUk7QUFFSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFFSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFFSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBR0osVUFBSSxPQUFPO0FBR1gsY0FBUSxLQUFLO0FBRWIsWUFBTSxLQUFLO0FBQ1gsY0FBUSxLQUFLO0FBQ2IsYUFBTyxNQUFPLE1BQUssV0FBVztBQUM5QixhQUFPLEtBQUs7QUFDWixlQUFTLEtBQUs7QUFDZCxZQUFNLE9BQVEsU0FBUSxLQUFLO0FBQzNCLFlBQU0sT0FBUSxNQUFLLFlBQVk7QUFFL0IsYUFBTyxNQUFNO0FBRWIsY0FBUSxNQUFNO0FBQ2QsY0FBUSxNQUFNO0FBQ2QsY0FBUSxNQUFNO0FBQ2QsaUJBQVcsTUFBTTtBQUNqQixhQUFPLE1BQU07QUFDYixhQUFPLE1BQU07QUFDYixjQUFRLE1BQU07QUFDZCxjQUFRLE1BQU07QUFDZCxjQUFTLE1BQUssTUFBTSxXQUFXO0FBQy9CLGNBQVMsTUFBSyxNQUFNLFlBQVk7QUFNaEM7QUFDQTtBQUNFLGNBQUksT0FBTztBQUNULG9CQUFRLE1BQU0sVUFBVTtBQUN4QixvQkFBUTtBQUNSLG9CQUFRLE1BQU0sVUFBVTtBQUN4QixvQkFBUTtBQUFBO0FBR1YsaUJBQU8sTUFBTSxPQUFPO0FBRXBCO0FBQ0E7QUFDRSxtQkFBSyxTQUFTO0FBQ2Qsd0JBQVU7QUFDVixzQkFBUTtBQUNSLG1CQUFNLFNBQVMsS0FBTTtBQUNyQixrQkFBSSxPQUFPO0FBSVQsdUJBQU8sVUFBVSxPQUFPO0FBQUEseUJBRWpCLEtBQUs7QUFDWixzQkFBTSxPQUFPO0FBQ2Isc0JBQU07QUFDTixvQkFBSTtBQUNGLHNCQUFJLE9BQU87QUFDVCw0QkFBUSxNQUFNLFVBQVU7QUFDeEIsNEJBQVE7QUFBQTtBQUVWLHlCQUFPLE9BQVMsTUFBSyxNQUFNO0FBQzNCLDRCQUFVO0FBQ1YsMEJBQVE7QUFBQTtBQUdWLG9CQUFJLE9BQU87QUFDVCwwQkFBUSxNQUFNLFVBQVU7QUFDeEIsMEJBQVE7QUFDUiwwQkFBUSxNQUFNLFVBQVU7QUFDeEIsMEJBQVE7QUFBQTtBQUVWLHVCQUFPLE1BQU0sT0FBTztBQUVwQjtBQUNBO0FBQ0UseUJBQUssU0FBUztBQUNkLDhCQUFVO0FBQ1YsNEJBQVE7QUFDUix5QkFBTSxTQUFTLEtBQU07QUFFckIsd0JBQUksS0FBSztBQUNQLDZCQUFPLE9BQU87QUFDZCw0QkFBTTtBQUNOLDBCQUFJLE9BQU87QUFDVCxnQ0FBUSxNQUFNLFVBQVU7QUFDeEIsZ0NBQVE7QUFDUiw0QkFBSSxPQUFPO0FBQ1Qsa0NBQVEsTUFBTSxVQUFVO0FBQ3hCLGtDQUFRO0FBQUE7QUFBQTtBQUdaLDhCQUFRLE9BQVMsTUFBSyxNQUFNO0FBRTVCLDBCQUFJLE9BQU87QUFDVCw2QkFBSyxNQUFNO0FBQ1gsOEJBQU0sT0FBTztBQUNiO0FBQUE7QUFHRixnQ0FBVTtBQUNWLDhCQUFRO0FBRVIsMkJBQUssT0FBTztBQUNaLDBCQUFJLE9BQU87QUFDVCw2QkFBSyxPQUFPO0FBQ1osNEJBQUksS0FBSztBQUNQLDhCQUFJLE1BQU07QUFDUixpQ0FBSyxNQUFNO0FBQ1gsa0NBQU0sT0FBTztBQUNiO0FBQUE7QUFBQTtBQXlCSiwrQkFBTztBQUNQLHNDQUFjO0FBQ2QsNEJBQUksVUFBVTtBQUNaLGtDQUFRLFFBQVE7QUFDaEIsOEJBQUksS0FBSztBQUNQLG1DQUFPO0FBQ1A7QUFDRSxxQ0FBTyxVQUFVLFNBQVM7QUFBQSxxQ0FDbkIsRUFBRTtBQUNYLG1DQUFPLE9BQU87QUFDZCwwQ0FBYztBQUFBO0FBQUEsbUNBR1QsUUFBUTtBQUNmLGtDQUFRLFFBQVEsUUFBUTtBQUN4QixnQ0FBTTtBQUNOLDhCQUFJLEtBQUs7QUFDUCxtQ0FBTztBQUNQO0FBQ0UscUNBQU8sVUFBVSxTQUFTO0FBQUEscUNBQ25CLEVBQUU7QUFDWCxtQ0FBTztBQUNQLGdDQUFJLFFBQVE7QUFDVixtQ0FBSztBQUNMLHFDQUFPO0FBQ1A7QUFDRSx1Q0FBTyxVQUFVLFNBQVM7QUFBQSx1Q0FDbkIsRUFBRTtBQUNYLHFDQUFPLE9BQU87QUFDZCw0Q0FBYztBQUFBO0FBQUE7QUFBQTtBQUtsQixrQ0FBUSxRQUFRO0FBQ2hCLDhCQUFJLEtBQUs7QUFDUCxtQ0FBTztBQUNQO0FBQ0UscUNBQU8sVUFBVSxTQUFTO0FBQUEscUNBQ25CLEVBQUU7QUFDWCxtQ0FBTyxPQUFPO0FBQ2QsMENBQWM7QUFBQTtBQUFBO0FBR2xCLCtCQUFPLE1BQU07QUFDWCxpQ0FBTyxVQUFVLFlBQVk7QUFDN0IsaUNBQU8sVUFBVSxZQUFZO0FBQzdCLGlDQUFPLFVBQVUsWUFBWTtBQUM3QixpQ0FBTztBQUFBO0FBRVQsNEJBQUk7QUFDRixpQ0FBTyxVQUFVLFlBQVk7QUFDN0IsOEJBQUksTUFBTTtBQUNSLG1DQUFPLFVBQVUsWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUtqQywrQkFBTyxPQUFPO0FBQ2Q7QUFDRSxpQ0FBTyxVQUFVLE9BQU87QUFDeEIsaUNBQU8sVUFBVSxPQUFPO0FBQ3hCLGlDQUFPLFVBQVUsT0FBTztBQUN4QixpQ0FBTztBQUFBLGlDQUNBLE1BQU07QUFDZiw0QkFBSTtBQUNGLGlDQUFPLFVBQVUsT0FBTztBQUN4Qiw4QkFBSSxNQUFNO0FBQ1IsbUNBQU8sVUFBVSxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUEsK0JBS3RCLE1BQUssUUFBUTtBQUNyQiw2QkFBTyxNQUFPLFFBQU8sU0FBdUIsUUFBUyxNQUFLLE1BQU07QUFDaEU7QUFBQTtBQUdBLDJCQUFLLE1BQU07QUFDWCw0QkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUdGO0FBQUE7QUFBQSx5QkFHTSxNQUFLLFFBQVE7QUFDckIsdUJBQU8sTUFBTyxRQUFPLFNBQXVCLFFBQVMsTUFBSyxNQUFNO0FBQ2hFO0FBQUEseUJBRU8sS0FBSztBQUVaLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBR0EscUJBQUssTUFBTTtBQUNYLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBR0Y7QUFBQTtBQUFBLGlCQUVLLE1BQU0sUUFBUSxPQUFPO0FBRzlCLFlBQU0sUUFBUTtBQUNkLGFBQU87QUFDUCxjQUFRLE9BQU87QUFDZixjQUFTLE1BQUssUUFBUTtBQUd0QixXQUFLLFVBQVU7QUFDZixXQUFLLFdBQVc7QUFDaEIsV0FBSyxXQUFZLE1BQU0sT0FBTyxJQUFLLFFBQU8sT0FBTyxJQUFLLE9BQU07QUFDNUQsV0FBSyxZQUFhLE9BQU8sTUFBTSxNQUFPLE9BQU0sUUFBUSxNQUFPLFFBQU87QUFDbEUsWUFBTSxPQUFPO0FBQ2IsWUFBTSxPQUFPO0FBQ2I7QUFBQTtBQUFBOzs7QUN2VkY7QUFBQTtBQXFCQSxRQUFJLFFBQVE7QUFFWixRQUFJLFVBQVU7QUFDZCxRQUFJLGNBQWM7QUFDbEIsUUFBSSxlQUFlO0FBR25CLFFBQUksUUFBUTtBQUNaLFFBQUksT0FBTztBQUNYLFFBQUksUUFBUTtBQUVaLFFBQUksUUFBUTtBQUFBLE1BQ1Y7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUNyRDtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFHO0FBQUE7QUFHL0QsUUFBSSxPQUFPO0FBQUEsTUFDVDtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQzVEO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQTtBQUcxRCxRQUFJLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUc7QUFBQSxNQUFHO0FBQUEsTUFBRztBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFLO0FBQUEsTUFDdEQ7QUFBQSxNQUFLO0FBQUEsTUFBSztBQUFBLE1BQUs7QUFBQSxNQUFLO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUFNO0FBQUEsTUFBTTtBQUFBLE1BQU07QUFBQSxNQUNsRDtBQUFBLE1BQU07QUFBQSxNQUFPO0FBQUEsTUFBTztBQUFBLE1BQU87QUFBQSxNQUFHO0FBQUE7QUFHaEMsUUFBSSxPQUFPO0FBQUEsTUFDVDtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQzVEO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFDcEM7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBLE1BQUk7QUFBQSxNQUFJO0FBQUEsTUFBSTtBQUFBO0FBR3RCLFdBQU8sVUFBVSx1QkFBdUIsTUFBTSxNQUFNLFlBQVksT0FBTyxPQUFPLGFBQWEsTUFBTTtBQUUvRixVQUFJLE9BQU8sS0FBSztBQUdoQixVQUFJLE1BQU07QUFDVixVQUFJLE1BQU07QUFDVixVQUFJLE1BQU0sR0FBRyxNQUFNO0FBQ25CLFVBQUksT0FBTztBQUNYLFVBQUksT0FBTztBQUNYLFVBQUksT0FBTztBQUNYLFVBQUksT0FBTztBQUNYLFVBQUksT0FBTztBQUNYLFVBQUksT0FBTztBQUNYLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSSxPQUFPO0FBQ1gsVUFBSSxhQUFhO0FBRWpCLFVBQUk7QUFDSixVQUFJLFFBQVEsSUFBSSxNQUFNLE1BQU0sVUFBVTtBQUN0QyxVQUFJLE9BQU8sSUFBSSxNQUFNLE1BQU0sVUFBVTtBQUNyQyxVQUFJLFFBQVE7QUFDWixVQUFJLGNBQWM7QUFFbEIsVUFBSSxXQUFXLFNBQVM7QUFrQ3hCLFdBQUssTUFBTSxHQUFHLE9BQU8sU0FBUztBQUM1QixjQUFNLE9BQU87QUFBQTtBQUVmLFdBQUssTUFBTSxHQUFHLE1BQU0sT0FBTztBQUN6QixjQUFNLEtBQUssYUFBYTtBQUFBO0FBSTFCLGFBQU87QUFDUCxXQUFLLE1BQU0sU0FBUyxPQUFPLEdBQUc7QUFDNUIsWUFBSSxNQUFNLFNBQVM7QUFBSztBQUFBO0FBQUE7QUFFMUIsVUFBSSxPQUFPO0FBQ1QsZUFBTztBQUFBO0FBRVQsVUFBSSxRQUFRO0FBSVYsY0FBTSxpQkFBa0IsS0FBSyxLQUFPLE1BQU0sS0FBTTtBQU1oRCxjQUFNLGlCQUFrQixLQUFLLEtBQU8sTUFBTSxLQUFNO0FBRWhELGFBQUssT0FBTztBQUNaLGVBQU87QUFBQTtBQUVULFdBQUssTUFBTSxHQUFHLE1BQU0sS0FBSztBQUN2QixZQUFJLE1BQU0sU0FBUztBQUFLO0FBQUE7QUFBQTtBQUUxQixVQUFJLE9BQU87QUFDVCxlQUFPO0FBQUE7QUFJVCxhQUFPO0FBQ1AsV0FBSyxNQUFNLEdBQUcsT0FBTyxTQUFTO0FBQzVCLGlCQUFTO0FBQ1QsZ0JBQVEsTUFBTTtBQUNkLFlBQUksT0FBTztBQUNULGlCQUFPO0FBQUE7QUFBQTtBQUdYLFVBQUksT0FBTyxLQUFNLFVBQVMsU0FBUyxRQUFRO0FBQ3pDLGVBQU87QUFBQTtBQUlULFdBQUssS0FBSztBQUNWLFdBQUssTUFBTSxHQUFHLE1BQU0sU0FBUztBQUMzQixhQUFLLE1BQU0sS0FBSyxLQUFLLE9BQU8sTUFBTTtBQUFBO0FBSXBDLFdBQUssTUFBTSxHQUFHLE1BQU0sT0FBTztBQUN6QixZQUFJLEtBQUssYUFBYSxTQUFTO0FBQzdCLGVBQUssS0FBSyxLQUFLLGFBQWEsV0FBVztBQUFBO0FBQUE7QUFzQzNDLFVBQUksU0FBUztBQUNYLGVBQU8sUUFBUTtBQUNmLGNBQU07QUFBQSxpQkFFRyxTQUFTO0FBQ2xCLGVBQU87QUFDUCxzQkFBYztBQUNkLGdCQUFRO0FBQ1IsdUJBQWU7QUFDZixjQUFNO0FBQUE7QUFHTixlQUFPO0FBQ1AsZ0JBQVE7QUFDUixjQUFNO0FBQUE7QUFJUixhQUFPO0FBQ1AsWUFBTTtBQUNOLFlBQU07QUFDTixhQUFPO0FBQ1AsYUFBTztBQUNQLGFBQU87QUFDUCxZQUFNO0FBQ04sYUFBTyxLQUFLO0FBQ1osYUFBTyxPQUFPO0FBR2QsVUFBSyxTQUFTLFFBQVEsT0FBTyxlQUMxQixTQUFTLFNBQVMsT0FBTztBQUMxQixlQUFPO0FBQUE7QUFJVDtBQUVFLG9CQUFZLE1BQU07QUFDbEIsWUFBSSxLQUFLLE9BQU87QUFDZCxvQkFBVTtBQUNWLHFCQUFXLEtBQUs7QUFBQSxtQkFFVCxLQUFLLE9BQU87QUFDbkIsb0JBQVUsTUFBTSxjQUFjLEtBQUs7QUFDbkMscUJBQVcsS0FBSyxhQUFhLEtBQUs7QUFBQTtBQUdsQyxvQkFBVSxLQUFLO0FBQ2YscUJBQVc7QUFBQTtBQUliLGVBQU8sS0FBTSxNQUFNO0FBQ25CLGVBQU8sS0FBSztBQUNaLGNBQU07QUFDTjtBQUNFLGtCQUFRO0FBQ1IsZ0JBQU0sT0FBUSxTQUFRLFFBQVEsUUFBUyxhQUFhLEtBQU8sV0FBVyxLQUFNLFdBQVU7QUFBQSxpQkFDL0UsU0FBUztBQUdsQixlQUFPLEtBQU0sTUFBTTtBQUNuQixlQUFPLE9BQU87QUFDWixtQkFBUztBQUFBO0FBRVgsWUFBSSxTQUFTO0FBQ1gsa0JBQVEsT0FBTztBQUNmLGtCQUFRO0FBQUE7QUFFUixpQkFBTztBQUFBO0FBSVQ7QUFDQSxZQUFJLEVBQUUsTUFBTSxTQUFTO0FBQ25CLGNBQUksUUFBUTtBQUFPO0FBQUE7QUFDbkIsZ0JBQU0sS0FBSyxhQUFhLEtBQUs7QUFBQTtBQUkvQixZQUFJLE1BQU0sUUFBUyxRQUFPLFVBQVU7QUFFbEMsY0FBSSxTQUFTO0FBQ1gsbUJBQU87QUFBQTtBQUlULGtCQUFRO0FBR1IsaUJBQU8sTUFBTTtBQUNiLGlCQUFPLEtBQUs7QUFDWixpQkFBTyxPQUFPLE9BQU87QUFDbkIsb0JBQVEsTUFBTSxPQUFPO0FBQ3JCLGdCQUFJLFFBQVE7QUFBSztBQUFBO0FBQ2pCO0FBQ0EscUJBQVM7QUFBQTtBQUlYLGtCQUFRLEtBQUs7QUFDYixjQUFLLFNBQVMsUUFBUSxPQUFPLGVBQzFCLFNBQVMsU0FBUyxPQUFPO0FBQzFCLG1CQUFPO0FBQUE7QUFJVCxnQkFBTSxPQUFPO0FBSWIsZ0JBQU0sT0FBUSxRQUFRLEtBQU8sUUFBUSxLQUFPLE9BQU8sY0FBYztBQUFBO0FBQUE7QUFPckUsVUFBSSxTQUFTO0FBSVgsY0FBTSxPQUFPLFFBQVUsTUFBTSxRQUFTLEtBQU8sTUFBTSxLQUFLO0FBQUE7QUFLMUQsV0FBSyxPQUFPO0FBQ1osYUFBTztBQUFBO0FBQUE7OztBQ3JWVDtBQUFBO0FBcUJBLFFBQUksUUFBZ0I7QUFDcEIsUUFBSSxVQUFnQjtBQUNwQixRQUFJLFFBQWdCO0FBQ3BCLFFBQUksZUFBZ0I7QUFDcEIsUUFBSSxnQkFBZ0I7QUFFcEIsUUFBSSxRQUFRO0FBQ1osUUFBSSxPQUFPO0FBQ1gsUUFBSSxRQUFRO0FBV1osUUFBSSxXQUFrQjtBQUN0QixRQUFJLFVBQWtCO0FBQ3RCLFFBQUksVUFBa0I7QUFNdEIsUUFBSSxPQUFrQjtBQUN0QixRQUFJLGVBQWtCO0FBQ3RCLFFBQUksY0FBa0I7QUFFdEIsUUFBSSxpQkFBa0I7QUFDdEIsUUFBSSxlQUFrQjtBQUN0QixRQUFJLGNBQWtCO0FBQ3RCLFFBQUksY0FBa0I7QUFJdEIsUUFBSSxhQUFjO0FBT2xCLFFBQU8sT0FBTztBQUNkLFFBQU8sUUFBUTtBQUNmLFFBQU8sT0FBTztBQUNkLFFBQU8sS0FBSztBQUNaLFFBQU8sUUFBUTtBQUNmLFFBQU8sUUFBUTtBQUNmLFFBQU8sT0FBTztBQUNkLFFBQU8sVUFBVTtBQUNqQixRQUFPLE9BQU87QUFDZCxRQUFPLFNBQVM7QUFDaEIsUUFBTyxPQUFPO0FBQ2QsUUFBVyxPQUFPO0FBQ2xCLFFBQVcsU0FBUztBQUNwQixRQUFXLFNBQVM7QUFDcEIsUUFBVyxRQUFRO0FBQ25CLFFBQVcsT0FBTztBQUNsQixRQUFXLFFBQVE7QUFDbkIsUUFBVyxVQUFVO0FBQ3JCLFFBQVcsV0FBVztBQUN0QixRQUFlLE9BQU87QUFDdEIsUUFBZSxNQUFNO0FBQ3JCLFFBQWUsU0FBUztBQUN4QixRQUFlLE9BQU87QUFDdEIsUUFBZSxVQUFVO0FBQ3pCLFFBQWUsUUFBUTtBQUN2QixRQUFlLE1BQU07QUFDckIsUUFBTyxRQUFRO0FBQ2YsUUFBTyxTQUFTO0FBQ2hCLFFBQU8sT0FBTztBQUNkLFFBQU8sTUFBTTtBQUNiLFFBQU8sTUFBTTtBQUNiLFFBQU8sT0FBTztBQU1kLFFBQUksY0FBYztBQUNsQixRQUFJLGVBQWU7QUFHbkIsUUFBSSxZQUFZO0FBRWhCLFFBQUksWUFBWTtBQUdoQixxQkFBaUI7QUFDZixhQUFXLE9BQU0sS0FBTSxPQUNiLE9BQU0sSUFBSyxTQUNYLE1BQUksVUFBVyxLQUNmLE1BQUksUUFBUztBQUFBO0FBSXpCO0FBQ0UsV0FBSyxPQUFPO0FBQ1osV0FBSyxPQUFPO0FBQ1osV0FBSyxPQUFPO0FBQ1osV0FBSyxXQUFXO0FBQ2hCLFdBQUssUUFBUTtBQUNiLFdBQUssT0FBTztBQUNaLFdBQUssUUFBUTtBQUNiLFdBQUssUUFBUTtBQUViLFdBQUssT0FBTztBQUdaLFdBQUssUUFBUTtBQUNiLFdBQUssUUFBUTtBQUNiLFdBQUssUUFBUTtBQUNiLFdBQUssUUFBUTtBQUNiLFdBQUssU0FBUztBQUdkLFdBQUssT0FBTztBQUNaLFdBQUssT0FBTztBQUdaLFdBQUssU0FBUztBQUNkLFdBQUssU0FBUztBQUdkLFdBQUssUUFBUTtBQUdiLFdBQUssVUFBVTtBQUNmLFdBQUssV0FBVztBQUNoQixXQUFLLFVBQVU7QUFDZixXQUFLLFdBQVc7QUFHaEIsV0FBSyxRQUFRO0FBQ2IsV0FBSyxPQUFPO0FBQ1osV0FBSyxRQUFRO0FBQ2IsV0FBSyxPQUFPO0FBQ1osV0FBSyxPQUFPO0FBRVosV0FBSyxPQUFPLElBQUksTUFBTSxNQUFNO0FBQzVCLFdBQUssT0FBTyxJQUFJLE1BQU0sTUFBTTtBQU81QixXQUFLLFNBQVM7QUFDZCxXQUFLLFVBQVU7QUFDZixXQUFLLE9BQU87QUFDWixXQUFLLE9BQU87QUFDWixXQUFLLE1BQU07QUFBQTtBQUdiLDhCQUEwQjtBQUN4QixVQUFJO0FBRUosVUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO0FBQVMsZUFBTztBQUFBO0FBQ25DLGNBQVEsS0FBSztBQUNiLFdBQUssV0FBVyxLQUFLLFlBQVksTUFBTSxRQUFRO0FBQy9DLFdBQUssTUFBTTtBQUNYLFVBQUksTUFBTTtBQUNSLGFBQUssUUFBUSxNQUFNLE9BQU87QUFBQTtBQUU1QixZQUFNLE9BQU87QUFDYixZQUFNLE9BQU87QUFDYixZQUFNLFdBQVc7QUFDakIsWUFBTSxPQUFPO0FBQ2IsWUFBTSxPQUFPO0FBQ2IsWUFBTSxPQUFPO0FBQ2IsWUFBTSxPQUFPO0FBRWIsWUFBTSxVQUFVLE1BQU0sU0FBUyxJQUFJLE1BQU0sTUFBTTtBQUMvQyxZQUFNLFdBQVcsTUFBTSxVQUFVLElBQUksTUFBTSxNQUFNO0FBRWpELFlBQU0sT0FBTztBQUNiLFlBQU0sT0FBTztBQUViLGFBQU87QUFBQTtBQUdULDBCQUFzQjtBQUNwQixVQUFJO0FBRUosVUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO0FBQVMsZUFBTztBQUFBO0FBQ25DLGNBQVEsS0FBSztBQUNiLFlBQU0sUUFBUTtBQUNkLFlBQU0sUUFBUTtBQUNkLFlBQU0sUUFBUTtBQUNkLGFBQU8saUJBQWlCO0FBQUE7QUFJMUIsMkJBQXVCLE1BQU07QUFDM0IsVUFBSTtBQUNKLFVBQUk7QUFHSixVQUFJLENBQUMsUUFBUSxDQUFDLEtBQUs7QUFBUyxlQUFPO0FBQUE7QUFDbkMsY0FBUSxLQUFLO0FBR2IsVUFBSSxhQUFhO0FBQ2YsZUFBTztBQUNQLHFCQUFhLENBQUM7QUFBQTtBQUdkLGVBQVEsZUFBYyxLQUFLO0FBQzNCLFlBQUksYUFBYTtBQUNmLHdCQUFjO0FBQUE7QUFBQTtBQUtsQixVQUFJLGNBQWUsY0FBYSxLQUFLLGFBQWE7QUFDaEQsZUFBTztBQUFBO0FBRVQsVUFBSSxNQUFNLFdBQVcsUUFBUSxNQUFNLFVBQVU7QUFDM0MsY0FBTSxTQUFTO0FBQUE7QUFJakIsWUFBTSxPQUFPO0FBQ2IsWUFBTSxRQUFRO0FBQ2QsYUFBTyxhQUFhO0FBQUE7QUFHdEIsMEJBQXNCLE1BQU07QUFDMUIsVUFBSTtBQUNKLFVBQUk7QUFFSixVQUFJLENBQUM7QUFBUSxlQUFPO0FBQUE7QUFHcEIsY0FBUSxJQUFJO0FBSVosV0FBSyxRQUFRO0FBQ2IsWUFBTSxTQUFTO0FBQ2YsWUFBTSxjQUFjLE1BQU07QUFDMUIsVUFBSSxRQUFRO0FBQ1YsYUFBSyxRQUFRO0FBQUE7QUFFZixhQUFPO0FBQUE7QUFHVCx5QkFBcUI7QUFDbkIsYUFBTyxhQUFhLE1BQU07QUFBQTtBQWM1QixRQUFJLFNBQVM7QUFFYixRQUFJO0FBQUosUUFBWTtBQUVaLHlCQUFxQjtBQUVuQixVQUFJO0FBQ0YsWUFBSTtBQUVKLGlCQUFTLElBQUksTUFBTSxNQUFNO0FBQ3pCLGtCQUFVLElBQUksTUFBTSxNQUFNO0FBRzFCLGNBQU07QUFDTixlQUFPLE1BQU07QUFBTyxnQkFBTSxLQUFLLFNBQVM7QUFBQTtBQUN4QyxlQUFPLE1BQU07QUFBTyxnQkFBTSxLQUFLLFNBQVM7QUFBQTtBQUN4QyxlQUFPLE1BQU07QUFBTyxnQkFBTSxLQUFLLFNBQVM7QUFBQTtBQUN4QyxlQUFPLE1BQU07QUFBTyxnQkFBTSxLQUFLLFNBQVM7QUFBQTtBQUV4QyxzQkFBYyxNQUFPLE1BQU0sTUFBTSxHQUFHLEtBQUssUUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFFLE1BQU07QUFHMUUsY0FBTTtBQUNOLGVBQU8sTUFBTTtBQUFNLGdCQUFNLEtBQUssU0FBUztBQUFBO0FBRXZDLHNCQUFjLE9BQU8sTUFBTSxNQUFNLEdBQUcsSUFBTSxTQUFTLEdBQUcsTUFBTSxNQUFNLENBQUUsTUFBTTtBQUcxRSxpQkFBUztBQUFBO0FBR1gsWUFBTSxVQUFVO0FBQ2hCLFlBQU0sVUFBVTtBQUNoQixZQUFNLFdBQVc7QUFDakIsWUFBTSxXQUFXO0FBQUE7QUFrQm5CLDBCQUFzQixNQUFNLEtBQUssS0FBSztBQUNwQyxVQUFJO0FBQ0osVUFBSSxRQUFRLEtBQUs7QUFHakIsVUFBSSxNQUFNLFdBQVc7QUFDbkIsY0FBTSxRQUFRLEtBQUssTUFBTTtBQUN6QixjQUFNLFFBQVE7QUFDZCxjQUFNLFFBQVE7QUFFZCxjQUFNLFNBQVMsSUFBSSxNQUFNLEtBQUssTUFBTTtBQUFBO0FBSXRDLFVBQUksUUFBUSxNQUFNO0FBQ2hCLGNBQU0sU0FBUyxNQUFNLFFBQVEsS0FBSyxNQUFNLE1BQU0sT0FBTyxNQUFNLE9BQU87QUFDbEUsY0FBTSxRQUFRO0FBQ2QsY0FBTSxRQUFRLE1BQU07QUFBQTtBQUdwQixlQUFPLE1BQU0sUUFBUSxNQUFNO0FBQzNCLFlBQUksT0FBTztBQUNULGlCQUFPO0FBQUE7QUFHVCxjQUFNLFNBQVMsTUFBTSxRQUFRLEtBQUssTUFBTSxNQUFNLE1BQU0sTUFBTTtBQUMxRCxnQkFBUTtBQUNSLFlBQUk7QUFFRixnQkFBTSxTQUFTLE1BQU0sUUFBUSxLQUFLLE1BQU0sTUFBTSxNQUFNO0FBQ3BELGdCQUFNLFFBQVE7QUFDZCxnQkFBTSxRQUFRLE1BQU07QUFBQTtBQUdwQixnQkFBTSxTQUFTO0FBQ2YsY0FBSSxNQUFNLFVBQVUsTUFBTTtBQUFTLGtCQUFNLFFBQVE7QUFBQTtBQUNqRCxjQUFJLE1BQU0sUUFBUSxNQUFNO0FBQVMsa0JBQU0sU0FBUztBQUFBO0FBQUE7QUFBQTtBQUdwRCxhQUFPO0FBQUE7QUFHVCxxQkFBaUIsTUFBTTtBQUNyQixVQUFJO0FBQ0osVUFBSSxPQUFPO0FBQ1gsVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJLE1BQU07QUFDVixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUksS0FBSztBQUNULFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSTtBQUNKLFVBQUksT0FBTztBQUNYLFVBQUksV0FBVyxTQUFTO0FBRXhCLFVBQUksV0FBVyxTQUFTO0FBQ3hCLFVBQUk7QUFDSixVQUFJO0FBQ0osVUFBSSxPQUFPLElBQUksTUFBTSxLQUFLO0FBQzFCLFVBQUk7QUFFSixVQUFJO0FBRUosVUFBSSxRQUNGLENBQUUsSUFBSSxJQUFJLElBQUksR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUc7QUFHbEUsVUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxLQUFLLFVBQzdCLENBQUMsS0FBSyxTQUFTLEtBQUssYUFBYTtBQUNwQyxlQUFPO0FBQUE7QUFHVCxjQUFRLEtBQUs7QUFDYixVQUFJLE1BQU0sU0FBUztBQUFRLGNBQU0sT0FBTztBQUFBO0FBSXhDLFlBQU0sS0FBSztBQUNYLGVBQVMsS0FBSztBQUNkLGFBQU8sS0FBSztBQUNaLGFBQU8sS0FBSztBQUNaLGNBQVEsS0FBSztBQUNiLGFBQU8sS0FBSztBQUNaLGFBQU8sTUFBTTtBQUNiLGFBQU8sTUFBTTtBQUdiLFlBQU07QUFDTixhQUFPO0FBQ1AsWUFBTTtBQUVOO0FBQ0E7QUFDRSxrQkFBUSxNQUFNO0FBQUEsaUJBQ1A7QUFDSCxrQkFBSSxNQUFNLFNBQVM7QUFDakIsc0JBQU0sT0FBTztBQUNiO0FBQUE7QUFHRixxQkFBTyxPQUFPO0FBQ1osb0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSx3QkFBUSxNQUFNLFdBQVc7QUFDekIsd0JBQVE7QUFBQTtBQUdWLGtCQUFLLE1BQU0sT0FBTyxLQUFNLFNBQVM7QUFDL0Isc0JBQU0sUUFBUTtBQUVkLHFCQUFLLEtBQUssT0FBTztBQUNqQixxQkFBSyxLQUFNLFNBQVMsSUFBSztBQUN6QixzQkFBTSxRQUFRLE1BQU0sTUFBTSxPQUFPLE1BQU0sR0FBRztBQUkxQyx1QkFBTztBQUNQLHVCQUFPO0FBRVAsc0JBQU0sT0FBTztBQUNiO0FBQUE7QUFFRixvQkFBTSxRQUFRO0FBQ2Qsa0JBQUksTUFBTTtBQUNSLHNCQUFNLEtBQUssT0FBTztBQUFBO0FBRXBCLGtCQUFJLENBQUUsT0FBTSxPQUFPLE1BQ2QsVUFBTyxRQUFvQixLQUFNLFNBQVEsTUFBTTtBQUNsRCxxQkFBSyxNQUFNO0FBQ1gsc0JBQU0sT0FBTztBQUNiO0FBQUE7QUFFRixrQkFBSyxRQUFPLFFBQXFCO0FBQy9CLHFCQUFLLE1BQU07QUFDWCxzQkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUdGLHdCQUFVO0FBQ1Ysc0JBQVE7QUFFUixvQkFBTyxRQUFPLE1BQW1CO0FBQ2pDLGtCQUFJLE1BQU0sVUFBVTtBQUNsQixzQkFBTSxRQUFRO0FBQUEseUJBRVAsTUFBTSxNQUFNO0FBQ25CLHFCQUFLLE1BQU07QUFDWCxzQkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUVGLG9CQUFNLE9BQU8sS0FBSztBQUVsQixtQkFBSyxRQUFRLE1BQU0sUUFBUTtBQUMzQixvQkFBTSxPQUFPLE9BQU8sTUFBUSxTQUFTO0FBRXJDLHFCQUFPO0FBQ1AscUJBQU87QUFFUDtBQUFBLGlCQUNHO0FBRUgscUJBQU8sT0FBTztBQUNaLG9CQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0Esd0JBQVEsTUFBTSxXQUFXO0FBQ3pCLHdCQUFRO0FBQUE7QUFHVixvQkFBTSxRQUFRO0FBQ2Qsa0JBQUssT0FBTSxRQUFRLFNBQVU7QUFDM0IscUJBQUssTUFBTTtBQUNYLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBRUYsa0JBQUksTUFBTSxRQUFRO0FBQ2hCLHFCQUFLLE1BQU07QUFDWCxzQkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUVGLGtCQUFJLE1BQU07QUFDUixzQkFBTSxLQUFLLE9BQVMsUUFBUSxJQUFLO0FBQUE7QUFFbkMsa0JBQUksTUFBTSxRQUFRO0FBRWhCLHFCQUFLLEtBQUssT0FBTztBQUNqQixxQkFBSyxLQUFNLFNBQVMsSUFBSztBQUN6QixzQkFBTSxRQUFRLE1BQU0sTUFBTSxPQUFPLE1BQU0sR0FBRztBQUFBO0FBSTVDLHFCQUFPO0FBQ1AscUJBQU87QUFFUCxvQkFBTSxPQUFPO0FBQUEsaUJBRVY7QUFFSCxxQkFBTyxPQUFPO0FBQ1osb0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSx3QkFBUSxNQUFNLFdBQVc7QUFDekIsd0JBQVE7QUFBQTtBQUdWLGtCQUFJLE1BQU07QUFDUixzQkFBTSxLQUFLLE9BQU87QUFBQTtBQUVwQixrQkFBSSxNQUFNLFFBQVE7QUFFaEIscUJBQUssS0FBSyxPQUFPO0FBQ2pCLHFCQUFLLEtBQU0sU0FBUyxJQUFLO0FBQ3pCLHFCQUFLLEtBQU0sU0FBUyxLQUFNO0FBQzFCLHFCQUFLLEtBQU0sU0FBUyxLQUFNO0FBQzFCLHNCQUFNLFFBQVEsTUFBTSxNQUFNLE9BQU8sTUFBTSxHQUFHO0FBQUE7QUFJNUMscUJBQU87QUFDUCxxQkFBTztBQUVQLG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUVILHFCQUFPLE9BQU87QUFDWixvQkFBSSxTQUFTO0FBQUs7QUFBQTtBQUNsQjtBQUNBLHdCQUFRLE1BQU0sV0FBVztBQUN6Qix3QkFBUTtBQUFBO0FBR1Ysa0JBQUksTUFBTTtBQUNSLHNCQUFNLEtBQUssU0FBVSxPQUFPO0FBQzVCLHNCQUFNLEtBQUssS0FBTSxRQUFRO0FBQUE7QUFFM0Isa0JBQUksTUFBTSxRQUFRO0FBRWhCLHFCQUFLLEtBQUssT0FBTztBQUNqQixxQkFBSyxLQUFNLFNBQVMsSUFBSztBQUN6QixzQkFBTSxRQUFRLE1BQU0sTUFBTSxPQUFPLE1BQU0sR0FBRztBQUFBO0FBSTVDLHFCQUFPO0FBQ1AscUJBQU87QUFFUCxvQkFBTSxPQUFPO0FBQUEsaUJBRVY7QUFDSCxrQkFBSSxNQUFNLFFBQVE7QUFFaEIsdUJBQU8sT0FBTztBQUNaLHNCQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0EsMEJBQVEsTUFBTSxXQUFXO0FBQ3pCLDBCQUFRO0FBQUE7QUFHVixzQkFBTSxTQUFTO0FBQ2Ysb0JBQUksTUFBTTtBQUNSLHdCQUFNLEtBQUssWUFBWTtBQUFBO0FBRXpCLG9CQUFJLE1BQU0sUUFBUTtBQUVoQix1QkFBSyxLQUFLLE9BQU87QUFDakIsdUJBQUssS0FBTSxTQUFTLElBQUs7QUFDekIsd0JBQU0sUUFBUSxNQUFNLE1BQU0sT0FBTyxNQUFNLEdBQUc7QUFBQTtBQUk1Qyx1QkFBTztBQUNQLHVCQUFPO0FBQUEseUJBR0EsTUFBTTtBQUNiLHNCQUFNLEtBQUssUUFBUTtBQUFBO0FBRXJCLG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUNILGtCQUFJLE1BQU0sUUFBUTtBQUNoQix1QkFBTyxNQUFNO0FBQ2Isb0JBQUksT0FBTztBQUFRLHlCQUFPO0FBQUE7QUFDMUIsb0JBQUk7QUFDRixzQkFBSSxNQUFNO0FBQ1IsMEJBQU0sTUFBTSxLQUFLLFlBQVksTUFBTTtBQUNuQyx3QkFBSSxDQUFDLE1BQU0sS0FBSztBQUVkLDRCQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sTUFBTSxLQUFLO0FBQUE7QUFFMUMsMEJBQU0sU0FDSixNQUFNLEtBQUssT0FDWCxPQUNBLE1BR0EsTUFFQTtBQUFBO0FBTUosc0JBQUksTUFBTSxRQUFRO0FBQ2hCLDBCQUFNLFFBQVEsTUFBTSxNQUFNLE9BQU8sT0FBTyxNQUFNO0FBQUE7QUFFaEQsMEJBQVE7QUFDUiwwQkFBUTtBQUNSLHdCQUFNLFVBQVU7QUFBQTtBQUVsQixvQkFBSSxNQUFNO0FBQVU7QUFBQTtBQUFBO0FBRXRCLG9CQUFNLFNBQVM7QUFDZixvQkFBTSxPQUFPO0FBQUEsaUJBRVY7QUFDSCxrQkFBSSxNQUFNLFFBQVE7QUFDaEIsb0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEIsdUJBQU87QUFDUDtBQUVFLHdCQUFNLE1BQU0sT0FBTztBQUVuQixzQkFBSSxNQUFNLFFBQVEsT0FDYixNQUFNLFNBQVM7QUFDbEIsMEJBQU0sS0FBSyxRQUFRLE9BQU8sYUFBYTtBQUFBO0FBQUEseUJBRWxDLE9BQU8sT0FBTztBQUV2QixvQkFBSSxNQUFNLFFBQVE7QUFDaEIsd0JBQU0sUUFBUSxNQUFNLE1BQU0sT0FBTyxPQUFPLE1BQU07QUFBQTtBQUVoRCx3QkFBUTtBQUNSLHdCQUFRO0FBQ1Isb0JBQUk7QUFBTztBQUFBO0FBQUEseUJBRUosTUFBTTtBQUNiLHNCQUFNLEtBQUssT0FBTztBQUFBO0FBRXBCLG9CQUFNLFNBQVM7QUFDZixvQkFBTSxPQUFPO0FBQUEsaUJBRVY7QUFDSCxrQkFBSSxNQUFNLFFBQVE7QUFDaEIsb0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEIsdUJBQU87QUFDUDtBQUNFLHdCQUFNLE1BQU0sT0FBTztBQUVuQixzQkFBSSxNQUFNLFFBQVEsT0FDYixNQUFNLFNBQVM7QUFDbEIsMEJBQU0sS0FBSyxXQUFXLE9BQU8sYUFBYTtBQUFBO0FBQUEseUJBRXJDLE9BQU8sT0FBTztBQUN2QixvQkFBSSxNQUFNLFFBQVE7QUFDaEIsd0JBQU0sUUFBUSxNQUFNLE1BQU0sT0FBTyxPQUFPLE1BQU07QUFBQTtBQUVoRCx3QkFBUTtBQUNSLHdCQUFRO0FBQ1Isb0JBQUk7QUFBTztBQUFBO0FBQUEseUJBRUosTUFBTTtBQUNiLHNCQUFNLEtBQUssVUFBVTtBQUFBO0FBRXZCLG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUNILGtCQUFJLE1BQU0sUUFBUTtBQUVoQix1QkFBTyxPQUFPO0FBQ1osc0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSwwQkFBUSxNQUFNLFdBQVc7QUFDekIsMEJBQVE7QUFBQTtBQUdWLG9CQUFJLFNBQVUsT0FBTSxRQUFRO0FBQzFCLHVCQUFLLE1BQU07QUFDWCx3QkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUdGLHVCQUFPO0FBQ1AsdUJBQU87QUFBQTtBQUdULGtCQUFJLE1BQU07QUFDUixzQkFBTSxLQUFLLE9BQVMsTUFBTSxTQUFTLElBQUs7QUFDeEMsc0JBQU0sS0FBSyxPQUFPO0FBQUE7QUFFcEIsbUJBQUssUUFBUSxNQUFNLFFBQVE7QUFDM0Isb0JBQU0sT0FBTztBQUNiO0FBQUEsaUJBQ0c7QUFFSCxxQkFBTyxPQUFPO0FBQ1osb0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSx3QkFBUSxNQUFNLFdBQVc7QUFDekIsd0JBQVE7QUFBQTtBQUdWLG1CQUFLLFFBQVEsTUFBTSxRQUFRLFFBQVE7QUFFbkMscUJBQU87QUFDUCxxQkFBTztBQUVQLG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUNILGtCQUFJLE1BQU0sYUFBYTtBQUVyQixxQkFBSyxXQUFXO0FBQ2hCLHFCQUFLLFlBQVk7QUFDakIscUJBQUssVUFBVTtBQUNmLHFCQUFLLFdBQVc7QUFDaEIsc0JBQU0sT0FBTztBQUNiLHNCQUFNLE9BQU87QUFFYix1QkFBTztBQUFBO0FBRVQsbUJBQUssUUFBUSxNQUFNLFFBQVE7QUFDM0Isb0JBQU0sT0FBTztBQUFBLGlCQUVWO0FBQ0gsa0JBQUksVUFBVSxXQUFXLFVBQVU7QUFBVztBQUFBO0FBQUEsaUJBRTNDO0FBQ0gsa0JBQUksTUFBTTtBQUVSLDBCQUFVLE9BQU87QUFDakIsd0JBQVEsT0FBTztBQUVmLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBR0YscUJBQU8sT0FBTztBQUNaLG9CQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0Esd0JBQVEsTUFBTSxXQUFXO0FBQ3pCLHdCQUFRO0FBQUE7QUFHVixvQkFBTSxPQUFRLE9BQU87QUFFckIsd0JBQVU7QUFDVixzQkFBUTtBQUdSLHNCQUFTLE9BQU87QUFBQSxxQkFDVDtBQUdILHdCQUFNLE9BQU87QUFDYjtBQUFBLHFCQUNHO0FBQ0gsOEJBQVk7QUFHWix3QkFBTSxPQUFPO0FBQ2Isc0JBQUksVUFBVTtBQUVaLDhCQUFVO0FBQ1YsNEJBQVE7QUFFUjtBQUFBO0FBRUY7QUFBQSxxQkFDRztBQUdILHdCQUFNLE9BQU87QUFDYjtBQUFBLHFCQUNHO0FBQ0gsdUJBQUssTUFBTTtBQUNYLHdCQUFNLE9BQU87QUFBQTtBQUdqQix3QkFBVTtBQUNWLHNCQUFRO0FBRVI7QUFBQSxpQkFDRztBQUVILHdCQUFVLE9BQU87QUFDakIsc0JBQVEsT0FBTztBQUdmLHFCQUFPLE9BQU87QUFDWixvQkFBSSxTQUFTO0FBQUs7QUFBQTtBQUNsQjtBQUNBLHdCQUFRLE1BQU0sV0FBVztBQUN6Qix3QkFBUTtBQUFBO0FBR1Ysa0JBQUssUUFBTyxXQUFjLFVBQVMsS0FBTTtBQUN2QyxxQkFBSyxNQUFNO0FBQ1gsc0JBQU0sT0FBTztBQUNiO0FBQUE7QUFFRixvQkFBTSxTQUFTLE9BQU87QUFJdEIscUJBQU87QUFDUCxxQkFBTztBQUVQLG9CQUFNLE9BQU87QUFDYixrQkFBSSxVQUFVO0FBQVc7QUFBQTtBQUFBLGlCQUV0QjtBQUNILG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUNILHFCQUFPLE1BQU07QUFDYixrQkFBSTtBQUNGLG9CQUFJLE9BQU87QUFBUSx5QkFBTztBQUFBO0FBQzFCLG9CQUFJLE9BQU87QUFBUSx5QkFBTztBQUFBO0FBQzFCLG9CQUFJLFNBQVM7QUFBSztBQUFBO0FBRWxCLHNCQUFNLFNBQVMsUUFBUSxPQUFPLE1BQU0sTUFBTTtBQUUxQyx3QkFBUTtBQUNSLHdCQUFRO0FBQ1Isd0JBQVE7QUFDUix1QkFBTztBQUNQLHNCQUFNLFVBQVU7QUFDaEI7QUFBQTtBQUdGLG9CQUFNLE9BQU87QUFDYjtBQUFBLGlCQUNHO0FBRUgscUJBQU8sT0FBTztBQUNaLG9CQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0Esd0JBQVEsTUFBTSxXQUFXO0FBQ3pCLHdCQUFRO0FBQUE7QUFHVixvQkFBTSxPQUFRLFFBQU8sTUFBbUI7QUFFeEMsd0JBQVU7QUFDVixzQkFBUTtBQUVSLG9CQUFNLFFBQVMsUUFBTyxNQUFtQjtBQUV6Qyx3QkFBVTtBQUNWLHNCQUFRO0FBRVIsb0JBQU0sUUFBUyxRQUFPLE1BQW1CO0FBRXpDLHdCQUFVO0FBQ1Ysc0JBQVE7QUFHUixrQkFBSSxNQUFNLE9BQU8sT0FBTyxNQUFNLFFBQVE7QUFDcEMscUJBQUssTUFBTTtBQUNYLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBSUYsb0JBQU0sT0FBTztBQUNiLG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUNILHFCQUFPLE1BQU0sT0FBTyxNQUFNO0FBRXhCLHVCQUFPLE9BQU87QUFDWixzQkFBSSxTQUFTO0FBQUs7QUFBQTtBQUNsQjtBQUNBLDBCQUFRLE1BQU0sV0FBVztBQUN6QiwwQkFBUTtBQUFBO0FBR1Ysc0JBQU0sS0FBSyxNQUFNLE1BQU0sV0FBWSxPQUFPO0FBRTFDLDBCQUFVO0FBQ1Ysd0JBQVE7QUFBQTtBQUdWLHFCQUFPLE1BQU0sT0FBTztBQUNsQixzQkFBTSxLQUFLLE1BQU0sTUFBTSxXQUFXO0FBQUE7QUFNcEMsb0JBQU0sVUFBVSxNQUFNO0FBQ3RCLG9CQUFNLFVBQVU7QUFFaEIscUJBQU8sQ0FBRSxNQUFNLE1BQU07QUFDckIsb0JBQU0sY0FBYyxPQUFPLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxTQUFTLEdBQUcsTUFBTSxNQUFNO0FBQzVFLG9CQUFNLFVBQVUsS0FBSztBQUVyQixrQkFBSTtBQUNGLHFCQUFLLE1BQU07QUFDWCxzQkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUdGLG9CQUFNLE9BQU87QUFDYixvQkFBTSxPQUFPO0FBQUEsaUJBRVY7QUFDSCxxQkFBTyxNQUFNLE9BQU8sTUFBTSxPQUFPLE1BQU07QUFDckM7QUFDRSx5QkFBTyxNQUFNLFFBQVEsT0FBUyxNQUFLLE1BQU0sV0FBVztBQUNwRCw4QkFBWSxTQUFTO0FBQ3JCLDRCQUFXLFNBQVMsS0FBTTtBQUMxQiw2QkFBVyxPQUFPO0FBRWxCLHNCQUFLLGFBQWM7QUFBUTtBQUFBO0FBRTNCLHNCQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0EsMEJBQVEsTUFBTSxXQUFXO0FBQ3pCLDBCQUFRO0FBQUE7QUFHVixvQkFBSSxXQUFXO0FBRWIsNEJBQVU7QUFDViwwQkFBUTtBQUVSLHdCQUFNLEtBQUssTUFBTSxVQUFVO0FBQUE7QUFHM0Isc0JBQUksYUFBYTtBQUVmLHdCQUFJLFlBQVk7QUFDaEIsMkJBQU8sT0FBTztBQUNaLDBCQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0EsOEJBQVEsTUFBTSxXQUFXO0FBQ3pCLDhCQUFRO0FBQUE7QUFJViw4QkFBVTtBQUNWLDRCQUFRO0FBRVIsd0JBQUksTUFBTSxTQUFTO0FBQ2pCLDJCQUFLLE1BQU07QUFDWCw0QkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUVGLDBCQUFNLE1BQU0sS0FBSyxNQUFNLE9BQU87QUFDOUIsMkJBQU8sSUFBSyxRQUFPO0FBRW5CLDhCQUFVO0FBQ1YsNEJBQVE7QUFBQSw2QkFHRCxhQUFhO0FBRXBCLHdCQUFJLFlBQVk7QUFDaEIsMkJBQU8sT0FBTztBQUNaLDBCQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0EsOEJBQVEsTUFBTSxXQUFXO0FBQ3pCLDhCQUFRO0FBQUE7QUFJViw4QkFBVTtBQUNWLDRCQUFRO0FBRVIsMEJBQU07QUFDTiwyQkFBTyxJQUFLLFFBQU87QUFFbkIsOEJBQVU7QUFDViw0QkFBUTtBQUFBO0FBS1Isd0JBQUksWUFBWTtBQUNoQiwyQkFBTyxPQUFPO0FBQ1osMEJBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSw4QkFBUSxNQUFNLFdBQVc7QUFDekIsOEJBQVE7QUFBQTtBQUlWLDhCQUFVO0FBQ1YsNEJBQVE7QUFFUiwwQkFBTTtBQUNOLDJCQUFPLEtBQU0sUUFBTztBQUVwQiw4QkFBVTtBQUNWLDRCQUFRO0FBQUE7QUFHVixzQkFBSSxNQUFNLE9BQU8sT0FBTyxNQUFNLE9BQU8sTUFBTTtBQUN6Qyx5QkFBSyxNQUFNO0FBQ1gsMEJBQU0sT0FBTztBQUNiO0FBQUE7QUFFRix5QkFBTztBQUNMLDBCQUFNLEtBQUssTUFBTSxVQUFVO0FBQUE7QUFBQTtBQUFBO0FBTWpDLGtCQUFJLE1BQU0sU0FBUztBQUFPO0FBQUE7QUFHMUIsa0JBQUksTUFBTSxLQUFLLFNBQVM7QUFDdEIscUJBQUssTUFBTTtBQUNYLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBTUYsb0JBQU0sVUFBVTtBQUVoQixxQkFBTyxDQUFFLE1BQU0sTUFBTTtBQUNyQixvQkFBTSxjQUFjLE1BQU0sTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLE1BQU0sU0FBUyxHQUFHLE1BQU0sTUFBTTtBQUduRixvQkFBTSxVQUFVLEtBQUs7QUFHckIsa0JBQUk7QUFDRixxQkFBSyxNQUFNO0FBQ1gsc0JBQU0sT0FBTztBQUNiO0FBQUE7QUFHRixvQkFBTSxXQUFXO0FBR2pCLG9CQUFNLFdBQVcsTUFBTTtBQUN2QixxQkFBTyxDQUFFLE1BQU0sTUFBTTtBQUNyQixvQkFBTSxjQUFjLE9BQU8sTUFBTSxNQUFNLE1BQU0sTUFBTSxNQUFNLE9BQU8sTUFBTSxVQUFVLEdBQUcsTUFBTSxNQUFNO0FBRy9GLG9CQUFNLFdBQVcsS0FBSztBQUd0QixrQkFBSTtBQUNGLHFCQUFLLE1BQU07QUFDWCxzQkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUdGLG9CQUFNLE9BQU87QUFDYixrQkFBSSxVQUFVO0FBQVc7QUFBQTtBQUFBLGlCQUV0QjtBQUNILG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUNILGtCQUFJLFFBQVEsS0FBSyxRQUFRO0FBRXZCLHFCQUFLLFdBQVc7QUFDaEIscUJBQUssWUFBWTtBQUNqQixxQkFBSyxVQUFVO0FBQ2YscUJBQUssV0FBVztBQUNoQixzQkFBTSxPQUFPO0FBQ2Isc0JBQU0sT0FBTztBQUViLDZCQUFhLE1BQU07QUFFbkIsc0JBQU0sS0FBSztBQUNYLHlCQUFTLEtBQUs7QUFDZCx1QkFBTyxLQUFLO0FBQ1osdUJBQU8sS0FBSztBQUNaLHdCQUFRLEtBQUs7QUFDYix1QkFBTyxLQUFLO0FBQ1osdUJBQU8sTUFBTTtBQUNiLHVCQUFPLE1BQU07QUFHYixvQkFBSSxNQUFNLFNBQVM7QUFDakIsd0JBQU0sT0FBTztBQUFBO0FBRWY7QUFBQTtBQUVGLG9CQUFNLE9BQU87QUFDYjtBQUNFLHVCQUFPLE1BQU0sUUFBUSxPQUFTLE1BQUssTUFBTSxXQUFXO0FBQ3BELDRCQUFZLFNBQVM7QUFDckIsMEJBQVcsU0FBUyxLQUFNO0FBQzFCLDJCQUFXLE9BQU87QUFFbEIsb0JBQUksYUFBYTtBQUFRO0FBQUE7QUFFekIsb0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSx3QkFBUSxNQUFNLFdBQVc7QUFDekIsd0JBQVE7QUFBQTtBQUdWLGtCQUFJLFdBQVksV0FBVSxTQUFVO0FBQ2xDLDRCQUFZO0FBQ1osMEJBQVU7QUFDViwyQkFBVztBQUNYO0FBQ0UseUJBQU8sTUFBTSxRQUFRLFdBQ1gsU0FBUyxNQUFNLFlBQVksV0FBWSxNQUFvQztBQUNyRiw4QkFBWSxTQUFTO0FBQ3JCLDRCQUFXLFNBQVMsS0FBTTtBQUMxQiw2QkFBVyxPQUFPO0FBRWxCLHNCQUFLLFlBQVksYUFBYztBQUFRO0FBQUE7QUFFdkMsc0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSwwQkFBUSxNQUFNLFdBQVc7QUFDekIsMEJBQVE7QUFBQTtBQUlWLDBCQUFVO0FBQ1Ysd0JBQVE7QUFFUixzQkFBTSxRQUFRO0FBQUE7QUFHaEIsd0JBQVU7QUFDVixzQkFBUTtBQUVSLG9CQUFNLFFBQVE7QUFDZCxvQkFBTSxTQUFTO0FBQ2Ysa0JBQUksWUFBWTtBQUlkLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBRUYsa0JBQUksVUFBVTtBQUVaLHNCQUFNLE9BQU87QUFDYixzQkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUVGLGtCQUFJLFVBQVU7QUFDWixxQkFBSyxNQUFNO0FBQ1gsc0JBQU0sT0FBTztBQUNiO0FBQUE7QUFFRixvQkFBTSxRQUFRLFVBQVU7QUFDeEIsb0JBQU0sT0FBTztBQUFBLGlCQUVWO0FBQ0gsa0JBQUksTUFBTTtBQUVSLG9CQUFJLE1BQU07QUFDVix1QkFBTyxPQUFPO0FBQ1osc0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFDQSwwQkFBUSxNQUFNLFdBQVc7QUFDekIsMEJBQVE7QUFBQTtBQUdWLHNCQUFNLFVBQVUsT0FBUyxNQUFLLE1BQU0sU0FBUztBQUU3QywwQkFBVSxNQUFNO0FBQ2hCLHdCQUFRLE1BQU07QUFFZCxzQkFBTSxRQUFRLE1BQU07QUFBQTtBQUd0QixvQkFBTSxNQUFNLE1BQU07QUFDbEIsb0JBQU0sT0FBTztBQUFBLGlCQUVWO0FBQ0g7QUFDRSx1QkFBTyxNQUFNLFNBQVMsT0FBUyxNQUFLLE1BQU0sWUFBWTtBQUN0RCw0QkFBWSxTQUFTO0FBQ3JCLDBCQUFXLFNBQVMsS0FBTTtBQUMxQiwyQkFBVyxPQUFPO0FBRWxCLG9CQUFLLGFBQWM7QUFBUTtBQUFBO0FBRTNCLG9CQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0Esd0JBQVEsTUFBTSxXQUFXO0FBQ3pCLHdCQUFRO0FBQUE7QUFHVixrQkFBSyxXQUFVLFNBQVU7QUFDdkIsNEJBQVk7QUFDWiwwQkFBVTtBQUNWLDJCQUFXO0FBQ1g7QUFDRSx5QkFBTyxNQUFNLFNBQVMsV0FDWixTQUFTLE1BQU0sWUFBWSxXQUFZLE1BQW9DO0FBQ3JGLDhCQUFZLFNBQVM7QUFDckIsNEJBQVcsU0FBUyxLQUFNO0FBQzFCLDZCQUFXLE9BQU87QUFFbEIsc0JBQUssWUFBWSxhQUFjO0FBQVE7QUFBQTtBQUV2QyxzQkFBSSxTQUFTO0FBQUs7QUFBQTtBQUNsQjtBQUNBLDBCQUFRLE1BQU0sV0FBVztBQUN6QiwwQkFBUTtBQUFBO0FBSVYsMEJBQVU7QUFDVix3QkFBUTtBQUVSLHNCQUFNLFFBQVE7QUFBQTtBQUdoQix3QkFBVTtBQUNWLHNCQUFRO0FBRVIsb0JBQU0sUUFBUTtBQUNkLGtCQUFJLFVBQVU7QUFDWixxQkFBSyxNQUFNO0FBQ1gsc0JBQU0sT0FBTztBQUNiO0FBQUE7QUFFRixvQkFBTSxTQUFTO0FBQ2Ysb0JBQU0sUUFBUyxVQUFXO0FBQzFCLG9CQUFNLE9BQU87QUFBQSxpQkFFVjtBQUNILGtCQUFJLE1BQU07QUFFUixvQkFBSSxNQUFNO0FBQ1YsdUJBQU8sT0FBTztBQUNaLHNCQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0EsMEJBQVEsTUFBTSxXQUFXO0FBQ3pCLDBCQUFRO0FBQUE7QUFHVixzQkFBTSxVQUFVLE9BQVMsTUFBSyxNQUFNLFNBQVM7QUFFN0MsMEJBQVUsTUFBTTtBQUNoQix3QkFBUSxNQUFNO0FBRWQsc0JBQU0sUUFBUSxNQUFNO0FBQUE7QUFHdEIsa0JBQUksTUFBTSxTQUFTLE1BQU07QUFDdkIscUJBQUssTUFBTTtBQUNYLHNCQUFNLE9BQU87QUFDYjtBQUFBO0FBSUYsb0JBQU0sT0FBTztBQUFBLGlCQUVWO0FBQ0gsa0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEIscUJBQU8sT0FBTztBQUNkLGtCQUFJLE1BQU0sU0FBUztBQUNqQix1QkFBTyxNQUFNLFNBQVM7QUFDdEIsb0JBQUksT0FBTyxNQUFNO0FBQ2Ysc0JBQUksTUFBTTtBQUNSLHlCQUFLLE1BQU07QUFDWCwwQkFBTSxPQUFPO0FBQ2I7QUFBQTtBQUFBO0FBa0JKLG9CQUFJLE9BQU8sTUFBTTtBQUNmLDBCQUFRLE1BQU07QUFDZCx5QkFBTyxNQUFNLFFBQVE7QUFBQTtBQUdyQix5QkFBTyxNQUFNLFFBQVE7QUFBQTtBQUV2QixvQkFBSSxPQUFPLE1BQU07QUFBVSx5QkFBTyxNQUFNO0FBQUE7QUFDeEMsOEJBQWMsTUFBTTtBQUFBO0FBR3BCLDhCQUFjO0FBQ2QsdUJBQU8sTUFBTSxNQUFNO0FBQ25CLHVCQUFPLE1BQU07QUFBQTtBQUVmLGtCQUFJLE9BQU87QUFBUSx1QkFBTztBQUFBO0FBQzFCLHNCQUFRO0FBQ1Isb0JBQU0sVUFBVTtBQUNoQjtBQUNFLHVCQUFPLFNBQVMsWUFBWTtBQUFBLHVCQUNyQixFQUFFO0FBQ1gsa0JBQUksTUFBTSxXQUFXO0FBQUssc0JBQU0sT0FBTztBQUFBO0FBQ3ZDO0FBQUEsaUJBQ0c7QUFDSCxrQkFBSSxTQUFTO0FBQUs7QUFBQTtBQUNsQixxQkFBTyxTQUFTLE1BQU07QUFDdEI7QUFDQSxvQkFBTSxPQUFPO0FBQ2I7QUFBQSxpQkFDRztBQUNILGtCQUFJLE1BQU07QUFFUix1QkFBTyxPQUFPO0FBQ1osc0JBQUksU0FBUztBQUFLO0FBQUE7QUFDbEI7QUFFQSwwQkFBUSxNQUFNLFdBQVc7QUFDekIsMEJBQVE7QUFBQTtBQUdWLHdCQUFRO0FBQ1IscUJBQUssYUFBYTtBQUNsQixzQkFBTSxTQUFTO0FBQ2Ysb0JBQUk7QUFDRix1QkFBSyxRQUFRLE1BQU0sUUFFZCxNQUFNLFFBQVEsTUFBTSxNQUFNLE9BQU8sUUFBUSxNQUFNLE1BQU0sUUFBUSxRQUFRLE1BQU0sT0FBTyxRQUFRLE1BQU0sTUFBTTtBQUFBO0FBRzdHLHVCQUFPO0FBRVAsb0JBQUssT0FBTSxRQUFRLE9BQU8sUUFBUSxXQUFXLE1BQU07QUFDakQsdUJBQUssTUFBTTtBQUNYLHdCQUFNLE9BQU87QUFDYjtBQUFBO0FBR0YsdUJBQU87QUFDUCx1QkFBTztBQUFBO0FBSVQsb0JBQU0sT0FBTztBQUFBLGlCQUVWO0FBQ0gsa0JBQUksTUFBTSxRQUFRLE1BQU07QUFFdEIsdUJBQU8sT0FBTztBQUNaLHNCQUFJLFNBQVM7QUFBSztBQUFBO0FBQ2xCO0FBQ0EsMEJBQVEsTUFBTSxXQUFXO0FBQ3pCLDBCQUFRO0FBQUE7QUFHVixvQkFBSSxTQUFVLE9BQU0sUUFBUTtBQUMxQix1QkFBSyxNQUFNO0FBQ1gsd0JBQU0sT0FBTztBQUNiO0FBQUE7QUFHRix1QkFBTztBQUNQLHVCQUFPO0FBQUE7QUFJVCxvQkFBTSxPQUFPO0FBQUEsaUJBRVY7QUFDSCxvQkFBTTtBQUNOO0FBQUEsaUJBQ0c7QUFDSCxvQkFBTTtBQUNOO0FBQUEsaUJBQ0c7QUFDSCxxQkFBTztBQUFBLGlCQUNKO0FBQUE7QUFHSCxxQkFBTztBQUFBO0FBQUE7QUFjYixXQUFLLFdBQVc7QUFDaEIsV0FBSyxZQUFZO0FBQ2pCLFdBQUssVUFBVTtBQUNmLFdBQUssV0FBVztBQUNoQixZQUFNLE9BQU87QUFDYixZQUFNLE9BQU87QUFHYixVQUFJLE1BQU0sU0FBVSxTQUFTLEtBQUssYUFBYSxNQUFNLE9BQU8sT0FDdkMsT0FBTSxPQUFPLFNBQVMsVUFBVTtBQUNuRCxZQUFJLGFBQWEsTUFBTSxLQUFLLFFBQVEsS0FBSyxVQUFVLE9BQU8sS0FBSztBQUM3RCxnQkFBTSxPQUFPO0FBQ2IsaUJBQU87QUFBQTtBQUFBO0FBR1gsYUFBTyxLQUFLO0FBQ1osY0FBUSxLQUFLO0FBQ2IsV0FBSyxZQUFZO0FBQ2pCLFdBQUssYUFBYTtBQUNsQixZQUFNLFNBQVM7QUFDZixVQUFJLE1BQU0sUUFBUTtBQUNoQixhQUFLLFFBQVEsTUFBTSxRQUNoQixNQUFNLFFBQVEsTUFBTSxNQUFNLE9BQU8sUUFBUSxNQUFNLEtBQUssV0FBVyxRQUFRLFFBQVEsTUFBTSxPQUFPLFFBQVEsTUFBTSxLQUFLLFdBQVc7QUFBQTtBQUUvSCxXQUFLLFlBQVksTUFBTSxPQUFRLE9BQU0sT0FBTyxLQUFLLEtBQzlCLE9BQU0sU0FBUyxPQUFPLE1BQU0sS0FDNUIsT0FBTSxTQUFTLFFBQVEsTUFBTSxTQUFTLFFBQVEsTUFBTTtBQUN2RSxVQUFNLFNBQVEsS0FBSyxTQUFTLEtBQU0sVUFBVSxhQUFhLFFBQVE7QUFDL0QsY0FBTTtBQUFBO0FBRVIsYUFBTztBQUFBO0FBR1Qsd0JBQW9CO0FBRWxCLFVBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztBQUNqQixlQUFPO0FBQUE7QUFHVCxVQUFJLFFBQVEsS0FBSztBQUNqQixVQUFJLE1BQU07QUFDUixjQUFNLFNBQVM7QUFBQTtBQUVqQixXQUFLLFFBQVE7QUFDYixhQUFPO0FBQUE7QUFHVCw4QkFBMEIsTUFBTTtBQUM5QixVQUFJO0FBR0osVUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO0FBQVMsZUFBTztBQUFBO0FBQ25DLGNBQVEsS0FBSztBQUNiLFVBQUssT0FBTSxPQUFPLE9BQU87QUFBSyxlQUFPO0FBQUE7QUFHckMsWUFBTSxPQUFPO0FBQ2IsV0FBSyxPQUFPO0FBQ1osYUFBTztBQUFBO0FBR1Qsa0NBQThCLE1BQU07QUFDbEMsVUFBSSxhQUFhLFdBQVc7QUFFNUIsVUFBSTtBQUNKLFVBQUk7QUFDSixVQUFJO0FBR0osVUFBSSxDQUFDLFFBQXdCLENBQUMsS0FBSztBQUF5QixlQUFPO0FBQUE7QUFDbkUsY0FBUSxLQUFLO0FBRWIsVUFBSSxNQUFNLFNBQVMsS0FBSyxNQUFNLFNBQVM7QUFDckMsZUFBTztBQUFBO0FBSVQsVUFBSSxNQUFNLFNBQVM7QUFDakIsaUJBQVM7QUFFVCxpQkFBUyxRQUFRLFFBQVEsWUFBWSxZQUFZO0FBQ2pELFlBQUksV0FBVyxNQUFNO0FBQ25CLGlCQUFPO0FBQUE7QUFBQTtBQUtYLFlBQU0sYUFBYSxNQUFNLFlBQVksWUFBWTtBQUNqRCxVQUFJO0FBQ0YsY0FBTSxPQUFPO0FBQ2IsZUFBTztBQUFBO0FBRVQsWUFBTSxXQUFXO0FBRWpCLGFBQU87QUFBQTtBQUdULFlBQVEsZUFBZTtBQUN2QixZQUFRLGdCQUFnQjtBQUN4QixZQUFRLG1CQUFtQjtBQUMzQixZQUFRLGNBQWM7QUFDdEIsWUFBUSxlQUFlO0FBQ3ZCLFlBQVEsVUFBVTtBQUNsQixZQUFRLGFBQWE7QUFDckIsWUFBUSxtQkFBbUI7QUFDM0IsWUFBUSx1QkFBdUI7QUFDL0IsWUFBUSxjQUFjO0FBQUE7OztBQ3pnRHRCO0FBQUE7QUFxQkEsV0FBTyxVQUFVO0FBQUEsTUFHZixZQUFvQjtBQUFBLE1BQ3BCLGlCQUFvQjtBQUFBLE1BQ3BCLGNBQW9CO0FBQUEsTUFDcEIsY0FBb0I7QUFBQSxNQUNwQixVQUFvQjtBQUFBLE1BQ3BCLFNBQW9CO0FBQUEsTUFDcEIsU0FBb0I7QUFBQSxNQUtwQixNQUFvQjtBQUFBLE1BQ3BCLGNBQW9CO0FBQUEsTUFDcEIsYUFBb0I7QUFBQSxNQUNwQixTQUFtQjtBQUFBLE1BQ25CLGdCQUFtQjtBQUFBLE1BQ25CLGNBQW1CO0FBQUEsTUFFbkIsYUFBbUI7QUFBQSxNQUluQixrQkFBMEI7QUFBQSxNQUMxQixjQUEwQjtBQUFBLE1BQzFCLG9CQUEwQjtBQUFBLE1BQzFCLHVCQUF5QjtBQUFBLE1BR3pCLFlBQTBCO0FBQUEsTUFDMUIsZ0JBQTBCO0FBQUEsTUFDMUIsT0FBMEI7QUFBQSxNQUMxQixTQUEwQjtBQUFBLE1BQzFCLG9CQUEwQjtBQUFBLE1BRzFCLFVBQTBCO0FBQUEsTUFDMUIsUUFBMEI7QUFBQSxNQUUxQixXQUEwQjtBQUFBLE1BRzFCLFlBQTBCO0FBQUE7QUFBQTs7O0FDakU1QjtBQUFBO0FBcUJBO0FBRUUsV0FBSyxPQUFhO0FBRWxCLFdBQUssT0FBYTtBQUVsQixXQUFLLFNBQWE7QUFFbEIsV0FBSyxLQUFhO0FBRWxCLFdBQUssUUFBYTtBQUVsQixXQUFLLFlBQWE7QUFXbEIsV0FBSyxPQUFhO0FBSWxCLFdBQUssVUFBYTtBQUlsQixXQUFLLE9BQWE7QUFFbEIsV0FBSyxPQUFhO0FBQUE7QUFHcEIsV0FBTyxVQUFVO0FBQUE7OztBQ3pEakI7QUFBQTtBQUdBLFFBQUksZUFBZTtBQUNuQixRQUFJLFFBQWU7QUFDbkIsUUFBSSxVQUFlO0FBQ25CLFFBQUksSUFBZTtBQUNuQixRQUFJLE1BQWU7QUFDbkIsUUFBSSxVQUFlO0FBQ25CLFFBQUksV0FBZTtBQUVuQixRQUFJLFdBQVcsT0FBTyxVQUFVO0FBaUZoQyxxQkFBaUI7QUFDZixVQUFJLENBQUUsaUJBQWdCO0FBQVUsZUFBTyxJQUFJLFFBQVE7QUFFbkQsV0FBSyxVQUFVLE1BQU0sT0FBTztBQUFBLFFBQzFCLFdBQVc7QUFBQSxRQUNYLFlBQVk7QUFBQSxRQUNaLElBQUk7QUFBQSxTQUNILFdBQVc7QUFFZCxVQUFJLE1BQU0sS0FBSztBQUlmLFVBQUksSUFBSSxPQUFRLElBQUksY0FBYyxLQUFPLElBQUksYUFBYTtBQUN4RCxZQUFJLGFBQWEsQ0FBQyxJQUFJO0FBQ3RCLFlBQUksSUFBSSxlQUFlO0FBQUssY0FBSSxhQUFhO0FBQUE7QUFBQTtBQUkvQyxVQUFLLElBQUksY0FBYyxLQUFPLElBQUksYUFBYSxNQUMzQyxDQUFFLFlBQVcsUUFBUTtBQUN2QixZQUFJLGNBQWM7QUFBQTtBQUtwQixVQUFLLElBQUksYUFBYSxNQUFRLElBQUksYUFBYTtBQUc3QyxZQUFLLEtBQUksYUFBYSxRQUFRO0FBQzVCLGNBQUksY0FBYztBQUFBO0FBQUE7QUFJdEIsV0FBSyxNQUFTO0FBQ2QsV0FBSyxNQUFTO0FBQ2QsV0FBSyxRQUFTO0FBQ2QsV0FBSyxTQUFTO0FBRWQsV0FBSyxPQUFTLElBQUk7QUFDbEIsV0FBSyxLQUFLLFlBQVk7QUFFdEIsVUFBSSxTQUFVLGFBQWEsYUFDekIsS0FBSyxNQUNMLElBQUk7QUFHTixVQUFJLFdBQVcsRUFBRTtBQUNmLGNBQU0sSUFBSSxNQUFNLElBQUk7QUFBQTtBQUd0QixXQUFLLFNBQVMsSUFBSTtBQUVsQixtQkFBYSxpQkFBaUIsS0FBSyxNQUFNLEtBQUs7QUFHOUMsVUFBSSxJQUFJO0FBRU4sWUFBSSxPQUFPLElBQUksZUFBZTtBQUM1QixjQUFJLGFBQWEsUUFBUSxXQUFXLElBQUk7QUFBQSxtQkFDL0IsU0FBUyxLQUFLLElBQUksZ0JBQWdCO0FBQzNDLGNBQUksYUFBYSxJQUFJLFdBQVcsSUFBSTtBQUFBO0FBRXRDLFlBQUksSUFBSTtBQUNOLG1CQUFTLGFBQWEscUJBQXFCLEtBQUssTUFBTSxJQUFJO0FBQzFELGNBQUksV0FBVyxFQUFFO0FBQ2Ysa0JBQU0sSUFBSSxNQUFNLElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQWtDNUIsWUFBUSxVQUFVLE9BQU8sU0FBVSxNQUFNO0FBQ3ZDLFVBQUksT0FBTyxLQUFLO0FBQ2hCLFVBQUksWUFBWSxLQUFLLFFBQVE7QUFDN0IsVUFBSSxhQUFhLEtBQUssUUFBUTtBQUM5QixVQUFJLFFBQVE7QUFDWixVQUFJLGVBQWUsTUFBTTtBQUl6QixVQUFJLGdCQUFnQjtBQUVwQixVQUFJLEtBQUs7QUFBUyxlQUFPO0FBQUE7QUFDekIsY0FBUyxTQUFTLENBQUMsQ0FBQyxPQUFRLE9BQVMsU0FBUyxPQUFRLEVBQUUsV0FBVyxFQUFFO0FBR3JFLFVBQUksT0FBTyxTQUFTO0FBRWxCLGFBQUssUUFBUSxRQUFRLGNBQWM7QUFBQSxpQkFDMUIsU0FBUyxLQUFLLFVBQVU7QUFDakMsYUFBSyxRQUFRLElBQUksV0FBVztBQUFBO0FBRTVCLGFBQUssUUFBUTtBQUFBO0FBR2YsV0FBSyxVQUFVO0FBQ2YsV0FBSyxXQUFXLEtBQUssTUFBTTtBQUUzQjtBQUNFLFlBQUksS0FBSyxjQUFjO0FBQ3JCLGVBQUssU0FBUyxJQUFJLE1BQU0sS0FBSztBQUM3QixlQUFLLFdBQVc7QUFDaEIsZUFBSyxZQUFZO0FBQUE7QUFHbkIsaUJBQVMsYUFBYSxRQUFRLE1BQU0sRUFBRTtBQUV0QyxZQUFJLFdBQVcsRUFBRSxlQUFlO0FBQzlCLG1CQUFTLGFBQWEscUJBQXFCLEtBQUssTUFBTTtBQUFBO0FBR3hELFlBQUksV0FBVyxFQUFFLGVBQWUsa0JBQWtCO0FBQ2hELG1CQUFTLEVBQUU7QUFDWCwwQkFBZ0I7QUFBQTtBQUdsQixZQUFJLFdBQVcsRUFBRSxnQkFBZ0IsV0FBVyxFQUFFO0FBQzVDLGVBQUssTUFBTTtBQUNYLGVBQUssUUFBUTtBQUNiLGlCQUFPO0FBQUE7QUFHVCxZQUFJLEtBQUs7QUFDUCxjQUFJLEtBQUssY0FBYyxLQUFLLFdBQVcsRUFBRSxnQkFBaUIsS0FBSyxhQUFhLEtBQU0sV0FBVSxFQUFFLFlBQVksVUFBVSxFQUFFO0FBRXBILGdCQUFJLEtBQUssUUFBUSxPQUFPO0FBRXRCLDhCQUFnQixRQUFRLFdBQVcsS0FBSyxRQUFRLEtBQUs7QUFFckQscUJBQU8sS0FBSyxXQUFXO0FBQ3ZCLHdCQUFVLFFBQVEsV0FBVyxLQUFLLFFBQVE7QUFHMUMsbUJBQUssV0FBVztBQUNoQixtQkFBSyxZQUFZLFlBQVk7QUFDN0Isa0JBQUk7QUFBUSxzQkFBTSxTQUFTLEtBQUssUUFBUSxLQUFLLFFBQVEsZUFBZSxNQUFNO0FBQUE7QUFFMUUsbUJBQUssT0FBTztBQUFBO0FBR1osbUJBQUssT0FBTyxNQUFNLFVBQVUsS0FBSyxRQUFRLEtBQUs7QUFBQTtBQUFBO0FBQUE7QUFZcEQsWUFBSSxLQUFLLGFBQWEsS0FBSyxLQUFLLGNBQWM7QUFDNUMsMEJBQWdCO0FBQUE7QUFBQSxlQUdWLE1BQUssV0FBVyxLQUFLLEtBQUssY0FBYyxNQUFNLFdBQVcsRUFBRTtBQUVyRSxVQUFJLFdBQVcsRUFBRTtBQUNmLGdCQUFRLEVBQUU7QUFBQTtBQUlaLFVBQUksVUFBVSxFQUFFO0FBQ2QsaUJBQVMsYUFBYSxXQUFXLEtBQUs7QUFDdEMsYUFBSyxNQUFNO0FBQ1gsYUFBSyxRQUFRO0FBQ2IsZUFBTyxXQUFXLEVBQUU7QUFBQTtBQUl0QixVQUFJLFVBQVUsRUFBRTtBQUNkLGFBQUssTUFBTSxFQUFFO0FBQ2IsYUFBSyxZQUFZO0FBQ2pCLGVBQU87QUFBQTtBQUdULGFBQU87QUFBQTtBQWFULFlBQVEsVUFBVSxTQUFTLFNBQVU7QUFDbkMsV0FBSyxPQUFPLEtBQUs7QUFBQTtBQWNuQixZQUFRLFVBQVUsUUFBUSxTQUFVO0FBRWxDLFVBQUksV0FBVyxFQUFFO0FBQ2YsWUFBSSxLQUFLLFFBQVEsT0FBTztBQUd0QixlQUFLLFNBQVMsS0FBSyxPQUFPLEtBQUs7QUFBQTtBQUUvQixlQUFLLFNBQVMsTUFBTSxjQUFjLEtBQUs7QUFBQTtBQUFBO0FBRzNDLFdBQUssU0FBUztBQUNkLFdBQUssTUFBTTtBQUNYLFdBQUssTUFBTSxLQUFLLEtBQUs7QUFBQTtBQTJDdkIscUJBQWlCLE9BQU87QUFDdEIsVUFBSSxXQUFXLElBQUksUUFBUTtBQUUzQixlQUFTLEtBQUssT0FBTztBQUdyQixVQUFJLFNBQVM7QUFBTyxjQUFNLFNBQVMsT0FBTyxJQUFJLFNBQVM7QUFBQTtBQUV2RCxhQUFPLFNBQVM7QUFBQTtBQVlsQix3QkFBb0IsT0FBTztBQUN6QixnQkFBVSxXQUFXO0FBQ3JCLGNBQVEsTUFBTTtBQUNkLGFBQU8sUUFBUSxPQUFPO0FBQUE7QUFjeEIsWUFBUSxVQUFVO0FBQ2xCLFlBQVEsVUFBVTtBQUNsQixZQUFRLGFBQWE7QUFDckIsWUFBUSxTQUFVO0FBQUE7OztBQ3RhbEI7QUFDQTtBQUVBLFFBQUksU0FBWSxpQkFBOEI7QUFFOUMsUUFBSSxVQUFZO0FBQ2hCLFFBQUksVUFBWTtBQUNoQixRQUFJLGFBQVk7QUFFaEIsUUFBSSxPQUFPO0FBRVgsV0FBTyxNQUFNLFNBQVMsU0FBUztBQUUvQixXQUFPLFVBQVU7QUFBQTs7O0FDYmpCO0FBQ0MsSUFBQztBQUNGLFVBQUksUUFBTztBQUdYLFVBQUk7QUFDSixVQUFJLE9BQU8sVUFBVTtBQUFXLGVBQU8sVUFBVTtBQUFBO0FBQWMsZUFBTyxPQUFPO0FBQUE7QUFDN0UsVUFBSTtBQUErQixlQUFPO0FBQUE7QUFBeUIsZUFBTyxPQUFPO0FBQUE7QUFDakY7QUFBaUIsWUFBSSxPQUFPLFdBQVMsZUFBZTtBQUFxQyxrQkFBUSxJQUFJLE1BQU0sU0FBUztBQUFBO0FBQ3BILE1BQUMsVUFBUyxPQUFNO0FBTWhCLGNBQUssVUFBVSxTQUFTO0FBRXZCLGNBQUksSUFBSSxJQUFJLE9BQU8sSUFBSSxJQUFJO0FBQzNCLGNBQUcsSUFBSSxLQUFLLFFBQU07QUFBTSxtQkFBTyxDQUFDLE1BQUssUUFBUSxZQUFZLElBQUksTUFBTSxHQUFHLEdBQUcsS0FBSztBQUU5RSxjQUFJLE9BQU87QUFDWCxjQUFHLElBQUksT0FBTyxHQUFHLFFBQU07QUFBTSxnQkFBSSxPQUFPLEdBQUcsT0FBTyxJQUFJO0FBRXRELGNBQUksS0FBSyxRQUFRLElBQUksV0FBVyxJQUFFLElBQUU7QUFDcEMsbUJBQVEsSUFBRSxHQUFHLElBQUUsSUFBSSxPQUFPLFFBQVE7QUFFakMsZ0JBQUksTUFBTSxJQUFJLE9BQU87QUFDckIsZ0JBQUksS0FBRyxJQUFJLEtBQUssR0FBRyxLQUFHLElBQUksS0FBSyxHQUFHLEtBQUssSUFBSSxLQUFLLE9BQU8sS0FBSyxJQUFJLEtBQUs7QUFDckUsZ0JBQUksUUFBUSxNQUFLLFFBQVEsWUFBWSxJQUFJLE1BQU0sSUFBRyxJQUFJO0FBRXRELGdCQUFHLEtBQUc7QUFBRyxvQkFBTTtBQUFBLHFCQUNQLElBQUksU0FBUztBQUFHLG9CQUFLLFVBQVUsT0FBTyxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsSUFBSSxJQUFJO0FBQUEscUJBQ2pFLElBQUksU0FBUztBQUFHLG9CQUFLLFVBQVUsT0FBTyxJQUFJLElBQUksS0FBSyxHQUFHLEdBQUcsSUFBSSxJQUFJO0FBRXpFLGlCQUFLLEtBQUssSUFBSTtBQUFVLGtCQUFNLElBQUksTUFBTTtBQUV4QyxnQkFBUSxJQUFJLFdBQVM7QUFBQSx1QkFDYixJQUFJLFdBQVM7QUFBRyxvQkFBSyxVQUFVLE9BQU8sSUFBSSxJQUFJLEtBQUssR0FBRyxHQUFHLElBQUksSUFBSTtBQUFBLHFCQUNqRSxJQUFJLFdBQVM7QUFDcEIsa0JBQUksS0FBSyxJQUFFO0FBQ1gscUJBQU0sSUFBSSxPQUFPLElBQUksV0FBUztBQUFHO0FBQ2pDLG9CQUFNLElBQUksV0FBVyxLQUFLLEtBQUssTUFBTTtBQUFBO0FBQUE7QUFHdkMsaUJBQU87QUFBQTtBQUVSLGNBQUssUUFBUSxjQUFjLFNBQVMsTUFBTSxHQUFHLEdBQUc7QUFFL0MsY0FBSSxPQUFPLElBQUUsR0FBRyxNQUFNLE1BQUssT0FBTyxRQUFRO0FBQzFDLGNBQUksTUFBTSxLQUFLLEtBQUssSUFBRSxNQUFJO0FBRTFCLGNBQUksS0FBSyxJQUFJLFdBQVcsT0FBSyxJQUFJLE9BQU8sSUFBSSxZQUFZLEdBQUc7QUFDM0QsY0FBSSxRQUFRLElBQUksT0FBTyxRQUFRLElBQUk7QUFDbkMsY0FBSSxLQUFLLE1BQUssS0FBSztBQUluQixjQUFRLFNBQU87QUFDZCxnQkFBSSxRQUFRLFFBQU07QUFDbEIsZ0JBQUcsU0FBUTtBQUFHLHVCQUFRLElBQUUsR0FBRyxJQUFFLE9BQU07QUFBUSxtQkFBRyxLQUFLLEtBQUs7QUFBQTtBQUN4RCxnQkFBRyxTQUFPO0FBQUksdUJBQVEsSUFBRSxHQUFHLElBQUUsT0FBTTtBQUFRLG1CQUFHLEtBQUssS0FBSyxLQUFHO0FBQUE7QUFBQSxxQkFFcEQsU0FBTztBQUNkLGdCQUFJLEtBQUcsSUFBSSxLQUFLLFNBQVMsS0FBRyxJQUFJLEtBQUcsSUFBSSxLQUFHO0FBQzFDLGdCQUFHO0FBQU8sbUJBQUcsR0FBRztBQUFLLG1CQUFHLEdBQUc7QUFBSyxtQkFBRyxHQUFHO0FBQUE7QUFDdEMsZ0JBQUcsU0FBUTtBQUFHLHVCQUFRLElBQUUsR0FBRyxJQUFFLE1BQU07QUFBUSxvQkFBSSxLQUFHLEtBQUcsR0FBRyxLQUFHLElBQUU7QUFBSSxtQkFBRyxNQUFNLEtBQUs7QUFBTSxtQkFBRyxLQUFHLEtBQUssS0FBSyxLQUFHO0FBQUssbUJBQUcsS0FBRyxLQUFLLEtBQUssS0FBRztBQUFLLG1CQUFHLEtBQUcsS0FBSztBQUMvSSxvQkFBRyxNQUFJLE1BQU0sS0FBSyxPQUFRLE1BQU0sS0FBSyxLQUFHLE1BQU8sTUFBTSxLQUFLLEtBQUcsTUFBTztBQUFJLHFCQUFHLEtBQUcsS0FBSztBQUFBO0FBQ3BGLGdCQUFHLFNBQU87QUFBSSx1QkFBUSxJQUFFLEdBQUcsSUFBRSxNQUFNO0FBQVEsb0JBQUksS0FBRyxLQUFHLEdBQUcsS0FBRyxJQUFFO0FBQUksbUJBQUcsTUFBTSxLQUFLO0FBQU0sbUJBQUcsS0FBRyxLQUFLLEtBQUssS0FBRztBQUFLLG1CQUFHLEtBQUcsS0FBSyxLQUFLLEtBQUc7QUFBSyxtQkFBRyxLQUFHLEtBQUs7QUFDL0ksb0JBQUcsTUFBSSxNQUFNLEdBQUcsTUFBSyxPQUFLLE1BQU0sR0FBRyxNQUFLLEtBQUcsTUFBSSxNQUFNLEdBQUcsTUFBSyxLQUFHLE1BQUk7QUFBSSxxQkFBRyxLQUFHLEtBQUs7QUFBQTtBQUFBLHFCQUU3RSxTQUFPO0FBQ2QsZ0JBQUksSUFBRSxJQUFJLEtBQUssU0FBUyxLQUFHLElBQUksS0FBSyxTQUFTLEtBQUcsS0FBRyxHQUFHLFNBQU87QUFFN0QsZ0JBQUcsU0FBTztBQUFHLHVCQUFRLElBQUUsR0FBRyxJQUFFLEdBQUc7QUFBUSxvQkFBSSxLQUFLLElBQUUsS0FBSyxLQUFLLElBQUU7QUFDN0QseUJBQVEsSUFBRSxHQUFHLElBQUUsR0FBRztBQUFPLHNCQUFJLEtBQUksS0FBRyxLQUFJLEdBQUcsSUFBSSxLQUFLLEtBQUksTUFBRyxPQUFNLElBQUksTUFBRSxNQUFJLEtBQU0sR0FBSSxLQUFHLElBQUU7QUFBSSxxQkFBRyxNQUFJLEVBQUU7QUFBTSxxQkFBRyxLQUFHLEtBQUcsRUFBRSxLQUFHO0FBQUsscUJBQUcsS0FBRyxLQUFHLEVBQUUsS0FBRztBQUFLLHFCQUFHLEtBQUcsS0FBSSxJQUFFLEtBQUksR0FBRyxLQUFHO0FBQUE7QUFBQTtBQUUxSyxnQkFBRyxTQUFPO0FBQUcsdUJBQVEsSUFBRSxHQUFHLElBQUUsR0FBRztBQUFRLG9CQUFJLEtBQUssSUFBRSxLQUFLLEtBQUssSUFBRTtBQUM3RCx5QkFBUSxJQUFFLEdBQUcsSUFBRSxHQUFHO0FBQU8sc0JBQUksS0FBSSxLQUFHLEtBQUksR0FBRyxJQUFJLEtBQUssS0FBSSxNQUFHLE9BQU0sSUFBSSxNQUFFLE1BQUksS0FBTSxHQUFJLEtBQUcsSUFBRTtBQUFJLHFCQUFHLE1BQUksRUFBRTtBQUFNLHFCQUFHLEtBQUcsS0FBRyxFQUFFLEtBQUc7QUFBSyxxQkFBRyxLQUFHLEtBQUcsRUFBRSxLQUFHO0FBQUsscUJBQUcsS0FBRyxLQUFJLElBQUUsS0FBSSxHQUFHLEtBQUc7QUFBQTtBQUFBO0FBRTFLLGdCQUFHLFNBQU87QUFBRyx1QkFBUSxJQUFFLEdBQUcsSUFBRSxHQUFHO0FBQVEsb0JBQUksS0FBSyxJQUFFLEtBQUssS0FBSyxJQUFFO0FBQzdELHlCQUFRLElBQUUsR0FBRyxJQUFFLEdBQUc7QUFBTyxzQkFBSSxLQUFJLEtBQUcsS0FBSSxHQUFHLElBQUksS0FBSyxLQUFJLE1BQUcsT0FBTSxJQUFJLE1BQUUsTUFBSSxLQUFLLElBQUssS0FBRyxJQUFFO0FBQUkscUJBQUcsTUFBSSxFQUFFO0FBQU0scUJBQUcsS0FBRyxLQUFHLEVBQUUsS0FBRztBQUFLLHFCQUFHLEtBQUcsS0FBRyxFQUFFLEtBQUc7QUFBSyxxQkFBRyxLQUFHLEtBQUksSUFBRSxLQUFJLEdBQUcsS0FBRztBQUFBO0FBQUE7QUFFMUssZ0JBQUcsU0FBTztBQUFHLHVCQUFRLElBQUUsR0FBRyxJQUFFLE1BQU07QUFBUyxvQkFBSSxLQUFHLEtBQUcsR0FBRyxJQUFFLEtBQUssSUFBMEIsS0FBRyxJQUFFO0FBQUksbUJBQUcsTUFBSSxFQUFFO0FBQU0sbUJBQUcsS0FBRyxLQUFHLEVBQUUsS0FBRztBQUFLLG1CQUFHLEtBQUcsS0FBRyxFQUFFLEtBQUc7QUFBSyxtQkFBRyxLQUFHLEtBQUksSUFBRSxLQUFJLEdBQUcsS0FBRztBQUFBO0FBQUEscUJBRXRLLFNBQU87QUFDZCxnQkFBRyxTQUFRO0FBQUksdUJBQVEsSUFBRSxHQUFHLElBQUUsTUFBTTtBQUFRLG9CQUFJLEtBQUcsS0FBRyxHQUFHLEtBQUcsS0FBRyxHQUFHLEtBQUcsS0FBSztBQUFNLG1CQUFHLE1BQUk7QUFBSyxtQkFBRyxLQUFHLEtBQUc7QUFBSyxtQkFBRyxL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
