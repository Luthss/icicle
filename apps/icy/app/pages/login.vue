<script setup lang="ts">
import { authClient } from "~/lib/auth-client";
const { data: session } = await authClient.useSession(useFetch);
</script>
<template>
	<div v-if="session">
		<p>Welcome, {{ session.user.name }}</p>
		<button @click="authClient.signOut()">Sign out</button>
	</div>
	<div v-else>
		<button @click="authClient.signIn.social({ provider: 'github' })">
			Continue with GitHub
		</button>
		<button @click="authClient.signIn.social({ provider: 'google' })">
			Continue with Google
		</button>
	</div>

</template>