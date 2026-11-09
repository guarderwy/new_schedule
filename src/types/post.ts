export interface Post {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface PostsFile {
  version: number
  list: Post[]
}
