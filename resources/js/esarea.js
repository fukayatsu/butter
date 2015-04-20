(function() {
  var getCurrentLine, getPrevLine, handleEnterKey, handleSpaceKey, handleTabKey, suggesting;

  if (location.host.match(/qiita\.com|esa\.io|docbase\.io|pplog\.net|lvh\.me/)) {
    return;
  }

  suggesting = null;

  window.addEventListener('keyup', function(e) {
    if (!e.target.tagName.match(/TEXTAREA/i)) {
      return;
    }

    if (location.host.match(/github\.com/)) {
      suggesting = !!$('ul.suggestions:visible').length;
    } else if (location.host.match(/idobata\.io/)) {
      suggesting = !!$('.atwho-view:visible').length;
    }
  });

  window.addEventListener('keydown', function(e) {
    if (!e.target.tagName.match(/TEXTAREA/i)) {
      return;
    }

    if (suggesting) {
      return;
    }

    switch (e.keyCode) {
      case 9:
        handleTabKey(e);
        break;
      case 13:
        handleEnterKey(e);
        break;
      case 32:
        handleSpaceKey(e);
    }
  });

  handleTabKey = function(e) {
    var currentLine, newPos, pos, reindentedCount, reindentedText, text;
    e.preventDefault();
    currentLine = getCurrentLine(e);
    text = $(e.target).val();
    pos = $(e.target).selection('getPos');
    if (currentLine) {
      $(e.target).selection('setPos', {
        start: currentLine.start,
        end: currentLine.end - 1
      });
    }
    if (e.shiftKey) {
      if (currentLine && currentLine.text.charAt(0) === '|') {
        newPos = text.lastIndexOf('|', pos.start - 1);
        if (newPos > 0) {
          $(e.target).selection('setPos', {
            start: newPos - 1,
            end: newPos - 1
          });
        }
      } else {
        reindentedText = $(e.target).selection().replace(/^ {1,4}/gm, '');
        reindentedCount = $(e.target).selection().length - reindentedText.length;
        $(e.target).selection('replace', {
          text: reindentedText,
          mode: 'before'
        });
        if (currentLine) {
          $(e.target).selection('setPos', {
            start: pos.start - reindentedCount,
            end: pos.start - reindentedCount
          });
        }
      }
    } else {
      if (currentLine && currentLine.text.charAt(0) === '|') {
        newPos = text.indexOf('|', pos.start + 1);
        if ((newPos < 0) || (newPos === text.lastIndexOf('|', currentLine.end - 1))) {
          $(e.target).selection('setPos', {
            start: currentLine.end,
            end: currentLine.end
          });
        } else {
          $(e.target).selection('setPos', {
            start: newPos + 2,
            end: newPos + 2
          });
        }
      } else {
        $(e.target).selection('replace', {
          text: '    ' + $(e.target).selection().split("\n").join("\n    "),
          mode: 'before'
        });
        if (currentLine) {
          $(e.target).selection('setPos', {
            start: pos.start + 4,
            end: pos.start + 4
          });
        }
      }
    }
    return $(e.target).trigger('input');
  };

  handleEnterKey = function(e) {
    var currentLine, i, len, match, prevLine, ref, row;
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }
    if (!(currentLine = getCurrentLine(e))) {
      return;
    }
    if (currentLine.start === currentLine.caret) {
      return;
    }
    if (match = currentLine.text.match(/^(\s*(?:-|\+|\*) (?:\[(?:x| )\] )?)\s*\S/)) {
      if (currentLine.text.match(/^(\s*(?:-|\+|\*) (?:\[(?:x| )\] ))\s*$/)) {
        $(e.target).selection('setPos', {
          start: currentLine.start,
          end: currentLine.end - 1
        });
        return;
      }
      e.preventDefault();
      $(e.target).selection('insert', {
        text: "\n" + match[1],
        mode: 'before'
      });
    } else if (currentLine.text.match(/^(\s*(?:-|\+|\*) )/)) {
      $(e.target).selection('setPos', {
        start: currentLine.start,
        end: currentLine.end
      });
    } else if (currentLine.text.match(/^.*\|\s*$/)) {
      if (currentLine.text.match(/^[\|\s]+$/)) {
        $(e.target).selection('setPos', {
          start: currentLine.start,
          end: currentLine.end
        });
        return;
      }
      if (!currentLine.endOfLine) {
        return;
      }
      e.preventDefault();
      row = [];
      ref = currentLine.text.match(/\|/g);
      for (i = 0, len = ref.length; i < len; i++) {
        match = ref[i];
        row.push("|");
      }
      prevLine = getPrevLine(e);
      if (!prevLine || (!currentLine.text.match(/---/) && !prevLine.text.match(/\|/g))) {
        $(e.target).selection('insert', {
          text: "\n" + row.join(' --- ') + "\n" + row.join('  '),
          mode: 'before'
        });
        $(e.target).selection('setPos', {
          start: currentLine.caret + 6 * row.length - 1,
          end: currentLine.caret + 6 * row.length - 1
        });
      } else {
        $(e.target).selection('insert', {
          text: "\n" + row.join('  '),
          mode: 'before'
        });
        $(e.target).selection('setPos', {
          start: currentLine.caret + 3,
          end: currentLine.caret + 3
        });
      }
    }
    return $(e.target).trigger('input');
  };

  handleSpaceKey = function(e) {
    var checkMark, currentLine, match, replaceTo;
    if (!(e.shiftKey && e.altKey)) {
      return;
    }
    if (!(currentLine = getCurrentLine(e))) {
      return;
    }
    if (match = currentLine.text.match(/^(\s*)(-|\+|\*) (?:\[(x| )\] )(.*)/)) {
      e.preventDefault();
      checkMark = match[3] === ' ' ? 'x' : ' ';
      replaceTo = "" + match[1] + match[2] + " [" + checkMark + "] " + match[4];
      $(e.target).selection('setPos', {
        start: currentLine.start,
        end: currentLine.end
      });
      $(e.target).selection('replace', {
        text: replaceTo,
        mode: 'keep'
      });
      $(e.target).selection('setPos', {
        start: currentLine.caret,
        end: currentLine.caret
      });
      return $(e.target).trigger('input');
    }
  };

  getCurrentLine = function(e) {
    var endPos, pos, startPos, text;
    text = $(e.target).val();
    pos = $(e.target).selection('getPos');
    if (!text) {
      return null;
    }
    if (pos.start !== pos.end) {
      return null;
    }
    startPos = text.lastIndexOf("\n", pos.start - 1) + 1;
    endPos = text.indexOf("\n", pos.start);
    if (endPos === -1) {
      endPos = text.length;
    }
    return {
      text: text.slice(startPos, endPos),
      start: startPos,
      end: endPos,
      caret: pos.start,
      endOfLine: !$.trim(text.slice(pos.start, endPos))
    };
  };

  getPrevLine = function(e) {
    var currentLine, endPos, startPos, text;
    currentLine = getCurrentLine(e);
    text = $(e.target).val().slice(0, currentLine.start);
    startPos = text.lastIndexOf("\n", currentLine.start - 2) + 1;
    endPos = currentLine.start;
    return {
      text: text.slice(startPos, endPos),
      start: startPos,
      end: endPos
    };
  };

}).call(this);
