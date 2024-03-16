<template>
  <div class="menu">
    <button class="menu-button" @click="handleButtonClick" value="input">
      <label for="fileInput" class="button-label">
        <img class="button-image" src="../assets/file.png" alt="Select Image" />
      </label>
      <input
        id="fileInput"
        class="button-input"
        type="file"
        @change="handleImageSelection"
      />
    </button>
    <div class="url">
      <input
        class="url-input"
        v-model="imageUrl"
        placeholder="URL"
        @keydown.enter="loadImageFromUrl"
      />
    </div>
    <button class="menu-button" @click="handleButtonClick" value="pipette">
      <label
        class="button-label"
        :class="{ 'button-label-tapped': state === 'pipette' }"
      >
        <img class="button-image" src="../assets/pipette.png" alt="Pipette" />
      </label>
    </button>
    <button class="menu-button" @click="handleButtonClick" value="modal">
      <label
        class="button-label"
        :class="{ 'button-label-tapped': state === 'modal' }"
      >
        <img class="button-image" src="../assets/modal.png" alt="modal" />
      </label>
    </button>
    <button class="menu-button" @click="saveCanvasImage" value="save">
      <label class="button-label">
        <img
          class="button-image"
          src="../assets/downloads.png"
          alt="Save Image"
        />
      </label>
    </button>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "MainMenu",
  props: {
    state: String,
  },
  data() {
    return {
      selectedImage: "",
      imageUrl: "",
    };
  },
  methods: {
    handleImageSelection(event) {
      const target = event.target;
      const selectedFile = target.files?.[0];

      if (selectedFile) {
        const imageUrl = URL.createObjectURL(selectedFile);
        this.selectedImage = imageUrl;
        this.$emit("onImageSelected", imageUrl);

        target.value = "";
      }
    },
    loadImageFromUrl() {
      if (this.imageUrl) {
        this.$emit("onImageSelected", this.imageUrl);
        this.selectedImage = this.imageUrl;
        this.imageUrl = "";
      }
    },
    saveCanvasImage() {
      const canvas = document.getElementById("canvas");
      const imageDataURL = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imageDataURL;
      link.download = "my_image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    handleButtonClick(event) {
      const target = event.target;
      const value = target.parentElement?.value
        ? target.parentElement.value
        : target.parentElement?.parentElement.value;
      this.$emit("changeState", value);
    },
  },
  beforeUnmount() {
    if (this.selectedImage) {
      URL.revokeObjectURL(this.selectedImage);
    }
  },
  watch: {
    state(newValue) {
      if (newValue === "pipette") {
        this.stateCursor = "pipette";
      } else this.stateCursor = null;
    },
  },
});
</script>

<style scoped lang="scss">
.menu {
  width: 50px;
  height: calc(100% - 10px);
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  background: #ececec;
}

.button {
  &-input {
    width: 100%;
    display: none;
  }

  &-label {
    cursor: pointer;
    background: #d6d6d6;
    border-radius: 10px;
    border: 10px solid #d6d6d6;
    display: block;
    transition: 0.3s;
    &:hover {
      background: #a0a0a0;
      border-color: #a0a0a0;
    }
    &-tapped {
      background: #a0a0a0;
      border-color: #a0a0a0;
    }
  }

  &-image {
    height: 25px;
  }
}

.url {
  &-input {
    width: 48px;
  }
}
</style>
