// Copyright (c) 2010, Anton Korenyushkin

$(function ()
{
  var openListsUL = $('ul.open.lists');
  var doneListsUL = $('ul.done.lists');
  var doneListsLink = $('a.done.lists');
  var doneCountSpan = $('span.count', doneListsLink);
  var addListLink = $('a.add.list');
  var addListForm = $('form.add.list');
  var addListInput = $('input[type="text"]', addListForm);
  var actionSpan = $('span.action', doneListsLink);
  var popupForm = $('form.popup');
  var popupNameInput = $('#name');
  var popupDescrInput = $('#descr');
  var popupItemsLabel = $('label.items', popupForm);
  var popupItemsUL = $('ul', popupForm);
  var backgroundDiv = $('div.background');

  var hasSelectStart = $(document).attr('onselectstart') !== undefined;
  var popupListLI;
  var mouseY;
  var lastY;


  function updateDoneCount() {
    var count = doneListsUL.children().length;
    doneCountSpan.text(count);
    if (count)
      doneListsLink.show();
    else
      doneListsLink.hide();
  }


  function moveList(listLI, listsUL, callback) {
    var listId = listLI.data('id');
    listLI.fadeOut(
      function () {
        var moved = false;
        listsUL.children().each(
          function () {
            if ($(this).data('id') < listId) {
              $(this).before(listLI);
              moved = true;
              return false;
            }
            return true;
          });
        if (!moved)
          listsUL.append(listLI);
        updateDoneCount();
        listLI.fadeIn();
        if (callback)
          callback();
      });
  }


  function createList(list) {
    var descr = list.descr || '';
    var open = list.open || [];
    var done = list.done || [];


    var countSpan = $('<span class="count">' + open.length + '</span>');
    var nameLink = $('<a class="name" href="#"></a>').text(list.name);
    var headerDiv = $('<div class="header"></div>').append(countSpan, nameLink);
    var descrDiv = $('<div class="descr"></div>').text(descr);
    var openUL = $('<ul class="open items"></ul>');
    var doneUL = $('<ul class="done items"></ul>');
    var addItemLink = $('<a class="add item" href="#">Add item</a>');
    var editLink = $('<a class="edit list" href="#">Edit</a>');
    var deleteLink = $('<a class="delete list" href="#">Delete</a>');
    var manageDiv = $('<div class="manage"></div>')
      .append(addItemLink, editLink, deleteLink);
    var addItemInput = $('<input type="text">');
    var closeLink = $('<a class="close" href="#">Close</a>');
    var addItemForm = $(
      '<form class="add item"> <input type="submit" value="Add item"> </form>')
      .prepend(addItemInput)
      .append(closeLink);
    var bodyDiv = $('<div class="body"></div>')
      .append(descrDiv, openUL, manageDiv, addItemForm, doneUL);
    var listLI = $('<li></li>').append(headerDiv, bodyDiv).data('id', list.id);


    function createItem(item, checked) {
      var itemLI = $('<li></li>').text(item.name).data('id', item.id);
      var checkbox = $('<input type="checkbox">').change(
        function () {
          var done = $(this).attr('checked');
          $.ajax(
            {
              type: 'POST',
              url: list.id + '/' + item.id,
              success: function () {
                var count = +countSpan.text();
                if (done) {
                  doneUL.prepend(itemLI);
                  if (!--count)
                    moveList(listLI, doneListsUL);
                } else {
                  openUL.append(itemLI);
                  if (!count++)
                    moveList(listLI, openListsUL);
                }
                countSpan.text(count);
              }
            });
        });
      if (checked)
        checkbox.attr('checked', 'checked');
      itemLI.prepend(checkbox);
      return itemLI;
    }


    function createItems(itemsUL, items, checked) {
      $.each(
        items, function (_, item) {
          itemsUL.append(createItem(item, checked));
        });
    }


    createItems(openUL, open, false);
    createItems(doneUL, done, true);


    nameLink.click(
      function () {
        $(this).blur();
        bodyDiv.slideToggle();
        return false;
      });


    addItemLink.click(
      function () {
        manageDiv.hide();
        addItemForm.fadeIn();
        addItemInput.focus();
        return false;
      });


    addItemForm.submit(
      function () {
        var name = addItemInput.val();
        if (!name)
          return false;
        addItemInput.val('');
        $.ajax(
          {
            type: 'POST',
            url: list.id,
            data: name,
            success: function (id) {
              openUL.append(createItem({id: +id, name: name}));
              countSpan.text(+countSpan.text() + 1);
              if (listLI.parent().hasClass('done'))
                moveList(listLI, openListsUL,
                         function () { addItemInput.focus(); });
            }
          });
        return false;
      });


    function closeAddItemForm() {
      addItemForm.fadeOut(
        function () {
          manageDiv.show();
        });
    }


    addItemForm.keydown(
      function (event) {
        if (event.keyCode == 27)
          closeAddItemForm();
      });


    closeLink.click(
      function () {
        closeAddItemForm();
        return false;
      });


    editLink.click(
      function () {
        popupListLI = listLI;
        popupNameInput.val(list.name);
        popupDescrInput.val(descr);
        popupItemsUL.children().remove();
        if (openUL.is(':empty'))
          popupItemsLabel.hide();
        else
          popupItemsLabel.show();
        openUL.children().each(
          function () {
            var deleteLink = $('<a class="delete item" href="#"></a>');
            var dragLink = $('<a class="drag item"></a>');
            var itemLI = $('<li></li>')
              .append($('<input type="text">').val($(this).text()),
                      deleteLink, dragLink)
              .data('id', $(this).data('id'));
            deleteLink.click(
              function () {
                itemLI.remove();
                return false;
              });
            dragLink.mousedown(
              function (event) {
                lastY = event.pageY;
                if (hasSelectStart)
                  $(document).bind(
                    'selectstart', function () { return false; });
                popupItemsUL.addClass('dragging');
                popupItemsUL.children().not(itemLI).fadeTo(0, 0.3).mouseenter(
                  function (event) {
                    if (event.pageY > lastY)
                      $(this).after(itemLI);
                    else
                      $(this).before(itemLI);
                    lastY = event.pageY;
                  });
                $('body').mouseup(
                  function () {
                    popupItemsUL.children().fadeTo(0, 1).unbind('mouseenter');
                    $('body').unbind('mouseup');
                    popupItemsUL.removeClass('dragging');
                    if (hasSelectStart)
                      $(document).unbind('selectstart');
                  });
                event.preventDefault();
                return false;
              });
            popupItemsUL.append(itemLI);
          });
        backgroundDiv.fadeIn();
        popupForm.fadeIn();
        popupNameInput.focus();
        return false;
      });


    deleteLink.click(
      function () {
        if (confirm('Are you sure?'))
          $.ajax(
            {
              type: 'DELETE',
              url: list.id,
              success: function () {
                listLI.slideUp(
                  function () {
                    listLI.remove();
                    updateDoneCount();
                  });
              }
            });
        return false;
      });

    return listLI;
  }


  addListLink.click(
    function () {
      addListLink.hide();
      addListForm.fadeIn();
      addListInput.focus();
      return false;
    });


  addListForm.submit(
    function () {
      var name = addListInput.val();
      if (!name)
        return false;
      addListForm.hide();
      addListLink.fadeIn();
      addListInput.val('');
      $.ajax(
        {
          type: 'POST',
          data: name,
          success: function (id) {
            var listLI = createList({id: +id, name: name});
            openListsUL.prepend(listLI);
            $('div.body', listLI).show();
            $('a.add.item', listLI).click();
          }
        });
      return false;
    });


  function closeAddListForm() {
    addListForm.fadeOut(
      function () {
        addListLink.show();
      });
  }


  addListForm.keydown(
    function (event) {
      if (event.keyCode == 27)
        closeAddListForm();
    });


  $('a.cancel', addListForm).click(
    function () {
      closeAddListForm();
      return false;
    });


  $('a.done.lists').click(
    function () {
      $(this).blur();
      doneListsUL.slideToggle(
        function () {
          actionSpan.text(actionSpan.text() == 'Show' ? 'Hide' : 'Show');
        });
      return false;
    });


  function closePopupForm() {
    popupForm.fadeOut();
    backgroundDiv.fadeOut();
  }


  popupForm.keypress(
    function (event) {
      if (event.keyCode == 27)
        closePopupForm();
    });


  $('a.cancel', popupForm).click(
    function () {
      closePopupForm();
      return false;
    });


  popupForm.submit(
    function () {
      var name = popupNameInput.val();
      if (!name)
        return false;
      var list = {
        name: name,
        descr: popupDescrInput.val(),
        open: []
      };
      popupItemsUL.children().each(
        function () {
          list.open.push(
            {id: $(this).data('id'), name: $('input', $(this)).val()});
        });
      var listId = popupListLI.data('id');
      $.ajax(
        {
          type: 'PUT',
          url: listId,
          data: JSON.stringify(list),
          success: function () {
            list.id = listId;
            list.done = $('ul.done.items > *', popupListLI).map(
              function () {
                return {id: $(this).data('id'), name: $(this).text()};
              });
            var listLI = createList(list);
            popupListLI.replaceWith(listLI);
            $('div.body', listLI).show();
            if (!list.open.length && !popupListLI.is(':empty'))
              moveList(listLI, doneListsUL);
          }
        });
      closePopupForm();
      return false;
    });


  $.each(
    lists, function (_, list) {
      (!list.open.length && list.done.length
       ? doneListsUL
       : openListsUL).append(createList(list));
    });


  if (openListsUL.is(':empty')) {
    addListLink.hide();
    addListForm.show();
    addListInput.focus();
  }


  updateDoneCount();


  popupForm.css(
    {left: document.documentElement.clientWidth / 2 - popupForm.width() / 2});
  backgroundDiv.css({height: document.documentElement.clientHeight});

});
