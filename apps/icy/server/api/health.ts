export default defineEventHandler(async (event) => {
  // ... Do whatever you want here
  const query = getQuery(event)

  return {
    message: "healthy",
    ...query,
  }
})