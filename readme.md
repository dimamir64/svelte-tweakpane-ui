<!--+ Warning: Content inside HTML comment blocks was generated by mdat and may be overwritten. +-->

<!-- title -->

# svelte-tweakpane-ui

<!-- /title -->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/banner-dark.webp">
  <img alt="Svelte Tweakpane UI Banner" src="./assets/banner-light.webp">
</picture>

<!-- badges {
  npm: ["svelte-tweakpane-ui"],
  custom: {
    MadeWithSvelte: {
      image: "https://madewithsvelte.com/storage/repo-shields/4860-shield.svg",
      link: "https://madewithsvelte.com/p/svelte-tweakpane-ui/shield-link",
    },
    Documentation: {
      image:
        "https://img.shields.io/badge/-Documentation-ffdd00?logo=readthedocs&logoColor=222222",
      link: "https://kitschpatrol.com/svelte-tweakpane-ui",
    }
  }
} -->

[![NPM Package svelte-tweakpane-ui](https://img.shields.io/npm/v/svelte-tweakpane-ui.svg)](https://npmjs.com/package/svelte-tweakpane-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MadeWithSvelte](https://madewithsvelte.com/storage/repo-shields/4860-shield.svg)](https://madewithsvelte.com/p/svelte-tweakpane-ui/shield-link)
[![Documentation](https://img.shields.io/badge/-Documentation-ffdd00?logo=readthedocs&logoColor=222222)](https://kitschpatrol.com/svelte-tweakpane-ui)

<!-- /badges -->

## Overview

🎛️ **_Svelte Tweakpane UI_** wraps user-interface elements from the excellent [Tweakpane](https://tweakpane.github.io/docs/) library in a collection of 31 idiomatic, reactive, type-safe, carefully-crafted, and obsessively-documented [Svelte](https://svelte.dev) components.

The library makes it easy to quickly and declaratively add knobs and dials to your projects using components that feel like they were made for Svelte. It also augments Tweakpane with a few [extra features](https://kitschpatrol.com/svelte-tweakpane-ui/docs/features) for your convenience and enjoyment.

[The components](https://kitschpatrol.com/svelte-tweakpane-ui/docs#components) should be useful for integrating controls and value monitoring in parametrically driven artworks, data visualizations, creative tools, simulations, etc.

## Demo

![Svelte Tweakpane UI quick demo](./docs/public/quick-demo.gif)

## Documentation

**_Please see the documentation site for much more information:_**\
**<https://kitschpatrol.com/svelte-tweakpane-ui>**

## Quick start

1. Add _Svelte Tweakpane UI_ to your Svelte project:

```sh
npm install svelte-tweakpane-ui
```

2. Import and use Tweakpane components in your `.svelte` files:

```svelte
<script lang="ts">
  import { Button } from 'svelte-tweakpane-ui';
</script>

<Button on:click={() => alert('🎛️')} />
```

## Maintainers

[@kitschpatrol](https://github.com/kitschpatrol)

<!-- footer -->

## Contributing

[Issues](https://github.com/kitschpatrol/svelte-tweakpane-ui/issues) and pull requests are welcome.

## License

[MIT](license.txt) © Eric Mika

<!-- /footer -->

---

_Note: This library is not to be confused with Karl Moore's [`svelte-tweakpane`](https://github.com/pierogis/svelte-tweakpane)._
