// Stream.js
//
// An app.net stream

/*global define:true */
define(['jquery', 'appnet', 'js/allPosts', 'js/threader',
        'js/PostList', 'js/Post',
        'jquery-mousewheel'],
function ($, appnet, allPosts, threader, PostList, Post)
{
  'use strict';

  function Stream(type, root)
  {
    this.type = type;
    this.root = root;
    this.list = new PostList();
    this.timer = null;
    this.since = null;
    this.ancestors = [];
    this.center = this.list;

    this.update();
    $(document).mousewheel($.proxy(this.moveMousewheel, this));
    $(document).keydown($.proxy(this.keyDown, this));
  }

  Stream.prototype.update = function ()
  {
    clearTimeout(this.timer);
    this.timer = setTimeout($.proxy(this.update, this), 30 * 1000);
    var options = {
      count: 200,
      include_deleted: 0,
      include_directed_posts: 1
    };
    if (this.since)
    {
      options.since_id = this.since;
    }
    appnet.api.getMyUnified(options, $.proxy(this.completeUpdate, this),
                            $.proxy(this.failUpdate, this));
  };

  Stream.prototype.completeUpdate = function (response)
  {
    if (response.meta.max_id)
    {
      this.since = response.meta.max_id;
    }
    var i = 0;
    var post;
    var len = response.data.length;
    if (len > 0)
    {
      for (i = len - 1; i >= 0; i -= 1)
      {
        if (! response.data[i].reply_to)
        {
          post = new Post(response.data[i]);
          allPosts.set(post);
          this.list.addPost(post);
        }
      }
      this.updateRender();
      var current = this.list.getCurrentPost();
      if (current)
      {
        threader.changeThread(current.raw.thread_id, this);
      }
    }
  };

  Stream.prototype.failUpdate = function (response)
  {
  };

  Stream.prototype.updateRender = function ()
  {
    var parent = null;
    if (this.ancestors.length > 0)
    {
      parent = this.ancestors[this.ancestors.length - 1].getCurrentPost();
    }
    var current = this.center.getCurrentPost();
    var child = null;
    if (current)
    {
      child = current.children.getCurrentPost();
    }
    this.root.html(this.center.renderList(2, parent, child));
  };

  Stream.prototype.moveMousewheel = function (event, delta, deltaX, deltaY)
  {
    event.preventDefault();
    if (deltaY < 0)
    {
      this.down();
    }
    else
    {
      this.up();
    }
    return false;
  };

  Stream.prototype.keyDown = function (event)
  {
    if (event.which === 87 || event.which === 38 || // w UP
        event.which === 104)
    {
      this.up();
    }
    else if (event.which === 65 || event.which === 37 || // a LEFT
             event.which === 188 || event.which === 100) // ,
    {
      this.left();
    }
    else if (event.which === 83 || event.which === 40 || // s DOWN
             event.which === 98)
    {
      this.down();
    }
    else if (event.which === 68 || event.which === 39 || // d RIGHT
             event.which === 190 || event.which === 102) // .
    {
      this.right();
    }
  };

  Stream.prototype.down = function ()
  {
    this.center.moveNext();
    this.updateRender();
    var current = this.list.getCurrentPost();
    if (current)
    {
      threader.changeThread(current.raw.thread_id, this);
    }
  };

  Stream.prototype.up = function ()
  {
    this.center.movePrevious();
    this.updateRender();
    var current = this.list.getCurrentPost();
    if (current)
    {
      threader.changeThread(current.raw.thread_id, this);
    }
  };

  Stream.prototype.right = function ()
  {
    var current = this.center.getCurrentPost();
    if (current)
    {
      var deeper = current.children.getCurrentPost();
      if (deeper)
      {
        this.ancestors.push(this.center);
        this.center = current.children;
        this.updateRender();
      }
    }
  };

  Stream.prototype.left = function ()
  {
    if (this.ancestors.length > 0)
    {
      this.center = this.ancestors.pop();
      this.updateRender();
    }
  };

  return Stream;
});
