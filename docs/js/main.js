
$(document).ready(function () {
    "use strict";

    var window_width = $(window).width(),
        window_height = window.innerHeight,
        header_height = $(".default-header").height(),
        header_height_static = $(".site-header.static").outerHeight(),
        fitscreen = window_height - header_height;


    $(".fullscreen").css("height", window_height)
    $(".fitscreen").css("height", fitscreen);

    if (document.getElementById("default-select")) {
        $('select').niceSelect();
    };
    if (document.getElementById("service-select")) {
        $('select').niceSelect();
    };

    $('.img-gal').magnificPopup({
        type: 'image',
        gallery: {
            enabled: true
        }
    });


    $('.play-btn').magnificPopup({
        type: 'iframe',
        mainClass: 'mfp-fade',
        removalDelay: 160,
        preloader: false,
        fixedContentPos: false
    });


    // Mobile Navigation
    if ($('#nav-menu-container').length) {
        var $mobile_nav = $('#nav-menu-container').clone().prop({
            id: 'mobile-nav'
        });
        $mobile_nav.find('> ul').attr({
            'class': '',
            'id': ''
        });
        $('body').append($mobile_nav);
        $('body').prepend('<button type="button" id="mobile-nav-toggle"><i class="lnr lnr-menu"></i></button>');
        $('body').append('<div id="mobile-body-overly"></div>');
        $('#mobile-nav').find('.menu-has-children').prepend('<i class="lnr lnr-chevron-down"></i>');

        $(document).on('click', '.menu-has-children i', function (e) {
            $(this).next().toggleClass('menu-item-active');
            $(this).nextAll('ul').eq(0).slideToggle();
            $(this).toggleClass("lnr-chevron-up lnr-chevron-down");
        });

        $(document).on('click', '#mobile-nav-toggle', function (e) {
            $('body').toggleClass('mobile-nav-active');
            $('#mobile-nav-toggle i').toggleClass('lnr-cross lnr-menu');
            $('#mobile-body-overly').toggle();
        });

        $(document).click(function (e) {
            var container = $("#mobile-nav, #mobile-nav-toggle");
            if (!container.is(e.target) && container.has(e.target).length === 0) {
                if ($('body').hasClass('mobile-nav-active')) {
                    $('body').removeClass('mobile-nav-active');
                    $('#mobile-nav-toggle i').toggleClass('lnr-cross lnr-menu');
                    $('#mobile-body-overly').fadeOut();
                }
            }
        });
    } else if ($("#mobile-nav, #mobile-nav-toggle").length) {
        $("#mobile-nav, #mobile-nav-toggle").hide();
    }

    // Smooth scroll for the menu and links with .scrollto classes
    $('.nav-menu a, #mobile-nav a, .scrollto').on('click', function () {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            if (target.length) {
                var top_space = 0;

                if ($('#header').length) {
                    top_space = $('#header').outerHeight();

                    if (!$('#header').hasClass('header-fixed')) {
                        top_space = top_space;
                    }
                }

                $('html, body').animate({
                    scrollTop: target.offset().top - top_space
                }, 1500, 'easeInOutExpo');

                if ($(this).parents('.nav-menu').length) {
                    $('.nav-menu .menu-active').removeClass('menu-active');
                    $(this).closest('li').addClass('menu-active');
                }

                if ($('body').hasClass('mobile-nav-active')) {
                    $('body').removeClass('mobile-nav-active');
                    $('#mobile-nav-toggle i').toggleClass('lnr-times lnr-bars');
                    $('#mobile-body-overly').fadeOut();
                }
                return false;
            }
        }
    });


    $(document).ready(function () {

        $('html, body').hide();

        if (window.location.hash) {

            setTimeout(function () {

                $('html, body').scrollTop(0).show();

                $('html, body').animate({

                    scrollTop: $(window.location.hash).offset().top - 108

                }, 1000)

            }, 0);

        }

        else {

            $('html, body').show();

        }

    });


    // Header scroll class
    $(window).scroll(function () {
        if ($(this).scrollTop() > 50) {
            $('#header').addClass('header-scrolled');
        } else {
            $('#header').removeClass('header-scrolled');
        }
    });


    $(".item").each(function (index) {
        $(this).data('index', index);
    });
    if ($('.owl-screenshot').length) {
        $('.owl-screenshot').owlCarousel({
            loop: true,
            margin: 30,
            center: true,
            autoWidth: false,
            items: 1,
            nav: false,
            autoplay: 2500,
            //smartSpeed: 1500,
            dots: false,
            rewind: true,
        });
        window.owl = $('.owl-screenshot');
        owl.owlCarousel();
    }

    $(document).ready(function () {
    });
});

var timeout = null;
function goTo(tag) {
    let findIdx = -1;
    $(".item").each(function (index) {
        //console.log($(this).data('index'), idx);
        if ($(this).data('tag') == tag) {
            if (findIdx == -1)
                findIdx = $(this).data('index');

            if (typeof findIdx == 'undefined')
                findIdx = -1;
        }
    });
    if (findIdx == -1)
        return;
    window.owl.trigger("stop.owl.autoplay");
    window.owl.trigger("to.owl.carousel", findIdx, 0);

    if (timeout)
        clearInterval(timeout);
    timeout = setTimeout(() => {
        window.owl.trigger("play.owl.autoplay");
    }, 5000);
}

fetchLatestVersion = async () => {
    const data = await fetch("https://api.github.com/repos/sandiz/rs-manager/releases/latest");
    const json = await data.json();
    const assets = json.assets;
    $("#version").html(json.tag_name + " - " + json.name);
    for (let i = 0; i < assets.length; i += 1) {
        const asset = assets[i];
        if (asset.name.endsWith(".dmg"))
            $("#mac-dl").attr('href', asset.browser_download_url);
        if (asset.name.endsWith(".exe"))
            $("#win-dl").attr('href', asset.browser_download_url);
    }
}
fetchLatestVersion();
