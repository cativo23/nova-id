<template>
  <svg
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
    :class="['nova-logo-icon', svgClass]"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7aa2f7" stop-opacity="1" />
        <stop offset="50%" stop-color="#9d7cd8" stop-opacity="1" />
        <stop offset="100%" stop-color="#bb9af7" stop-opacity="1" />
      </linearGradient>
      <filter :id="filterId">
        <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter v-if="glow" :id="glowId">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feFlood :flood-color="glowColor" flood-opacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g :filter="glow ? `url(#${glowId})` : `url(#${filterId})`" transform="translate(24, 24)">
      <path
        class="nova-hex"
        d="M 0,-18 L 15.6,-9 L 15.6,9 L 0,18 L -15.6,9 L -15.6,-9 Z"
        fill="none"
        :stroke="`url(#${gradientId})`"
        stroke-width="2.2"
        stroke-linejoin="round"
      />
      <circle class="nova-dot" cx="0" cy="0" r="4" fill="#7dcfff" />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps({
  svgClass: { type: String, default: 'h-8 w-8' },
  gradientId: { type: String, default: 'nova-icon-grad' },
  filterId: { type: String, default: 'nova-icon-glow' },
  glowId: { type: String, default: 'nova-icon-glow-strong' },
  glow: { type: Boolean, default: false },
  glowColor: { type: String, default: '#7dcfff' }
})
</script>

<style scoped>
.nova-logo-icon { flex-shrink: 0; }
.nova-hex { transform-origin: 24px 24px; transition: transform 0.25s ease, stroke-opacity 0.2s ease; }
.nova-dot { transform-origin: 24px 24px; transition: opacity 0.2s ease; }
:deep(.nova-logo-icon) { display: block; }
</style>
