{
  "targets": [
    {
      "target_name": "axidev_io",
      "sources": [
        "src/addon.c",
        "vendor/axidev-io/src/c_api.c",
        "vendor/axidev-io/src/core/context.c",
        "vendor/axidev-io/src/core/log.c",
        "vendor/axidev-io/src/internal/utf.c",
        "vendor/axidev-io/src/vendor/stb_ds_impl.c",
        "vendor/axidev-io/src/keyboard/common/key_utils.c",
        "vendor/axidev-io/src/keyboard/common/keymap.c"
      ],
      "include_dirs": [
        "vendor/axidev-io/include",
        "vendor/axidev-io/src",
        "vendor/axidev-io/vendor"
      ],
      "defines": [
        "AXIDEV_IO_STATIC"
      ],
      "conditions": [
        [
          "OS==\"win\"",
          {
            "defines": [
              "_CRT_SECURE_NO_WARNINGS"
            ],
            "sources": [
              "vendor/axidev-io/src/internal/thread_win32.c",
              "vendor/axidev-io/src/keyboard/common/windows_keymap.c",
              "vendor/axidev-io/src/keyboard/sender/sender_windows.c",
              "vendor/axidev-io/src/keyboard/listener/listener_windows.c"
            ],
            "libraries": [
              "user32.lib",
              "kernel32.lib"
            ]
          }
        ],
        [
          "OS==\"linux\"",
          {
            "sources": [
              "vendor/axidev-io/src/internal/thread_pthread.c",
              "vendor/axidev-io/src/keyboard/common/linux_layout.c",
              "vendor/axidev-io/src/keyboard/common/linux_keysym.c",
              "vendor/axidev-io/src/keyboard/sender/sender_uinput.c",
              "vendor/axidev-io/src/keyboard/listener/listener_linux.c"
            ],
            "cflags": [
              "-std=c11",
              "-Wall",
              "-Wextra",
              "-Wno-unused-parameter",
              "<!@(pkg-config --cflags libinput libudev xkbcommon)"
            ],
            "libraries": [
              "<!@(pkg-config --libs libinput libudev xkbcommon)",
              "-pthread"
            ]
          }
        ]
      ]
    }
  ]
}
